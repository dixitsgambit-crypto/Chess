// Certify engine-goal puzzles with Stockfish 16 NNUE, and audit every other puzzle.
//
//   npm run verify:engine            certify new or changed engine puzzles (cached by fingerprint)
//   npm run verify:engine -- --force re-certify everything
//   npm run verify:engine -- --audit also cross-check all mate/material puzzles against Stockfish
//
// Writes src/content/engine-certificates.json, which the fast validator (npm test) checks.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';
import { ALL_LESSONS, allTasks } from '../src/content/kingdoms.ts';
import { PLACEMENT } from '../src/content/placement.ts';
import type { PuzzleTask, Task } from '../src/content/schema.ts';
import { classify, demoFingerprintSource, fingerprintSource, type DemoCertificate, type EngineCertificate } from '../src/content/engine-cert.ts';
import { NodeEngine, valueOf } from './engine.ts';

const FILE = fileURLToPath(new URL('../src/content/engine-certificates.json', import.meta.url));
const force = process.argv.includes('--force');
const audit = process.argv.includes('--audit');
const strip = (s: string) => s.replace(/[+#]/g, '');

const tasks: Task[] = [...allTasks().map((r) => r.task), ...PLACEMENT.map((p) => p.task)];
const engineTasks = tasks.filter((t): t is PuzzleTask => t.kind === 'puzzle' && t.goal.type === 'engine');
const certs: Record<string, EngineCertificate> = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : {};
const fp = (t: PuzzleTask) => createHash('sha256').update(fingerprintSource(t)).digest('hex').slice(0, 16);

const engine = await NodeEngine.start();
let problems = 0;

for (const t of engineTasks) {
  if (t.goal.type !== 'engine') continue;
  const f = fp(t);
  if (!force && certs[t.id]?.fingerprint === f) { console.log(`  = ${t.id} (cached)`); continue; }
  const started = Date.now();
  const lines = await engine.analyseAll(t.fen, t.goal.depth);
  const evals = lines.map((l) => ({ san: l.san, value: Number(valueOf(l).toFixed(2)) })).sort((a, b) => b.value - a.value);
  const c = classify(t.goal.mode, evals);
  const cert: EngineCertificate = {
    id: t.id, fen: t.fen, fingerprint: f, engine: engine.name, depth: Math.min(...lines.map((l) => l.depth)), mode: t.goal.mode,
    accepted: c.accepted, bestRejected: c.bestRejected, gap: c.gap, evals: evals.slice(0, 10), verifiedAt: new Date().toISOString().slice(0, 10),
  };
  certs[t.id] = cert;
  const declared = [t.solution[0], ...(t.accept ?? [])].map(strip).sort();
  const ok = JSON.stringify(declared) === JSON.stringify(c.accepted.map(strip).sort()) && c.gap >= t.goal.margin;
  if (!ok) problems++;
  console.log(`  ${ok ? '✓' : '✗'} ${t.id}: engine accepts [${c.accepted.join(', ')}], content declares [${declared.join(', ')}], gap ${c.gap} (need ${t.goal.margin}), depth ${cert.depth}, ${Math.round((Date.now() - started) / 1000)}s`);
}

// demonstrations whose captions make engine-level claims
const demoCerts = certs as unknown as Record<string, DemoCertificate>;
const demos = ALL_LESSONS.filter((l) => l.demo.verify);
for (const l of demos) {
  const d = l.demo;
  const id = `${l.id}#demo`;
  const f = createHash('sha256').update(demoFingerprintSource(d)).digest('hex').slice(0, 16);
  if (!force && demoCerts[id]?.fingerprint === f) { console.log(`  = ${id} (cached)`); continue; }
  const c = new Chess(d.fen);
  const side = c.turn();
  const plies: DemoCertificate['plies'] = [];
  let depth = Infinity;
  for (const san of d.moves) {
    if (c.turn() === side) {
      const lines = await engine.analyseAll(c.fen(), d.verify!.depth);
      depth = Math.min(depth, ...lines.map((x) => x.depth));
      const evals = lines.map((x) => ({ san: x.san, value: Number(valueOf(x).toFixed(2)) })).sort((a, b) => b.value - a.value);
      const cls = classify(d.verify!.mode, evals);
      const played = evals.find((x) => strip(x.san) === strip(san)) ?? { value: NaN };
      plies.push({ san, value: played.value, ok: cls.accepted.map(strip).includes(strip(san)), alternatives: cls.accepted.length });
    }
    c.move(san);
  }
  const ok = plies.every((p) => p.ok);
  demoCerts[id] = { id, fingerprint: f, engine: engine.name, depth, mode: d.verify!.mode, plies, ok, verifiedAt: new Date().toISOString().slice(0, 10) };
  if (!ok) problems++;
  console.log(`  ${ok ? '✓' : '✗'} ${id}: ${plies.map((p) => `${p.san}${p.ok ? '' : '✗'}(${p.value}, ${p.alternatives} keep it)`).join(' ')}`);
}

// drop certificates for tasks and demos that no longer exist
for (const id of Object.keys(certs)) if (!engineTasks.some((t) => t.id === id) && !demos.some((l) => `${l.id}#demo` === id)) delete certs[id];
writeFileSync(FILE, JSON.stringify(Object.fromEntries(Object.entries(certs).sort()), null, 2) + '\n');
console.log(`\n${engineTasks.length} engine puzzle(s); certificates in src/content/engine-certificates.json`);

if (audit) {
  console.log('\nAudit: Stockfish second opinion on mate and material puzzles (depth 16)');
  let flagged = 0;
  for (const t of tasks) {
    if (t.kind !== 'puzzle' || (t.goal.type !== 'mate' && t.goal.type !== 'material')) continue;
    const lines = await engine.analyse(t.fen, 16, 4);
    const best = lines[0];
    const allowed = [t.solution[0], ...(t.accept ?? [])].map(strip);
    let verdict = 'ok';
    if (t.goal.type === 'mate') {
      if (best.mate === null || best.mate <= 0 || best.mate > t.goal.in) verdict = `engine finds no mate in ${t.goal.in} (best ${best.san} ${best.mate !== null ? 'M' + best.mate : best.cp})`;
    } else if (!allowed.includes(strip(best.san))) {
      const mine = lines.find((l) => allowed.includes(strip(l.san)));
      const diff = mine ? valueOf(best) - valueOf(mine) : Infinity;
      if (diff > 0.5) verdict = `engine prefers ${best.san} (${valueOf(best).toFixed(2)}) over ${t.solution[0]} (${mine ? valueOf(mine).toFixed(2) : 'not in top 4'})`;
    }
    if (verdict !== 'ok') { flagged++; console.log(`  ! ${t.id}: ${verdict}`); }
  }
  console.log(flagged ? `${flagged} puzzle(s) flagged for review.` : 'No disagreements.');
}

process.exit(problems ? 1 : 0);
