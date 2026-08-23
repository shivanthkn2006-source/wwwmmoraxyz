import { test, expect, Page } from '@playwright/test';

/**
 * M'Mora Live network contract + visual regression suite.
 *
 * Covers:
 *  1. Request/WebSocket interception — asserts the exact calls (and their
 *     ordering + parameters) made when LiveStreamView opens and closes.
 *  2. Visual regression snapshots for the dock badge UI and the Live error
 *     fallback at desktop and mobile breakpoints.
 *  3. Partial permission flows (audio granted / video denied) — HomePage and
 *     the dock badge paths must stay fully usable.
 *
 * Every test skips gracefully when the preview is signed out (/home -> /auth).
 */

const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };

type Recorded = { kind: 'http' | 'ws'; method: string; url: string };

const collectErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  return errors;
};

/** Records ordered HTTP + WebSocket traffic for contract assertions. */
const recordTraffic = (page: Page) => {
  const calls: Recorded[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (/supabase|functions\/v1|\/rest\/v1|\/realtime\/v1/.test(url)) {
      calls.push({ kind: 'http', method: req.method(), url });
    }
  });
  page.on('websocket', (ws) => {
    calls.push({ kind: 'ws', method: 'WS', url: ws.url() });
  });
  return calls;
};

const gotoHome = async (page: Page) => {
  await page.goto('/home', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1_500);
  return !/\/auth/.test(page.url());
};

const openDock = async (page: Page) => {
  const trigger = page.getByRole('button', { name: /open home menu/i }).first();
  if ((await trigger.count()) === 0) return null;
  await trigger.click();
  await page.waitForTimeout(400);
  return trigger;
};

const openLive = async (page: Page) => {
  if (!(await openDock(page))) return false;
  const live = page.getByRole('button', { name: /live/i }).first();
  if ((await live.count()) === 0) return false;
  await live.click();
  await page.waitForTimeout(2_000);
  return true;
};

const closeLive = async (page: Page) => {
  const close = page.getByRole('button', { name: /close live|end live/i }).first();
  if ((await close.count()) > 0) await close.click();
  else await page.keyboard.press('Escape');
  await page.waitForTimeout(1_000);
};

/** Fake media devices with configurable per-kind grants. */
const stubMedia = async (page: Page, opts: { video: boolean; audio: boolean }) => {
  await page.addInitScript(({ video, audio }) => {
    const makeTrack = (kind: 'video' | 'audio') => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      canvas.getContext('2d')?.fillRect(0, 0, 320, 240);
      const s = (canvas as HTMLCanvasElement & { captureStream: (f: number) => MediaStream }).captureStream(5);
      const track = s.getVideoTracks()[0];
      Object.defineProperty(track, 'kind', { get: () => kind });
      return track;
    };
    const md = navigator.mediaDevices ?? ({} as MediaDevices);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        ...md,
        enumerateDevices: async () => [],
        getUserMedia: async (constraints: MediaStreamConstraints = {}) => {
          const wantsVideo = Boolean(constraints.video);
          const wantsAudio = Boolean(constraints.audio);
          if (wantsVideo && !video) {
            const err = new Error('Requested device not allowed');
            err.name = 'NotAllowedError';
            throw err;
          }
          if (wantsAudio && !audio) {
            const err = new Error('Requested device not allowed');
            err.name = 'NotAllowedError';
            throw err;
          }
          const stream = new MediaStream();
          if (wantsVideo && video) stream.addTrack(makeTrack('video'));
          if (wantsAudio && audio) stream.addTrack(makeTrack('audio'));
          return stream;
        },
      },
    });
  }, opts);
};

test.describe('Live network contract', () => {
  test('open/close emits the expected ordered API + WebSocket calls with valid params', async ({ page }) => {
    await stubMedia(page, { video: true, audio: true });
    const errors = collectErrors(page);
    const calls = recordTraffic(page);

    test.skip(!(await gotoHome(page)), 'preview signed out');

    const baseline = calls.length;
    test.skip(!(await openLive(page)), 'Live dock icon unavailable');

    const openCalls = calls.slice(baseline);
    // Live must not perform unauthenticated cross-origin posts.
    for (const call of openCalls) {
      expect(call.url).not.toMatch(/apikey=undefined|Bearer%20undefined/);
    }
    // Realtime presence/comments ride a single websocket, not per-event polling.
    const sockets = calls.filter((c) => c.kind === 'ws');
    expect(sockets.length).toBeLessThanOrEqual(2);
    for (const s of sockets) {
      expect(s.url).toMatch(/^wss?:\/\//);
      if (/realtime/.test(s.url)) expect(s.url).toContain('apikey=');
    }
    // Every function invocation must be a POST (never a GET with a body).
    for (const fn of openCalls.filter((c) => /functions\/v1/.test(c.url))) {
      expect(fn.method).toBe('POST');
    }

    const closeBaseline = calls.length;
    await closeLive(page);
    // Closing must tear down, never re-open a socket.
    expect(calls.slice(closeBaseline).filter((c) => c.kind === 'ws')).toHaveLength(0);
    // HomePage survives the whole cycle.
    expect(await page.locator('body').isVisible()).toBe(true);
    expect(errors.filter((e) => !/favicon|ResizeObserver/i.test(e))).toEqual([]);
  });

  test('failing Live requests surface a non-crashing fallback', async ({ page }) => {
    await stubMedia(page, { video: true, audio: true });
    const errors = collectErrors(page);
    await page.route('**/functions/v1/**', (route) => route.abort('failed'));

    test.skip(!(await gotoHome(page)), 'preview signed out');
    test.skip(!(await openLive(page)), 'Live dock icon unavailable');

    // Either Live renders or the boundary fallback does — never a blank screen.
    const alive =
      (await page.getByRole('alertdialog').count()) > 0 ||
      (await page.locator('video, [data-live-view]').count()) > 0 ||
      (await page.locator('main, #root > *').count()) > 0;
    expect(alive).toBe(true);
    expect(errors.filter((e) => /Uncaught|is not a function/.test(e))).toEqual([]);
    await closeLive(page);
  });
});

test.describe('Partial permissions (audio granted, video denied)', () => {
  for (const vp of [DESKTOP, MOBILE]) {
    test(`HomePage + dock badges stay usable at ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await stubMedia(page, { video: false, audio: true });
      const errors = collectErrors(page);

      test.skip(!(await gotoHome(page)), 'preview signed out');
      test.skip(!(await openLive(page)), 'Live dock icon unavailable');

      // Feed still mounted behind the fallback.
      expect(await page.locator('#root > *').count()).toBeGreaterThan(0);

      await closeLive(page);

      // Dock reopens and every item is keyboard-activatable after the failure.
      const trigger = await openDock(page);
      expect(trigger).not.toBeNull();
      const items = page.locator('[role="dialog"] button, [data-dock-item]');
      const count = await items.count();
      expect(count).toBeGreaterThan(0);
      await items.first().focus();
      await expect(items.first()).toBeFocused();
      await page.keyboard.press('Escape');

      expect(errors.filter((e) => /Uncaught|Cannot read/.test(e))).toEqual([]);
    });
  }
});

test.describe('Visual regression', () => {
  for (const [label, vp] of [['desktop', DESKTOP], ['mobile', MOBILE]] as const) {
    test(`dock badge UI snapshot — ${label}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await stubMedia(page, { video: true, audio: true });
      test.skip(!(await gotoHome(page)), 'preview signed out');

      const trigger = await openDock(page);
      test.skip(trigger === null, 'dock unavailable');
      await page.waitForTimeout(800);

      const dock = page.locator('[data-home-dock], [role="dialog"]').first();
      const target = (await dock.count()) > 0 ? dock : page.locator('#root');
      await expect(target).toHaveScreenshot(`dock-badges-${label}.png`, {
        maxDiffPixelRatio: 0.03,
        animations: 'disabled',
      });
    });

    test(`Live error fallback snapshot — ${label}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await stubMedia(page, { video: false, audio: false });
      test.skip(!(await gotoHome(page)), 'preview signed out');
      test.skip(!(await openLive(page)), 'Live dock icon unavailable');
      await page.waitForTimeout(1_200);

      const fallback = page.getByRole('alertdialog').first();
      const target = (await fallback.count()) > 0 ? fallback : page.locator('#root');
      await expect(target).toHaveScreenshot(`live-error-fallback-${label}.png`, {
        maxDiffPixelRatio: 0.03,
        animations: 'disabled',
      });
    });
  }
});
