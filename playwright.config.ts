import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    headless: true,
    screenshot: 'only-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3100/api/health',
    env: {
      PORT: '3100',
      API_PORT: '3101',
      ADMIN_PIN: 'test-pin',
      DB_PATH: join(mkdtempSync(join(tmpdir(), 'honesty-browser-')), 'test.sqlite'),
    },
    reuseExistingServer: false,
  },
});
