import { describe, expect, it, vi } from 'vitest';
import { EXPORT_PAGE_SIZE, EXPORT_ROW_CEILING, fetchAllRows } from '@/lib/paginatedFetch';

/** Builds a fake range query returning `sizes[i]` rows on the i-th call. */
function fakeQuery(sizes: number[], errorOnCall = -1) {
  const calls: Array<[number, number]> = [];
  const factory = async (from: number, to: number) => {
    calls.push([from, to]);
    const idx = calls.length - 1;
    return idx === errorOnCall
      ? { data: null, error: { message: 'boom' } }
      : { data: Array.from({ length: sizes[idx] ?? 0 }, (_, i) => ({ n: from + i })), error: null };
  };
  return { factory, calls };
}

describe('fetchAllRows', () => {
  it('returns a single short page without extra requests', async () => {
    const { factory, calls } = fakeQuery([3]);
    const rows = await fetchAllRows(factory);
    expect(rows).toHaveLength(3);
    expect(calls).toEqual([[0, EXPORT_PAGE_SIZE - 1]]);
  });

  it('pages until a short page arrives', async () => {
    const { factory, calls } = fakeQuery([EXPORT_PAGE_SIZE, EXPORT_PAGE_SIZE, 7]);
    const rows = await fetchAllRows(factory);
    expect(rows).toHaveLength(EXPORT_PAGE_SIZE * 2 + 7);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it('returns empty when the first page is empty', async () => {
    const { factory, calls } = fakeQuery([0]);
    expect(await fetchAllRows(factory)).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it('throws on a page error instead of returning partial rows', async () => {
    const { factory } = fakeQuery([EXPORT_PAGE_SIZE, 5], 1);
    await expect(fetchAllRows(factory, 'test')).rejects.toThrow('test export failed: boom');
  });

  it('fails closed at the row ceiling rather than looping forever', async () => {
    const fullPages = Math.ceil(EXPORT_ROW_CEILING / EXPORT_PAGE_SIZE) + 1;
    const { factory } = fakeQuery(Array.from({ length: fullPages }, () => EXPORT_PAGE_SIZE));
    await expect(fetchAllRows(factory, 'test')).rejects.toThrow('refusing to return a partial file');
  });
});

describe('growth export uses pagination', () => {
  it('collectGrowthExport pages past the first 1,000 rows', async () => {
    vi.resetModules();
    const rangeMock = vi.fn(async (from: number) => ({
      data: from === 0
        ? Array.from({ length: EXPORT_PAGE_SIZE }, (_, i) => ({ id: `item-${i}`, item_id: `item-${i}` }))
        : [{ id: 'item-last', item_id: 'item-last' }],
      error: null,
    }));
    const builder = () => ({
      eq: () => builder(),
      order: () => builder(),
      select: () => builder(),
      maybeSingle: async () => ({ data: null, error: null }),
      range: rangeMock,
    });
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: { from: () => ({ select: () => builder() }) },
    }));
    const { collectGrowthExport } = await import('@/lib/growthExport');
    const bundle = await collectGrowthExport('user-1');
    expect(bundle.insights.length).toBeGreaterThan(EXPORT_PAGE_SIZE);
    expect(rangeMock.mock.calls.length).toBeGreaterThan(1);
    vi.doUnmock('@/integrations/supabase/client');
  });
});
