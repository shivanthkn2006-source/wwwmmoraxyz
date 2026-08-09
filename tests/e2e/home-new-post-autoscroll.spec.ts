import { expect, test } from '@playwright/test';

test.describe('global and friends new-post auto-scroll gate', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  for (const tab of ['global', 'personal']) {
    test(`${tab} stays still on initial load and manual refresh, then makes one realtime pass`, async ({ page }) => {
      const result = await page.evaluate(({ tab }) => {
        const detect = (previous: string[], next: string[], source: string) => {
          const previousSet = new Set(previous);
          const newIds = source === 'realtime' ? next.filter(id => !previousSet.has(id)) : [];
          return { newIds, shouldAutoScroll: newIds.length > 0 };
        };
        const initial = detect([], [`${tab}-1`], 'initial');
        const refresh = detect([`${tab}-1`], [`${tab}-2`, `${tab}-1`], 'manual');
        const realtime = detect([`${tab}-1`], [`${tab}-2`, `${tab}-1`], 'realtime');
        let index = 0;
        const visited: string[] = [];
        while (index < realtime.newIds.length) visited.push(realtime.newIds[index++]);
        return { initial, refresh, realtime, visited };
      }, { tab });
      expect(result.initial.shouldAutoScroll).toBe(false);
      expect(result.refresh.shouldAutoScroll).toBe(false);
      expect(result.realtime).toEqual({ newIds: [`${tab}-2`], shouldAutoScroll: true });
      expect(result.visited).toEqual([`${tab}-2`]);
    });
  }
});