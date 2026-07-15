/**
 * Extended loops-upload regression: uploads three synthetic loop videos
 * back-to-back and confirms:
 *  - The home page never falls through to the ErrorBoundary fallback
 *  - No `postgres_changes ... after subscribe()` errors accumulate
 *
 * Notes:
 *  - The hidden <input id="loops-video-upload"> is targeted directly so
 *    we don't have to walk the UI overlay to open the picker.
 *  - The test tolerates the upload being rejected by RLS/auth (public
 *    session may not be able to insert posts); we only assert that the
 *    UI stays interactive across repeated attempts.
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.resolve(__dirname, 'fixtures/tiny-loop.mp4');

test('multiple back-to-back loops uploads do not crash home', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(e.message));

  await page.goto('/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const input = page.locator('#loops-video-upload');
  const inputExists = await input.count();
  test.skip(inputExists === 0, 'loops upload input not mounted on this route/session');

  for (let i = 0; i < 3; i++) {
    await input.setInputFiles(FIXTURE);
    await page.waitForTimeout(2500);

    // After every attempt, the ErrorBoundary must not have taken over.
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  }

  const realtimeErrs = consoleErrors.filter(
    (e) => e.includes('postgres_changes') && e.includes('after `subscribe()`'),
  );
  expect(realtimeErrs, `Cumulative realtime errors: ${realtimeErrs.join(' | ')}`).toHaveLength(0);
});
