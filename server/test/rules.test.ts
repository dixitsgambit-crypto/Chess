// Chess rules, FEN/PGN handling, the referee on special moves, and spaced-repetition scheduling.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { parsePgn } from '../../src/pgn/parser.ts';
import { fenProblem } from '../../src/chess/fen.ts';
import { judgeMove, newPuzzleSession } from '../../src/chess/judge.ts';
import type { PuzzleTask } from '../../src/content/schema.ts';
import { Ctx, recordAttempt, recordReview } from '../rules.ts';
import { freshState, DAY } from '../../src/academy/progression.ts';
import { fullTask } from '../content.ts';

test('castling: legal when clear; illegal through check or after moving', () => {
  const c = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  assert.ok(c.moves().includes('O-O') && c.moves().includes('O-O-O'));
  // a rook on c4 attacks f1, so White may not castle kingside through it
  const through = new Chess('r3k2r/8/8/8/2b5/8/8/R3K2R w KQkq - 0 1');
  assert.ok(!through.moves().includes('O-O'));
  assert.ok(through.moves().includes('O-O-O'));
  // no castling out of check
  const inCheck = new Chess('r3k2r/8/8/8/1b6/8/8/R3K2R w KQkq - 0 1');
  assert.ok(inCheck.isCheck() && !inCheck.moves().some((m) => m.startsWith('O-O')));
  // rights are lost once the king moves
  c.move('Kf1'); c.move('Kf8'); c.move('Ke1'); c.move('Ke8');
  assert.ok(!c.moves().includes('O-O'));
});

test('en passant only on the very next move', () => {
  const c = new Chess('4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1');
  c.move('d5');
  assert.ok(c.moves().includes('exd6'));
  const ep = c.move('exd6');
  assert.ok(ep.isEnPassant());
  assert.equal(c.get('d5'), undefined, 'the captured pawn disappears from d5');
  const late = new Chess('4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1');
  late.move('d5'); late.move('Kd1'); late.move('Ke7');
  assert.ok(!late.moves().includes('exd6'), 'the right expires');
});

test('promotion to any piece, including underpromotion', () => {
  for (const p of ['q', 'r', 'b', 'n'] as const) {
    const c = new Chess('8/4P1k1/8/8/8/8/8/4K3 w - - 0 1');
    const m = c.move({ from: 'e7', to: 'e8', promotion: p });
    assert.equal(c.get('e8')?.type, p);
    assert.ok(m.isPromotion());
  }
});

test('checkmate and stalemate are told apart', () => {
  const mate = new Chess('R5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1');
  assert.ok(mate.isCheckmate() && !mate.isStalemate());
  const stale = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
  assert.ok(stale.isStalemate() && !stale.isCheckmate() && stale.isDraw());
});

test('FEN validation rejects impossible positions (stricter than chess.js)', () => {
  assert.match(fenProblem('not a fen')!, /six fields/);
  assert.match(fenProblem('8/8/8/8/8/8/8/8 w - - 0 1')!, /king/);
  assert.match(fenProblem('4k3/8/8/8/8/8/8/K3K3 w - - 0 1')!, /kings/);
  assert.match(fenProblem('4k3/8/8/8/8/8/8/P3K3 w - - 0 1')!, /edge/);
  assert.match(fenProblem('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0')!, /six fields/);
  // chess.js 1.0.0 accepts these two; the academy does not
  assert.doesNotThrow(() => new Chess('8/8/8/8/8/8/k7/K7 w - - 0 1'));
  assert.match(fenProblem('8/8/8/8/8/8/k7/K7 w - - 0 1')!, /neighbouring/);
  assert.match(fenProblem('4k3/4R3/8/8/8/8/8/4K3 w - - 0 1')!, /not to move \(Black\) is in check/);
  assert.equal(fenProblem('4k3/4R3/8/8/8/8/8/4K3 b - - 0 1'), null, 'the same position with Black to move is fine');
  assert.equal(fenProblem('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'), null);
});

test('PGN round trip: export, re-import, same moves; academy parser keeps variations', () => {
  const c = new Chess();
  for (const m of ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'O-O']) c.move(m);
  c.setHeader('White', 'Tester');
  const pgn = c.pgn();
  const back = new Chess();
  back.loadPgn(pgn);
  assert.deepEqual(back.history(), c.history());
  assert.equal(back.getHeaders().White, 'Tester');
  const [game] = parsePgn('[Event "v"]\n\n1. e4 e5 (1... c5 2. Nf3) 2. Nf3 {a comment} Nc6 *');
  assert.equal(game.root.children[0].san, 'e4');
  assert.equal(game.root.children[0].children.length, 2, 'main line and the 1...c5 variation');
  assert.equal(game.issues.length, 0);
});

test('the referee handles promotion and en passant moves (no forced illegal moves)', () => {
  const promo: PuzzleTask = { kind: 'puzzle', id: 'x', fen: '8/4P1k1/8/8/8/8/8/4K3 w - - 0 1', solution: ['e8=Q'], goal: { type: 'rule', rule: 'promotion' }, prompt: 'p', explanation: 'e', hints: [], difficulty: 1, objective: 'o', themes: [] };
  assert.equal(judgeMove(promo, newPuzzleSession(promo), 'e7e8n', 'learn').verdict, 'wrong', 'a knight is not the queen asked for');
  assert.equal(judgeMove(promo, newPuzzleSession(promo), 'e7e8q', 'learn').verdict, 'solved');
  assert.equal(judgeMove(promo, newPuzzleSession(promo), 'e7e9q', 'learn').message, 'Malformed move.');
  assert.equal(judgeMove(promo, newPuzzleSession(promo), 'g7g8', 'learn').message, 'Illegal move.', 'cannot move the opponent’s king');
  const ep = fullTask('f-special.g2') as PuzzleTask;
  assert.equal(judgeMove(ep, newPuzzleSession(ep), 'e5d6', 'learn').verdict, 'solved');
});

test('spaced repetition: correct reviews push the next review out; misses bring it back tomorrow', () => {
  const task = fullTask('f-check.i1')!;
  let t = Date.UTC(2026, 0, 1);
  const ctx = new Ctx(freshState(t), t);
  recordAttempt(ctx, task, 'independent', true, 0, 0);
  assert.equal(ctx.s.items[task.id].srs!.due, t + DAY, 'first review after one day');
  // reviewing early earns nothing
  let r = recordReview(ctx, task, true);
  assert.equal(r.xp, 0);
  // due review: correct → interval grows beyond one day, +5 XP
  t += 3 * DAY; ctx.now = t;
  const before = ctx.s.items[task.id].srs!.interval;
  r = recordReview(ctx, task, true);
  assert.equal(r.xp, 5);
  assert.ok(ctx.s.items[task.id].srs!.interval > before);
  assert.ok(ctx.s.items[task.id].srs!.due > t + DAY);
  // a miss resets to tomorrow
  t = ctx.s.items[task.id].srs!.due + 1; ctx.now = t;
  r = recordReview(ctx, task, false);
  assert.equal(r.xp, 0);
  assert.equal(ctx.s.items[task.id].srs!.due, t + DAY);
  assert.equal(ctx.s.items[task.id].srs!.interval, 1);
});
