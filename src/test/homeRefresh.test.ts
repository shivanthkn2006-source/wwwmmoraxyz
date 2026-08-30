import { describe, expect, it, vi } from 'vitest';
import { onHomeRefresh, triggerHomeRefresh } from '@/lib/homeRefresh';

describe('unified home refresh', () => {
  it('awaits every registered feed refresh and supports unsubscribe', async () => {
    const events: string[] = [];
    const first = vi.fn(async () => {
      await Promise.resolve();
      events.push('posts');
    });
    const second = vi.fn(() => {
      events.push('zoe-dhf');
    });
    const unsubscribeFirst = onHomeRefresh(first);
    const unsubscribeSecond = onHomeRefresh(second);

    await triggerHomeRefresh();
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
    expect(events).toEqual(expect.arrayContaining(['posts', 'zoe-dhf']));

    unsubscribeFirst();
    unsubscribeSecond();
    await triggerHomeRefresh();
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it('does not reject when one refresh source fails', async () => {
    const unsubscribe = onHomeRefresh(() => Promise.reject(new Error('offline')));
    await expect(triggerHomeRefresh()).resolves.toBeUndefined();
    unsubscribe();
  });
});