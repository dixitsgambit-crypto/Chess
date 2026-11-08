// Verifies every board position in the curriculum. Run: npm run validate
import { Chess } from 'chess.js';
import { KINGDOMS, ALL_LESSONS, allTasks } from '../src/content/kingdoms.ts';
import { PLACEMENT } from '../src/content/placement.ts';
import { MASTER_GAMES } from '../src/content/masterGames.ts';
import type { Task } from '../src/content/schema.ts';
import { matingMoves, scoreRootMoves } from '../src/chess/search.ts';
import { probeKpk, kpkGoodMoves } from '../src/chess/kpk.ts';
import { fenProblem } from '../src/chess/fen.ts';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { demoFingerprintSource, fingerprintSource, type DemoCertificate, type EngineCertificate } from '../src/content/engine-cert.ts';

const CERT_FILE = fileURLToPath(new URL('../src/content/engine-certificates.json', import.meta.url));
const certs: Record<string, EngineCertificate> = existsSync(CERT_FILE) ? JSON.parse(readFileSync(CERT_FILE, 'utf8')) : {};

const errors: string[] = [];
const notes: string[] = [];
const err = (id: string, m: string) => errors.push(`${id}: ${m}`);
const note = (id: string, m: string) => notes.push(`${id}: ${m}`);
const strip = (s: string) => s.replace(/[+#]/g, '');
const SQUARE = /^[a-h][1-8]$/;

function loadFen(id: string, fen: string): Chess | null {
  const problem = fenProblem(fen);
  if (problem) { err(id, `illegal FEN "${fen}": ${problem}`); return null; }
  try {
    return new Chess(fen);
  } catch (e) {
    err(id, `invalid FEN "${fen}": ${(e as Error).message}`);
    return null;
  }
}

function playLine(id: string, fen: string, line: string[]): Chess | null {
  const c = loadFen(id, fen);
  if (!c) return null;
  for (const san of line) {
    try {
      c.move(san);
    } catch {
      err(id, `illegal move "${san}" in line ${line.join(' ')}`);
      return null;
    }
  }
  return c;
}

function checkTask(t: Task) {
  const id = t.id;
  if (!t.prompt || t.prompt.length < 4 || t.prompt === '—' || t.prompt === 'placeholder') err(id, 'missing prompt');
  if (!t.explanation || t.explanation === 'placeholder') err(id, 'missing explanation');
  if (!t.objective) err(id, 'missing objective');
  if (t.kind === 'choice') {
    if (t.answer < 0 || t.answer >= t.options.length) err(id, 'answer index out of range');
    if (t.fen) loadFen(id, t.fen);
    return;
  }
  if (t.kind === 'square') {
    loadFen(id, t.fen);
    if (!t.answer.length || t.answer.some((s) => !SQUARE.test(s))) err(id, 'bad square answer');
    return;
  }
  if (t.kind === 'playout') {
    const c = loadFen(id, t.fen);
    if (!c) return;
    if (t.opponent === 'kpk') {
      const p = probeKpk(t.fen);
      if (!p) return err(id, 'kpk playout without a K+P vs K position');
      const stm = c.turn();
      if (t.goal === 'promote' && !(p.result === 'win' && p.strong === stm)) err(id, `promote playout is not a win for the side to move (${JSON.stringify(p)})`);
      if (t.goal === 'hold' && !(p.result === 'draw' && p.strong !== stm)) err(id, `hold playout is not a draw for the defender (${JSON.stringify(p)})`);
    }
    return;
  }
  // puzzle
  const end = playLine(id, t.fen, t.solution);
  if (!end) return;
  for (const a of t.accept ?? []) playLine(id, t.fen, [a]);
  const g = t.goal;
  if (g.type === 'mate') {
    if (!end.isCheckmate()) err(id, `solution does not end in mate`);
    if (t.solution.length !== g.in * 2 - 1) err(id, `solution length ${t.solution.length} does not match mate in ${g.in}`);
    const firsts = matingMoves(t.fen, g.in);
    if (!firsts.map(strip).includes(strip(t.solution[0]))) err(id, `search does not confirm ${t.solution[0]} mates in ${g.in}`);
    if (g.in > 1 && matingMoves(t.fen, g.in - 1).length) err(id, `a shorter mate exists`);
    note(id, `mate in ${g.in}; accepted first moves: ${firsts.join(', ')}`);
  } else if (g.type === 'material') {
    const scores = scoreRootMoves(t.fen, g.depth);
    const mine = scores.find((s) => strip(s.san) === strip(t.solution[0]));
    if (!mine || mine.gain < g.minGain) err(id, `${t.solution[0]} gains ${mine?.gain} < ${g.minGain}`);
    const allowed = new Set([t.solution[0], ...(t.accept ?? [])].map(strip));
    const rivals = scores.filter((s) => s.gain >= g.minGain && !allowed.has(strip(s.san)));
    if (rivals.length) err(id, `ambiguous: also wins ≥${g.minGain}: ${rivals.map((r) => `${r.san}(${r.gain})`).join(', ')}`);
    note(id, `material: ${scores.slice(0, 3).map((s) => `${s.san} ${s.gain > 500 ? 'mates' : s.gain}`).join(', ')}`);
  } else if (g.type === 'rule') {
    const c = new Chess(t.fen);
    const mv = c.move(t.solution[0]);
    if (g.rule === 'en-passant' && !mv.isEnPassant()) err(id, 'not an en passant capture');
    if (g.rule === 'castle' && !(mv.isKingsideCastle() || mv.isQueensideCastle())) err(id, 'not castling');
    if (g.rule === 'promotion' && !mv.isPromotion()) err(id, 'not a promotion');
  } else if (g.type === 'engine') {
    const cert = certs[id];
    const fp = createHash('sha256').update(fingerprintSource(t)).digest('hex').slice(0, 16);
    if (!cert) return err(id, 'no Stockfish certificate — run npm run verify:engine');
    if (cert.fingerprint !== fp) return err(id, 'certificate is stale (puzzle changed) — run npm run verify:engine');
    if (t.solution.length !== 1) err(id, 'engine puzzles are single-move tasks');
    const declared = [t.solution[0], ...(t.accept ?? [])].map(strip).sort();
    if (JSON.stringify(declared) !== JSON.stringify(cert.accepted.map(strip).sort())) err(id, `declared answers [${declared}] differ from the engine's [${cert.accepted}]`);
    if (cert.gap < g.margin) err(id, `engine gap ${cert.gap} is below the required margin ${g.margin}`);
    if (cert.depth < g.depth) err(id, `certified at depth ${cert.depth}, below the required ${g.depth}`);
    note(id, `engine ${g.mode}: accepts ${cert.accepted.join(', ')}; next best ${cert.bestRejected?.san} (${cert.bestRejected?.value}); gap ${cert.gap}; depth ${cert.depth}`);
  } else if (g.type === 'kpk') {
    const p = probeKpk(t.fen);
    const stm = new Chess(t.fen).turn();
    if (!p) return err(id, 'not a K+P vs K position');
    const expectStrong = g.outcome === 'win';
    if (expectStrong && !(p.result === 'win' && p.strong === stm)) err(id, `position is not a win for the side to move (${JSON.stringify(p)})`);
    if (!expectStrong && !(p.result === 'draw' && p.strong !== stm)) err(id, `position is not a draw for the defender to move (${JSON.stringify(p)})`);
    const moves = kpkGoodMoves(t.fen);
    const good = moves.filter((m) => m.outcome === (g.outcome === 'win' ? 'win' : 'draw')).map((m) => m.san);
    if (!good.map(strip).includes(strip(t.solution[0]))) err(id, `${t.solution[0]} does not keep the ${g.outcome}`);
    note(id, `kpk ${g.outcome}: good moves ${good.join(', ')} of ${moves.length}`);
  }
}

// ---- ids, prerequisites and duplicate positions
const tasks: Task[] = [...allTasks().map((r) => r.task), ...PLACEMENT.map((p) => p.task)];
const seen = new Map<string, number>();
for (const t of tasks) seen.set(t.id, (seen.get(t.id) ?? 0) + 1);
for (const [id, n] of seen) if (n > 1) err(id, `duplicate id (${n}×)`);

const fenUse = new Map<string, string[]>();
for (const r of [...allTasks().map((x) => ({ id: x.task.id, stage: x.stage, t: x.task })), ...PLACEMENT.map((p) => ({ id: p.task.id, stage: 'placement', t: p.task }))]) {
  if (!('fen' in r.t) || !r.t.fen || r.t.kind === 'square' || r.t.kind === 'choice') continue;
  const key = r.t.fen.split(' ').slice(0, 2).join(' ');
  fenUse.set(key, [...(fenUse.get(key) ?? []), `${r.id}[${r.stage}]`]);
}
for (const [fen, ids] of fenUse) {
  const assessed = ids.filter((i) => /\[(exam|boss|placement)\]/.test(i));
  if (ids.length > 1 && assessed.length) err(assessed[0], `assessment position is not unseen; also used by ${ids.filter((i) => i !== assessed[0]).join(', ')} (${fen})`);
}

const lessonIds = new Set(ALL_LESSONS.map((l) => l.id));
for (const l of ALL_LESSONS) {
  for (const p of l.prerequisites) if (!lessonIds.has(p)) err(l.id, `unknown prerequisite ${p}`);
  if (l.demo.captions.length !== l.demo.moves.length + 1) err(l.id, `demo needs ${l.demo.moves.length + 1} captions, has ${l.demo.captions.length}`);
  if (l.demo.verify) {
    const id = `${l.id}#demo`;
    const cert = (certs as unknown as Record<string, DemoCertificate>)[id];
    const fp = createHash('sha256').update(demoFingerprintSource(l.demo)).digest('hex').slice(0, 16);
    if (!cert) err(id, 'demo makes engine-level claims but has no certificate — run npm run verify:engine');
    else if (cert.fingerprint !== fp) err(id, 'demo certificate is stale — run npm run verify:engine');
    else if (!cert.ok) err(id, `Stockfish rejects a demo move: ${cert.plies.filter((p) => !p.ok).map((p) => p.san).join(', ')}`);
    else note(id, `engine-certified ${cert.mode} line at depth ${cert.depth}`);
  }
  const c = playLine(`${l.id}.demo`, l.demo.fen, l.demo.moves);
  if (c && probeKpk(l.demo.fen)) {
    const d = new Chess(l.demo.fen);
    const outs = l.demo.moves.map((m) => { const r = probeKpk(d.fen()); d.move(m); return `${m}@${r?.result}`; });
    note(`${l.id}.demo`, `kpk ${outs.join(' ')} → ${probeKpk(d.fen())?.result}`);
  }
  for (const s of ['guided', 'independent', 'application', 'exam'] as const) if (!l[s].length) err(l.id, `empty ${s} stage`);
}

for (const t of tasks) checkTask(t);

for (const g of MASTER_GAMES) {
  const c = new Chess();
  try {
    c.loadPgn(g.pgn);
    const last = c.history().at(-1) ?? '';
    if (g.result === '1-0' && last.endsWith('#') && c.turn() !== 'b') err(g.id, 'result does not match final mate');
    note(g.id, `${c.history().length} plies, final ${last}`);
  } catch (e) {
    err(g.id, `PGN does not replay: ${(e as Error).message}`);
  }
}

const verbose = process.argv.includes('--verbose');
if (verbose) for (const n of notes) console.log('  ·', n);
const count = KINGDOMS.reduce((s, k) => s + k.lessons.length, 0);
console.log(`\nChecked ${count} lessons, ${tasks.length} tasks, ${MASTER_GAMES.length} master games.`);
if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors) console.error('  ✗', e);
  process.exit(1);
}
console.log('All content verified.');
