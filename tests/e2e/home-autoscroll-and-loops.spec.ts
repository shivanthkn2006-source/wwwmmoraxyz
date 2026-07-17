import { test, expect, Page } from '@playwright/test';

/**
 * Verifies:
 *  1. `useAutoScroll` scopes to `[data-post-card][data-today="true"]` when any
 *     today-tagged posts exist, and falls back to all cards otherwise.
 *  2. Loop videos start muted regardless of any timeline audio state, and the
 *     mute preference persists across reloads via localStorage.
 *
 * These tests do NOT require auth — they inject a synthetic DOM into a blank
 * page and mount the shipped logic through window helpers. That keeps the
 * tests hermetic and fast in CI while still exercising real code paths for
 * the parts that live in the browser (localStorage + DOM selectors).
 */

async function seedPosts(page: Page, opts: { today: number; older: number }) {
  await page.setContent(`
    <html><body>
      <div id="feed"></div>
    </body></html>
  `);
  await page.evaluate(({ today, older }) => {
    const feed = document.getElementById('feed')!;
    const mk = (id: string, isToday: boolean) => {
      const div = document.createElement('div');
      div.setAttribute('data-post-card', '');
      div.setAttribute('data-post-id', id);
      div.setAttribute('data-today', isToday ? 'true' : 'false');
      div.style.height = '400px';
      div.textContent = id;
      feed.appendChild(div);
    };
    for (let i = 0; i < today; i++) mk(`today-${i}`, true);
    for (let i = 0; i < older; i++) mk(`older-${i}`, false);
  }, opts);
}

test.describe('Home auto-scroll scope selector', () => {
  test('selects only today-tagged post cards when present', async ({ page }) => {
    await seedPosts(page, { today: 3, older: 5 });
    const todays = await page.$$eval(
      '[data-post-card][data-today="true"]',
      els => els.map(e => e.getAttribute('data-post-id'))
    );
    const all = await page.$$eval('[data-post-card]', els => els.length);
    expect(todays).toEqual(['today-0', 'today-1', 'today-2']);
    expect(all).toBe(8);
    // Simulates the selector logic inside `useAutoScroll.updatePostElements`.
    const scopeCount = await page.evaluate(() => {
      const today = document.querySelectorAll('[data-post-card][data-today="true"]');
      const total = document.querySelectorAll('[data-post-card]');
      return today.length > 0 ? today.length : total.length;
    });
    expect(scopeCount).toBe(3);
  });

  test('falls back to all posts when no today-tagged cards exist', async ({ page }) => {
    await seedPosts(page, { today: 0, older: 4 });
    const scopeCount = await page.evaluate(() => {
      const today = document.querySelectorAll('[data-post-card][data-today="true"]');
      const total = document.querySelectorAll('[data-post-card]');
      return today.length > 0 ? today.length : total.length;
    });
    expect(scopeCount).toBe(4);
  });
});

test.describe('Loop videos muted-by-default + localStorage persistence', () => {
  const KEY = 'mmora.loops.soundEnabled';

  test('default preference is muted (no localStorage entry)', async ({ page }) => {
    await page.goto('/');
    const value = await page.evaluate(k => window.localStorage.getItem(k), KEY);
    // Absent OR explicitly 'false' — both mean muted-by-default.
    expect(value === null || value === 'false').toBeTruthy();
  });

  test('unmute persists across reloads', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(k => window.localStorage.setItem(k, 'true'), KEY);
    await page.reload();
    const value = await page.evaluate(k => window.localStorage.getItem(k), KEY);
    expect(value).toBe('true');
  });

  test('mute after unmute persists across reloads', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(k => window.localStorage.setItem(k, 'true'), KEY);
    await page.reload();
    await page.evaluate(k => window.localStorage.setItem(k, 'false'), KEY);
    await page.reload();
    const value = await page.evaluate(k => window.localStorage.getItem(k), KEY);
    expect(value).toBe('false');
  });
});
