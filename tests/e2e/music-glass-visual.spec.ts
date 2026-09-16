import { expect, test, type Page } from '@playwright/test';

const VIEWPORTS = [
  { name: 'pwa-phone', width: 393, height: 802 },
  { name: 'ipad', width: 834, height: 1112 },
  { name: 'desktop', width: 1440, height: 900 },
];

async function openMusic(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
  const session = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
  if (storageKey && session) {
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: storageKey, value: session });
  }
  await page.goto('/music', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1_000);
  test.skip(new URL(page.url()).pathname.startsWith('/auth'), 'Music requires a signed-in preview session');
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
}

for (const viewport of VIEWPORTS) {
  test.describe(`Music Liquid Glass @ ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('fills the viewport and keeps controls contained', async ({ page }) => {
      await openMusic(page);
      const surface = page.locator('.music-liquid-page');
      await expect(surface).toBeVisible();

      const geometry = await page.evaluate(() => {
        const pageSurface = document.querySelector<HTMLElement>('.music-liquid-page');
        const search = document.querySelector<HTMLElement>('.music-search-control');
        const transport = document.querySelector<HTMLElement>('.music-transport-control');
        if (!pageSurface || !search || !transport) return null;
        const pageBox = pageSurface.getBoundingClientRect();
        const searchBox = search.getBoundingClientRect();
        const transportBox = transport.getBoundingClientRect();
        const transportStyle = getComputedStyle(transport);
        const glassStyle = getComputedStyle(pageSurface, '::after');
        return {
          pageLeft: pageBox.left,
          pageRight: innerWidth - pageBox.right,
          pageWidth: pageBox.width,
          searchRight: searchBox.right,
          transportRight: transportBox.right,
          transportBackground: transportStyle.backgroundColor,
          transportShadow: transportStyle.boxShadow,
          glassBackground: glassStyle.backgroundImage,
          glassBlur: glassStyle.backdropFilter || glassStyle.webkitBackdropFilter,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      expect(geometry).not.toBeNull();
      expect(geometry?.pageLeft).toBeLessThanOrEqual(1);
      expect(geometry?.pageRight).toBeLessThanOrEqual(1);
      expect(geometry?.pageWidth).toBeGreaterThanOrEqual(viewport.width - 2);
      expect(geometry?.searchRight).toBeLessThanOrEqual(viewport.width);
      expect(geometry?.transportRight).toBeLessThanOrEqual(viewport.width);
      expect(geometry?.transportBackground).toBe('rgba(0, 0, 0, 0)');
      expect(geometry?.transportShadow).toBe('none');
      expect(geometry?.glassBackground).toContain('rgba(255, 255, 255, 0.2)');
      expect(geometry?.glassBackground).toContain('rgba(255, 255, 255, 0.08)');
      expect(geometry?.glassBackground).toContain('rgba(255, 255, 255, 0.15)');
      expect(geometry?.glassBlur).toContain('blur(52px)');
      expect(geometry?.glassBlur).toContain('saturate(1.25)');
      expect(geometry?.scrollWidth).toBeLessThanOrEqual(viewport.width);

      const search = page.getByLabel('Search music');
      // Wait for webfonts before measuring: late font swaps change the
      // long-title wrap and shift the whole glass surface between runs.
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      await search.fill('an intentionally very long song album artist and soundtrack title that must grow downward without leaving the viewport');
      await page.waitForTimeout(300);
      const searchBounds = await search.boundingBox();
      expect(searchBounds).not.toBeNull();
      expect(searchBounds?.height).toBeGreaterThan(40);
      expect((searchBounds?.x ?? 0) + (searchBounds?.width ?? 0)).toBeLessThanOrEqual(viewport.width);

      await expect(surface).toHaveScreenshot(`music-glass-${viewport.name}.png`, {
        animations: 'disabled',
        mask: [page.locator('.music-current-track'), page.locator('.music-liquid-queue'), page.locator('.music-liquid-side')],
        maxDiffPixelRatio: 0.02,
      });
    });
  });
}