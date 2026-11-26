import { validPhoto } from './photos.mjs';
import express from 'express';
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppError } from './database.mjs';

export function createApp(store, { adminPin = '1234', staticDir = resolve('dist'), production = false } = {}) {
  const app = express();
  const sessions = new Map();
  const hash = token => createHash('sha256').update(token).digest('hex');
  if (production && (!adminPin || adminPin.length < 16)) throw new Error('Production credential required');
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
  app.use('/api/admin/products', express.json({ limit: '128kb' }));
  app.use(express.json({ limit: '32kb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/products', async (_req, res) => res.json(await store.products()));
  app.get('/api/products/:id/photo', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.sendStatus(404);
    const photo = await store.photo(id);
    if (!validPhoto(photo)) return res.sendStatus(404);
    res.set('X-Content-Type-Options', 'nosniff');
    res.type('image/jpeg').send(Buffer.from(photo.slice('data:image/jpeg;base64,'.length), 'base64'));
  });
  app.get('/api/announcement', async (_req,res) => res.json({message:await store.announcement()}));
  app.post('/api/wishes', async (req,res) => res.status(201).json(await store.sendWishes(req.body ?? {})));
  app.post('/api/orders', async (req, res) => res.status(201).json(await store.placeOrder(req.body ?? {})));
  app.post('/api/admin/login', async (req, res) => {
    const now = Date.now();
    for (const [key, entry] of attempts) if (now > entry.until) attempts.delete(key);
    for (const [key, expires] of sessions) if (now > expires) sessions.delete(key);
    const attempt = attempts.get(req.ip) ?? { count: 0, until: now + 60000 };
    const key = production ? (req.get('x-vercel-forwarded-for') || req.ip) : req.ip;
    if (production ? (await store.loginAttempt(key, now)) > 10 : attempt.count >= 10)
      return res.status(429).json({ error: 'Too many attempts. Try again in a minute.' });
    const entered = Buffer.from(typeof req.body?.pin === 'string' ? req.body.pin : '');
    const expected = Buffer.from(adminPin);
    if (entered.length !== expected.length || !timingSafeEqual(entered, expected)) {
      attempt.count++;
      attempts.set(req.ip, attempt);
      return res.status(401).json({ error: 'Incorrect PIN. Try again.' });
    }
    attempts.delete(req.ip);
    if (production) await store.clearAttempts(key);
    const token = randomBytes(32).toString('hex');
    if (production) await store.createSession(hash(token), now + 8 * 60 * 60 * 1000);
    else sessions.set(token, now + 8 * 60 * 60 * 1000);
    res.cookie('honesty_session', token, {
      httpOnly: true,
      secure: production,
      sameSite: 'strict',
      path: '/api/admin',
      maxAge: 8 * 60 * 60 * 1000,
    });
    res.json({ ok: true });
  });
  app.use('/api/admin', async (req, res, next) => {
    const token = req.headers.cookie
      ?.split(';')
      .map((x) => x.trim())
      .find((x) => x.startsWith('honesty_session='))
      ?.slice('honesty_session='.length);
    if (!token || (production ? !(await store.sessionValid(hash(token), Date.now())) : (sessions.get(token) ?? 0) < Date.now()))
      return res.status(401).json({ error: 'Sign in to the admin panel.' });
    req.adminToken = token;
    next();
  });
  app.post('/api/admin/logout', async (req, res) => {
    if (production) await store.deleteSession(hash(req.adminToken));
    else sessions.delete(req.adminToken);
    res.clearCookie('honesty_session', { path: '/api/admin' });
    res.json({ ok: true });
  });
  app.get('/api/admin/wishes', async (_req,res) => res.json(await store.wishes()));
  app.patch('/api/admin/wishes/:id/archive', async (req,res) => res.json(await store.archiveWish(req.params.id)));
  app.patch('/api/admin/announcement', async (req,res) => res.json({message:await store.setAnnouncement(req.body?.message)}));
  app.get('/api/admin/orders', async (_req, res) => res.json(await store.orders()));
  app.post('/api/admin/products', async (req, res) =>
    res.status(201).json(await store.addProduct(req.body ?? {})),
  );
  app.patch('/api/admin/products/:id/photo', async (req, res) =>
    res.json(await store.updatePhoto(Number(req.params.id), req.body ?? {})),
  );
  app.patch('/api/admin/products/:id/stock', async (req, res) =>
    res.json(await store.updateStock(Number(req.params.id), req.body ?? {})),
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
    const status = error instanceof AppError ? error.status : [400, 413].includes(error.status) ? error.status : 500;
    if (status === 500) console.error(error);
    res
      .status(status)
      .json({ error: status === 500 ? 'Something went wrong. Please try again.' : error.message });
  });
  return app;
}
