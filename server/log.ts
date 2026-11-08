/**
 * Minimal structured logger: one JSON object per line on stdout/stderr.
 * Never pass passwords, tokens, cookies, request bodies or exercise answers to it.
 * LOG_LEVEL=debug|info|warn|error (default info); LOG_LEVEL=silent turns it off (tests).
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 } as const;
type Level = Exclude<keyof typeof LEVELS, 'silent'>;
const threshold = LEVELS[(process.env.LOG_LEVEL as keyof typeof LEVELS) ?? 'info'] ?? LEVELS.info;

function write(level: Level, msg: string, fields?: Record<string, unknown>) {
  if (LEVELS[level] < threshold) return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...fields });
  (level === 'error' || level === 'warn' ? process.stderr : process.stdout).write(line + '\n');
}

export const log = {
  debug: (m: string, f?: Record<string, unknown>) => write('debug', m, f),
  info: (m: string, f?: Record<string, unknown>) => write('info', m, f),
  warn: (m: string, f?: Record<string, unknown>) => write('warn', m, f),
  error: (m: string, f?: Record<string, unknown>) => write('error', m, f),
};
