/**
 * Crawler regression: every public route in the sitemap must return a 200 and
 * render a self-referencing canonical + og:url once the SPA has hydrated.
 *
 * Run against the live domain (default) or any base URL:
 *   PLAYWRIGHT_BASE_URL=http://localhost:8080 bunx playwright test tests/e2e/seo-crawl.spec.ts
 */
import { test, expect } from '@playwright/test';
import { entries } from '../../scripts/generate-sitemap';
import { ROUTE_SEO } from '../../src/config/routeSeo';

const SITE_URL = 'https://www.mmora.xyz';

test.describe('public route crawl', () => {
  for (const entry of entries) {
    test(`${entry.path} responds 200 with correct head tags`, async ({ page }) => {
      const response = await page.goto(entry.path, { waitUntil: 'domcontentloaded' });
      expect(response, `no response for ${entry.path}`).not.toBeNull();
      expect(response!.status(), `${entry.path} status`).toBeLessThan(400);

      const expectedUrl = `${SITE_URL}${entry.path === '/' ? '/' : entry.path}`;

      await expect
        .poll(
          async () =>
            page.evaluate(() => document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null),
          { timeout: 20_000, message: `missing canonical on ${entry.path}` },
        )
        .toBe(expectedUrl);

      const ogUrl = await page.evaluate(
        () => document.querySelector('meta[property="og:url"]')?.getAttribute('content') ?? null,
      );
      expect(ogUrl, `og:url on ${entry.path}`).toBe(expectedUrl);

      const title = await page.title();
      expect(title, `title on ${entry.path}`).toBe(ROUTE_SEO[entry.path].title);

      const description = await page.evaluate(
        () => document.querySelector('meta[name="description"]')?.getAttribute('content') ?? null,
      );
      expect(description, `description on ${entry.path}`).toBe(ROUTE_SEO[entry.path].description);

      const h1Count = await page.locator('h1').count();
      expect(h1Count, `h1 count on ${entry.path}`).toBeGreaterThan(0);
    });
  }

  test('sitemap.xml and robots.txt are served', async ({ request }) => {
    for (const path of ['/sitemap.xml', '/robots.txt']) {
      const res = await request.get(path);
      expect(res.status(), `${path} status`).toBe(200);
    }
  });
});
