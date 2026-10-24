import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
vi.mock('@/worlds/realmap/osmWorkerBridge', () => ({
  parseInWorker: async () => ({ buildings: [], roads: [], pois: [], fetchedAt: Date.now(), v: 5 }),
}));

describe('shared map outage fallback', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    invoke.mockReset();
    vi.stubGlobal('indexedDB', undefined);
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response('{"elements":[]}')));
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  const bbox = { south: 40, west: -74, north: 40.01, east: -73.99 };
  async function load(key: string) {
    const osm = await import('@/worlds/realmap/osm');
    const result = osm.loadChunk(key, bbox, () => key);
    await vi.advanceTimersByTimeAsync(1201);
    return { osm, chunk: await result };
  }

  it('resolves a 503 to the phone map fallback rather than rejecting or sharing writes', async () => {
    invoke.mockResolvedValue({ data: null, error: { context: { status: 503 }, message: 'SUPABASE_EDGE_RUNTIME_SERVICE_DEGRADED' } });
    const { osm, chunk } = await load('1_1');
    expect(chunk).toMatchObject({ buildings: [], roads: [], pois: [], v: 5 });
    expect(osm.loaderStats.network).toBe(1);
    expect(osm.loaderStats.failures).toBe(0);
    expect(osm.sharedCacheDown()).toBe(true);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('https://overpass-api.de/api/interpreter');
  });

  it('skips the shared store for 60 seconds then checks it again', async () => {
    invoke.mockResolvedValue({ data: null, error: { context: { status: 503 } } });
    const { osm } = await load('2_2');
    await load('3_3');
    expect(invoke).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(osm.sharedCacheDown()).toBe(false);
    invoke.mockResolvedValue({ data: { data: { buildings: [], roads: [], pois: [], v: 5 } }, error: null });
    const chunk = await osm.loadChunk('4_4', bbox, () => '4_4');
    expect(chunk?.v).toBe(5);
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(osm.loaderStats.shared).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('also falls back when the shared invocation throws a network error', async () => {
    invoke.mockRejectedValue(new TypeError('Failed to fetch'));
    const { osm, chunk } = await load('5_5');
    expect(chunk).not.toBeNull();
    expect(osm.sharedCacheDown()).toBe(true);
    expect(osm.loaderStats.failures).toBe(0);
  });
});