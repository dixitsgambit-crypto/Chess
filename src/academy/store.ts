/**
 * Browser-side progress store. It holds the copy of the player's state the server
 * last sent and shows the server's notifications. It awards nothing itself: every
 * change goes through the API, and the server's rules decide (see server/rules.ts).
 */
import { useSyncExternalStore } from 'react';
import { api, ApiError } from './api';
import { loadContent } from './content';
import { freshState, type GameRec, type PlacementRec, type Settings, type Profile as ProfileT, type State, type Toast } from './progression';

export * from './progression';

export interface User { id: number; username: string | null; guest: boolean }
export interface Session { status: 'loading' | 'ready' | 'error'; user: User | null; error?: string }

let state: State = freshState();
let session: Session = { status: 'loading', user: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export const getState = () => state;
export const useStore = (): State => useSyncExternalStore(subscribe, () => state);
export const useSession = (): Session => useSyncExternalStore(subscribe, () => session);

/** Apply a server response: new state and any notifications. */
export function applyServer(r: { state?: State; toasts?: Toast[]; user?: User }) {
  if (r.state) state = r.state;
  if (r.user) session = { ...session, user: r.user };
  for (const t of r.toasts ?? []) pushToast(t.kind, t.text);
  emit();
}

let booting: Promise<void> | null = null;
/** Load content and the session (creating a guest if needed). Repeated calls share one boot unless forced. */
export function boot(force = false): Promise<void> {
  if (!booting || force) booting = doBoot();
  return booting;
}
async function doBoot() {
  session = { status: 'loading', user: null };
  emit();
  try {
    await loadContent();
    let me: { user: User; state: State };
    try { me = await api.get('/api/me'); }
    catch (e) {
      if (!(e instanceof ApiError) || e.status !== 401) throw e;
      me = await api.post('/api/auth/guest');
    }
    state = me.state;
    session = { status: 'ready', user: me.user };
  } catch (e) {
    session = { status: 'error', user: null, error: (e as Error).message };
  }
  emit();
}

// ------------------------------------------------------------- notifications
let toasts: Toast[] = [];
let toastId = 0;
const toastListeners = new Set<() => void>();
export function pushToast(kind: Toast['kind'], text: string) {
  const t = { id: ++toastId, kind, text };
  toasts = [...toasts, t];
  toastListeners.forEach((l) => l());
  setTimeout(() => { toasts = toasts.filter((x) => x.id !== t.id); toastListeners.forEach((l) => l()); }, 4200);
}
export function useToasts(): Toast[] {
  return useSyncExternalStore((l) => { toastListeners.add(l); return () => { toastListeners.delete(l); }; }, () => toasts);
}

/** Run a request; on failure show the server's message instead of failing silently. */
async function send<T>(p: Promise<T>): Promise<T | null> {
  try { const r = await p; applyServer(r as { state?: State; toasts?: Toast[] }); return r; }
  catch (e) { pushToast('info', (e as Error).message); return null; }
}

// ------------------------------------------------------------- accounts
export async function register(username: string, password: string) {
  const r = await api.post<{ user: User; state: State }>('/api/auth/register', { username, password });
  applyServer(r);
}
export async function login(username: string, password: string) {
  const r = await api.post<{ user: User; state: State }>('/api/auth/login', { username, password });
  applyServer(r);
}
export async function logout() {
  await api.post('/api/auth/logout');
  await boot(true); // continues as a fresh guest
}

export const getAccount = () => api.get<{ user: User; createdAt: number; activeSessions: number }>('/api/account');
export const changePassword = (current: string, next: string) => api.post<{ otherSessionsSignedOut: number }>('/api/account/password', { current, next });
export const revokeOtherSessions = () => api.post<{ signedOut: number }>('/api/account/sessions/revoke-others');
export async function deleteAccount(password: string) {
  await api.post('/api/account/delete', { password, confirm: 'DELETE' });
  await boot(true); // continue as a brand-new guest
}

// ------------------------------------------------------------- actions
export const markStage = (lessonId: string, stage: string) => { void send(api.post(`/api/lessons/${encodeURIComponent(lessonId)}/stage`, { stage })); };
export const completePlacement = async () => (await send(api.post<{ placement: PlacementRec }>('/api/placement/complete')))?.placement;
export const recordGame = (g: Omit<GameRec, 'at'>) => send(api.post('/api/games', g));
export const startTournament = (timeControl: string) => send(api.post('/api/tournament/start', { timeControl }));
export const withdrawTournament = () => send(api.post('/api/tournament/withdraw'));
export const submitGuesses = async (gameId: string, side: 'w' | 'b', guesses: string[]) => send(api.post<{ pct: number; right: number; total: number }>('/api/guess', { gameId, side, guesses }));
export const recordRush = (score: number) => send(api.post('/api/rush', { score }));
export function updateSettings(patch: Partial<Settings>) {
  state = { ...state, settings: { ...state.settings, ...patch } }; // optimistic; the server confirms or corrects
  emit();
  void send(api.patch('/api/settings', patch)).then((r) => { if (!r) void boot(true); });
}
export const updateProfile = (patch: Partial<Pick<ProfileT, 'name' | 'emblem'>>) => send(api.patch('/api/profile', patch));
export const resetProgress = () => send(api.post('/api/progress/reset', { confirm: 'RESET' }));
