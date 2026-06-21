import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for blank-screen smoke tests.
 * Targets the live preview URL by default; override with PLAYWRIGHT_BASE_URL.
 */
const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ||
  'https://id-preview--b9030454-e916-4ad9-be10-f87ad69107c0.lovable.app';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
