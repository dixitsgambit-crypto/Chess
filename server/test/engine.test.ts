// Stockfish communication (Node build with NNUE) — the engine used for content certification.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NodeEngine, valueOf } from '../../scripts/engine.ts';

test('Stockfish starts with NNUE, finds a mate in one and evaluates every legal move', { timeout: 60_000 }, async () => {
  const e = await NodeEngine.start(16);
  const lines = await e.analyseAll('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', 8);
  assert.equal(lines[0].san, 'Ra8#');
  assert.equal(lines[0].mate, 1);
  assert.ok(valueOf(lines[0]) > 99);
  assert.equal(lines.length, 20, 'one line per legal move');
  const draw = await e.analyse('8/8/8/8/8/k7/8/K7 w - - 0 1', 6, 1);
  // Stockfish adds a tiny random offset to draw scores, so allow a few centipawns
  assert.ok(Math.abs(draw[0].cp ?? 0) <= 5 && draw[0].mate === null, 'bare kings are a dead draw');
  // illegal positions are refused before they reach the engine (Stockfish crashes on them)
  await assert.rejects(() => e.analyse('8/8/8/8/8/8/k7/K7 w - - 0 1', 6, 1), /neighbouring/);
});
