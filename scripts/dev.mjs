import { spawn } from 'node:child_process';
const backend = spawn(process.execPath, ['--watch', 'server/index.mjs'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: process.env.API_PORT || '3001' },
});
const frontend = spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { stdio: 'inherit' });
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  backend.kill();
  frontend.kill();
  process.exitCode = code;
}
for (const child of [backend, frontend]) child.on('exit', (code) => stop(code ?? 1));
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
