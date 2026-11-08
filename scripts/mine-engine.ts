// Engine-backed position miner for rook endings (authoring tool; slow).
//
//   node --experimental-strip-types scripts/mine-engine.ts <philidor|lucena> [seconds] [seed] [depth]
//
// philidor: Black to move must find the drawing move(s); every other move loses.
// lucena:   White to move must find the winning move(s); every other move lets the win go.
// Prints one JSON line per find with every move's evaluation, for an author to review.
import { Chess, type Square } from 'chess.js';
import { NodeEngine, valueOf } from './engine.ts';

const kind = process.argv[2] ?? 'philidor';
const seconds = Number(process.argv[3] ?? 300);
let seed = (Number(process.argv[4] ?? 1) * 2654435761) >>> 0 || 1;
const depth = Number(process.argv[5] ?? 16);
const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const F = 'abcdefgh';
const sq = (f: number, r: number) => (F[f] + r) as Square;

function scene(): string | null {
  const c = new Chess();
  c.clear();
  const pf = ri(2, 5);
  if (kind === 'philidor') {
    const pr = ri(4, 6);
    c.put({ type: 'p', color: 'w' }, sq(pf, pr));
    c.put({ type: 'k', color: 'w' }, sq(Math.min(7, Math.max(0, pf + ri(-1, 1))), Math.min(7, pr + ri(0, 1))));
    c.put({ type: 'k', color: 'b' }, sq(Math.min(7, Math.max(0, pf + ri(-1, 1))), 8));
    c.put({ type: 'r', color: 'w' }, sq(ri(0, 7), ri(1, 7)));
    c.put({ type: 'r', color: 'b' }, sq(ri(0, 7), ri(1, 8)));
  } else {
    c.put({ type: 'p', color: 'w' }, sq(pf, 7));
    c.put({ type: 'k', color: 'w' }, sq(pf, 8));
    const side = rnd() < 0.5 ? -1 : 1;
    const bkf = pf + 2 * side;
    if (bkf < 0 || bkf > 7) return null;
    c.put({ type: 'k', color: 'b' }, sq(bkf, ri(6, 8)));
    c.put({ type: 'r', color: 'w' }, sq(pf + side, ri(1, 4)));
    c.put({ type: 'r', color: 'b' }, sq(pf - 2 * side >= 0 && pf - 2 * side <= 7 ? pf - 2 * side : pf - side, ri(1, 3)));
  }
  const fen = c.fen().split(' ');
  fen[1] = kind === 'philidor' ? 'b' : 'w'; fen[2] = '-'; fen[3] = '-';
  try {
    const t = new Chess(fen.join(' '));
    const other = new Chess(fen.join(' ').replace(` ${fen[1]} `, ` ${fen[1] === 'w' ? 'b' : 'w'} `));
    if (other.isCheck() || t.isGameOver() || t.moves().length < 6) return null;
    return t.fen();
  } catch { return null; }
}

const engine = await NodeEngine.start();
const deadline = Date.now() + seconds * 1000;
let tried = 0, found = 0;
while (Date.now() < deadline) {
  const fen = scene();
  if (!fen) continue;
  tried++;
  const lines = await engine.analyseAll(fen, depth);
  const vals = lines.map((l) => ({ san: l.san, v: Number(valueOf(l).toFixed(2)) }));
  const best = vals[0]?.v ?? -99;
  const [lo, hi] = kind === 'philidor' ? [-0.6, -2.5] : [2.5, 1.0];
  if (best < lo) continue; // no drawing (resp. winning) move at all
  const accepted = vals.filter((x) => x.v >= lo);
  const rejected = vals.filter((x) => x.v < lo);
  if (accepted.length > 3 || !rejected.length || rejected[0].v > hi) continue;
  console.log(JSON.stringify({ kind, fen, depth, accepted: accepted.map((x) => x.san), evals: vals }));
  found++;
}
console.error(`${kind}: tried ${tried}, found ${found}`);
process.exit(0);
