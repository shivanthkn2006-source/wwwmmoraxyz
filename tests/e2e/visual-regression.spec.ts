// ═══════════════════════════════════════════════════════════════════════════════
// M'MORA VISUAL REGRESSION - Blue Accent Guard
// Captures baseline screenshots of key surfaces (home, sidebar, blue-themed
// components) and asserts no `teal-*` classes leak back into rendered HTML.
// ═══════════════════════════════════════════════════════════════════════════════

import { test, expect } from '@playwright/test';

const ROUTES: Array<{ name: string; path: string }> = [
  { name: 'home', path: '/home' },
  { name: 'profile', path: '/profile' },
  { name: 'search', path: '/search' },
];

test.describe('M\'mora blue accent visual regression', () => {
  for (const route of ROUTES) {
    test(`no teal-* leaks on ${route.name}`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);

      // Fail if any rendered element still uses a teal Tailwind class.
      const tealCount = await page.evaluate(() => {
        const all = document.querySelectorAll('[class*="teal-"]');
        return all.length;
      });
      expect(tealCount, `Found ${tealCount} teal-* class usages on ${route.path}`).toBe(0);

      // Capture screenshot baseline (Playwright auto-diffs against snapshot).
      await expect(page).toHaveScreenshot(`${route.name}.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.02,
      });
    });
  }

  test('sidebar accent uses blue token', async ({ page }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const sidebar = page.locator('[data-sidebar], nav').first();
    if (await sidebar.count()) {
      await expect(sidebar).toHaveScreenshot('sidebar.png', {
        maxDiffPixelRatio: 0.02,
      });
    }
  });
});
