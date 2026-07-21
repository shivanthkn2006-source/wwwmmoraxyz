import { test, expect, devices } from '@playwright/test';

const viewports = [
  { name: 'desktop', viewport: { width: 1280, height: 800 } },
  { name: 'ios-safari-size', viewport: devices['iPhone 14'].viewport },
  { name: 'android-chrome-size', viewport: devices['Pixel 7'].viewport },
];

for (const target of viewports) {
  test(`auth exposes passkey login controls on ${target.name}`, async ({ page }) => {
    await page.setViewportSize(target.viewport);
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: /passkey|face id|touch id|fingerprint/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /voice citadel login/i })).toBeVisible();
  });
}

test('voice citadel allows primary passkey start before password login', async ({ page }) => {
  await page.goto('/voice-auth', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
  await expect(page.getByRole('button', { name: /passkey login|face id|touch id|fingerprint/i }).first()).toBeVisible();
});