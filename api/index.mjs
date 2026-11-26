import { createApp } from '../server/app.mjs';
import { openRemoteStore } from '../server/remote.mjs';
let app;
export default async function handler(req, res) {
  try {
    if (!app) {
      const pin = process.env.ADMIN_PIN;
      if (!pin || pin.length < 16) throw new Error('Production admin credential missing or too short');
      app = createApp(openRemoteStore(), { adminPin: pin, production: true });
    }
  } catch (error) {
    console.error('HonestyBox initialization failed');
    return res.status(503).json({ error: 'Service unavailable.' });
  }
  return app(req, res);
}
