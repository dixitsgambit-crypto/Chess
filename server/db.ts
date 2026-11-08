import { DatabaseSync } from 'node:sqlite';
import { freshState, type State } from '../src/academy/progression.ts';
import { runMigrations, type MigrationReport } from './migrations.ts';

export interface UserRow { id: number; username: string | null; pass_hash: string | null; created_at: number; guest: number; last_seen?: number | null }

export class Store {
  db: DatabaseSync;
  migration: MigrationReport;
  constructor(file: string, opts: { backupDir?: string; now?: number } = {}) {
    this.db = new DatabaseSync(file);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE COLLATE NOCASE,
        pass_hash TEXT,
        created_at INTEGER NOT NULL,
        guest INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS progress (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        state TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS attempts (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        task_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        done INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS attempts_user ON attempts(user_id, done);
    `);
    // the statements above are the original (version 0) schema; everything newer is a migration
    this.migration = runMigrations(this.db, { file, backupDir: opts.backupDir, now: opts.now });
  }

  /**
   * Housekeeping. Never deletes users (guest or registered) or progress.
   * - expired sessions are removed;
   * - attempts left open for over a day are closed (an abandoned assessment already counts as a miss);
   * - finished attempts older than 30 days are removed (they are no longer needed for refereeing).
   */
  cleanup(now: number) {
    const day = 24 * 3600 * 1000;
    const sessions = Number(this.db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now).changes);
    const closed = Number(this.db.prepare('UPDATE attempts SET done = 1 WHERE done = 0 AND created_at < ?').run(now - day).changes);
    const removed = Number(this.db.prepare('DELETE FROM attempts WHERE done = 1 AND created_at < ?').run(now - 30 * day).changes);
    return { sessions, closed, removed };
  }

  touchUser(id: number, now: number) {
    // at most one write per user per 10 minutes
    this.db.prepare('UPDATE users SET last_seen = ? WHERE id = ? AND (last_seen IS NULL OR last_seen < ?)').run(now, id, now - 600_000);
  }

  // --- account management
  setPassword(id: number, hash: string) { this.db.prepare('UPDATE users SET pass_hash = ? WHERE id = ?').run(hash, id); }
  dropOtherSessions(userId: number, keepTokenHash: string) {
    return Number(this.db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').run(userId, keepTokenHash).changes);
  }
  countSessions(userId: number, now: number) {
    return Number((this.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ? AND expires_at >= ?').get(userId, now) as { n: number }).n);
  }
  deleteUser(id: number) { this.db.prepare('DELETE FROM users WHERE id = ?').run(id); }

  // --- Opening Laboratory data
  loadLab(userId: number): { data: unknown; updatedAt: number } | null {
    const r = this.db.prepare('SELECT data, updated_at FROM lab_data WHERE user_id = ?').get(userId) as { data: string; updated_at: number } | undefined;
    return r ? { data: JSON.parse(r.data), updatedAt: r.updated_at } : null;
  }
  saveLab(userId: number, data: unknown, now: number) {
    this.db.prepare('INSERT INTO lab_data (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at').run(userId, JSON.stringify(data), now);
  }

  close() { this.db.close(); }

  createUser(now: number, username: string | null = null, passHash: string | null = null): UserRow {
    const r = this.db.prepare('INSERT INTO users (username, pass_hash, created_at, guest) VALUES (?, ?, ?, ?)').run(username, passHash, now, username ? 0 : 1);
    const id = Number(r.lastInsertRowid);
    this.saveState(id, freshState(now), now);
    return this.userById(id)!;
  }
  userById(id: number) { return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined; }
  userByName(name: string) { return this.db.prepare('SELECT * FROM users WHERE username = ?').get(name) as UserRow | undefined; }
  upgradeUser(id: number, username: string, passHash: string) {
    this.db.prepare('UPDATE users SET username = ?, pass_hash = ?, guest = 0 WHERE id = ?').run(username, passHash, id);
  }

  addSession(tokenHash: string, userId: number, expires: number) {
    this.db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(tokenHash, userId, expires);
  }
  sessionUser(tokenHash: string, now: number): UserRow | undefined {
    const s = this.db.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?').get(tokenHash) as { user_id: number; expires_at: number } | undefined;
    if (!s) return undefined;
    if (s.expires_at < now) { this.dropSession(tokenHash); return undefined; }
    return this.userById(s.user_id);
  }
  dropSession(tokenHash: string) { this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash); }
  dropUserSessions(userId: number) { this.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId); }

  loadState(userId: number): State {
    const r = this.db.prepare('SELECT state FROM progress WHERE user_id = ?').get(userId) as { state: string } | undefined;
    return r ? { ...freshState(), ...JSON.parse(r.state) } : freshState();
  }
  saveState(userId: number, s: State, now: number) {
    this.db.prepare('INSERT INTO progress (user_id, state, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at').run(userId, JSON.stringify(s), now);
  }

  putAttempt(id: string, userId: number, taskId: string, data: unknown, now: number) {
    this.db.prepare('INSERT INTO attempts (id, user_id, task_id, data, created_at) VALUES (?, ?, ?, ?, ?)').run(id, userId, taskId, JSON.stringify(data), now);
  }
  getAttempt<T>(id: string, userId: number): { task_id: string; data: T; done: number } | undefined {
    const r = this.db.prepare('SELECT task_id, data, done FROM attempts WHERE id = ? AND user_id = ?').get(id, userId) as { task_id: string; data: string; done: number } | undefined;
    return r && { task_id: r.task_id, data: JSON.parse(r.data) as T, done: r.done };
  }
  updateAttempt(id: string, data: unknown, done: boolean) {
    this.db.prepare('UPDATE attempts SET data = ?, done = ? WHERE id = ?').run(JSON.stringify(data), done ? 1 : 0, id);
  }
  /** Close any other open attempts the user has on this task (one live attempt per position). */
  closeOpenAttempts(userId: number, taskId: string) {
    this.db.prepare('UPDATE attempts SET done = 1 WHERE user_id = ? AND task_id = ? AND done = 0').run(userId, taskId);
  }
  /** Run fn inside one write transaction. */
  tx<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const out = fn(); this.db.exec('COMMIT'); return out; } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
}
