/**
 * @vitest-environment jsdom
 *
 * Integration test: runtime signal bus → fusion → urgent-call propagation.
 */

import { describe, it, expect } from 'vitest';
import {
  subscribeRuntimeSignals,
  recomputeFusion,
  getRuntimeSignals,
} from '@/utils/zoeRuntimeSignalBus';

describe('zoeRuntimeSignalBus', () => {
  it('publishes urgent-call → concerned fusion to subscribers', async () => {
    const received: boolean[] = [];
    const unsub = subscribeRuntimeSignals(s => received.push(s.urgentCall));
    const fused = recomputeFusion({ urgentCall: true });
    expect(fused.emotion).toBe('concerned');
    expect(getRuntimeSignals().urgentCall).toBe(true);
    expect(received.some(Boolean)).toBe(true);
    unsub();
  });

  it('falls back to baseline fusion without signals', () => {
    const fused = recomputeFusion({});
    expect(['idle', 'happy', 'sad', 'concerned', 'joyful', 'nostalgic', 'focused', 'flirty', 'sleepy', 'restless', 'thinking', 'loving', 'surprised', 'angry', 'crying']).toContain(fused.emotion);
  });
});
