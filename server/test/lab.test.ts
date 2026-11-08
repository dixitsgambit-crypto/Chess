// Opening Laboratory: server storage, validation, stale-write protection, merge rules.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { readFileSync } from 'node:fs';
import { createApp } from '../app.ts';
import { mergeLab, type LabData } from '../../src/academy/lab-merge.ts';

const app = createApp({ dbFile: ':memory:' });
let base = '';
before(async () => { await new Promise<void>((r) => app.server.listen(0, r)); base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`; });
after(() => app.server.close());

function client() {
  let cookie = '';
  return async (method: string, path: string, body?: unknown) => {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: method === 'GET' ? undefined : JSON.stringify(body ?? {}) });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, ...((await res.json().catch(() => ({}))) as Record<string, any>) } as Record<string, any> & { status: number };
  };
}

const PGN = '[Event "Test"]\n\n1. e4 e5 2. Nf3 Nc6 *';
const lab = (over: Partial<LabData> = {}): LabData => ({ sources: [{ name: 'mine.pgn', text: PGN }], notes: {}, stats: {}, side: 'auto', ...over });

test('laboratory data is saved per player and survives reload', async () => {
  const c = client();
  await c('POST', '/api/auth/guest');
  assert.deepEqual((await c('GET', '/api/lab')).data, null);
  const saved = await c('PUT', '/api/lab', { data: lab(), baseUpdatedAt: 0 });
  assert.equal(saved.status, 200);
  const got = await c('GET', '/api/lab');
  assert.equal(got.data.sources[0].name, 'mine.pgn');
  assert.equal(got.updatedAt, saved.updatedAt);
  // another player sees nothing of it
  const other = client();
  await other('POST', '/api/auth/guest');
  assert.equal((await other('GET', '/api/lab')).data, null);
});

test('a stale write from another device is refused, not applied', async () => {
  const c = client();
  await c('POST', '/api/auth/guest');
  const first = await c('PUT', '/api/lab', { data: lab(), baseUpdatedAt: 0 });
  await c('PUT', '/api/lab', { data: lab({ side: 'b' }), baseUpdatedAt: first.updatedAt });
  const stale = await c('PUT', '/api/lab', { data: lab({ side: 'w' }), baseUpdatedAt: first.updatedAt });
  assert.equal(stale.status, 409);
  assert.equal((await c('GET', '/api/lab')).data.side, 'b');
});

test('uploads are validated: real PGN only, size and count limits', async () => {
  const c = client();
  await c('POST', '/api/auth/guest');
  assert.equal((await c('PUT', '/api/lab', { data: lab({ sources: [{ name: 'junk.pgn', text: 'hello there' }] }) })).status, 400);
  assert.equal((await c('PUT', '/api/lab', { data: lab({ sources: Array.from({ length: 21 }, (_, i) => ({ name: `f${i}.pgn`, text: PGN })) }) })).status, 400);
  assert.equal((await c('PUT', '/api/lab', { data: lab({ sources: [{ name: 'big.pgn', text: PGN + ' '.repeat(600 * 1024) }] }) })).status, 400);
  // the real built-in repertoire file is accepted as an upload
  const blackmood = readFileSync(new URL('../../public/repertoire/blackmood.pgn', import.meta.url), 'utf8');
  assert.equal((await c('PUT', '/api/lab', { data: lab({ sources: [{ name: 'blackmood copy.pgn', text: blackmood }] }) })).status, 200);
});

test('merging browser data never removes or overwrites server data', () => {
  const server = lab({ notes: { k1: { key: 'k1', moves: '1.e4', text: 'server note', updated: 1 } }, side: 'b' });
  const browser = lab({
    sources: [{ name: 'mine.pgn', text: PGN.replace('Nc6', 'd6') }, { name: 'new.pgn', text: PGN.replace('e4 e5', 'd4 d5') }, { name: 'copy-of-mine.pgn', text: PGN }],
    notes: { k1: { key: 'k1', moves: '1.e4', text: 'browser note', updated: 2 }, k2: { key: 'k2', moves: '1.d4', text: 'extra', updated: 2 } },
    side: 'w',
  });
  const { merged, added } = mergeLab(server, browser);
  assert.deepEqual(merged.sources.map((s) => s.name), ['mine.pgn', 'mine.pgn (from this browser)', 'new.pgn']);
  assert.equal(merged.sources[0].text, PGN, 'the server copy is untouched');
  assert.equal(merged.notes.k1.text, 'server note');
  assert.equal(merged.notes.k2.text, 'extra');
  assert.equal(merged.side, 'b');
  assert.equal(added, 3);
  // merging the same data again adds nothing
  assert.equal(mergeLab(merged, browser).added, 0);
});
