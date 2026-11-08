/**
 * XP, credit, mastery and reward rules. Runs only on the server, against the
 * user's stored state, with the server's clock. The browser can ask for things
 * to happen; only these functions decide what is awarded.
 */
import type { Task } from '../src/content/schema.ts';
import { KINGDOMS, lessonById, type Stage } from '../src/content/kingdoms.ts';
import { PLACEMENT } from '../src/content/placement.ts';
import {
  ACHIEVEMENTS, BOARD_THEMES, DAILY_XP, DAY, RETRY_COOLDOWN_MS, WEEKLY_XP, dailyMissions, dayKey, levelFor, titleFor, weekKey, weeklyMissions,
  type ItemRec, type LessonRec, type MissionEvent, type PlacementRec, type Srs, type State, type Toast,
} from '../src/academy/progression.ts';

export class Ctx {
  toasts: Toast[] = [];
  private n = 0;
  s: State;
  now: number;
  constructor(s: State, now: number) { this.s = s; this.now = now; }
  toast(kind: Toast['kind'], text: string) { this.toasts.push({ id: ++this.n, kind, text }); }
}

export interface AttemptResult { xp: number; credited: boolean; note: string }

function award(ctx: Ctx, amount: number, reason: string) {
  if (amount <= 0) return;
  const before = levelFor(ctx.s.xp);
  ctx.s = { ...ctx.s, xp: ctx.s.xp + amount, log: [{ at: ctx.now, amount, reason }, ...ctx.s.log].slice(0, 200) };
  ctx.toast('xp', `+${amount} XP · ${reason}`);
  const after = levelFor(ctx.s.xp);
  if (after > before) {
    ctx.toast('unlock', `Level ${after}${titleFor(after).level === after ? ` — new title: ${titleFor(after).title}` : ''}`);
    const theme = BOARD_THEMES.find((t) => t.level > before && t.level <= after);
    if (theme) ctx.toast('unlock', `Board unlocked: ${theme.name}`);
  }
}

export function touchDay(ctx: Ctx) {
  const d = dayKey(ctx.now), w = weekKey(ctx.now);
  let s = ctx.s;
  if (!s.days.includes(d)) s = { ...s, days: [...s.days, d].slice(-400) };
  if (s.daily.date !== d) s = { ...s, daily: { date: d, progress: {}, claimed: [] } };
  if (s.weekly.week !== w) s = { ...s, weekly: { week: w, progress: {}, claimed: [] } };
  ctx.s = s;
}

function bump(ctx: Ctx, event: MissionEvent | 'retained-credit' | 'flawless', by = 1) {
  touchDay(ctx);
  ctx.s = { ...ctx.s, counters: { ...ctx.s.counters, [event]: (ctx.s.counters[event] ?? 0) + by } };
  for (const [scope, defs, reward] of [['daily', dailyMissions(ctx.s.daily.date), DAILY_XP], ['weekly', weeklyMissions(ctx.s.weekly.week), WEEKLY_XP]] as const) {
    for (const m of defs) {
      if (m.event !== event) continue;
      const box = ctx.s[scope];
      const progress = { ...box.progress, [m.id]: (box.progress[m.id] ?? 0) + by };
      const done = progress[m.id] >= m.target && !box.claimed.includes(m.id);
      ctx.s = { ...ctx.s, [scope]: { ...box, progress, claimed: done ? [...box.claimed, m.id] : box.claimed } };
      if (done) {
        ctx.toast('mission', `${scope === 'daily' ? 'Daily mission' : 'Weekly challenge'} complete: ${m.label}`);
        award(ctx, reward, scope === 'daily' ? 'Daily mission' : 'Weekly challenge');
      }
    }
  }
}

export function checkAchievements(ctx: Ctx) {
  for (const a of ACHIEVEMENTS) {
    if (ctx.s.achievements[a.id] || !a.check(ctx.s)) continue;
    ctx.s = { ...ctx.s, achievements: { ...ctx.s.achievements, [a.id]: ctx.now } };
    ctx.toast('achievement', `Achievement: ${a.name}`);
  }
}

const mult = (t: Task) => 1 + (t.difficulty - 1) * 0.5;
const isMate = (t: Task) => t.kind === 'puzzle' && t.goal.type === 'mate';
const isAssessment = (stage: Stage) => stage === 'exam' || stage === 'boss' || stage === 'placement';

/**
 * Mark the start of an assessment attempt. Opening an unseen position counts:
 * walking away (or refreshing) is recorded as a miss unless the attempt is finished correctly.
 */
export function beginAssessment(ctx: Ctx, task: Task) {
  let prev: ItemRec = ctx.s.items[task.id] ?? { attempts: 0, solved: false, credited: false, lastAt: 0 };
  if (prev.credited) return;
  // a previous attempt that was opened but never finished counts as a miss
  if (prev.pendingSince) prev = { ...prev, attempts: prev.attempts + 1, lastFailAt: prev.pendingSince, firstCorrect: prev.attempts === 0 ? false : prev.firstCorrect };
  ctx.s = { ...ctx.s, items: { ...ctx.s.items, [task.id]: { ...prev, pendingSince: ctx.now } } };
}

export { assessmentOpen } from '../src/academy/progression.ts';

/** Record a finished attempt whose correctness the referee has already established. */
export function recordAttempt(ctx: Ctx, task: Task, stage: Stage, correct: boolean, hints: number, misses: number): AttemptResult {
  touchDay(ctx);
  const now = ctx.now;
  const { pendingSince: _pending, ...prev }: ItemRec = ctx.s.items[task.id] ?? { attempts: 0, solved: false, credited: false, lastAt: 0 };
  const first = prev.attempts === 0 && misses === 0;
  const rec: ItemRec = { ...prev, attempts: prev.attempts + 1, lastAt: now };
  if (prev.attempts === 0) rec.firstCorrect = correct && misses === 0 && hints === 0;
  const newlySolved = correct && !prev.solved;
  if (correct) rec.solved = true;
  if (!correct || misses > 0) rec.lastFailAt = now;
  let xp = 0, note = '';

  if (stage === 'guided') {
    if (newlySolved) { xp = 2; note = 'Guided practice: small XP — the real reward comes from independent work.'; }
  } else if (stage === 'independent' || stage === 'application') {
    if (newlySolved) {
      const base = task.kind === 'playout' ? 20 : 10;
      xp = Math.round((first && hints === 0 ? base : hints > 0 ? base * 0.4 : base * 0.2) * mult(task));
      note = first && hints === 0 ? 'First attempt, no hints: full XP.' : hints > 0 ? 'Solved with hints: reduced XP.' : 'Solved after a miss: reduced XP.';
    } else if (correct) note = 'Already solved before — no XP for repeats.';
  } else if (isAssessment(stage)) {
    if (!prev.credited && correct && hints === 0 && misses === 0) {
      if (prev.attempts === 0) { rec.credited = true; note = 'Credited: solved at the first attempt.'; }
      else {
        const lastFail = prev.lastFailAt ?? 0;
        if (lastFail && now - lastFail >= RETRY_COOLDOWN_MS) {
          rec.credited = true; note = 'Credited after a spaced retry — knowledge retained.';
          bump(ctx, 'retained-credit');
        } else note = 'Correct, but not credited: a failed exam position can only be credited after a 20-hour gap.';
      }
    }
    if (rec.credited && !prev.credited && stage !== 'placement') xp = Math.round(15 * mult(task));
  }

  if (stage !== 'guided' && stage !== 'placement' && task.kind !== 'choice') {
    if (newlySolved) rec.srs = { due: now + DAY, interval: 1, ease: 2.3, reps: 0 };
    else if (!correct && (stage === 'exam' || stage === 'boss')) rec.srs = { due: now + DAY, interval: 1, ease: 2.0, reps: 0 };
  }

  ctx.s = { ...ctx.s, items: { ...ctx.s.items, [task.id]: rec } };
  if (stage === 'placement') ctx.s = { ...ctx.s, placementDraft: { ...(ctx.s.placementDraft ?? {}), [task.id]: correct && misses === 0 } };
  if (xp) award(ctx, xp, `${task.prompt.slice(0, 40)}${task.prompt.length > 40 ? '…' : ''}`);
  if (correct && first && hints === 0 && stage !== 'guided' && stage !== 'placement') bump(ctx, 'first-try');
  if (newlySolved && isMate(task) && stage !== 'placement') bump(ctx, 'mate');
  if (newlySolved && task.kind === 'playout') bump(ctx, 'playout');
  if (rec.credited && !prev.credited && stage !== 'placement') bump(ctx, 'credit');
  checkAchievements(ctx);
  return { xp, credited: rec.credited, note };
}

/** A spaced-revision review of a position already solved. */
export function recordReview(ctx: Ctx, task: Task, correct: boolean): AttemptResult {
  touchDay(ctx);
  const now = ctx.now;
  const prev = ctx.s.items[task.id];
  if (!prev?.srs) return { xp: 0, credited: false, note: 'This position is not in your revision queue.' };
  const due = prev.srs.due <= now;
  const srs: Srs = correct
    ? { due: now + Math.round(Math.max(1, prev.srs.interval * prev.srs.ease)) * DAY, interval: Math.max(1, prev.srs.interval * prev.srs.ease), ease: Math.min(3, prev.srs.ease + 0.1), reps: prev.srs.reps + 1 }
    : { due: now + DAY, interval: 1, ease: Math.max(1.3, prev.srs.ease - 0.2), reps: 0 };
  const rec: ItemRec = { ...prev, srs, lastAt: now };
  if (!correct && !prev.credited) rec.lastFailAt = now;
  const stage = stageOf(task.id);
  let newlyCredited = false;
  if (correct && !prev.credited && (stage === 'exam' || stage === 'boss') && prev.lastFailAt && now - prev.lastFailAt >= RETRY_COOLDOWN_MS) {
    rec.credited = newlyCredited = true;
    bump(ctx, 'retained-credit');
  }
  ctx.s = { ...ctx.s, items: { ...ctx.s.items, [task.id]: rec } };
  let xp = 0;
  if (correct && due) { xp = 5; award(ctx, xp, 'Revision: knowledge retained'); bump(ctx, 'review'); }
  if (newlyCredited) { const x = Math.round(15 * mult(task)); xp += x; award(ctx, x, 'Exam position credited'); bump(ctx, 'credit'); }
  if (newlyCredited) {
    for (const l of KINGDOMS.flatMap((k) => k.lessons)) if (l.exam.some((t) => t.id === task.id)) evaluateLesson(ctx, l.id);
    for (const k of KINGDOMS) if (k.boss?.tasks.some((t) => t.id === task.id)) evaluateBoss(ctx, k.id);
  }
  checkAchievements(ctx);
  return { xp, credited: rec.credited, note: correct ? (due ? 'Review passed — next review pushed further out.' : 'Correct (not yet due, so no XP).') : 'Missed — this position comes back tomorrow.' };
}

let stageIndex: Map<string, Stage> | null = null;
export function stageOf(id: string): Stage | undefined {
  if (!stageIndex) {
    stageIndex = new Map();
    for (const k of KINGDOMS) {
      for (const l of k.lessons) for (const st of ['guided', 'independent', 'application', 'exam'] as const) for (const t of l[st]) stageIndex.set(t.id, st);
      for (const t of k.boss?.tasks ?? []) stageIndex.set(t.id, 'boss');
    }
    for (const p of PLACEMENT) stageIndex.set(p.task.id, 'placement');
  }
  return stageIndex.get(id);
}

export function markStage(ctx: Ctx, lessonId: string, stage: string) {
  if (!lessonById(lessonId)) return;
  const l = ctx.s.lessons[lessonId] ?? { stages: [], mastered: false };
  if (l.stages.includes(stage)) return;
  ctx.s = { ...ctx.s, lessons: { ...ctx.s.lessons, [lessonId]: { ...l, stages: [...l.stages, stage] } } };
}

/** Mastery = credit on every exam position. Called by the server after exam attempts. */
export function evaluateLesson(ctx: Ctx, lessonId: string, sessionPct?: number) {
  const lesson = lessonById(lessonId);
  if (!lesson) return;
  const prev = ctx.s.lessons[lessonId] ?? { stages: [], mastered: false };
  // highest share of examination positions credited so far (this was never recorded before)
  const creditedPct = Math.round((lesson.exam.filter((t) => ctx.s.items[t.id]?.credited).length / lesson.exam.length) * 100);
  const rec: LessonRec = { ...prev, examBest: Math.max(prev.examBest ?? 0, sessionPct ?? creditedPct) };
  const newly = !prev.mastered && lesson.exam.every((t) => ctx.s.items[t.id]?.credited);
  if (newly) {
    rec.mastered = true; rec.masteredAt = ctx.now;
    if (lesson.exam.every((t) => ctx.s.items[t.id]?.firstCorrect)) bump(ctx, 'flawless');
  }
  ctx.s = { ...ctx.s, lessons: { ...ctx.s.lessons, [lessonId]: rec } };
  if (newly) award(ctx, 50, `Mastered: ${lesson.title}`);
  checkAchievements(ctx);
}

export { UNLOCKS } from '../src/academy/progression.ts';
import { UNLOCKS } from '../src/academy/progression.ts';

export function evaluateBoss(ctx: Ctx, kingdomId: string) {
  const k = KINGDOMS.find((x) => x.id === kingdomId);
  if (!k?.boss || ctx.s.bosses[kingdomId]?.defeated) return;
  const credited = k.boss.tasks.filter((t) => ctx.s.items[t.id]?.credited).length;
  if (credited / k.boss.tasks.length < 0.8) return;
  ctx.s = { ...ctx.s, bosses: { ...ctx.s.bosses, [kingdomId]: { defeated: true, at: ctx.now } } };
  award(ctx, 150, `Defeated ${k.boss.name}`);
  for (const id of UNLOCKS[kingdomId] ?? []) {
    if (ctx.s.unlocked.includes(id)) continue;
    ctx.s = { ...ctx.s, unlocked: [...ctx.s.unlocked, id] };
    ctx.toast('unlock', `Kingdom unlocked: ${KINGDOMS.find((x) => x.id === id)?.name}`);
  }
  checkAchievements(ctx);
}

/** Placement is scored from the answers the referee recorded, never from client claims. */
export function completePlacement(ctx: Ctx): PlacementRec | { error: string } {
  if (ctx.s.placement) return { error: 'Placement has already been completed.' };
  const draft = ctx.s.placementDraft ?? {};
  if (PLACEMENT.some((p) => !(p.task.id in draft))) return { error: 'Answer every placement position first.' };
  const scores: PlacementRec['scores'] = {};
  for (const p of PLACEMENT) {
    const sc = (scores[p.kingdom] ??= { correct: 0, total: 0 });
    sc.total++;
    if (draft[p.task.id]) sc.correct++;
  }
  const passed = (k: string) => !!scores[k] && scores[k].correct / scores[k].total >= 0.75;
  const testedOut = [...new Set(PLACEMENT.filter((p) => draft[p.task.id] && passed(p.kingdom)).flatMap((p) => p.lessons))];
  const lessons = { ...ctx.s.lessons };
  for (const id of testedOut) lessons[id] = { ...(lessons[id] ?? { stages: [], mastered: false }), testedOut: true };
  const unlocked = [...ctx.s.unlocked];
  if (passed('foundation')) for (const id of UNLOCKS.foundation) if (!unlocked.includes(id)) unlocked.push(id);
  const recommended = !passed('foundation') ? 'foundation' : !passed('tactics') ? 'tactics' : 'endgames';
  const placement: PlacementRec = { at: ctx.now, scores, testedOut, recommended };
  const { placementDraft: _drop, ...rest } = ctx.s;
  ctx.s = { ...rest, lessons, unlocked, placement };
  checkAchievements(ctx);
  return placement;
}

export function bumpEvent(ctx: Ctx, e: MissionEvent) { bump(ctx, e); }
