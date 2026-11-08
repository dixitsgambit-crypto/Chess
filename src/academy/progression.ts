/**
 * Shared, content-free progression definitions: state shape, levels, titles,
 * cosmetics, mission and achievement definitions. Imported by both the browser
 * and the server. It must never import curriculum content, because anything the
 * browser imports ends up in the public bundle.
 */
export const RETRY_COOLDOWN_MS = 20 * 3600 * 1000;
export const DAY = 24 * 3600 * 1000;

export interface Srs { due: number; interval: number; ease: number; reps: number }
export interface ItemRec {
  attempts: number;
  solved: boolean;
  firstCorrect?: boolean;
  credited: boolean;
  lastFailAt?: number;
  lastAt: number;
  srs?: Srs;
  /** Server-only: an assessment attempt was opened at this time and not yet finished. */
  pendingSince?: number;
}
export interface LessonRec { stages: string[]; mastered: boolean; masteredAt?: number; testedOut?: boolean; examBest?: number }
export interface Settings { reducedMotion: 'system' | 'on' | 'off'; coordinates: boolean; showDests: boolean; autoQueen: boolean; boardTheme: string }
export interface Profile { name: string; emblem: string; createdAt: number }
export interface XpEvent { at: number; amount: number; reason: string }
export interface GameRec { at: number; opponent: string; skill: number; color: 'w' | 'b'; result: 'win' | 'loss' | 'draw'; reason: string; timeControl: string; pgn: string; event?: string }
export interface TournamentRec { id: string; startedAt: number; timeControl: string; rounds: { opponent: string; skill: number; color: 'w' | 'b'; result?: 'win' | 'loss' | 'draw' }[]; finishedAt?: number }
export interface PlacementRec { at: number; scores: Record<string, { correct: number; total: number }>; testedOut: string[]; recommended: string }

export interface State {
  v: 1;
  profile: Profile;
  settings: Settings;
  xp: number;
  log: XpEvent[];
  items: Record<string, ItemRec>;
  lessons: Record<string, LessonRec>;
  bosses: Record<string, { defeated: boolean; at?: number }>;
  unlocked: string[];
  placement?: PlacementRec;
  /** Server-side record of placement answers while the assessment is in progress. */
  placementDraft?: Record<string, boolean>;
  achievements: Record<string, number>;
  counters: Record<string, number>;
  days: string[];
  daily: { date: string; progress: Record<string, number>; claimed: string[] };
  weekly: { week: string; progress: Record<string, number>; claimed: string[] };
  games: GameRec[];
  tournament?: TournamentRec;
  tournamentsWon: number;
  guessBest: Record<string, number>;
}

export const freshState = (now = Date.now()): State => ({
  v: 1,
  profile: { name: 'Wanderer', emblem: '♙', createdAt: now },
  settings: { reducedMotion: 'system', coordinates: true, showDests: true, autoQueen: false, boardTheme: 'walnut' },
  xp: 0,
  log: [],
  items: {},
  lessons: {},
  bosses: {},
  unlocked: ['foundation'],
  achievements: {},
  counters: {},
  days: [],
  daily: { date: '', progress: {}, claimed: [] },
  weekly: { week: '', progress: {}, claimed: [] },
  games: [],
  tournamentsWon: 0,
  guessBest: {},
});

/** Notifications produced by the server while applying a rule. */
export interface Toast { id: number; kind: 'xp' | 'achievement' | 'unlock' | 'info' | 'mission'; text: string }

// ------------------------------------------------------------- levels & titles
export const levelFor = (xp: number) => Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2);
export const xpForLevel = (level: number) => 50 * level * (level - 1);

export const TITLES: { level: number; title: string; emblem: string }[] = [
  { level: 1, title: 'Pawn Initiate', emblem: '♙' },
  { level: 3, title: 'Knight Apprentice', emblem: '♘' },
  { level: 6, title: 'Bishop Adept', emblem: '♗' },
  { level: 10, title: 'Rook Guardian', emblem: '♖' },
  { level: 15, title: 'Queen Strategist', emblem: '♕' },
  { level: 21, title: 'Royal Tactician', emblem: '⚔' },
  { level: 28, title: 'Chess Commander', emblem: '⚜' },
  { level: 36, title: 'Master of the Board', emblem: '♔' },
  { level: 45, title: 'Grandmaster Scholar', emblem: '♚' },
];
export const titleFor = (level: number) => [...TITLES].reverse().find((t) => level >= t.level)!;

export const BOARD_THEMES: { id: string; name: string; level: number; light: string; dark: string }[] = [
  { id: 'walnut', name: 'Walnut Hall', level: 1, light: '#e6d2ae', dark: '#a87b52' },
  { id: 'midnight', name: 'Midnight Marble', level: 3, light: '#c9cdd6', dark: '#5d6679' },
  { id: 'emerald', name: 'Emerald Court', level: 6, light: '#dfe3c8', dark: '#6f8f5e' },
  { id: 'crimson', name: 'Crimson Keep', level: 10, light: '#e8d6c8', dark: '#9a5a52' },
  { id: 'obsidian', name: 'Obsidian Throne', level: 15, light: '#b9ab92', dark: '#3f3a36' },
];

// ------------------------------------------------------------- calendar (UTC, so browser and server agree)
export const dayKey = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
export function weekKey(t = Date.now()) {
  const d = new Date(t);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  const thursday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day + 3));
  const jan4 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((thursday.getTime() - jan4.getTime()) / DAY - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${thursday.getUTCFullYear()}-W${week}`;
}
export const today = () => dayKey();
export const currentWeek = () => weekKey();

// ------------------------------------------------------------- missions
export type MissionEvent = 'first-try' | 'review' | 'mate' | 'engine-game' | 'credit' | 'playout' | 'guess';
export interface MissionDef { id: string; label: string; target: number; event: MissionEvent }
const DAILY_POOL: MissionDef[] = [
  { id: 'd-first-try', label: 'Solve 5 puzzles at the first attempt without hints', target: 5, event: 'first-try' },
  { id: 'd-review', label: 'Pass 3 revision reviews', target: 3, event: 'review' },
  { id: 'd-mate', label: 'Deliver 3 checkmates in puzzles', target: 3, event: 'mate' },
  { id: 'd-game', label: 'Finish a game against the AI Grandmaster', target: 1, event: 'engine-game' },
  { id: 'd-credit', label: 'Earn credit on 2 examination positions', target: 2, event: 'credit' },
  { id: 'd-playout', label: 'Win a practical play-out', target: 1, event: 'playout' },
  { id: 'd-guess', label: 'Score 50%+ in a Guess-the-Move session', target: 1, event: 'guess' },
];
const WEEKLY_POOL: MissionDef[] = [
  { id: 'w-credit', label: 'Earn credit on 12 examination positions', target: 12, event: 'credit' },
  { id: 'w-first-try', label: 'Solve 25 puzzles at the first attempt without hints', target: 25, event: 'first-try' },
  { id: 'w-games', label: 'Finish 3 games against the AI Grandmaster', target: 3, event: 'engine-game' },
];
export const DAILY_XP = 25;
export const WEEKLY_XP = 100;

function hash(s: string) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
export function dailyMissions(date = dayKey()): MissionDef[] {
  const pool = [...DAILY_POOL];
  const out: MissionDef[] = [];
  let h = hash(date);
  while (out.length < 3) { out.push(pool.splice(h % pool.length, 1)[0]); h = hash(String(h)); }
  return out;
}
export function weeklyMissions(week = weekKey()): MissionDef[] {
  return [WEEKLY_POOL[hash(week) % WEEKLY_POOL.length], WEEKLY_POOL[(hash(week) + 1) % WEEKLY_POOL.length]];
}

// ------------------------------------------------------------- achievements
export interface AchievementDef { id: string; name: string; description: string; icon: string; check: (s: State) => boolean }
const lessonsMastered = (s: State) => Object.values(s.lessons).filter((l) => l.mastered).length;
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-blood', name: 'First Steps', description: 'Solve your first puzzle at the first attempt.', icon: '♙', check: (s) => (s.counters['first-try'] ?? 0) >= 1 },
  { id: 'sharp-eye', name: 'Sharp Eye', description: 'Solve 25 puzzles at the first attempt without hints.', icon: '👁', check: (s) => (s.counters['first-try'] ?? 0) >= 25 },
  { id: 'mate-hunter', name: 'Mate Hunter', description: 'Deliver 15 checkmates in puzzles.', icon: '♚', check: (s) => (s.counters.mate ?? 0) >= 15 },
  { id: 'scholar', name: 'Scholar', description: 'Master your first lesson.', icon: '📖', check: (s) => lessonsMastered(s) >= 1 },
  { id: 'sage', name: 'Sage of the Realm', description: 'Master 10 lessons.', icon: '📚', check: (s) => lessonsMastered(s) >= 10 },
  { id: 'gatekeeper', name: 'Gate Breaker', description: 'Defeat the Gatekeeper of the Foundation Realm.', icon: '🛡', check: (s) => !!s.bosses.foundation?.defeated },
  { id: 'knight-captain', name: 'Captain’s Seal', description: 'Defeat the Knight-Captain of the Tactical Kingdom.', icon: '⚔', check: (s) => !!s.bosses.tactics?.defeated },
  { id: 'warden', name: 'Citadel Key', description: 'Defeat the Citadel Warden.', icon: '🗝', check: (s) => !!s.bosses.endgames?.defeated },
  { id: 'retained', name: 'Long Memory', description: 'Pass 10 spaced revision reviews.', icon: '⏳', check: (s) => (s.counters.review ?? 0) >= 10 },
  { id: 'comeback', name: 'Second Wind', description: 'Earn credit on an exam position you failed earlier, after a spaced retry.', icon: '↺', check: (s) => (s.counters['retained-credit'] ?? 0) >= 1 },
  { id: 'flawless', name: 'Flawless', description: 'Pass a lesson examination with every position right at the first attempt.', icon: '✦', check: (s) => (s.counters.flawless ?? 0) >= 1 },
  { id: 'placed', name: 'Know Thyself', description: 'Complete the placement assessment.', icon: '⚖', check: (s) => !!s.placement },
  { id: 'technician', name: 'Technician', description: 'Win 3 practical play-outs.', icon: '⚙', check: (s) => (s.counters.playout ?? 0) >= 3 },
  { id: 'giant-slayer', name: 'Giant Slayer', description: 'Beat the AI Grandmaster at skill 8 or higher.', icon: '🗡', check: (s) => s.games.some((g) => g.result === 'win' && g.skill >= 8) },
  { id: 'champion', name: 'Kingdom Cup Champion', description: 'Win the Kingdom Cup in the Tournament Hall.', icon: '🏆', check: (s) => s.tournamentsWon >= 1 },
  { id: 'historian', name: 'Historian', description: 'Score 60%+ in Guess-the-Move on a master game.', icon: '📜', check: (s) => Object.values(s.guessBest).some((v) => v >= 60) },
  { id: 'devoted', name: 'Devoted', description: 'Train on 7 different days.', icon: '🔥', check: (s) => s.days.length >= 7 },
];

/** Which kingdoms open when a kingdom's guardian is defeated. */
export const UNLOCKS: Record<string, string[]> = { foundation: ['tactics', 'endgames'], tactics: ['strategy', 'calculation'], endgames: [], calculation: [] };
/** The kingdom whose guardian opens `id`, if any. */
export const openedBy = (id: string) => Object.keys(UNLOCKS).find((k) => UNLOCKS[k].includes(id));

/** Whether an assessment position may be attempted for credit right now (same rule on both sides). */
export function assessmentOpen(s: State, taskId: string, now: number): { open: boolean; until?: number } {
  const r = s.items[taskId];
  if (!r || r.credited || (r.attempts === 0 && !r.pendingSince)) return { open: true };
  const lastFail = Math.max(r.lastFailAt ?? 0, r.pendingSince ?? 0);
  return now - lastFail >= RETRY_COOLDOWN_MS ? { open: true } : { open: false, until: lastFail + RETRY_COOLDOWN_MS };
}

export const dueReviews =(s: State, now = Date.now()) => Object.entries(s.items).filter(([, r]) => r.srs && r.srs.due <= now).map(([id]) => id);

export function streak(s: State): number {
  const d = new Date();
  if (!s.days.includes(dayKey(d.getTime()))) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (s.days.includes(dayKey(d.getTime()))) { n++; d.setUTCDate(d.getUTCDate() - 1); }
  return n;
}
