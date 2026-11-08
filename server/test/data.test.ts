// Database tests: migrations, backups, persistence across restarts, cleanup.
// Every test uses its own temporary directory; the real data/ folder is never touched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Store } from '../db.ts';
import { LATEST_VERSION, schemaVersion } from '../migrations.ts';
import { backupDatabase, pruneBackups } from '../backup.ts';

const tmp = () => mkdtempSync(join(tmpdir(), 'chessverse-test-'));

/** A database exactly as the pre-migration (version 0) server created it, with some data. */
function makeVersion0(file: string) {
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE COLLATE NOCASE, pass_hash TEXT, created_at INTEGER NOT NULL, guest INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
    CREATE TABLE progress (user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, state TEXT NOT NULL, updated_at INTEGER NOT NULL);
    CREATE TABLE attempts (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, task_id TEXT NOT NULL, data TEXT NOT NULL, created_at INTEGER NOT NULL, done INTEGER NOT NULL DEFAULT 0);
    INSERT INTO users (username, pass_hash, created_at, guest) VALUES ('old_player', 'scrypt$x', 1, 0), (NULL, NULL, 2, 1);
    INSERT INTO progress (user_id, state, updated_at) VALUES (1, '{"v":1,"xp":321}', 1), (2, '{"v":1,"xp":7}', 2);
    INSERT INTO sessions VALUES ('h1', 1, 9999999999999);
  `);
  db.close();
}

test('migrations upgrade an old database without losing data, and back it up first', () => {
  const dir = tmp();
  const file = join(dir, 'old.db');
  makeVersion0(file);
  const store = new Store(file, { backupDir: join(dir, 'backups') });
  assert.equal(store.migration.from, 0);
  assert.equal(schemaVersion(store.db), LATEST_VERSION);
  assert.ok(store.migration.backup, 'a pre-migration backup must be written');
  assert.equal(store.loadState(1).xp, 321);
  assert.equal(store.loadState(2).xp, 7);
  assert.equal(store.userByName('old_player')?.guest, 0);
  // the backup is a readable copy of the version-0 data
  const b = new DatabaseSync(store.migration.backup!, { readOnly: true });
  assert.equal((b.prepare('PRAGMA user_version').get() as { user_version: number }).user_version, 0);
  assert.equal((b.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n, 2);
  b.close();
  store.close();
  // re-opening applies nothing and takes no new backup
  const again = new Store(file, { backupDir: join(dir, 'backups') });
  assert.deepEqual(again.migration.applied, []);
  assert.equal(again.migration.backup, null);
  again.close();
  rmSync(dir, { recursive: true, force: true });
});

test('progress persists across a server restart', () => {
  const dir = tmp();
  const file = join(dir, 'p.db');
  const a = new Store(file);
  const u = a.createUser(1000, 'persist_me', 'hash');
  const s = a.loadState(u.id);
  a.saveState(u.id, { ...s, xp: 42 }, 1001);
  a.saveLab(u.id, { sources: [{ name: 'x.pgn', text: '1. e4 *' }] }, 1002);
  a.close();
  const b = new Store(file);
  assert.equal(b.loadState(u.id).xp, 42);
  assert.deepEqual((b.loadLab(u.id)!.data as { sources: unknown[] }).sources.length, 1);
  b.close();
  rmSync(dir, { recursive: true, force: true });
});

test('backups include un-checkpointed WAL data; pruning keeps the newest', () => {
  const dir = tmp();
  const file = join(dir, 'w.db');
  const store = new Store(file);
  const u = store.createUser(1);
  store.saveState(u.id, { ...store.loadState(u.id), xp: 99 }, 2); // lives in the WAL until checkpoint
  const out = join(dir, 'b');
  const files = [1, 2, 3].map((i) => backupDatabase(store.db, out, 'daily', 1_700_000_000_000 + i * 1000));
  const copy = new DatabaseSync(files[0], { readOnly: true });
  assert.match((copy.prepare('SELECT state FROM progress').get() as { state: string }).state, /"xp":99/);
  copy.close();
  backupDatabase(store.db, out, 'pre-migration-v0-to-v1');
  pruneBackups(out, 'daily-', 2);
  const left = readdirSync(out);
  assert.equal(left.filter((f) => f.startsWith('daily-')).length, 2);
  assert.equal(left.filter((f) => f.startsWith('pre-migration')).length, 1, 'pruning never removes other backups');
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

test('cleanup never deletes users or progress', () => {
  const store = new Store(':memory:');
  const day = 24 * 3600 * 1000;
  const g = store.createUser(0); // a guest
  store.addSession('old', g.id, 10);
  store.putAttempt('a-open', g.id, 't', {}, 0);
  store.putAttempt('a-done', g.id, 't', {}, 0);
  store.updateAttempt('a-done', {}, true);
  const r = store.cleanup(40 * day);
  // the 40-day-old open attempt is closed and then, being older than 30 days, removed with the other one
  assert.deepEqual(r, { sessions: 1, closed: 1, removed: 2 });
  assert.ok(store.userById(g.id), 'guest kept');
  assert.equal(store.loadState(g.id).v, 1, 'progress kept');
  store.close();
});
