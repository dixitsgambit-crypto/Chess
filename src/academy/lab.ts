/**
 * Opening Laboratory data, stored on the server per player (it used to live only in
 * this browser's localStorage).
 *
 * Migration rule — never lose or silently replace anything:
 *  - The first time a player opens the Laboratory in a browser that still has old
 *    localStorage data, that data is MERGED into the server copy: new files are added,
 *    a same-named file with different contents is kept as “name (from this browser)”,
 *    and notes/statistics only fill gaps. The old localStorage entries are left in place.
 *  - That browser data is merged into one player only (the first to open the Lab here),
 *    so it is not copied into every account that later signs in on this computer.
 *
 * The legacy components keep calling loadNotes()/saveNotes()/loadStats()/saveStats();
 * those now read and write this in-memory copy, which is saved to the server shortly after.
 */
import { api } from './api';
import { pushToast } from './store';
import { mergeLab, type LabData, type LabNote, type LabSource, type LabStat } from './lab-merge';

export { mergeLab };
export type { LabData, LabNote, LabSource, LabStat };

const LEGACY = { sources: 'aca.sources.v1', notes: 'aca.notes.v1', stats: 'aca.practice.v1', side: 'aca.side.v1' };
const MIGRATED = 'chessverse.lab-migrated-to';

const empty = (): LabData => ({ sources: [], notes: {}, stats: {}, side: 'auto' });
let data: LabData = empty();
let updatedAt = 0;
let loadedFor: number | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let conflict = false;

function readLegacy(): LabData | null {
  try {
    const sources = JSON.parse(localStorage.getItem(LEGACY.sources) ?? '[]') as LabSource[];
    const notes = JSON.parse(localStorage.getItem(LEGACY.notes) ?? '{}') as Record<string, LabNote>;
    const stats = JSON.parse(localStorage.getItem(LEGACY.stats) ?? '{}') as Record<string, LabStat>;
    const side = (localStorage.getItem(LEGACY.side) ?? 'auto') as LabData['side'];
    if (!sources.length && !Object.keys(notes).length && !Object.keys(stats).length && side === 'auto') return null;
    return { sources: sources.map((s) => ({ name: s.name, text: s.text })), notes, stats, side };
  } catch { return null; }
}

let inflight: { userId: number; p: Promise<void> } | null = null;

/** Load the player's laboratory from the server (and merge old browser data once). Concurrent calls share one load. */
export function loadLab(userId: number): Promise<void> {
  if (loadedFor === userId) return Promise.resolve();
  if (inflight?.userId === userId) return inflight.p;
  const p = doLoad(userId).finally(() => { if (inflight?.p === p) inflight = null; });
  inflight = { userId, p };
  return p;
}

async function doLoad(userId: number): Promise<void> {
  const r = await api.get<{ data: LabData | null; updatedAt: number }>('/api/lab');
  data = r.data ?? empty();
  updatedAt = r.updatedAt;
  conflict = false;
  let migratedTo: string | null = null;
  try { migratedTo = localStorage.getItem(MIGRATED); } catch { /* storage blocked */ }
  const legacy = migratedTo ? null : readLegacy();
  if (legacy) {
    const { merged, added } = mergeLab(data, legacy);
    data = merged;
    await saveNow();
    try { localStorage.setItem(MIGRATED, String(userId)); } catch { /* ignore */ }
    if (added) pushToast('info', `Moved ${added} item(s) of Opening Laboratory data from this browser to your account. The browser copy was kept.`);
  }
  loadedFor = userId;
}

async function saveNow() {
  if (conflict) return;
  try {
    const r = await api.put<{ updatedAt: number }>('/api/lab', { data, baseUpdatedAt: updatedAt });
    updatedAt = r.updatedAt;
  } catch (e) {
    if ((e as { status?: number }).status === 409) conflict = true;
    pushToast('info', `Opening Laboratory not saved: ${(e as Error).message}`);
  }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveTimer = null; void saveNow(); }, 800);
}

export const labSources = () => data.sources;
export function setLabSources(sources: LabSource[]) { data = { ...data, sources }; scheduleSave(); }
export const labNotes = () => data.notes;
export function setLabNotes(notes: Record<string, LabNote>) { data = { ...data, notes }; scheduleSave(); }
export const labStats = () => data.stats;
export function setLabStats(stats: Record<string, LabStat>) { data = { ...data, stats }; scheduleSave(); }
export const labSide = () => data.side;
export function setLabSide(side: LabData['side']) { data = { ...data, side }; scheduleSave(); }
export const labConflict = () => conflict;
