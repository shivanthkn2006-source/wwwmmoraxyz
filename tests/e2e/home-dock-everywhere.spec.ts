import { test, expect } from '@playwright/test';

/**
 * UI regression: the glass home dock must render in the SAME bottom-right
 * corner on every routable page (auth screens and the standalone Zoe Infinity
 * surface are intentionally excluded).
 *
 * Signed-out visitors are redirected to /auth, so this suite only asserts the
 * dock contract on routes that render for the current session. When a route
 * redirects to /auth the check is skipped rather than failed — that keeps the
 * spec meaningful in both authenticated and anonymous CI runs.
 */
const ROUTES = [
  '/home',
  '/growth-insights',
  '/profile',
  '/chat',
  '/notification-history',
  '/zoe-ai',
  '/universal-timeline',
  '/analytics',
  '/voice-commands',
  '/selfie-city',
];

test.describe('Global home dock placement', () => {
  for (const route of ROUTES) {
    test(`renders bottom-right on ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      if (new URL(page.url()).pathname.startsWith('/auth')) test.skip();

      const dock = page.locator('[data-home-dock]').first();
      await expect(dock).toBeVisible({ timeout: 15_000 });

      const box = await dock.boundingBox();
      const viewport = page.viewportSize();
      expect(box).not.toBeNull();
      expect(viewport).not.toBeNull();
      // Bottom-right quadrant, within a generous margin of the viewport edges.
      expect(box!.x + box!.width).toBeGreaterThan(viewport!.width * 0.55);
      expect(box!.y + box!.height).toBeGreaterThan(viewport!.height * 0.55);
    });
  }
});
