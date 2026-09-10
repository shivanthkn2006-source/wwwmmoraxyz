/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listeners = new Map<string, (event: Record<string, string>) => void>();
const startListening = vi.fn(async () => ({ active: true }));
const stopListening = vi.fn(async () => undefined);
const setOutputActive = vi.fn(async () => undefined);

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
  registerPlugin: () => ({
    startListening,
    stopListening,
    setOutputActive,
    getStatus: vi.fn(async () => ({ active: true, permission: 'granted' })),
    addListener: vi.fn(async (name: string, listener: (event: Record<string, string>) => void) => {
      listeners.set(name, listener);
      return { remove: vi.fn(async () => undefined) };
    }),
  }),
}));

describe('NativeZoeAudioBridge', () => {
  beforeEach(async () => {
    vi.resetModules();
    listeners.clear();
    startListening.mockClear();
    stopListening.mockClear();
    setOutputActive.mockClear();
  });

  it('uses the native wake service and forwards wake events to the one Zoe orb', async () => {
    const { nativeZoeAudioBridge } = await import('@/services/NativeZoeAudioBridge');
    const activated = vi.fn();
    window.addEventListener('zoe-orb-activate', activated);
    expect(await nativeZoeAudioBridge.start(['hey zoe'], ['zoe stop'])).toBe(true);
    expect(startListening).toHaveBeenCalledWith({ wakePhrases: ['hey zoe'], stopPhrases: ['zoe stop'] });
    listeners.get('wakeWord')?.({ phrase: 'hey zoe' });
    expect(activated).toHaveBeenCalledTimes(1);
    window.removeEventListener('zoe-orb-activate', activated);
  });

  it('forwards native stop and output activity without browser speech synthesis', async () => {
    const { nativeZoeAudioBridge } = await import('@/services/NativeZoeAudioBridge');
    const stopped = vi.fn();
    window.addEventListener('zoe-stop-speaking', stopped);
    await nativeZoeAudioBridge.initialize();
    listeners.get('stopPhrase')?.({ phrase: 'zoe stop' });
    await nativeZoeAudioBridge.setOutputActive(true);
    await nativeZoeAudioBridge.stop();
    expect(stopped).toHaveBeenCalledTimes(1);
    expect(setOutputActive).toHaveBeenCalledWith({ active: true });
    expect(stopListening).toHaveBeenCalledTimes(1);
    window.removeEventListener('zoe-stop-speaking', stopped);
  });
});