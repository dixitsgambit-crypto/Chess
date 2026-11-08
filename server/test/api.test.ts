// API tests: node --test server/test/   (npm run test:server)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { Chess } from 'chess.js';
import { createApp } from '../app.ts';
import { kpkAfter, probeKpk } from '../../src/chess/kpk.ts';

let clock = Date.UTC(2026, 10, 8, 12);
const HOUR = 3600 * 1000;
const app = createApp({ dbFile: ':memory:', now: () => clock });
let base = '';

before(async () => {
  await new Promise<void>((r) => app.server.listen(0, r));
  base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
});
after(() => app.server.close());

/** A tiny client with its own cookie jar. */
function client() {
  let cookie = '';
  const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : method !== 'GET' ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : method !== 'GET' ? '{}' : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
    const json = (await res.json().catch(() => ({}))) as Record<string, any>;
    return { status: res.status, ...json } as Record<string, any> & { status: number };
  };
  return {
    get: (p: string) => call('GET', p),
    post: (p: string, b?: unknown, h?: Record<string, string>) => call('POST', p, b, h),
    patch: (p: string, b?: unknown) => call('PATCH', p, b),
    raw: call,
  };
}

async function solveOnce(c: ReturnType<typeof client>, taskId: string, moves: string[], extra: { hint?: boolean } = {}) {
  const a = await c.post('/api/attempts', { taskId });
  assert.equal(a.status, 200, a.error);
  if (extra.hint) assert.equal((await c.post(`/api/attempts/${a.attemptId}/hint`)).status, 200);
  let last: any;
  for (const uci of moves) last = await c.post(`/api/attempts/${a.attemptId}/move`, { uci });
  return last;
}

test('guest session and redacted content', async () => {
  const c = client();
  assert.equal((await c.get('/api/me')).status, 401);
  const g = await c.post('/api/auth/guest');
  assert.equal(g.user.guest, true);
  const me = await c.get('/api/me');
  assert.equal(me.state.xp, 0);
  const res = await fetch(base + '/api/content');
  const text = await res.text();
  const content = JSON.parse(text);
  const task = content.kingdoms[0].lessons[2].independent[0];
  assert.deepEqual(task.solution, []);
  assert.equal(task.explanation, '');
  assert.ok(!text.includes('Scholar’s Mate'), 'explanations must not ship to the browser');
  assert.equal(content.placement[4].task.answer, -1);
});

test('XP only for first independent solves; repeats earn nothing', async () => {
  const c = client();
  await c.post('/api/auth/guest');
  const first = await solveOnce(c, 'f-check.i1', ['h5f7']);
  assert.equal(first.verdict, 'solved');
  assert.equal(first.result.xp, 10);
  assert.match(first.explanation, /Scholar/);
  const again = await solveOnce(c, 'f-check.i1', ['h5f7']);
  assert.equal(again.result.xp, 0);
  assert.equal((await c.get('/api/me')).state.xp, 10 + 0 + (first.state.xp - 10));
});

test('misses and hints reduce XP; hints are refused in exams', async () => {
  const c = client();
  await c.post('/api/auth/guest');
  // stalemate trap first, then the mate: solved after a miss
  const a = await c.post('/api/attempts', { taskId: 'f-check.i2' });
  const w = await c.post(`/api/attempts/${a.attemptId}/move`, { uci: 'f5f7' });
  assert.equal(w.verdict, 'wrong');
  assert.match(w.message, /stalemate/);
  const r = await c.post(`/api/attempts/${a.attemptId}/move`, { uci: 'f5f8' });
  assert.equal(r.verdict, 'solved');
  assert.equal(r.result.xp, 3);
  const h = await solveOnce(c, 'f-pieces.i1', ['e4f5'], { hint: true });
  assert.equal(h.result.xp, 4);
  const exam = await c.post('/api/attempts', { taskId: 'f-check.e1' });
  assert.equal((await c.post(`/api/attempts/${exam.attemptId}/hint`)).status, 403);
});

test('alternative mating routes are accepted and refereed move by move', async () => {
  const c = client();
  await c.post('/api/auth/guest');
  const a = await c.post('/api/attempts', { taskId: 'f-mates.i1' });
  const m1 = await c.post(`/api/attempts/${a.attemptId}/move`, { uci: 'f6f7' });
  assert.equal(m1.verdict, 'continue');
  assert.equal(m1.reply.san, 'Kh7');
  const m2 = await c.post(`/api/attempts/${a.attemptId}/move`, { uci: 'a1h1' });
  assert.equal(m2.verdict, 'solved');
});

test('exam: one try, 20-hour rest, retention credit, mastery', async () => {
  const c = client();
  await c.post('/api/auth/guest');
  // e-opp exam: fail e1, pass e2 and e3
  const f = await solveOnce(c, 'e-opp.e1', ['d2d3']);
  assert.equal(f.verdict, 'failed');
  assert.deepEqual(f.solution, ['Kc3']);
  assert.equal((await solveOnce(c, 'e-opp.e2', ['d5e5'])).result.credited, true);
  const q = await c.post('/api/attempts', { taskId: 'e-opp.e3' });
  const ans = await c.post(`/api/attempts/${q.attemptId}/answer`, { option: 1 });
  assert.equal(ans.verdict, 'solved');
  assert.equal(ans.state.lessons['e-opposition'].mastered, false);
  assert.equal(ans.state.lessons['e-opposition'].examBest, 67, 'highest credit is recorded (2 of 3)');
  // immediate retake is refused
  assert.equal((await c.post('/api/attempts', { taskId: 'e-opp.e1' })).status, 423);
  clock += 21 * HOUR;
  const retry = await solveOnce(c, 'e-opp.e1', ['d2c3']);
  assert.equal(retry.result.credited, true);
  assert.equal(retry.state.lessons['e-opposition'].mastered, true);
  // credited positions cannot be farmed
  assert.equal((await c.post('/api/attempts', { taskId: 'e-opp.e1' })).status, 409);
});

test('defeating the tactics guardian opens the Calculation Temple', async () => {
  const c = client();
  await c.post('/api/auth/guest');
  assert.ok(!(await c.get('/api/me')).state.unlocked.includes('calculation'));
  for (const [id, uci] of [['t-boss.1', 'd5c7'], ['t-boss.2', 'a1e1'], ['t-boss.3', 'c4c5'], ['t-boss.4', 'd1d8']]) {
    const r = await solveOnce(c, id, [uci]);
    assert.equal(r.verdict, 'solved', `${id}: ${r.message}`);
  }
  const me = await c.get('/api/me');
  assert.equal(me.state.bosses.tactics?.defeated, true);
  assert.ok(me.state.unlocked.includes('calculation'));
});

test('engine-certified puzzles accept exactly the certified moves', async () => {
  const c = client();
  await c.post('/api/auth/guest');
  // Philidor: any rook drop down the b-file holds; a king move loses
  const a = await c.post('/api/attempts', { taskId: 'e-rook.g1' });
  const wrong = await c.post(`/api/attempts/${a.attemptId}/move`, { uci: 'e8d8' });
  assert.equal(wrong.verdict, 'wrong');
  assert.match(wrong.message, /Stockfish/);
  const right = await c.post(`/api/attempts/${a.attemptId}/move`, { uci: 'b6b3' });
  assert.equal(right.verdict, 'solved');
});

test('walking away from an exam position counts as a miss', async () => {
  const c = client();
  await c.post('/api/auth/guest');
  assert.equal((await c.post('/api/attempts', { taskId: 'f-check.e1' })).status, 200);
  assert.equal((await c.post('/api/attempts', { taskId: 'f-check.e1' })).status, 423);
});

test('nothing can be fabricated through the API', async () => {
  const c = client();
  await c.post('/api/auth/guest');
  const a = await c.post('/api/attempts', { taskId: 'f-check.i1' });
  assert.equal((await c.post(`/api/attempts/${a.attemptId}/move`, { uci: 'zz' })).verdict, 'continue');
  assert.equal((await c.post(`/api/attempts/${a.attemptId}/move`, { uci: 'a1a8' })).message, 'Illegal move.');
  assert.equal((await c.post('/api/attempts', { taskId: 'no-such-task' })).status, 404);
  assert.equal((await c.patch('/api/settings', { boardTheme: 'obsidian' })).status, 403);
  assert.equal((await c.patch('/api/profile', { emblem: '♚' })).status, 403);
  assert.equal((await c.post('/api/progress/import', { xp: 99999 })).status, 404);
  // another user's attempt id is invisible
  const other = client();
  await other.post('/api/auth/guest');
  assert.equal((await other.post(`/api/attempts/${a.attemptId}/move`, { uci: 'h5f7' })).status, 404);
  assert.equal((await c.get('/api/me')).state.xp, 0);
});

test('play-outs are verified from the move list', async () => {
  const c = client();
  await c.post('/api/auth/guest');
  assert.equal((await c.post('/api/playouts', { taskId: 'f-mates.a1', moves: ['Qd5+', 'Kxd5'] })).status, 422);
  assert.equal((await c.post('/api/playouts', { taskId: 'f-mates.a1', moves: ['Qd2', 'Ke5'] })).status, 422);
  // hold play-out: find an attacker move that hangs the pawn and check it is rejected
  // search a short line: perfect defence by Black, then a White move that hangs the pawn
  const fen0 = '8/8/8/4k3/8/4PK2/8/8 b - - 0 1';
  const hangs = (fen: string, m: string) => { const t = new Chess(fen); t.move(m); return t.moves({ verbose: true }).find((x) => x.captured === 'p'); };
  let forgedLine: string[] | null = null;
  const dfs = (fen: string, line: string[], depth: number) => {
    if (forgedLine || depth > 6) return;
    const c0 = new Chess(fen);
    if (c0.turn() === 'b') {
      for (const m of c0.moves()) if (kpkAfter(fen, m) === 'draw') { const n = new Chess(fen); n.move(m); dfs(n.fen(), [...line, m], depth + 1); }
    } else {
      for (const m of c0.moves()) {
        const grab = hangs(fen, m);
        if (grab) { forgedLine = [...line, m, grab.san]; return; }
      }
      for (const m of c0.moves().filter((x) => !hangs(fen, x)).slice(0, 2)) { const n = new Chess(fen); n.move(m); dfs(n.fen(), [...line, m], depth + 1); }
    }
  };
  dfs(fen0, [], 0);
  assert.ok(forgedLine, 'expected to find an attacker move that hangs the pawn');
  assert.ok(probeKpk(fen0));
  const forged = await c.post('/api/playouts', { taskId: 'e-opp.a2', moves: forgedLine });
  assert.equal(forged.status, 422);
  assert.match(forged.error, /solver/);
  // a genuine winning promotion line against a defender that always keeps the draw when possible is accepted
  const task = { fen: '8/8/2k5/8/8/2K5/2P5/8 w - - 0 1' };
  const c2 = new Chess(task.fen);
  const moves: string[] = [];
  for (let i = 0; i < 80 && moves.length < 60; i++) {
    const fen = c2.fen();
    const opts = c2.moves();
    let pick: string;
    if (c2.turn() === 'w') {
      const promos = opts.filter((m) => m.includes('=Q') && kpkAfter(fen, m) === 'win');
      pick = promos[0] ?? opts.filter((m) => kpkAfter(fen, m) === 'win').sort((a, b) => (b.startsWith('c') ? 1 : 0) - (a.startsWith('c') ? 1 : 0))[0];
    } else {
      const holds = opts.filter((m) => kpkAfter(fen, m) === 'draw');
      pick = (holds.length ? holds : opts)[0];
    }
    c2.move(pick);
    moves.push(pick);
    if (pick.includes('=')) break;
  }
  assert.ok(moves.at(-1)!.includes('=Q'), `line did not promote: ${moves.join(' ')}`);
  assert.ok(moves.filter((_, i) => i % 2 === 0).length <= 20, `line too long: ${moves.join(' ')}`);
  const ok = await c.post('/api/playouts', { taskId: 'e-opp.a1', moves });
  assert.equal(ok.status, 200, ok.error);
  assert.ok(ok.result.xp > 0);
});

test('accounts: guest upgrade keeps progress, login, logout', async () => {
  const c = client();
  await c.post('/api/auth/guest');
  await solveOnce(c, 'f-check.i1', ['h5f7']);
  assert.equal((await c.post('/api/auth/register', { username: 'ab', password: 'x' })).status, 400);
  const reg = await c.post('/api/auth/register', { username: 'magnus_fan', password: 'correct horse' });
  assert.equal(reg.user.guest, false);
  assert.ok(reg.state.xp >= 10);
  assert.equal((await client().post('/api/auth/register', { username: 'MAGNUS_FAN', password: 'whatever123' })).status, 409);
  await c.post('/api/auth/logout');
  assert.equal((await c.get('/api/me')).status, 401);
  const d = client();
  assert.equal((await d.post('/api/auth/login', { username: 'magnus_fan', password: 'wrong pass' })).status, 401);
  const ok = await d.post('/api/auth/login', { username: 'magnus_fan', password: 'correct horse' });
  assert.ok(ok.state.xp >= 10);
});

test('account management: change password, revoke other devices, delete', async () => {
  const a = client();
  await a.post('/api/auth/guest');
  await a.post('/api/auth/register', { username: 'acct_owner', password: 'first-password' });
  const b = client();
  await b.post('/api/auth/login', { username: 'acct_owner', password: 'first-password' });
  assert.equal((await a.get('/api/account')).activeSessions, 2);
  assert.equal((await a.post('/api/account/password', { current: 'wrong-one!', next: 'second-password' })).status, 401);
  assert.equal((await a.post('/api/account/password', { current: 'first-password', next: 'short' })).status, 400);
  const ch = await a.post('/api/account/password', { current: 'first-password', next: 'second-password' });
  assert.equal(ch.otherSessionsSignedOut, 1);
  assert.equal((await b.get('/api/me')).status, 401, 'the other device is signed out');
  assert.equal((await a.get('/api/me')).status, 200, 'this device stays signed in');
  const c = client();
  assert.equal((await c.post('/api/auth/login', { username: 'acct_owner', password: 'first-password' })).status, 401);
  assert.equal((await c.post('/api/auth/login', { username: 'acct_owner', password: 'second-password' })).status, 200);
  assert.equal((await a.post('/api/account/sessions/revoke-others')).signedOut, 1);
  // deletion needs the word and the password
  assert.equal((await a.post('/api/account/delete', { password: 'second-password' })).status, 400);
  assert.equal((await a.post('/api/account/delete', { password: 'nope-nope', confirm: 'DELETE' })).status, 401);
  assert.equal((await a.post('/api/account/delete', { password: 'second-password', confirm: 'DELETE' })).deleted, true);
  assert.equal((await a.get('/api/me')).status, 401);
  assert.equal((await client().post('/api/auth/login', { username: 'acct_owner', password: 'second-password' })).status, 401);
  // the username is free again
  assert.equal((await client().post('/api/auth/register', { username: 'acct_owner', password: 'brand-new-pass' })).status, 200);
});

test('CSRF: cross-origin and non-JSON writes are refused', async () => {
  const c = client();
  await c.post('/api/auth/guest');
  assert.equal((await c.post('/api/rush', { score: 5 }, { Origin: 'https://evil.example' })).status, 403);
  const res = await fetch(base + '/api/auth/guest', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' });
  assert.equal(res.status, 415);
});

test('games must be legal and their results consistent', async () => {
  const c = client();
  await c.post('/api/auth/guest');
  const mate = '1. f3 e5 2. g4 Qh4# 0-1';
  assert.equal((await c.post('/api/games', { pgn: mate, color: 'w', result: 'win', reason: 'checkmate', skill: 3 })).status, 422);
  assert.equal((await c.post('/api/games', { pgn: mate, color: 'b', result: 'win', reason: 'checkmate', skill: 9 })).status, 200);
  assert.equal((await c.post('/api/games', { pgn: '1. e4 e5 2. Ke3', color: 'w', result: 'win', reason: 'checkmate', skill: 9 })).status, 422);
  const me = await c.get('/api/me');
  assert.ok(me.state.achievements['giant-slayer']);
});

test('guess-the-move is scored by the server', async () => {
  const c = client();
  await c.post('/api/auth/guest');
  const g = new Chess();
  g.loadPgn('1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0');
  const white = g.history({ verbose: true }).filter((m) => m.color === 'w').map((m) => m.san);
  const r = await c.post('/api/guess', { gameId: 'opera-1858', side: 'w', guesses: white });
  assert.equal(r.pct, 100);
  assert.equal((await c.post('/api/guess', { gameId: 'opera-1858', side: 'w', guesses: ['e4'] })).status, 400);
});
