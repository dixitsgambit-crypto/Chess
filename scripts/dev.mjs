// Runs the API server (restarting on changes) and the Vite dev server together.
import { spawn } from 'node:child_process';

const children = [
  // the API always uses 8787 in development (vite.config.ts proxies /api there), whatever PORT says
  spawn(process.execPath, ['--watch', '--experimental-strip-types', 'server/index.ts'], { stdio: 'inherit', env: { ...process.env, PORT: '8787' } }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { stdio: 'inherit' }),
];
const stop = () => { for (const c of children) c.kill(); process.exit(); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
for (const c of children) c.on('exit', (code) => { if (code) stop(); });
