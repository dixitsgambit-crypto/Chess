/**
 * The referee. Runs on the server only: it needs full task content (solutions),
 * which never ships to the browser. Every function is pure — it takes a session
 * snapshot and returns the next one.
 */
import { Chess } from 'chess.js';
import type { ChoiceTask, PlayoutTask, PuzzleTask, SquareTask } from '../content/schema.ts';
import { canMateIn, stubbornReply } from './search.ts';
import { kpkAfter, probeKpk } from './kpk.ts';

export type Mode = 'learn' | 'assess';
export type Verdict = 'continue' | 'solved' | 'wrong' | 'failed';

export interface PuzzleSession {
  fen: string;
  ply: number;
  offScript: boolean;
  solverMoves: number;
  misses: number;
  history: string[];
}

export interface MoveJudgement {
  verdict: Verdict;
  session: PuzzleSession;
  /** The move as played (SAN) and the opponent's scripted or computed reply. */
  played?: string;
  reply?: { san: string; from: string; to: string };
  message: string;
}

const strip = (s: string) => s.replace(/[+#]/g, '');
const UCI = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

export const newPuzzleSession = (task: PuzzleTask): PuzzleSession => ({ fen: task.fen, ply: 0, offScript: false, solverMoves: 0, misses: 0, history: [] });

/** Judge one solver move. `uci` is untrusted input. */
export function judgeMove(task: PuzzleTask, s: PuzzleSession, uci: string, mode: Mode): MoveJudgement {
  if (!UCI.test(uci)) return { verdict: 'continue', session: s, message: 'Malformed move.' };
  const c = new Chess(s.fen);
  let mv;
  try { mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { return { verdict: 'continue', session: s, message: 'Illegal move.' }; }
  const next: PuzzleSession = { ...s, fen: c.fen(), solverMoves: s.solverMoves + 1, history: [...s.history, mv.san] };
  const ok = (message: string): MoveJudgement => ({ verdict: 'solved', session: next, played: mv.san, message });
  const wrong = (reason: string): MoveJudgement => mode === 'assess'
    ? { verdict: 'failed', session: { ...next, misses: s.misses + 1 }, played: mv.san, message: reason }
    : { verdict: 'wrong', session: { ...newPuzzleSession(task), misses: s.misses + 1 }, played: mv.san, message: `${reason} Try again.` };
  const reply = (san: string, ply: number, offScript = s.offScript): MoveJudgement => {
    const r = c.move(san);
    return { verdict: 'continue', session: { ...next, fen: c.fen(), ply, offScript, history: [...next.history, r.san] }, played: mv.san, reply: { san: r.san, from: r.from, to: r.to }, message: 'Good. Keep going.' };
  };
  const g = task.goal;

  if (g.type === 'mate') {
    if (c.isCheckmate()) return ok('Checkmate!');
    if (c.isStalemate()) return wrong('That is stalemate — a draw!');
    const left = g.in - next.solverMoves;
    if (left <= 0) return wrong('That is not mate.');
    if (!s.offScript && strip(mv.san) === strip(task.solution[s.ply] ?? '')) {
      const scripted = task.solution[s.ply + 1];
      if (scripted) return reply(scripted, s.ply + 2);
    }
    const defence = stubbornReply(c.fen(), left);
    if (!defence) return wrong('That is not mate.');
    const test = new Chess(c.fen());
    test.move(defence);
    if (!canMateIn(test, left)) return wrong('That lets the king escape the net.');
    return reply(defence, s.ply + 2, true);
  }

  if (g.type === 'kpk') {
    const out = kpkAfter(s.fen, mv.san);
    if (out === g.outcome) return ok(g.outcome === 'win' ? 'That keeps the win.' : 'That holds the draw.');
    return wrong(g.outcome === 'win' ? 'That move throws the win away — with best defence it is only a draw.' : 'That move loses — White can now force promotion.');
  }

  const expected = task.solution[s.ply];
  if (s.ply === 0 && (task.accept ?? []).some((a) => strip(a) === strip(mv.san))) return ok('Correct — that also works.');
  if (strip(mv.san) !== strip(expected ?? '')) {
    if (g.type === 'engine') {
      return wrong(g.mode === 'win' ? 'That lets the win slip: Stockfish no longer rates the position as winning.'
        : g.mode === 'draw' ? 'That loses: after it, Stockfish finds a winning plan for the opponent.'
          : 'Stockfish rates that move clearly worse than the best one.');
    }
    return wrong(g.type === 'rule' ? `That is ${mv.san}, not the move asked for.` : c.isCheckmate() ? 'Checkmate is not the task here — but well spotted!' : 'That does not win material by force.');
  }
  if (s.ply + 1 >= task.solution.length) return ok('Correct!');
  const r = reply(task.solution[s.ply + 1], s.ply + 2);
  if (s.ply + 2 >= task.solution.length) return { ...r, verdict: 'solved', message: 'Correct!' };
  return r;
}

export function judgeChoice(task: ChoiceTask, option: number): boolean {
  return Number.isInteger(option) && option === task.answer;
}

export function judgeSquare(task: SquareTask, square: string): boolean {
  return typeof square === 'string' && task.answer.includes(square);
}

/** True if, after `san`, the opponent can capture a pawn of the side that just moved. */
export function hangsPawn(fen: string, san: string): boolean {
  const t = new Chess(fen);
  t.move(san);
  return t.moves({ verbose: true }).some((m) => m.captured === 'p');
}

/**
 * Verify a finished play-out from its full move list (both sides, SAN).
 * Legality, the goal and the move limit are always checked. For the exact
 * K+P solver, the opponent's moves are also checked against perfect play, so a
 * forged game with a blundering opponent is rejected. Stockfish replies cannot
 * be re-run on the server, so for those only legality and the goal are proven.
 */
export function verifyPlayout(task: PlayoutTask, moves: unknown): { ok: boolean; reason: string } {
  if (!Array.isArray(moves) || moves.length > 400 || moves.some((m) => typeof m !== 'string')) return { ok: false, reason: 'Malformed move list.' };
  const c = new Chess(task.fen);
  const user = c.turn();
  let userMoves = 0;
  let lastUserSan = '', beforeLastUser = task.fen;
  for (const san of moves as string[]) {
    const before = c.fen();
    const mover = c.turn();
    if (task.opponent === 'kpk' && mover !== user) {
      const options = c.moves();
      const outcomes = options.map((o) => ({ o, out: kpkAfter(before, o) }));
      if (task.goal === 'promote') {
        // the defender must keep the draw whenever any move does
        const holds = outcomes.filter((x) => x.out === 'draw').map((x) => x.o);
        if (holds.length && !holds.includes(san)) return { ok: false, reason: 'Opponent moves do not match the solver.' };
      } else {
        const wins = outcomes.filter((x) => x.out === 'win').map((x) => x.o);
        const safe = options.filter((o) => !hangsPawn(before, o));
        if (wins.length && !wins.includes(san)) return { ok: false, reason: 'Opponent moves do not match the solver.' };
        if (!wins.length && safe.length && !safe.includes(san)) return { ok: false, reason: 'Opponent moves do not match the solver.' };
      }
    }
    try { c.move(san); } catch { return { ok: false, reason: `Illegal move ${san}.` }; }
    if (mover === user) { userMoves++; lastUserSan = san; beforeLastUser = before; }
    if (userMoves > task.maxMoves) return { ok: false, reason: 'Move limit exceeded.' };
    if (task.goal === 'hold' && mover === user) {
      const p = probeKpk(c.fen());
      if (p && p.result === 'win') return { ok: false, reason: 'A defending move lost the draw.' };
    }
  }
  if (task.goal === 'mate') return c.isCheckmate() && c.turn() !== user ? { ok: true, reason: 'Checkmate.' } : { ok: false, reason: 'No checkmate.' };
  if (task.goal === 'promote') {
    const last = new Chess(beforeLastUser).move(lastUserSan);
    return last?.promotion && kpkAfter(beforeLastUser, lastUserSan) === 'win' ? { ok: true, reason: 'Promoted safely.' } : { ok: false, reason: 'No safe promotion.' };
  }
  const p = probeKpk(c.fen());
  const held = !p || c.isDraw() || userMoves >= task.maxMoves;
  return held ? { ok: true, reason: 'Held the draw.' } : { ok: false, reason: 'The defence did not last long enough.' };
}
