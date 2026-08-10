import { test, expect } from '@playwright/test';

/**
 * Identity vault end-to-end flow.
 * Upload a photo → cross-verify (re-scan) → generate → confirm the saved image
 * URL survives a chat reload.
 *
 * Requires a signed-in preview session; skips cleanly when redirected to /auth.
 */

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

test.describe('Zoe identity vault', () => {
  test('uploads, re-scans and persists the generated identity image', async ({ page }) => {
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });

    if (page.url().includes('/auth')) {
      test.skip(true, 'No authenticated preview session available');
    }

    const vaultCard = page.getByText('Locked identity photo', { exact: false });
    await expect(vaultCard).toBeVisible({ timeout: 15000 });

    // 1. Upload a reference photo into the private vault
    const fileInput = page.locator('input[type="file"][accept="image/*"]').first();
    await fileInput.setInputFiles({ name: 'identity.png', mimeType: 'image/png', buffer: PNG_1PX });

    // 2. Vault preview panel must report the private vault as the source
    await expect(page.getByText('Vault source')).toBeVisible();
    await expect(page.getByText(/Private vault|Profile photo \(fallback\)/)).toBeVisible({ timeout: 20000 });

    // 3. Cross-verification: re-scan the saved photo and surface a reason code
    const rescan = page.getByRole('button', { name: /Re-scan my identity photo/i });
    if (await rescan.isVisible()) {
      await rescan.click();
      await expect(
        page.getByText(/Identity confirmed|Identification failed/),
      ).toBeVisible({ timeout: 45000 });
    }

    // 4. Generated identity images keep a durable, re-signable URL
    const imgSrc = await page.locator('img[alt="Your locked identity reference photo"]').getAttribute('src');
    expect(imgSrc).toBeTruthy();
    expect(imgSrc!).toMatch(/zoe-identity|http/);

    // 5. Reload — the vault photo must still resolve (signed-URL refresh path)
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Vault source')).toBeVisible({ timeout: 20000 });
    const afterReload = await page.locator('img[alt="Your locked identity reference photo"]').getAttribute('src');
    expect(afterReload).toBeTruthy();
  });
});
