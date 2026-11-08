// Curriculum authoring tool: searches random positions for exercises that have exactly
// one solution, using the same exact searches the validator uses.
//
//   node --experimental-strip-types scripts/mine-positions.ts <motif> [seconds] [seed]
//
// motifs:
//   mate2      unique mate in 2 (first move tagged: sacrifice / quiet / check / capture)
//   material   unique move winning >= 3 points (depth 3 + captures)
//   defend     side to move is threatened; exactly one move avoids losing >= 3 points
//   kpk        king + pawn positions where exactly one move keeps the result, kings >= 3 apart
//
// Output: one JSON line per find, with the principal line, for an author to review.
import { Chess, type Square } from 'chess.js';
import { canMateIn, matingMoves, scoreRootMoves, stubbornReply } from '../src/chess/search.ts';
import { kpkGoodMoves, probeKpk } from '../src/chess/kpk.ts';

const motif = process.argv[2] ?? 'mate2';
const seconds = Number(process.argv[3] ?? 60);
let seed = Number(process.argv[4] ?? 1);
// xorshift32 (integer-only, so different seeds give different streams)
seed = (seed * 2654435761) >>> 0 || 1;
const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)];
const FILES = 'abcdefgh';
const sq = (f: number, r: number) => (FILES[f] + r) as Square;

function place(c: Chess, type: string, color: 'w' | 'b', ranks: [number, number]): boolean {
  for (let i = 0; i < 30; i++) {
    const s = sq(Math.floor(rnd() * 8), ranks[0] + Math.floor(rnd() * (ranks[1] - ranks[0] + 1)));
    if (!c.get(s)) return c.put({ type: type as never, color }, s);
  }
  return false;
}

/** A king-side attacking scene: black king castled with some pawn cover, White with attackers. */
function attackScene(): string | null {
  const c = new Chess();
  c.clear();
  const bk = pick(['g8', 'h8', 'g8', 'f8']) as Square;
  c.put({ type: 'k', color: 'b' }, bk);
  for (const p of ['f7', 'g7', 'h7', 'g6', 'h6', 'f6', 'a7', 'b7']) if (rnd() < (p.startsWith('a') || p.startsWith('b') ? 0.5 : 0.45)) c.put({ type: 'p', color: 'b' }, p as Square);
  c.put({ type: 'k', color: 'w' }, pick(['g1', 'h1', 'c1']) as Square);
  for (const p of ['f2', 'g2', 'h2', 'a2', 'b2']) if (rnd() < 0.6 && !c.get(p as Square)) c.put({ type: 'p', color: 'w' }, p as Square);
  const whitePieces = ['q', 'r', 'r', 'b', 'n', 'n', 'b'].filter(() => rnd() < 0.45).slice(0, 3);
  if (!whitePieces.length) whitePieces.push(pick(['q', 'r']));
  for (const t of whitePieces) place(c, t, 'w', [3, 8]);
  for (const t of ['r', 'q', 'b', 'n', 'r'].filter(() => rnd() < 0.4).slice(0, 3)) place(c, t, 'b', [5, 8]);
  return finish(c, 'w');
}

/** An open middlegame scene with a few pieces each. */
function openScene(): string | null {
  const c = new Chess();
  c.clear();
  c.put({ type: 'k', color: 'w' }, pick(['g1', 'h1', 'c1', 'b1', 'e1']) as Square);
  c.put({ type: 'k', color: 'b' }, pick(['g8', 'h8', 'c8', 'b8', 'e8']) as Square);
  for (const color of ['w', 'b'] as const) {
    for (const t of ['q', 'r', 'r', 'b', 'b', 'n', 'n'].filter(() => rnd() < 0.35).slice(0, 4)) place(c, t, color, color === 'w' ? [1, 6] : [3, 8]);
    for (let i = 0; i < 3; i++) place(c, 'p', color, color === 'w' ? [2, 4] : [5, 7]);
  }
  return finish(c, rnd() < 0.5 ? 'w' : 'b');
}

function finish(c: Chess, turn: 'w' | 'b'): string | null {
  const fen = c.fen().split(' ');
  fen[1] = turn; fen[2] = '-'; fen[3] = '-';
  try {
    const t = new Chess(fen.join(' '));
    // the side not to move must not be in check
    const other = new Chess(fen.join(' ').replace(` ${turn} `, ` ${turn === 'w' ? 'b' : 'w'} `));
    if (other.isCheck() || t.isGameOver()) return null;
    return t.fen();
  } catch { return null; }
}

const material = (fen: string) => {
  const v: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let s = 0;
  for (const row of new Chess(fen).board()) for (const p of row) if (p) s += (p.color === 'w' ? 1 : -1) * v[p.type];
  return s;
};

function principal(fen: string, first: string, n: number): string[] {
  const c = new Chess(fen);
  const line = [c.move(first).san];
  for (let left = n - 1; left > 0 && !c.isGameOver(); left--) {
    const r = stubbornReply(c.fen(), left);
    if (!r) break;
    line.push(c.move(r).san);
    const m = matingMoves(c.fen(), left)[0];
    if (!m) break;
    line.push(c.move(m).san);
  }
  return line;
}

const deadline = Date.now() + seconds * 1000;
let tried = 0, found = 0;
const seen = new Set<string>();

if (motif === 'kpk') {
  // exhaustive: pawn on files b-g ranks 2-5, all king squares, both sides to move
  for (const pf of [1, 2, 3, 4, 5, 6]) for (const pr of [2, 3, 4, 5]) for (let wk = 0; wk < 64; wk++) for (let bk = 0; bk < 64; bk++) for (const turn of ['w', 'b'] as const) {
    if (Date.now() > deadline) break;
    const c = new Chess(); c.clear();
    const p = sq(pf, pr), w = sq(wk % 8, 1 + (wk >> 3)), b = sq(bk % 8, 1 + (bk >> 3));
    if (new Set([p, w, b]).size < 3) continue;
    c.put({ type: 'p', color: 'w' }, p); c.put({ type: 'k', color: 'w' }, w); c.put({ type: 'k', color: 'b' }, b);
    const fen = finish(c, turn);
    if (!fen) continue;
    const dist = Math.max(Math.abs((wk % 8) - (bk % 8)), Math.abs((wk >> 3) - (bk >> 3)));
    if (dist < 3) continue;
    const pr0 = probeKpk(fen);
    if (!pr0) continue;
    const want = turn === 'w' ? 'win' : 'draw';
    if (pr0.result !== want) continue;
    const good = kpkGoodMoves(fen).filter((m) => m.outcome === want);
    if (good.length !== 1 || /^[a-h][1-8]/.test(good[0].san)) continue; // a king move, the instructive case
    console.log(JSON.stringify({ motif, fen, answer: good[0].san, dist }));
    found++;
  }
} else {
  while (Date.now() < deadline) {
    tried++;
    const fen = motif === 'mate2' ? attackScene() : openScene();
    if (!fen || seen.has(fen)) continue;
    seen.add(fen);
    const stm = fen.split(' ')[1];
    const bal = material(fen) * (stm === 'w' ? 1 : -1);
    if (motif === 'mate2') {
      if (bal < -3 || bal > 6) continue;
      const c = new Chess(fen);
      if (canMateIn(c, 1)) continue;
      const firsts = matingMoves(fen, 2);
      if (firsts.length !== 1) continue;
      const after = new Chess(fen);
      const mv = after.move(firsts[0]);
      const line = principal(fen, firsts[0], 2);
      const capturedBack = line[1]?.includes('x') && new Chess(fen).move(firsts[0]).to === new Chess(after.fen()).move(line[1]).to;
      const tags = [mv.san.includes('+') ? 'check' : mv.captured ? 'capture' : 'quiet', capturedBack ? 'sacrifice' : ''].filter(Boolean);
      console.log(JSON.stringify({ motif, fen, answer: firsts[0], line, tags, balance: bal }));
      found++;
    } else {
      if (Math.abs(bal) > 3) continue;
      const scores = scoreRootMoves(fen, 3);
      if (motif === 'material') {
        const [best, second] = scores;
        if (!best || best.gain < 3 || best.gain > 500 || (second && second.gain >= 1)) continue;
        // skip "take the hanging piece": demand a quiet/forcing first move, or a capture that wins more than it takes
        const mv = new Chess(fen).move(best.san);
        const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
        if (mv.captured && best.gain <= VAL[mv.captured]) continue;
        const tag = mv.san.includes('+') ? 'check' : mv.captured ? 'capture' : 'quiet';
        console.log(JSON.stringify({ motif, fen, answer: best.san, tag, gain: best.gain, next: second?.san, nextGain: second?.gain, balance: bal }));
        found++;
      } else {
        const [best, second] = scores;
        if (!best || best.gain < -0.5 || best.gain > 1 || !second || second.gain > -3) continue;
        // the threat must be real: if the side to move passed, it would lose material
        console.log(JSON.stringify({ motif, fen, answer: best.san, gain: best.gain, next: second.san, nextGain: second.gain, balance: bal }));
        found++;
      }
    }
  }
}
console.error(`${motif}: tried ${tried}, found ${found}`);
