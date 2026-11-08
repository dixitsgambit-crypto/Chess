/**
 * Small, exact searches built on chess.js. They are used to verify lesson content
 * (scripts/validate-content.ts) and, at runtime, to accept correct alternative moves
 * in mating puzzles. They are deliberately simple: material-only evaluation, so they
 * are only trusted for forcing tactics and short mates, never for positional claims.
 */
import { Chess, type Move } from 'chess.js';

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const MATE = 1000;

type Mv = { from: string; to: string; promotion?: string };
const asInput = (m: Move): Mv => ({ from: m.from, to: m.to, promotion: m.promotion });

/** Material of the side to move minus the opponent's, in pawns. */
export function materialBalance(c: Chess): number {
  const stm = c.turn();
  let s = 0;
  for (const row of c.board()) for (const p of row) if (p) s += (p.color === stm ? 1 : -1) * VALUE[p.type];
  return s;
}

/** True if the side to move can force checkmate in at most `n` of its own moves. */
export function canMateIn(c: Chess, n: number): boolean {
  for (const m of c.moves({ verbose: true })) {
    c.move(asInput(m));
    const ok = c.isCheckmate() || (n > 1 && !c.isDraw() && everyReplyMated(c, n - 1));
    c.undo();
    if (ok) return true;
  }
  return false;
}

function everyReplyMated(c: Chess, n: number): boolean {
  const replies = c.moves({ verbose: true });
  if (!replies.length) return false; // stalemate
  for (const r of replies) {
    c.move(asInput(r));
    const ok = canMateIn(c, n);
    c.undo();
    if (!ok) return false;
  }
  return true;
}

/** SAN of every first move that forces mate within `n` moves. */
export function matingMoves(fen: string, n: number): string[] {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const m of c.moves({ verbose: true })) {
    c.move(asInput(m));
    if (c.isCheckmate() || (n > 1 && !c.isDraw() && everyReplyMated(c, n - 1))) out.push(m.san);
    c.undo();
  }
  return out;
}

/** Shortest forced mate for the side to move, up to `max` moves; null if none found. */
export function mateDistance(c: Chess, max: number): number | null {
  for (let n = 1; n <= max; n++) if (canMateIn(c, n)) return n;
  return null;
}

/**
 * The defender's most stubborn reply: one that escapes mate within `n` if possible,
 * otherwise the one that delays it longest. Returns SAN, or null if no legal move.
 */
export function stubbornReply(fen: string, n: number): string | null {
  const c = new Chess(fen);
  let best: { san: string; d: number } | null = null;
  for (const m of c.moves({ verbose: true })) {
    c.move(asInput(m));
    const d = mateDistance(c, n) ?? 99;
    c.undo();
    if (!best || d > best.d) best = { san: m.san, d };
  }
  return best?.san ?? null;
}

// ---------------------------------------------------------------- material search

function ordered(c: Chess): Move[] {
  return c.moves({ verbose: true }).sort((a, b) => (b.captured ? VALUE[b.captured] * 10 - VALUE[b.piece] : -100) - (a.captured ? VALUE[a.captured] * 10 - VALUE[a.piece] : -100));
}

function quiesce(c: Chess, alpha: number, beta: number, qd: number): number {
  if (c.isCheckmate()) return -MATE;
  const stand = materialBalance(c);
  if (stand >= beta) return stand;
  if (stand > alpha) alpha = stand;
  if (qd === 0) return stand;
  for (const m of ordered(c)) {
    if (!m.captured && !m.promotion) continue;
    c.move(asInput(m));
    const v = -quiesce(c, -beta, -alpha, qd - 1);
    c.undo();
    if (v >= beta) return v;
    if (v > alpha) alpha = v;
  }
  return alpha;
}

function negamax(c: Chess, depth: number, alpha: number, beta: number): number {
  if (c.isCheckmate()) return -MATE - depth;
  if (c.isDraw()) return 0;
  if (depth === 0) return quiesce(c, alpha, beta, 6);
  let best = -Infinity;
  for (const m of ordered(c)) {
    c.move(asInput(m));
    const v = -negamax(c, depth - 1, -beta, -alpha);
    c.undo();
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

export interface RootScore { san: string; gain: number }

/**
 * Material gained by each legal first move, searched `depth` plies with capture
 * quiescence. A gain above 500 means the move forces mate inside the horizon.
 */
export function scoreRootMoves(fen: string, depth: number): RootScore[] {
  const c = new Chess(fen);
  const before = materialBalance(c);
  const out: RootScore[] = [];
  for (const m of c.moves({ verbose: true })) {
    c.move(asInput(m));
    const v = -negamax(c, depth - 1, -Infinity, Infinity);
    c.undo();
    out.push({ san: m.san, gain: v - before });
  }
  return out.sort((a, b) => b.gain - a.gain);
}
