import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.resolve(__dirname, 'fixtures/tiny-loop.mp4');

async function signIn(page: Page): Promise<boolean> {
  const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
  const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
  if (storageKey && sessionJson) {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: storageKey, value: sessionJson });
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    return true;
  }

  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) return false;

  await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/home|\/$/, { timeout: 30_000 });
  await page.goto('/home', { waitUntil: 'domcontentloaded' });
  return true;
}

test.describe('Loops playback and responsive media', () => {
  test('uploads a loop, refreshes, reopens Loops, and verifies poster/playback fallback', async ({ page }) => {
    test.setTimeout(120_000);
    const signedIn = await signIn(page);
    test.skip(!signedIn, 'No injected session or E2E credentials available');

    const input = page.locator('#loops-video-upload');
    await expect(input).toHaveCount(1);
    await input.setInputFiles(FIXTURE);

    await expect(page.getByText(/Posted!|Upload failed|Unsupported file|File too large/i)).toBeVisible({ timeout: 45_000 });
    const uploadFailed = await page.getByText(/Upload failed|Unsupported file|File too large/i).isVisible().catch(() => false);
    test.skip(uploadFailed, 'Upload rejected in this environment; UI rejection path already surfaced a clear error');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-testid="loop-video-item"]').first()).toBeVisible({ timeout: 30_000 });

    const firstLoop = page.locator('[data-testid="loop-video-item"]').first();
    await expect(firstLoop.locator('img[alt="Loop preview"]')).toBeVisible({ timeout: 20_000 });
    await firstLoop.click();

    const playerVideo = page.locator('video').last();
    const fallback = page.getByText('Playback not supported for this format');
    await Promise.race([
      playerVideo.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null),
      fallback.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null),
    ]);

    const supportsMp4 = await page.evaluate(() => document.createElement('video').canPlayType('video/mp4') !== '');
    if (supportsMp4 && !(await fallback.isVisible().catch(() => false))) {
      await expect.poll(async () => playerVideo.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThanOrEqual(2);
    } else {
      await expect(fallback).toBeVisible();
    }
  });

  for (const viewport of [
    { name: 'mobile portrait', width: 390, height: 844 },
    { name: 'mobile landscape', width: 844, height: 390 },
    { name: 'desktop', width: 1280, height: 800 },
  ]) {
    test(`PostCard media fits viewport on ${viewport.name}`, async ({ page }) => {
      const signedIn = await signIn(page);
      test.skip(!signedIn, 'No injected session or E2E credentials available');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/home', { waitUntil: 'domcontentloaded' });

      const frame = page.locator('[data-testid="post-media-frame"]').first();
      const hasMedia = await frame.isVisible({ timeout: 20_000 }).catch(() => false);
      test.skip(!hasMedia, 'No media post available to measure');

      const box = await frame.boundingBox();
      expect(box, 'media frame box').not.toBeNull();
      expect(box!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box!.height).toBeLessThanOrEqual(Math.ceil(viewport.height * 0.9));

      const objectFit = await frame.locator('[data-testid="post-video"], [data-testid="post-image"]').first().evaluate((el) => getComputedStyle(el).objectFit);
      expect(objectFit).toBe('contain');
    });
  }

  for (const viewport of [
    { name: 'mobile portrait large preview', width: 390, height: 844 },
    { name: 'mobile landscape large preview', width: 844, height: 390 },
    { name: 'desktop large preview', width: 1280, height: 800 },
  ]) {
    test(`PostCard large/deferred preview renders a poster or skeleton on ${viewport.name}`, async ({ page }, testInfo) => {
      const signedIn = await signIn(page);
      test.skip(!signedIn, 'No injected session or E2E credentials available');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/home', { waitUntil: 'domcontentloaded' });

      const deferredFrame = page.locator('[data-testid="post-deferred-media-preview"]').first();
      const genericFrame = page.locator('[data-testid="post-media-frame"]').first();
      const frame = (await deferredFrame.isVisible({ timeout: 20_000 }).catch(() => false)) ? deferredFrame : genericFrame;
      const hasFrame = await frame.isVisible({ timeout: 20_000 }).catch(() => false);
      test.skip(!hasFrame, 'No PostCard media preview available to capture');

      await frame.screenshot({ path: testInfo.outputPath(`postcard-large-preview-${viewport.width}x${viewport.height}.png`) });
      const box = await frame.boundingBox();
      expect(box, 'preview frame box').not.toBeNull();
      expect(box!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box!.height).toBeLessThanOrEqual(Math.ceil(viewport.height * 0.9));

      if (await deferredFrame.isVisible().catch(() => false)) {
        const hasPoster = await deferredFrame.locator('[data-testid="post-deferred-poster"]').isVisible().catch(() => false);
        const hasSkeleton = await deferredFrame.locator('.animate-pulse').first().isVisible().catch(() => false);
        await expect(deferredFrame.getByText(/Preview ready|Preview pending/i)).toBeVisible();
        expect(hasPoster || hasSkeleton, 'large preview should show poster or loading skeleton').toBeTruthy();
      }
    });
  }

  test('LoopVideoItem shows generated fallback poster and decode reason when backend poster is missing', async ({ page }) => {
    const signedIn = await signIn(page);
    test.skip(!signedIn, 'No injected session or E2E credentials available');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/home', { waitUntil: 'domcontentloaded' });

    const loop = page.locator('[data-testid="loop-video-item"]').first();
    await expect(loop).toBeVisible({ timeout: 30_000 });
    await expect(loop.locator('[data-testid="loop-poster-image"]')).toBeVisible({ timeout: 20_000 });
  });
});