/**
 * Exact king + pawn vs king solver (a "bitbase"), computed by retrograde-style
 * iteration the first time it is needed (~0.5 s). It answers one question with
 * certainty: with best play, does the side with the pawn win, or is it a draw?
 * Used to verify Endgame Citadel content and to play perfect defence/attack.
 */
import { Chess } from 'chess.js';

const UNKNOWN = 0, DRAW = 1, WIN = 2, INVALID = 3;
const W = 0, B = 1;
let table: Uint8Array | null = null;

const file = (s: number) => s & 7;
const rank = (s: number) => s >> 3;
const idx = (stm: number, wk: number, bk: number, p: number) => ((stm * 64 + wk) * 64 + bk) * 64 + p;
const adjacent = (a: number, b: number) => a !== b && Math.abs(file(a) - file(b)) <= 1 && Math.abs(rank(a) - rank(b)) <= 1;

const KING_STEPS: number[][] = Array.from({ length: 64 }, (_, s) => {
  const out: number[] = [];
  for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
    if (!df && !dr) continue;
    const f = file(s) + df, r = rank(s) + dr;
    if (f >= 0 && f < 8 && r >= 0 && r < 8) out.push(r * 8 + f);
  }
  return out;
});

const pawnAttacks = (p: number, s: number) => rank(s) === rank(p) + 1 && Math.abs(file(s) - file(p)) === 1;

function blackMoves(wk: number, bk: number, p: number): number[] {
  return KING_STEPS[bk].filter((s) => !adjacent(s, wk) && s !== wk && !pawnAttacks(p, s));
}

function initial(stm: number, wk: number, bk: number, p: number): number {
  if (rank(p) < 1 || rank(p) > 6) return INVALID;
  if (wk === bk || wk === p || bk === p || adjacent(wk, bk)) return INVALID;
  if (stm === W && pawnAttacks(p, bk)) return INVALID; // black left in check
  if (stm === W && rank(p) === 6) {
    const q = p + 8;
    if (wk !== q && bk !== q && (!adjacent(bk, q) || adjacent(wk, q))) return WIN;
  }
  if (stm === B) {
    const moves = blackMoves(wk, bk, p);
    if (moves.includes(p)) return DRAW; // undefended pawn is captured
    if (!moves.length) return pawnAttacks(p, bk) ? WIN : DRAW; // mate : stalemate
  }
  return UNKNOWN;
}

function build(): Uint8Array {
  const t = new Uint8Array(2 * 64 * 64 * 64);
  for (let stm = 0; stm < 2; stm++) for (let wk = 0; wk < 64; wk++) for (let bk = 0; bk < 64; bk++) for (let p = 0; p < 64; p++)
    t[idx(stm, wk, bk, p)] = initial(stm, wk, bk, p);
  let changed = true;
  while (changed) {
    changed = false;
    for (let stm = 0; stm < 2; stm++) for (let wk = 0; wk < 64; wk++) for (let bk = 0; bk < 64; bk++) for (let p = 8; p < 56; p++) {
      const i = idx(stm, wk, bk, p);
      if (t[i] !== UNKNOWN) continue;
      let result = UNKNOWN;
      if (stm === W) {
        let allDraw = true;
        const succ: number[] = [];
        for (const s of KING_STEPS[wk]) if (s !== p && !adjacent(s, bk)) succ.push(t[idx(B, s, bk, p)]);
        if (rank(p) < 6) {
          if (p + 8 !== wk && p + 8 !== bk) {
            succ.push(t[idx(B, wk, bk, p + 8)]);
            if (rank(p) === 1 && p + 16 !== wk && p + 16 !== bk) succ.push(t[idx(B, wk, bk, p + 16)]);
          }
        } // a push to the 8th rank that is not an immediate win counts as a draw
        for (const v of succ) {
          if (v === WIN) { result = WIN; break; }
          if (v === UNKNOWN) allDraw = false;
        }
        if (result === UNKNOWN && allDraw) result = DRAW;
      } else {
        let allWin = true;
        for (const s of blackMoves(wk, bk, p)) {
          const v = t[idx(W, wk, s, p)];
          if (v === DRAW) { result = DRAW; break; }
          if (v === UNKNOWN) allWin = false;
        }
        if (result === UNKNOWN && allWin) result = WIN;
      }
      if (result !== UNKNOWN) { t[i] = result; changed = true; }
    }
  }
  for (let i = 0; i < t.length; i++) if (t[i] === UNKNOWN) t[i] = DRAW;
  return t;
}

const sq = (name: string) => (name.charCodeAt(1) - 49) * 8 + (name.charCodeAt(0) - 97);

export interface KpkProbe {
  /** Result with best play, for the side that owns the pawn. */
  result: 'win' | 'draw';
  strong: 'w' | 'b';
}

/** Probe a FEN containing exactly two kings and one pawn. Returns null for anything else. */
export function probeKpk(fen: string): KpkProbe | null {
  const c = new Chess(fen);
  let wk = -1, bk = -1, p = -1, count = 0;
  let pawnColor = 'w' as 'w' | 'b';
  c.board().forEach((row) => row.forEach((pc) => {
    if (!pc) return;
    count++;
    if (pc.type === 'k') (pc.color === 'w' ? (wk = sq(pc.square)) : (bk = sq(pc.square)));
    else if (pc.type === 'p') { p = sq(pc.square); pawnColor = pc.color; }
  }));
  if (count !== 3 || p < 0) return null;
  let stm = c.turn() === 'w' ? W : B;
  if (pawnColor === 'b') {
    // mirror the board vertically and swap colours so the pawn is White's
    const m = (s: number) => (7 - rank(s)) * 8 + file(s);
    [wk, bk] = [m(bk), m(wk)];
    p = m(p);
    stm = 1 - stm;
  }
  if (c.isGameOver()) return { result: c.isCheckmate() ? 'win' : 'draw', strong: pawnColor };
  table ??= build();
  const v = table[idx(stm, wk, bk, p)];
  if (v === INVALID) return null;
  return { result: v === WIN ? 'win' : 'draw', strong: pawnColor };
}

/** Outcome after a move, for the strong side; promotion is judged by whether the new queen survives. */
export function kpkAfter(fen: string, san: string): 'win' | 'draw' {
  const c = new Chess(fen);
  const mv = c.move(san);
  if (mv.promotion) {
    if (c.isStalemate() || mv.promotion === 'n' || mv.promotion === 'b') return 'draw';
    const qsq = mv.to;
    const defended = c.isAttacked(qsq, mv.color);
    const kingCanTake = c.moves({ verbose: true }).some((m) => m.to === qsq);
    return kingCanTake && !defended ? 'draw' : 'win';
  }
  const pr = probeKpk(c.fen());
  return pr ? pr.result : 'draw';
}

/** Every legal move from `fen` that keeps the given outcome for the side to move. */
export function kpkGoodMoves(fen: string): { san: string; outcome: 'win' | 'draw' }[] {
  const c = new Chess(fen);
  return c.moves().map((san) => ({ san, outcome: kpkAfter(fen, san) }));
}
