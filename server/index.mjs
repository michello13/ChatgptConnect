import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore } from './database.mjs';
import { createApp } from './app.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const store = openStore(process.env.DB_PATH || resolve(root, 'data/honesty-box.sqlite'));
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
const pin = process.env.ADMIN_PIN || '1234';
if (pin === '1234') console.log('Local demo admin PIN: 1234. Set ADMIN_PIN in .env to change it.');
const server = createApp(store, { adminPin: pin, staticDir: resolve(root, 'dist') }).listen(
  port,
  host,
  () => {
    console.log(`Honesty Box API listening on http://${host}:${port}`);
  },
);
server.on('error', (error) => {
  console.error(error.message);
  store.close();
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    server.close(() => {
      store.close();
      process.exit(0);
    }),
  );
