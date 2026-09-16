import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

/**
 * Playwright config for blank-screen smoke tests.
 * Targets the live preview URL by default; override with PLAYWRIGHT_BASE_URL.
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://www.mmora.xyz';
const SYSTEM_CHROMIUM = '/opt/ms-playwright/chromium-1194/chrome-linux/chrome';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    headless: true,
    launchOptions: existsSync(SYSTEM_CHROMIUM) ? { executablePath: SYSTEM_CHROMIUM } : undefined,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
