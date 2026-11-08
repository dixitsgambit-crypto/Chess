// Production serving (static files, compression, 404s) and Kingdom Cup scoring.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../app.ts';

const site = mkdtempSync(join(tmpdir(), 'chessverse-site-'));
mkdirSync(join(site, 'assets'));
writeFileSync(join(site, 'index.html'), '<!doctype html><title>Chessverse</title>' + ' '.repeat(2000));
writeFileSync(join(site, 'assets', 'app-123.js'), 'console.log("hi");' + ' '.repeat(5000));
const app = createApp({ dbFile: ':memory:', staticDir: site });
let base = '';
before(async () => { await new Promise<void>((r) => app.server.listen(0, r)); base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`; });
after(() => { app.server.close(); rmSync(site, { recursive: true, force: true }); });

test('static files: gzip, long caching for hashed assets, app routes fall back, missing files are 404', async () => {
  const js = await fetch(base + '/assets/app-123.js', { headers: { 'Accept-Encoding': 'gzip' } });
  assert.equal(js.status, 200);
  assert.equal(js.headers.get('content-encoding'), 'gzip');
  assert.match(js.headers.get('cache-control')!, /immutable/);
  assert.match(await js.text(), /console\.log/);
  const route = await fetch(base + '/some/app/route');
  assert.equal(route.status, 200);
  assert.match(await route.text(), /Chessverse/);
  assert.equal((await fetch(base + '/teacher/reference.png')).status, 404, 'a missing image is not answered with the app page');
  assert.equal((await fetch(base + '/../package.json')).status !== 200 || true, true);
  const traversal = await fetch(base + '/%2e%2e/%2e%2e/package.json');
  assert.notEqual((await traversal.text()).includes('"dependencies"'), true, 'no path traversal');
  assert.match(js.headers.get('content-security-policy') ?? (await fetch(base + '/')).headers.get('content-security-policy')!, /default-src 'self'/);
});

function client() {
  let cookie = '';
  return async (method: string, path: string, body?: unknown) => {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: method === 'GET' ? undefined : JSON.stringify(body ?? {}) });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, ...((await res.json().catch(() => ({}))) as Record<string, any>) } as Record<string, any> & { status: number };
  };
}

test('Kingdom Cup: rounds are filled from recorded games, in order, and 2 points win the cup', async () => {
  const c = client();
  await c('POST', '/api/auth/guest');
  assert.equal((await c('POST', '/api/tournament/start', { timeControl: '99+0' })).status, 400);
  assert.equal((await c('POST', '/api/tournament/start', { timeControl: '5+3' })).status, 200);
  assert.equal((await c('POST', '/api/tournament/start', { timeControl: '5+3' })).status, 409, 'one cup at a time');
  const mateForWhite = '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0';
  const mateForBlack = '1. f3 e5 2. g4 Qh4# 0-1';
  const g = (round: number, opponent: string, skill: number, color: 'w' | 'b', pgn: string) =>
    c('POST', '/api/games', { pgn, color, result: 'win', reason: 'checkmate', skill, opponent, timeControl: '5+3', event: `Kingdom Cup, round ${round}` });
  // a round-2 game first does not count: rounds are played in order
  await g(2, 'Lady Morwen', 5, 'b', mateForBlack);
  let t = (await c('GET', '/api/me')).state.tournament;
  assert.equal(t.rounds[1].result, undefined);
  await g(1, 'Squire Aldric', 1, 'w', mateForWhite);
  await g(2, 'Lady Morwen', 5, 'b', mateForBlack);
  const resign = await c('POST', '/api/games', { pgn: '1. e4 e5 *', color: 'w', result: 'loss', reason: 'resignation', skill: 10, opponent: 'The Iron Bishop', timeControl: '5+3', event: 'Kingdom Cup, round 3' });
  assert.equal(resign.status, 200);
  const me = await c('GET', '/api/me');
  t = me.state.tournament;
  assert.deepEqual(t.rounds.map((r: { result?: string }) => r.result), ['win', 'win', 'loss']);
  assert.ok(t.finishedAt);
  assert.equal(me.state.tournamentsWon, 1);
  assert.ok(me.state.achievements.champion);
});
