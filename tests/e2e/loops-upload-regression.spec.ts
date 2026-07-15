/**
 * Loops upload + home page regression check.
 *
 * Verifies:
 *  1. Home page (/home) mounts without the ErrorBoundary
 *     "Something went wrong" fallback.
 *  2. No `postgres_changes` callback errors are printed to the
 *     console (regression guard for the private_timelines_changes
 *     channel collision that previously killed the page after a
 *     loops video upload).
 *
 * Run with:  bunx playwright test tests/e2e/loops-upload-regression.spec.ts
 */
import { test, expect } from '@playwright/test';

test('home page loads without realtime postgres_changes crash', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  await page.goto('/home', { waitUntil: 'domcontentloaded' });

  // Give hooks time to subscribe to realtime channels
  await page.waitForTimeout(4000);

  // Regression: the ErrorBoundary fallback must not be visible.
  await expect(page.getByText('Something went wrong')).toHaveCount(0);

  // Regression: the specific postgres_changes-after-subscribe error
  // that killed the home page after a loops upload must not appear.
  const realtimeErr = consoleErrors.find((e) =>
    e.includes('postgres_changes') && e.includes('after `subscribe()`'),
  );
  expect(realtimeErr, `Realtime callback error detected: ${realtimeErr}`).toBeUndefined();
});
