// One-off consistent backup of the Chessverse database:  npm run backup
// Safe while the server is running (VACUUM INTO reads a consistent snapshot, including the WAL).
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { backupDatabase } from '../server/backup.ts';

const here = dirname(fileURLToPath(import.meta.url));
const dbFile = resolve(process.env.CHESSVERSE_DB ?? resolve(here, '../data/chessverse.db'));
if (!existsSync(dbFile)) { console.error(`No database at ${dbFile}`); process.exit(1); }
const dir = resolve(process.env.CHESSVERSE_BACKUPS ?? resolve(dirname(dbFile), 'backups'));
const db = new DatabaseSync(dbFile, { readOnly: true });
const file = backupDatabase(db, dir, 'manual');
db.close();
console.log(`Backup written: ${file}`);
