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
  '/analytics-dashboard',
  '/voice-commands',
  '/selfie-city',
  '/music',
  '/zoe-omega?vr=1',
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

test.describe('Responsive Home menu grid', () => {
  const viewports = [
    { name: 'foldable', width: 280, height: 653 },
    { name: 'phone-pwa', width: 393, height: 802 },
    { name: 'short-landscape', width: 667, height: 375 },
    { name: 'ipad', width: 834, height: 1112 },
    { name: 'desktop', width: 1440, height: 900 },
  ];

  for (const viewport of viewports) {
    test(`keeps seven icons and labels inside the panel on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/home', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      if (new URL(page.url()).pathname.startsWith('/auth')) test.skip();

      await page.locator('[data-home-dock-trigger]').click();
      const dock = page.locator('[data-home-dock]').first();
      const grid = dock.locator('[data-home-dock-grid]');
      await expect(grid).toBeVisible();
      await page.waitForTimeout(400);

      const buttons = grid.getByRole('menuitem');
      await expect(buttons).toHaveCount(28);
      const firstRowY = await buttons.evaluateAll((nodes) => nodes.slice(0, 7).map((node) => node.getBoundingClientRect().y));
      expect(new Set(firstRowY.map((value) => Math.round(value))).size).toBe(1);

      const dockBox = await dock.boundingBox();
      const gridBox = await grid.boundingBox();
      expect(dockBox).not.toBeNull();
      expect(gridBox).not.toBeNull();
      expect(gridBox!.x).toBeGreaterThanOrEqual(dockBox!.x);
      expect(gridBox!.x + gridBox!.width).toBeLessThanOrEqual(dockBox!.x + dockBox!.width + 1);

      const first = buttons.first();
      await first.hover();
      const label = first.locator('.home-dock-label');
      await expect(label).toBeVisible();
      const labelBox = await label.boundingBox();
      expect(labelBox).not.toBeNull();
      expect(labelBox!.y).toBeGreaterThanOrEqual(dockBox!.y);
      expect(labelBox!.y + labelBox!.height).toBeLessThanOrEqual(dockBox!.y + dockBox!.height + 1);
    });
  }
});

test('keeps the compact player off Music while preserving the global mount', async ({ page }) => {
  await page.goto('/music', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  if (new URL(page.url()).pathname.startsWith('/auth')) test.skip();

  await expect(page.locator('[data-testid="global-music-control"]')).toHaveCount(0);
  const audio = page.locator('[data-global-audio-quick-connect]');
  const search = page.locator('.music-search-control');
  await expect(audio).toBeVisible();
  await expect(search).toBeVisible();
  const audioBox = await audio.boundingBox();
  const searchBox = await search.boundingBox();
  expect(audioBox).not.toBeNull();
  expect(searchBox).not.toBeNull();
  expect(audioBox!.y + audioBox!.height).toBeLessThanOrEqual(searchBox!.y);
});
