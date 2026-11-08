import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { Chess } from 'chess.js';
import { Store, type UserRow } from './db.ts';
import { DUMMY_HASH, RateLimiter, checkCredentials, hashPassword, hashToken, newId, newToken, verifyPassword } from './auth.ts';
import { publicContent, fullTask } from './content.ts';
import { validateLab } from './lab.ts';
import {
  Ctx, assessmentOpen, beginAssessment, bumpEvent, checkAchievements, completePlacement, evaluateBoss, evaluateLesson,
  markStage, recordAttempt, recordReview, stageOf, touchDay, type AttemptResult,
} from './rules.ts';
import { judgeChoice, judgeSquare, newPuzzleSession, type Mode, type PuzzleSession } from '../src/chess/judge.ts';
import { JudgePool } from './judge-pool.ts';
import { log } from './log.ts';
import { gzipSync } from 'node:zlib';
import { allTasks, lessonById, type Stage } from '../src/content/kingdoms.ts';
import { MASTER_GAMES } from '../src/content/masterGames.ts';
import { BOARD_THEMES, TITLES, freshState, levelFor, type GameRec, type State, type TournamentRec } from '../src/academy/progression.ts';
import type { Task } from '../src/content/schema.ts';

export interface AppOptions {
  dbFile: string;
  staticDir?: string;
  /** Injectable clock (tests use it to move time forward). */
  now?: () => number;
  secureCookies?: boolean;
  trustProxy?: boolean;
  /** Extra allowed Origin values for state-changing requests (e.g. the Vite dev server). */
  allowedOrigins?: string[];
  /** Where pre-migration backups are written (file databases only). */
  backupDir?: string;
  /** Public link to this deployment's complete source code (GPL requirement when hosting publicly). */
  sourceUrl?: string;
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

const COOKIE = 'cv_session';
const SESSION_MS = 30 * 24 * 3600 * 1000;
const MAX_BODY = 64 * 1024;

interface AttemptData { taskId: string; stage: Stage; review: boolean; mode: Mode; hints: number; misses: number; puzzle?: PuzzleSession }

const lessonOfExam = new Map<string, string>();
for (const r of allTasks()) if (r.stage === 'exam' && r.lessonId) lessonOfExam.set(r.task.id, r.lessonId);
const kingdomOfBoss = new Map<string, string>();
for (const r of allTasks()) if (r.stage === 'boss') kingdomOfBoss.set(r.task.id, r.kingdomId);

const CUP_ROUNDS = [{ opponent: 'Squire Aldric', skill: 1 }, { opponent: 'Lady Morwen', skill: 5 }, { opponent: 'The Iron Bishop', skill: 10 }];
const TIME_CONTROLS = ['10+0', '5+3', '3+2'];

export function createApp(opts: AppOptions) {
  const now = opts.now ?? (() => Date.now());
  const store = new Store(opts.dbFile, { backupDir: opts.backupDir, now: now() });
  const judges = new JudgePool();
  const authLimit = new RateLimiter(20, 60_000);
  const apiLimit = new RateLimiter(900, 60_000);

  // ------------------------------------------------------------ helpers
  const ipOf = (req: IncomingMessage) => (opts.trustProxy ? String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() : '') || req.socket.remoteAddress || '?';

  function cookieToken(req: IncomingMessage): string | null {
    for (const part of String(req.headers.cookie ?? '').split(';')) {
      const [k, ...v] = part.trim().split('=');
      if (k === COOKIE) return decodeURIComponent(v.join('='));
    }
    return null;
  }
  function setSession(res: ServerResponse, token: string | null) {
    const attrs = ['Path=/', 'HttpOnly', 'SameSite=Lax', ...(opts.secureCookies ? ['Secure'] : [])];
    res.setHeader('Set-Cookie', token ? `${COOKIE}=${token}; Max-Age=${SESSION_MS / 1000}; ${attrs.join('; ')}` : `${COOKIE}=; Max-Age=0; ${attrs.join('; ')}`);
  }
  function startSession(res: ServerResponse, userId: number) {
    const token = newToken();
    store.addSession(hashToken(token), userId, now() + SESSION_MS);
    setSession(res, token);
  }
  function currentUser(req: IncomingMessage): UserRow {
    const t = cookieToken(req);
    const u = t ? store.sessionUser(hashToken(t), now()) : undefined;
    if (!u) throw new HttpError(401, 'Not signed in.');
    store.touchUser(u.id, now());
    return u;
  }
  async function body(req: IncomingMessage, limit = MAX_BODY): Promise<Record<string, unknown>> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const c of req) {
      size += (c as Buffer).length;
      if (size > limit) throw new HttpError(413, 'Request too large.');
      chunks.push(c as Buffer);
    }
    if (!size) return {};
    try {
      const v = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error();
      return v;
    } catch { throw new HttpError(400, 'Invalid JSON.'); }
  }
  const userInfo = (u: UserRow) => ({ id: u.id, username: u.username, guest: !!u.guest });

  /** Load state, apply a rule, save — all inside one transaction. */
  function mutate<T extends object>(u: UserRow, fn: (ctx: Ctx) => T) {
    return store.tx(() => {
      const ctx = new Ctx(store.loadState(u.id), now());
      const out = fn(ctx);
      store.saveState(u.id, ctx.s, ctx.now);
      return { ...out, state: ctx.s, toasts: ctx.toasts };
    });
  }

  function reveal(task: Task) {
    return {
      explanation: task.explanation,
      ...(task.kind === 'puzzle' ? { solution: task.solution } : {}),
      ...(task.kind === 'choice' ? { answer: task.answer } : {}),
      ...(task.kind === 'square' ? { squares: task.answer } : {}),
    };
  }

  function finalize(ctx: Ctx, att: AttemptData, task: Task, correct: boolean): AttemptResult {
    let result: AttemptResult;
    if (att.review) result = recordReview(ctx, task, correct && att.misses === 0 && att.hints === 0);
    else result = recordAttempt(ctx, task, att.stage, correct, att.hints, att.misses);
    if (!att.review && att.stage === 'exam') { const l = lessonOfExam.get(task.id); if (l) evaluateLesson(ctx, l); }
    if (!att.review && att.stage === 'boss') { const k = kingdomOfBoss.get(task.id); if (k) evaluateBoss(ctx, k); }
    return result;
  }

  function loadAttempt(u: UserRow, id: string) {
    const a = store.getAttempt<AttemptData>(id, u.id);
    if (!a) throw new HttpError(404, 'Attempt not found.');
    if (a.done) throw new HttpError(409, 'This attempt is already finished.');
    const task = fullTask(a.task_id)!;
    return { att: a.data, task };
  }

  // ------------------------------------------------------------ routes
  type Handler = (req: IncomingMessage, res: ServerResponse, params: string[]) => Promise<unknown> | unknown;
  const routes: [string, RegExp, Handler][] = [];
  const route = (method: string, path: string, h: Handler) => routes.push([method, new RegExp('^' + path.replace(/:\w+/g, '([^/]+)') + '$'), h]);

  route('GET', '/api/health', () => ({ ok: true }));
  route('GET', '/api/about', () => ({ licence: 'GPL-3.0-or-later', sourceUrl: opts.sourceUrl ?? null }));
  route('GET', '/api/content', (_req, res) => { res.setHeader('Cache-Control', 'no-cache'); return { raw: publicContent() }; });

  route('POST', '/api/auth/guest', (req, res) => {
    if (!authLimit.allow('guest:' + ipOf(req))) throw new HttpError(429, 'Too many requests. Try again in a minute.');
    const u = store.createUser(now());
    startSession(res, u.id);
    return { user: userInfo(u), state: store.loadState(u.id) };
  });

  route('POST', '/api/auth/register', async (req, res) => {
    if (!authLimit.allow('auth:' + ipOf(req))) throw new HttpError(429, 'Too many attempts. Try again in a minute.');
    const b = await body(req);
    const bad = checkCredentials(b.username, b.password);
    if (bad) throw new HttpError(400, bad);
    if (store.userByName(String(b.username))) throw new HttpError(409, 'That username is taken.');
    const hash = await hashPassword(String(b.password));
    // a signed-in guest keeps their progress by upgrading in place
    let u: UserRow | undefined;
    try { u = currentUser(req); } catch { u = undefined; }
    if (u && u.guest) { store.upgradeUser(u.id, String(b.username), hash); store.dropUserSessions(u.id); }
    else u = store.createUser(now(), String(b.username), hash);
    startSession(res, u.id);
    mutate(store.userById(u.id)!, (ctx) => { if (ctx.s.profile.name === 'Wanderer') ctx.s = { ...ctx.s, profile: { ...ctx.s.profile, name: String(b.username) } }; return {}; });
    return { user: userInfo(store.userById(u.id)!), state: store.loadState(u.id) };
  });

  route('POST', '/api/auth/login', async (req, res) => {
    const b = await body(req);
    if (!authLimit.allow('auth:' + ipOf(req)) || !authLimit.allow('login:' + String(b.username).toLowerCase())) throw new HttpError(429, 'Too many attempts. Try again in a minute.');
    const u = typeof b.username === 'string' ? store.userByName(b.username) : undefined;
    const ok = await verifyPassword(typeof b.password === 'string' ? b.password : '', u?.pass_hash ?? DUMMY_HASH);
    if (!u || !ok) throw new HttpError(401, 'Wrong username or password.');
    const old = cookieToken(req);
    if (old) store.dropSession(hashToken(old));
    startSession(res, u.id);
    return { user: userInfo(u), state: store.loadState(u.id) };
  });

  route('POST', '/api/auth/logout', (req, res) => {
    const t = cookieToken(req);
    if (t) store.dropSession(hashToken(t));
    setSession(res, null);
    return { ok: true };
  });

  // --- account management
  route('GET', '/api/account', (req) => {
    const u = currentUser(req);
    return { user: userInfo(u), createdAt: u.created_at, activeSessions: store.countSessions(u.id, now()) };
  });

  route('POST', '/api/account/password', async (req) => {
    const u = currentUser(req);
    if (u.guest) throw new HttpError(400, 'Create an account first.');
    if (!authLimit.allow('pw:' + u.id)) throw new HttpError(429, 'Too many attempts. Try again in a minute.');
    const b = await body(req);
    if (!(await verifyPassword(typeof b.current === 'string' ? b.current : '', u.pass_hash))) throw new HttpError(401, 'Your current password is not correct.');
    const bad = checkCredentials(u.username, b.next);
    if (bad) throw new HttpError(400, bad);
    if (b.next === b.current) throw new HttpError(400, 'The new password must be different.');
    store.setPassword(u.id, await hashPassword(String(b.next)));
    const signedOut = store.dropOtherSessions(u.id, hashToken(cookieToken(req)!));
    return { ok: true, otherSessionsSignedOut: signedOut };
  });

  route('POST', '/api/account/sessions/revoke-others', (req) => {
    const u = currentUser(req);
    return { signedOut: store.dropOtherSessions(u.id, hashToken(cookieToken(req)!)) };
  });

  route('POST', '/api/account/delete', async (req, res) => {
    const u = currentUser(req);
    if (!authLimit.allow('del:' + u.id)) throw new HttpError(429, 'Too many attempts. Try again in a minute.');
    const b = await body(req);
    if (b.confirm !== 'DELETE') throw new HttpError(400, 'Type DELETE to confirm.');
    if (!u.guest && !(await verifyPassword(typeof b.password === 'string' ? b.password : '', u.pass_hash))) throw new HttpError(401, 'Your password is not correct.');
    store.deleteUser(u.id); // progress, sessions, attempts and lab data go with it (ON DELETE CASCADE)
    setSession(res, null);
    return { deleted: true };
  });

  // --- Opening Laboratory data (per player)
  route('GET', '/api/lab', (req) => {
    const u = currentUser(req);
    const lab = store.loadLab(u.id);
    return { data: lab?.data ?? null, updatedAt: lab?.updatedAt ?? 0 };
  });

  route('PUT', '/api/lab', async (req) => {
    const u = currentUser(req);
    const b = await body(req, 2.5 * 1024 * 1024);
    const data = validateLab(b.data);
    if (typeof data === 'string') throw new HttpError(400, data);
    return store.tx(() => {
      // never silently overwrite a newer copy saved from another device
      const current = store.loadLab(u.id);
      const base = Number(b.baseUpdatedAt) || 0;
      if (current && current.updatedAt !== base) throw new HttpError(409, 'Your laboratory was changed on another device. Reload to see the latest version.');
      const at = Math.max(now(), (current?.updatedAt ?? 0) + 1);
      store.saveLab(u.id, data, at);
      return { updatedAt: at };
    });
  });

  route('GET', '/api/me', (req) => {
    const u = currentUser(req);
    return { user: userInfo(u), state: store.loadState(u.id), serverTime: now() };
  });

  // --- the referee
  route('POST', '/api/attempts', async (req) => {
    const u = currentUser(req);
    const b = await body(req);
    const task = typeof b.taskId === 'string' ? fullTask(b.taskId) : undefined;
    if (!task) throw new HttpError(404, 'Unknown position.');
    if (task.kind === 'playout') throw new HttpError(400, 'Play-outs are submitted with /api/playouts.');
    const stage = stageOf(task.id)!;
    const review = b.review === true;
    return mutate(u, (ctx) => {
      touchDay(ctx);
      if (review && !ctx.s.items[task.id]?.srs) throw new HttpError(400, 'This position is not in your revision queue.');
      if (!review && stage === 'placement' && ctx.s.placement) throw new HttpError(409, 'Placement has already been completed.');
      const assessing = review || stage === 'exam' || stage === 'boss' || stage === 'placement';
      if (!review && assessing) {
        const open = assessmentOpen(ctx.s, task.id, ctx.now);
        if (!open.open) throw new HttpError(423, `This position is resting until ${new Date(open.until!).toISOString()}.`);
        if (ctx.s.items[task.id]?.credited) throw new HttpError(409, 'This position is already credited.');
        beginAssessment(ctx, task);
      }
      store.closeOpenAttempts(u.id, task.id);
      const data: AttemptData = { taskId: task.id, stage, review, mode: assessing ? 'assess' : 'learn', hints: 0, misses: 0, puzzle: task.kind === 'puzzle' ? newPuzzleSession(task) : undefined };
      const id = newId();
      store.putAttempt(id, u.id, task.id, data, ctx.now);
      return { attemptId: id, mode: data.mode };
    });
  });

  route('POST', '/api/attempts/:id/hint', (req, _res, [id]) => {
    const u = currentUser(req);
    return store.tx(() => {
      const { att, task } = loadAttempt(u, id);
      if (att.mode === 'assess') throw new HttpError(403, 'No hints in assessments.');
      if (att.hints >= task.hints.length) throw new HttpError(400, 'No more hints.');
      const next = { ...att, hints: att.hints + 1 };
      store.updateAttempt(id, next, false);
      return { hint: task.hints[att.hints], hintsUsed: next.hints, free: att.stage === 'guided' };
    });
  });

  route('POST', '/api/attempts/:id/move', async (req, _res, [id]) => {
    const u = currentUser(req);
    const b = await body(req);
    // judge in a worker thread (searches can take a moment), then apply atomically —
    // but only if the attempt is still exactly as it was when the move was judged
    const snap = loadAttempt(u, id);
    if (snap.task.kind !== 'puzzle' || !snap.att.puzzle) throw new HttpError(400, 'Not a board puzzle.');
    const j = await judges.move(snap.task.id, snap.att.puzzle, String(b.uci ?? '').slice(0, 5), snap.att.mode);
    return mutate(u, (ctx) => {
      const { att, task } = loadAttempt(u, id);
      if (JSON.stringify(att.puzzle) !== JSON.stringify(snap.att.puzzle)) throw new HttpError(409, 'That position changed while your move was being judged. Please try again.');
      const next: AttemptData = { ...att, puzzle: j.session, misses: j.session.misses };
      const done = j.verdict === 'solved' || j.verdict === 'failed';
      store.updateAttempt(id, next, done);
      const free = { ...next, hints: att.stage === 'guided' ? 0 : next.hints };
      const result = done ? finalize(ctx, free, task, j.verdict === 'solved') : undefined;
      return { verdict: j.verdict, played: j.played, reply: j.reply, message: j.message, fen: j.session.fen, ...(done ? reveal(task) : {}), result };
    });
  });

  route('POST', '/api/attempts/:id/answer', async (req, _res, [id]) => {
    const u = currentUser(req);
    const b = await body(req);
    return mutate(u, (ctx) => {
      const { att, task } = loadAttempt(u, id);
      let correct: boolean;
      if (task.kind === 'choice') correct = judgeChoice(task, Number(b.option));
      else if (task.kind === 'square') correct = judgeSquare(task, String(b.square ?? ''));
      else throw new HttpError(400, 'Not a question.');
      if (!correct && att.mode === 'learn') {
        store.updateAttempt(id, { ...att, misses: att.misses + 1 }, false);
        return { verdict: 'wrong' as const };
      }
      const next = { ...att, misses: correct ? att.misses : att.misses + 1 };
      store.updateAttempt(id, next, true);
      const result = finalize(ctx, { ...next, hints: att.stage === 'guided' ? 0 : next.hints }, task, correct);
      return { verdict: correct ? 'solved' as const : 'failed' as const, ...reveal(task), result };
    });
  });

  route('POST', '/api/attempts/:id/giveup', (req, _res, [id]) => {
    const u = currentUser(req);
    return mutate(u, (ctx) => {
      const { att, task } = loadAttempt(u, id);
      store.updateAttempt(id, att, true);
      const result = finalize(ctx, att, task, false);
      return { verdict: 'failed' as const, ...reveal(task), result };
    });
  });

  route('POST', '/api/playouts', async (req) => {
    const u = currentUser(req);
    const b = await body(req);
    const task = typeof b.taskId === 'string' ? fullTask(b.taskId) : undefined;
    if (!task || task.kind !== 'playout') throw new HttpError(404, 'Unknown play-out.');
    const v = await judges.playout(task.id, b.moves);
    if (!v.ok) throw new HttpError(422, v.reason);
    const restarts = Math.max(0, Math.min(1000, Math.floor(Number(b.restarts) || 0)));
    const hints = Math.max(0, Math.min(task.hints.length, Math.floor(Number(b.hints) || 0)));
    return mutate(u, (ctx) => ({ result: recordAttempt(ctx, task, stageOf(task.id)!, true, hints, restarts), explanation: task.explanation }));
  });

  route('POST', '/api/lessons/:id/stage', async (req, _res, [id]) => {
    const u = currentUser(req);
    const b = await body(req);
    if (!lessonById(id)) throw new HttpError(404, 'Unknown lesson.');
    const stage = String(b.stage ?? '');
    if (!['intro', 'concept', 'demo', 'guided', 'independent', 'application', 'exam', 'results'].includes(stage)) throw new HttpError(400, 'Unknown stage.');
    return mutate(u, (ctx) => { markStage(ctx, id, stage); return {}; });
  });

  route('POST', '/api/placement/complete', (req) => {
    const u = currentUser(req);
    return mutate(u, (ctx) => {
      const p = completePlacement(ctx);
      if ('error' in p) throw new HttpError(409, p.error);
      return { placement: p };
    });
  });

  route('POST', '/api/games', async (req) => {
    const u = currentUser(req);
    const b = await body(req);
    const game = validateGame(b);
    return mutate(u, (ctx) => {
      ctx.s = { ...ctx.s, games: [game, ...ctx.s.games].slice(0, 200) };
      bumpEvent(ctx, 'engine-game');
      const t = ctx.s.tournament;
      const m = /^Kingdom Cup, round (\d)$/.exec(game.event ?? '');
      if (t && !t.finishedAt && m) {
        const k = Number(m[1]) - 1;
        const r = t.rounds[k];
        const firstOpen = t.rounds.findIndex((x) => !x.result);
        if (r && k === firstOpen && r.opponent === game.opponent && r.skill === game.skill && r.color === game.color && game.timeControl === t.timeControl) {
          const rounds = t.rounds.map((x, i) => (i === k ? { ...x, result: game.result } : x));
          const finished = rounds.every((x) => x.result);
          const score = rounds.reduce((n, x) => n + (x.result === 'win' ? 1 : x.result === 'draw' ? 0.5 : 0), 0);
          ctx.s = { ...ctx.s, tournament: { ...t, rounds, finishedAt: finished ? ctx.now : undefined }, tournamentsWon: ctx.s.tournamentsWon + (finished && score >= 2 ? 1 : 0) };
        }
      }
      checkAchievements(ctx);
      return {};
    });
  });

  route('POST', '/api/tournament/start', async (req) => {
    const u = currentUser(req);
    const b = await body(req);
    if (!TIME_CONTROLS.includes(String(b.timeControl))) throw new HttpError(400, 'Unknown time control.');
    return mutate(u, (ctx) => {
      if (ctx.s.tournament && !ctx.s.tournament.finishedAt) throw new HttpError(409, 'A tournament is already in progress.');
      const t: TournamentRec = { id: newId(), startedAt: ctx.now, timeControl: String(b.timeControl), rounds: CUP_ROUNDS.map((r, i) => ({ ...r, color: i % 2 ? 'b' : 'w' })) };
      ctx.s = { ...ctx.s, tournament: t };
      return {};
    });
  });
  route('POST', '/api/tournament/withdraw', (req) => {
    const u = currentUser(req);
    return mutate(u, (ctx) => { ctx.s = { ...ctx.s, tournament: undefined }; return {}; });
  });

  route('POST', '/api/guess', async (req) => {
    const u = currentUser(req);
    const b = await body(req);
    const g = MASTER_GAMES.find((x) => x.id === b.gameId);
    if (!g) throw new HttpError(404, 'Unknown game.');
    const side = b.side === 'b' ? 'b' : 'w';
    const c = new Chess();
    c.loadPgn(g.pgn);
    const sideMoves = c.history({ verbose: true }).filter((m) => m.color === side).map((m) => m.san);
    const guesses = Array.isArray(b.guesses) ? b.guesses.map(String) : [];
    if (guesses.length !== sideMoves.length) throw new HttpError(400, 'Submit one guess for every move of that side.');
    const right = guesses.filter((x, i) => x === sideMoves[i]).length;
    const pct = Math.round((right / sideMoves.length) * 100);
    return mutate(u, (ctx) => {
      ctx.s = { ...ctx.s, guessBest: { ...ctx.s.guessBest, [g.id]: Math.max(ctx.s.guessBest[g.id] ?? 0, pct) } };
      if (pct >= 50) bumpEvent(ctx, 'guess');
      checkAchievements(ctx);
      return { right, total: sideMoves.length, pct };
    });
  });

  route('POST', '/api/rush', async (req) => {
    const u = currentUser(req);
    const b = await body(req);
    const score = Math.max(0, Math.min(1000, Math.floor(Number(b.score) || 0)));
    return mutate(u, (ctx) => { ctx.s = { ...ctx.s, counters: { ...ctx.s.counters, rushBest: Math.max(ctx.s.counters.rushBest ?? 0, score) } }; return {}; });
  });

  route('PATCH', '/api/settings', async (req) => {
    const u = currentUser(req);
    const b = await body(req);
    return mutate(u, (ctx) => {
      const s = { ...ctx.s.settings };
      if ('reducedMotion' in b) { if (!['system', 'on', 'off'].includes(String(b.reducedMotion))) throw new HttpError(400, 'Bad reducedMotion.'); s.reducedMotion = b.reducedMotion as typeof s.reducedMotion; }
      for (const k of ['coordinates', 'showDests', 'autoQueen'] as const) if (k in b) { if (typeof b[k] !== 'boolean') throw new HttpError(400, `Bad ${k}.`); s[k] = b[k] as boolean; }
      if ('boardTheme' in b) {
        const t = BOARD_THEMES.find((x) => x.id === b.boardTheme);
        if (!t) throw new HttpError(400, 'Unknown board theme.');
        if (levelFor(ctx.s.xp) < t.level) throw new HttpError(403, `${t.name} unlocks at level ${t.level}.`);
        s.boardTheme = t.id;
      }
      ctx.s = { ...ctx.s, settings: s };
      return {};
    });
  });

  route('PATCH', '/api/profile', async (req) => {
    const u = currentUser(req);
    const b = await body(req);
    return mutate(u, (ctx) => {
      const p = { ...ctx.s.profile };
      if ('name' in b) {
        // eslint-disable-next-line no-control-regex
        const name = String(b.name).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 32);
        if (!name) throw new HttpError(400, 'Name cannot be empty.');
        p.name = name;
      }
      if ('emblem' in b) {
        const t = TITLES.find((x) => x.emblem === b.emblem);
        if (!t) throw new HttpError(400, 'Unknown emblem.');
        if (levelFor(ctx.s.xp) < t.level) throw new HttpError(403, `That emblem unlocks at level ${t.level}.`);
        p.emblem = t.emblem;
      }
      ctx.s = { ...ctx.s, profile: p };
      return {};
    });
  });

  route('POST', '/api/progress/reset', async (req) => {
    const u = currentUser(req);
    const b = await body(req);
    if (b.confirm !== 'RESET') throw new HttpError(400, 'Confirmation missing.');
    return mutate(u, (ctx) => { ctx.s = { ...freshState(ctx.now), settings: ctx.s.settings, profile: ctx.s.profile }; return {}; });
  });

  route('GET', '/api/progress/export', (req, res) => {
    const u = currentUser(req);
    res.setHeader('Content-Disposition', 'attachment; filename="chessverse-progress.json"');
    return store.loadState(u.id);
  });

  // ------------------------------------------------------------ static files
  const root = opts.staticDir ? resolve(opts.staticDir) : null;
  const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.pgn': 'text/plain; charset=utf-8', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
  async function serveStatic(req: IncomingMessage, res: ServerResponse) {
    if (!root) throw new HttpError(404, 'Not found.');
    const url = new URL(req.url ?? '/', 'http://x');
    let file = normalize(join(root, decodeURIComponent(url.pathname)));
    if (!file.startsWith(root + sep) && file !== root) throw new HttpError(404, 'Not found.');
    try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); } catch {
      // a missing file (anything with an extension) is a real 404; other paths are app routes
      if (extname(url.pathname)) throw new HttpError(404, 'Not found.');
      file = join(root, 'index.html');
    }
    const type = TYPES[extname(file)] ?? 'application/octet-stream';
    const headers: Record<string, string> = { 'Content-Type': type, 'Cache-Control': file.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache', Vary: 'Accept-Encoding' };
    const st = await stat(file);
    if (acceptsGzip(req) && COMPRESSIBLE.test(type)) {
      // compressed copies are cached in memory, keyed by path and modification time
      const key = `${file}:${st.mtimeMs}`;
      let gz = gzCache.get(key);
      if (!gz) { gz = gzipSync(await readFile(file)); gzCache.set(key, gz); }
      res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip', 'Content-Length': String(gz.length) });
      return res.end(gz);
    }
    res.writeHead(200, { ...headers, 'Content-Length': String(st.size) });
    res.end(await readFile(file));
  }
  const gzCache = new Map<string, Buffer>();
  const COMPRESSIBLE = /^(text\/|application\/(json|javascript|wasm)|image\/svg)/;
  const acceptsGzip = (req: IncomingMessage) => /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''));

  // ------------------------------------------------------------ dispatch
  const CSP = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', CSP);
    if (opts.secureCookies) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    const started = Date.now();
    const send = (status: number, payload: unknown) => {
      const text = typeof payload === 'object' && payload && 'raw' in payload ? (payload as { raw: string }).raw : JSON.stringify(payload);
      const headers: Record<string, string> = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', Vary: 'Accept-Encoding' };
      if (text.length > 1024 && acceptsGzip(req)) {
        res.writeHead(status, { ...headers, 'Content-Encoding': 'gzip' });
        res.end(gzipSync(text));
      } else {
        res.writeHead(status, headers);
        res.end(text);
      }
      // request log: method, path, status, time — never bodies, cookies or answers
      const fields = { method: req.method, path: (req.url ?? '').split('?')[0], status, ms: Date.now() - started };
      if (status >= 500) log.error('request', fields); else if (status >= 400) log.info('request', fields); else log.debug('request', fields);
    };
    try {
      const url = new URL(req.url ?? '/', 'http://x');
      const method = req.method ?? 'GET';
      if (!url.pathname.startsWith('/api/')) {
        if (method !== 'GET' && method !== 'HEAD') throw new HttpError(405, 'Method not allowed.');
        return await serveStatic(req, res);
      }
      if (method !== 'GET') {
        // CSRF: JSON only (forces a CORS preflight cross-site) and same-origin requests only
        if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) throw new HttpError(415, 'Send JSON.');
        const origin = req.headers.origin;
        if (origin) {
          const host = req.headers['x-forwarded-host'] && opts.trustProxy ? req.headers['x-forwarded-host'] : req.headers.host;
          let ok = (opts.allowedOrigins ?? []).includes(origin);
          try { ok ||= new URL(origin).host === host; } catch { ok = false; }
          if (!ok) throw new HttpError(403, 'Cross-origin request refused.');
        }
      }
      const hit = routes.find(([m, re]) => m === method && re.test(url.pathname));
      if (!hit) throw new HttpError(404, 'Not found.');
      if (!apiLimit.allow('api:' + (cookieToken(req) ?? ipOf(req)))) throw new HttpError(429, 'Slow down.');
      const params = hit[1].exec(url.pathname)!.slice(1).map(decodeURIComponent);
      const out = await hit[2](req, res, params);
      send(200, out ?? {});
    } catch (e) {
      if (e instanceof HttpError) return send(e.status, { error: e.message });
      log.error('unhandled error', { path: (req.url ?? '').split('?')[0], error: (e as Error).message, stack: (e as Error).stack?.split('\n').slice(0, 6).join(' | ') });
      send(500, { error: 'Internal error.' });
    }
  });

  server.on('close', () => { void judges.close(); });
  return { server, store, judges };
}

const VERIFIABLE: Record<string, (c: Chess) => boolean> = {
  checkmate: (c) => c.isCheckmate(),
  stalemate: (c) => c.isStalemate(),
  'insufficient material': (c) => c.isInsufficientMaterial(),
  'threefold repetition': (c) => c.isThreefoldRepetition(),
  'fifty-move rule': (c) => c.isDrawByFiftyMoves(),
};

/** Check that a reported game is a legal game whose result matches the final position where it can. */
function validateGame(b: Record<string, unknown>): GameRec {
  const color = b.color === 'b' ? 'b' : b.color === 'w' ? 'w' : null;
  const result = ['win', 'loss', 'draw'].includes(String(b.result)) ? (b.result as GameRec['result']) : null;
  const skill = Number(b.skill);
  const reason = String(b.reason ?? '');
  if (!color || !result || !Number.isInteger(skill) || skill < 0 || skill > 20) throw new HttpError(400, 'Bad game record.');
  if (typeof b.pgn !== 'string' || b.pgn.length > 20000) throw new HttpError(400, 'Bad PGN.');
  const c = new Chess();
  try { c.loadPgn(b.pgn); } catch { throw new HttpError(422, 'The PGN is not a legal game.'); }
  if (c.getHeaders().FEN) throw new HttpError(422, 'Games must start from the initial position.');
  if (reason in VERIFIABLE) {
    if (!VERIFIABLE[reason](c)) throw new HttpError(422, `The final position is not ${reason}.`);
    if (reason === 'checkmate' && result !== (c.turn() === color ? 'loss' : 'win')) throw new HttpError(422, 'Result does not match the mate.');
    if (reason !== 'checkmate' && result !== 'draw') throw new HttpError(422, 'That ending is a draw.');
  } else if (reason === 'resignation') { if (result !== 'loss') throw new HttpError(422, 'Resigning is a loss.'); }
  else if (reason === 'draw agreed') { if (result !== 'draw' || c.history().length < 30) throw new HttpError(422, 'Draws can be agreed from move 15.'); }
  else if (reason !== 'time forfeit') throw new HttpError(400, 'Unknown result reason.');
  else if (c.isGameOver()) throw new HttpError(422, 'The game had already ended on the board.');
  return {
    at: Date.now(), opponent: String(b.opponent ?? 'The Grandmaster').slice(0, 40), skill, color, result, reason,
    timeControl: String(b.timeControl ?? '').slice(0, 10), pgn: b.pgn, event: typeof b.event === 'string' ? b.event.slice(0, 60) : undefined,
  };
}

export type { State };
