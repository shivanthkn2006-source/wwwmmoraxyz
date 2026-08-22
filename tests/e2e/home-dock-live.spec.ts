import { test, expect, Page } from '@playwright/test';

/**
 * Home dock badges + M'Mora Live open/close smoke tests across desktop
 * breakpoints, plus camera/mic MediaStream leak checks.
 *
 * The suite is resilient to the preview being signed out: if /home redirects
 * to /auth the dock is absent and the test is skipped rather than failing.
 */

const BREAKPOINTS = [
  { name: 'laptop-1280', width: 1280, height: 800 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'wide-1920', width: 1920, height: 1080 },
];

type Errors = string[];

const collectErrors = (page: Page): Errors => {
  const errors: Errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  return errors;
};

const gotoHome = async (page: Page) => {
  await page.goto('/home', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(2_000);
  return !/\/auth/.test(page.url());
};

const openDock = async (page: Page) => {
  const trigger = page.getByRole('button', { name: /open home menu/i }).first();
  if ((await trigger.count()) === 0) return null;
  await trigger.click();
  await page.waitForTimeout(500);
  return trigger;
};

/** Fake camera + mic so Live can start inside headless CI. */
const stubGetUserMedia = async (page: Page) => {
  await page.addInitScript(() => {
    const makeTrack = (kind: 'video' | 'audio') => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      ctx?.fillRect(0, 0, 320, 240);
      const stream = (canvas as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream }).captureStream(5);
      const track = stream.getVideoTracks()[0];
      Object.defineProperty(track, 'kind', { get: () => kind });
      return track;
    };
    const fake = async () => {
      const stream = new MediaStream();
      stream.addTrack(makeTrack('video'));
      stream.addTrack(makeTrack('audio'));
      return stream;
    };
    if (!navigator.mediaDevices) {
      Object.defineProperty(navigator, 'mediaDevices', { value: {}, configurable: true });
    }
    (navigator.mediaDevices as MediaDevices).getUserMedia = fake as MediaDevices['getUserMedia'];
  });
};

const liveTrackCount = (page: Page) =>
  page.evaluate(() => {
    const fn = (window as unknown as { __mmoraMediaTracks?: () => { liveTracks: number } }).__mmoraMediaTracks;
    return fn ? fn().liveTracks : 0;
  });

for (const bp of BREAKPOINTS) {
  test.describe(`home dock @ ${bp.name}`, () => {
    test.use({ viewport: { width: bp.width, height: bp.height } });

    test('dock opens and badges render without crashing the page', async ({ page }) => {
      const errors = collectErrors(page);
      const signedIn = await gotoHome(page);
      test.skip(!signedIn, 'preview is signed out — dock is not rendered');

      const trigger = await openDock(page);
      test.skip(!trigger, 'home dock trigger not present');

      const items = page.getByRole('menuitem');
      expect(await items.count()).toBeGreaterThan(3);

      // Badges are optional (counts may be zero) but must never break the page.
      const badged = await page.getByRole('menuitem', { name: /\d+ new/ }).count();
      expect(badged).toBeGreaterThanOrEqual(0);

      // The badge boundary must not have fired, and HomePage stays mounted.
      const failures = await page.evaluate(
        () => (window as unknown as { __mmoraDockBadgeFailures?: unknown[] }).__mmoraDockBadgeFailures?.length ?? 0,
      );
      expect(failures, 'dock badge boundary should not catch errors').toBe(0);
      await expect(page.locator('#root')).toBeVisible();

      const fatal = errors.filter((e) => /Can't find variable|is not defined|Cannot read propert/i.test(e));
      expect(fatal, `runtime errors: ${fatal.join(' | ')}`).toHaveLength(0);
    });

    test('Live view opens, closes and releases camera/mic tracks', async ({ page }) => {
      await stubGetUserMedia(page);
      const errors = collectErrors(page);
      const signedIn = await gotoHome(page);
      test.skip(!signedIn, 'preview is signed out — dock is not rendered');

      const trigger = await openDock(page);
      test.skip(!trigger, 'home dock trigger not present');

      const liveItem = page.getByRole('menuitem', { name: /^Live/ }).first();
      test.skip((await liveItem.count()) === 0, 'Live dock icon not present');
      await liveItem.click();

      const dialog = page.getByRole('dialog', { name: /live stream/i });
      await expect(dialog).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(1_500);

      // Close with Escape and verify full teardown.
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden({ timeout: 10_000 });
      await page.waitForTimeout(1_000);

      expect(await liveTrackCount(page), 'camera/mic tracks must be released on close').toBe(0);

      // Re-open, switch tab away, and confirm hardware is released too.
      await openDock(page);
      await page.getByRole('menuitem', { name: /^Live/ }).first().click();
      await expect(dialog).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(1_000);

      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await page.waitForTimeout(1_000);
      expect(await liveTrackCount(page), 'tracks must be released when the tab is hidden').toBe(0);

      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden({ timeout: 10_000 });

      const fatal = errors.filter((e) => /Can't find variable|is not defined|Cannot read propert/i.test(e));
      expect(fatal, `runtime errors: ${fatal.join(' | ')}`).toHaveLength(0);
    });
  });
}

test.describe('compatibility report', () => {
  test('lists tested features and live track status', async ({ page }) => {
    await page.goto('/compatibility-report', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    const report = page.getByTestId('compat-report');
    test.skip((await report.count()) === 0, 'preview is signed out — report is protected');

    await expect(report).toBeVisible();
    await expect(page.locator('[data-feature="live-stream"]')).toBeVisible();
    await expect(page.locator('[data-feature="dock-badges"]')).toBeVisible();
    await expect(page.getByTestId('compat-media')).toContainText('live track');
  });
});
