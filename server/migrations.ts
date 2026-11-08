/**
 * Versioned, additive database migrations, tracked with SQLite's `user_version`.
 *
 * Rules: migrations only ever ADD (tables, columns, indexes). They never drop or rewrite
 * existing data. Before any pending migration runs on a file database, a full backup is
 * written with VACUUM INTO (which includes the WAL), so a failed upgrade can be restored.
 * Each migration runs in its own transaction together with the version bump.
 */
import type { DatabaseSync } from 'node:sqlite';
import { backupDatabase } from './backup.ts';

export interface Migration { version: number; name: string; up: (db: DatabaseSync) => void }

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'Opening Laboratory data on the server; indexes; users.last_seen',
    up: (db) => db.exec(`
      CREATE TABLE IF NOT EXISTS lab_data (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS attempts_created ON attempts(created_at);
      CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
      ALTER TABLE users ADD COLUMN last_seen INTEGER;
    `),
  },
];

export const LATEST_VERSION = MIGRATIONS.at(-1)?.version ?? 0;

export function schemaVersion(db: DatabaseSync): number {
  return Number((db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version);
}

export interface MigrationReport { from: number; to: number; applied: string[]; backup: string | null }

export function runMigrations(db: DatabaseSync, opts: { file: string; backupDir?: string; now?: number }): MigrationReport {
  const from = schemaVersion(db);
  const pending = MIGRATIONS.filter((m) => m.version > from).sort((a, b) => a.version - b.version);
  let backup: string | null = null;
  if (pending.length && opts.file !== ':memory:' && opts.backupDir) {
    backup = backupDatabase(db, opts.backupDir, `pre-migration-v${from}-to-v${pending.at(-1)!.version}`, opts.now);
  }
  const applied: string[] = [];
  for (const m of pending) {
    db.exec('BEGIN IMMEDIATE');
    try {
      m.up(db);
      db.exec(`PRAGMA user_version = ${m.version}`);
      db.exec('COMMIT');
      applied.push(`v${m.version}: ${m.name}`);
    } catch (e) {
      db.exec('ROLLBACK');
      throw new Error(`Migration v${m.version} (${m.name}) failed and was rolled back${backup ? `; backup at ${backup}` : ''}: ${(e as Error).message}`);
    }
  }
  return { from, to: schemaVersion(db), applied, backup };
}
