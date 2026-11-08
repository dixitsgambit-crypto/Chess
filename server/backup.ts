/**
 * Consistent SQLite backups with VACUUM INTO. Unlike copying the .db file, this includes
 * everything still in the write-ahead log and produces a compact, self-contained file.
 *
 *   npm run backup                 one-off backup into data/backups
 * Restore: stop the server, copy a backup over data/chessverse.db, delete the -wal/-shm
 * files next to it, start the server.
 */
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';

const stamp = (t: number) => new Date(t).toISOString().replace(/[:.]/g, '-').replace('Z', '');

export function backupDatabase(db: DatabaseSync, dir: string, label: string, now = Date.now()): string {
  mkdirSync(dir, { recursive: true });
  const file = resolve(join(dir, `${label}-${stamp(now)}.db`));
  db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  return file;
}

/** Keep the newest `keep` files whose names start with `prefix`; never touches other backups. */
export function pruneBackups(dir: string, prefix: string, keep: number): string[] {
  let files: string[];
  try { files = readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith('.db')); } catch { return []; }
  const sorted = files.map((f) => ({ f, t: statSync(join(dir, f)).mtimeMs })).sort((a, b) => b.t - a.t);
  const removed = sorted.slice(keep).map((x) => x.f);
  for (const f of removed) rmSync(join(dir, f));
  return removed;
}
