import { describe, it, expect, vi, beforeEach } from 'vitest';

const upsert = vi.fn().mockResolvedValue({ error: null });
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ upsert }) },
}));

import { recordGrowthEvent, __resetGrowthAnalytics } from '@/lib/growthAnalytics';

describe('growth analytics', () => {
  beforeEach(() => {
    upsert.mockClear();
    __resetGrowthAnalytics();
  });

  it('records one impression per card and dedupes repeats', async () => {
    const input = { userId: 'u1', itemId: 'i1', slot: 'morning' };
    await recordGrowthEvent('impression', input);
    await recordGrowthEvent('impression', input);
    await recordGrowthEvent('impression', input);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it('tracks impressions and clicks independently', async () => {
    const input = { userId: 'u1', itemId: 'i1', slot: 'morning' };
    await recordGrowthEvent('impression', input);
    await recordGrowthEvent('click', input);
    expect(upsert).toHaveBeenCalledTimes(2);
  });

  it('never writes without a signed-in user or an item id', async () => {
    await recordGrowthEvent('impression', { userId: undefined, itemId: 'i1', slot: 'morning' });
    await recordGrowthEvent('impression', { userId: 'u1', itemId: undefined, slot: 'morning' });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('swallows backend failures', async () => {
    upsert.mockRejectedValueOnce(new Error('offline'));
    await expect(
      recordGrowthEvent('impression', { userId: 'u1', itemId: 'i9', slot: 'night' }),
    ).resolves.toBeUndefined();
  });
});
