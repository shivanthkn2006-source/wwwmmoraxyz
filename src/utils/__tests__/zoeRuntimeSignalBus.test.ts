/**
 * Integration test: runtime signal bus → fusion → urgent-call propagation.
 * Avoids jsdom by injecting a minimal EventTarget as `window`.
 */
import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  if (typeof (globalThis as any).window === 'undefined') {
    (globalThis as any).window = new EventTarget();
  }
});

describe('zoeRuntimeSignalBus', () => {
  it('publishes urgent-call → concerned fusion to subscribers', async () => {
    const mod = await import('@/utils/zoeRuntimeSignalBus');
    const received: boolean[] = [];
    const unsub = mod.subscribeRuntimeSignals(s => received.push(s.urgentCall));
    const fused = mod.recomputeFusion({ urgentCall: true });
    expect(fused.emotion).toBe('concerned');
    expect(mod.getRuntimeSignals().urgentCall).toBe(true);
    expect(received.some(Boolean)).toBe(true);
    unsub();
  });

  it('falls back to a known fusion emotion without urgent signals', async () => {
    const mod = await import('@/utils/zoeRuntimeSignalBus');
    const fused = mod.recomputeFusion({});
    expect([
      'idle','happy','sad','concerned','joyful','nostalgic','focused',
      'flirty','sleepy','restless','thinking','loving','surprised','angry','crying',
    ]).toContain(fused.emotion);
  });
});
