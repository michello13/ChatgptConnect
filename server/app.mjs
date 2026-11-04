import express from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppError } from './database.mjs';

export function createApp(store, { adminPin = '1234', staticDir = resolve('dist') } = {}) {
  const app = express();
  const sessions = new Map();
  const attempts = new Map();
  app.disable('x-powered-by');
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', (req, res, next) => {
    if (['POST', 'PATCH', 'DELETE'].includes(req.method)) {
      // Reject cross-site browser requests; non-browser clients can call the API directly.
      const origin = req.get('origin');
      if (origin) {
        let originHost;
        try {
          originHost = new URL(origin).host;
        } catch {
          return res.status(403).json({ error: 'Invalid origin.' });
        }
        if (originHost !== req.get('host'))
          return res.status(403).json({ error: 'Cross-site requests are not allowed.' });
      }
      if (!req.is('application/json'))
        return res.status(415).json({ error: 'Send application/json.' });
    }
    next();
  });
  app.use(express.json({ limit: '32kb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/products', (_req, res) => res.json(store.products()));
  app.post('/api/orders', (req, res) => res.status(201).json(store.placeOrder(req.body ?? {})));
  app.post('/api/admin/login', (req, res) => {
    const now = Date.now();
    for (const [key, entry] of attempts) if (now > entry.until) attempts.delete(key);
    for (const [key, expires] of sessions) if (now > expires) sessions.delete(key);
    const attempt = attempts.get(req.ip) ?? { count: 0, until: now + 60000 };
    if (attempt.count >= 10)
      return res.status(429).json({ error: 'Too many attempts. Try again in a minute.' });
    const entered = Buffer.from(typeof req.body?.pin === 'string' ? req.body.pin : '');
    const expected = Buffer.from(adminPin);
    if (entered.length !== expected.length || !timingSafeEqual(entered, expected)) {
      attempt.count++;
      attempts.set(req.ip, attempt);
      return res.status(401).json({ error: 'Incorrect PIN. Try again.' });
    }
    attempts.delete(req.ip);
    const token = randomBytes(32).toString('hex');
    sessions.set(token, now + 8 * 60 * 60 * 1000);
    res.cookie('honesty_session', token, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/api/admin',
      maxAge: 8 * 60 * 60 * 1000,
    });
    res.json({ ok: true });
  });
  app.use('/api/admin', (req, res, next) => {
    const token = req.headers.cookie
      ?.split(';')
      .map((x) => x.trim())
      .find((x) => x.startsWith('honesty_session='))
      ?.slice('honesty_session='.length);
    if (!token || (sessions.get(token) ?? 0) < Date.now())
      return res.status(401).json({ error: 'Sign in to the admin panel.' });
    req.adminToken = token;
    next();
  });
  app.post('/api/admin/logout', (req, res) => {
    sessions.delete(req.adminToken);
    res.clearCookie('honesty_session', { path: '/api/admin' });
    res.json({ ok: true });
  });
  app.get('/api/admin/orders', (_req, res) => res.json(store.orders()));
  app.post('/api/admin/products', (req, res) =>
    res.status(201).json(store.addProduct(req.body ?? {})),
  );
  app.patch('/api/admin/products/:id/stock', (req, res) =>
    res.json(store.updateStock(Number(req.params.id), req.body ?? {})),
  );
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
  if (existsSync(resolve(staticDir, 'index.html'))) {
    app.use(express.static(staticDir));
    app.get('/', (_req, res) => res.sendFile(resolve(staticDir, 'index.html')));
  } else {
    app.get('/', (_req, res) =>
      res.status(503).send('Run npm run dev, or npm run build before npm start.'),
    );
  }
  app.use((error, _req, res, _next) => {
    const status = error instanceof AppError ? error.status : error.status === 400 ? 400 : 500;
    if (status === 500) console.error(error);
    res
      .status(status)
      .json({ error: status === 500 ? 'Something went wrong. Please try again.' : error.message });
  });
  return app;
}
