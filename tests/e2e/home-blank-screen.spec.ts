import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

/**
 * Smoke test: load /home and fail if the page renders blank,
 * is fully black, or is stuck on a loading/spinner-only screen.
 *
 * Heuristics:
 *  1. <body> must contain non-trivial visible text OR multiple visible elements
 *     beyond the initial loading spinner.
 *  2. Screenshot pixel analysis: there must be enough color variance and
 *     non-black pixels (the app uses a dark theme but never pure-black-only).
 */

const SCREENSHOT_DIR = path.resolve('test-results/home-screenshots');

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test('/home renders real content (not blank / black / loading-only)', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`console.error: ${msg.text()}`);
  });

  await page.goto('/home', { waitUntil: 'domcontentloaded' });

  // Give the SPA time to hydrate / redirect (auth -> /home or /auth).
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(2_000);

  const screenshotPath = path.join(SCREENSHOT_DIR, `home-${Date.now()}.png`);
  const buffer = await page.screenshot({ path: screenshotPath, fullPage: false });

  // ── 1. DOM-level checks ───────────────────────────────────────────────
  const root = await page.locator('#root').first();
  await expect(root, '#root should exist').toBeVisible({ timeout: 10_000 });

  const bodyText = (await page.locator('body').innerText()).trim();
  const visibleElementCount = await page.locator('body *:visible').count();

  // A loading-only screen typically has <5 visible elements and no/minimal text.
  const looksLikeLoadingOnly =
    visibleElementCount < 8 && bodyText.replace(/\s+/g, '').length < 10;

  // ── 2. Pixel-level checks ─────────────────────────────────────────────
  const png = PNG.sync.read(buffer);
  const { data, width, height } = png;
  const totalPixels = width * height;

  let blackish = 0;
  const colorBuckets = new Set<string>();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r < 12 && g < 12 && b < 12) blackish++;
    // Bucket colors coarsely (every 32 levels) to estimate variance.
    colorBuckets.add(`${r >> 5}-${g >> 5}-${b >> 5}`);
  }
  const blackishRatio = blackish / totalPixels;
  const uniqueColorBuckets = colorBuckets.size;

  const isMostlyBlack = blackishRatio > 0.97;
  const hasNoVariance = uniqueColorBuckets < 6;

  // ── 3. Assertions with diagnostic output ──────────────────────────────
  const diagnostics = {
    url: page.url(),
    bodyTextLength: bodyText.length,
    bodyTextPreview: bodyText.slice(0, 120),
    visibleElementCount,
    blackishRatio: Number(blackishRatio.toFixed(4)),
    uniqueColorBuckets,
    consoleErrors: consoleErrors.slice(0, 10),
    screenshotPath,
  };
  console.log('[home-blank-screen] diagnostics:', JSON.stringify(diagnostics, null, 2));

  expect(isMostlyBlack, `Page is mostly black (${(blackishRatio * 100).toFixed(1)}% black pixels). See ${screenshotPath}`).toBe(false);
  expect(hasNoVariance, `Page has almost no color variance (${uniqueColorBuckets} unique buckets) — likely blank. See ${screenshotPath}`).toBe(false);
  expect(looksLikeLoadingOnly, `Page appears to show only a loading/empty state (${visibleElementCount} visible els, ${bodyText.length} chars). See ${screenshotPath}`).toBe(false);
});
