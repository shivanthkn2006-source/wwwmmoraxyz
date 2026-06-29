/**
 * Integration test: runDeepRootScanNow appends to history and dispatches event.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';

beforeAll(() => {
  if (typeof (globalThis as any).window === 'undefined') {
    (globalThis as any).window = new EventTarget();
  }
  if (typeof (globalThis as any).localStorage === 'undefined') {
    const store = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    };
  }
  if (typeof (globalThis as any).performance === 'undefined') {
    (globalThis as any).performance = { now: () => Date.now() };
  }
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(async (name: string) => {
        if (name === 'provider-health') {
          return {
            data: { summary: { healthyTiers: [1, 3, 5], degradedTiers: [2], missingKeyTiers: [], primaryHealthy: 1 } },
            error: null,
          };
        }
        if (name === 'zoe-infinity-brain') {
          return { data: { response: 'OK', _diag: { selectedTier: 1, attempts: [{}] } }, error: null };
        }
        return { data: null, error: null };
      }),
    },
  },
}));

describe('deep-root scan scheduler', () => {
  it('runs a scan, appends to history, and dispatches event', async () => {
    localStorage.clear();
    const events: any[] = [];
    const handler = (e: Event) => events.push((e as CustomEvent).detail);
    window.addEventListener('zoe:deep-root-scan', handler);

    const mod = await import('@/hooks/useDeepRootScanScheduler');
    const before = mod.getDeepRootScanHistory().length;
    const result = await mod.runDeepRootScanNow();
    const after = mod.getDeepRootScanHistory().length;

    expect(after).toBe(before + 1);
    expect(result.ok).toBe(true);
    expect(result.health?.healthy).toContain(1);
    expect(result.cascade?.selectedTier).toBe(1);
    expect(events.length).toBeGreaterThan(0);
    window.removeEventListener('zoe:deep-root-scan', handler);
  });

  it('caps history at 30 entries', async () => {
    const mod = await import('@/hooks/useDeepRootScanScheduler');
    const fake = Array.from({ length: 35 }, (_, i) => ({
      at: new Date(Date.now() - i * 1000).toISOString(),
      ok: true, health: null, cascade: null,
      signals: { hormonesPhase: 'day', fusion: 'idle@0.00', urgentCall: false },
    }));
    localStorage.setItem('zoe_deep_root_scan_history_v1', JSON.stringify(fake));
    expect(mod.getDeepRootScanHistory().length).toBe(35);
    await mod.runDeepRootScanNow();
    expect(mod.getDeepRootScanHistory().length).toBeLessThanOrEqual(30);
  });
});
