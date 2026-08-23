import { test, expect } from '@playwright/test';

/**
 * Verifies the Home surface never blank-screens when the DHF brain or the
 * mmora feed injection wiring fails (function 500, quota error, or offline).
 */
const failBrain = async (page: import('@playwright/test').Page, status: number, body: unknown) => {
  await page.route('**/functions/v1/zoe-dhf-brain', (route) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }),
  );
};

test.describe('DHF feed wiring failures', () => {
  test('home renders when zoe-dhf-brain returns 500', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await failBrain(page, 500, { error: 'internal_error' });

    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const body = await page.locator('body').innerText();
    expect(body.trim().length).toBeGreaterThan(0);
    expect(errors.join('\n')).not.toMatch(/Minified React error #(130|31)/);
  });

  test('home renders when feed table queries fail', async ({ page }) => {
    await page.route('**/rest/v1/mmora_feed_items**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'rls_violation' }) }),
    );
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('home renders when the brain endpoint is unreachable', async ({ page }) => {
    await page.route('**/functions/v1/zoe-dhf-brain', (route) => route.abort('failed'));
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await expect(page.locator('body')).toBeVisible();
  });
});
