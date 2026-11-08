// Chessverse Academy server. Run: npm run server  (production: npm start after npm run build)
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { backupDatabase, pruneBackups } from './backup.ts';
import { log } from './log.ts';

const here = dirname(fileURLToPath(import.meta.url));
const dbFile = resolve(process.env.CHESSVERSE_DB ?? resolve(here, '../data/chessverse.db'));
const backupDir = resolve(process.env.CHESSVERSE_BACKUPS ?? resolve(dirname(dbFile), 'backups'));
mkdirSync(dirname(dbFile), { recursive: true });
const port = Number(process.env.PORT ?? 8787);
const production = process.env.NODE_ENV === 'production' || process.argv.includes('--production');
const KEEP_DAILY = Number(process.env.CHESSVERSE_KEEP_BACKUPS ?? 14);

const { server, store } = createApp({
  dbFile,
  backupDir,
  staticDir: production ? resolve(here, '../dist') : undefined,
  secureCookies: process.env.COOKIE_SECURE === '1',
  trustProxy: process.env.TRUST_PROXY === '1',
  sourceUrl: process.env.SOURCE_URL || undefined,
  allowedOrigins: production ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173'],
});

const m = store.migration;
log.info('database', { file: dbFile, schema: m.to, applied: m.applied, preMigrationBackup: m.backup });

// housekeeping every hour; a backup once a day (and once at start-up), keeping the newest KEEP_DAILY
const housekeeping = () => {
  try { log.info('cleanup', store.cleanup(Date.now())); } catch (e) { log.error('cleanup failed', { error: (e as Error).message }); }
};
const dailyBackup = () => {
  try {
    const file = backupDatabase(store.db, backupDir, 'daily');
    const pruned = pruneBackups(backupDir, 'daily-', KEEP_DAILY);
    log.info('backup', { file, pruned: pruned.length });
  } catch (e) { log.error('backup failed', { error: (e as Error).message }); }
};
housekeeping();
dailyBackup();
setInterval(housekeeping, 3600_000).unref();
setInterval(dailyBackup, 24 * 3600_000).unref();

server.listen(port, () => log.info('listening', { url: `http://localhost:${port}`, mode: production ? 'production' : 'api-only (use the Vite dev server)' }));

const shutdown = (signal: string) => {
  log.info('shutting down', { signal });
  server.close(() => { store.close(); process.exit(0); });
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
