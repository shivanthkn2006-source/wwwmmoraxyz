/**
 * @vitest-environment jsdom
 */
/**
 * Hands-free wake word — behaviour contract.
 *
 * Guards the promises the Zoe Audio page makes to the user: one-time mic
 * permission, "Hey Zoe" fires the same activation a headset button fires,
 * "Zoe stop" cuts her off, and the browser never claims pocket listening.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ensureMicPermission = vi.fn(async () => true);
const interruptZoe = vi.fn();

vi.mock('@/services/AudioRouterService', () => ({
  audioRouter: {
    ensureMicPermission: (...a: unknown[]) => ensureMicPermission(...(a as [])),
    interruptZoe: () => interruptZoe(),
    applySinkToElement: async () => undefined,
    releaseMic: async () => undefined,
  },
}));

class FakeRecognition {
  static instances: FakeRecognition[] = [];
  continuous = false;
  interimResults = false;
  lang = '';
  onstart: (() => void) | null = null;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  started = false;
  constructor() { FakeRecognition.instances.push(this); }
  start() { this.started = true; this.onstart?.(); }
  abort() { this.started = false; }
  stop() { this.started = false; }
  say(transcript: string) {
    this.onresult?.({ resultIndex: 0, results: [[{ transcript }]] });
  }
}

describe('zoeBackgroundListener', () => {
  beforeEach(() => {
    vi.resetModules();
    FakeRecognition.instances = [];
    ensureMicPermission.mockClear();
    interruptZoe.mockClear();
    (window as unknown as Record<string, unknown>).SpeechRecognition = FakeRecognition;
    localStorage.clear();
  });

  afterEach(async () => {
    const { resetMuteGate } = await import('@/features/zoe-handsfree/muteGate');
    resetMuteGate();
  });

  it('reports honest capability: browser tabs cannot listen in your pocket', async () => {
    const { wakeWordCapability } = await import('@/services/ZoeBackgroundListener');
    const cap = wakeWordCapability();
    expect(cap.supported).toBe(true);
    expect(cap.isNative).toBe(false);
    expect(cap.backgroundCapable).toBe(false);
  });

  it('reports unsupported when the browser has no speech recognition', async () => {
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    const { wakeWordCapability } = await import('@/services/ZoeBackgroundListener');
    expect(wakeWordCapability().supported).toBe(false);
  });

  it('asks for the microphone once and then listens', async () => {
    const { zoeBackgroundListener } = await import('@/services/ZoeBackgroundListener');
    const ok = await zoeBackgroundListener.enable();
    expect(ok).toBe(true);
    expect(ensureMicPermission).toHaveBeenCalledTimes(1);
    expect(zoeBackgroundListener.getState()).toBe('listening');
    expect(zoeBackgroundListener.wasEnabledBefore()).toBe(true);
  });

  it('fires the same activation event a headset button fires on "hey zoe"', async () => {
    const { zoeBackgroundListener } = await import('@/services/ZoeBackgroundListener');
    await zoeBackgroundListener.enable();
    const seen: string[] = [];
    const onActivate = () => seen.push('activate');
    window.addEventListener('zoe-orb-activate', onActivate);
    FakeRecognition.instances.at(-1)?.say('hey zoe');
    window.removeEventListener('zoe-orb-activate', onActivate);
    expect(seen).toEqual(['activate']);
    expect(zoeBackgroundListener.getState()).toBe('triggered');
    zoeBackgroundListener.disable();
  });

  it('stops Zoe speaking on a stop phrase without re-activating her', async () => {
    const { zoeBackgroundListener } = await import('@/services/ZoeBackgroundListener');
    await zoeBackgroundListener.enable();
    let activated = 0;
    const onActivate = () => { activated += 1; };
    window.addEventListener('zoe-orb-activate', onActivate);
    FakeRecognition.instances.at(-1)?.say('zoe stop');
    window.removeEventListener('zoe-orb-activate', onActivate);
    expect(interruptZoe).toHaveBeenCalledTimes(1);
    expect(activated).toBe(0);
    zoeBackgroundListener.disable();
  });

  it('turns itself off when the microphone is refused', async () => {
    ensureMicPermission.mockResolvedValueOnce(false);
    const { zoeBackgroundListener } = await import('@/services/ZoeBackgroundListener');
    const ok = await zoeBackgroundListener.enable();
    expect(ok).toBe(false);
    expect(zoeBackgroundListener.getState()).toBe('error');
  });

  it('discards all wake phrases while muted except “Zoe wake”', async () => {
    const muteGate = await import('@/features/zoe-handsfree/muteGate');
    const { zoeBackgroundListener } = await import('@/services/ZoeBackgroundListener');
    await zoeBackgroundListener.enable();
    muteGate.setZoeMuted(true);
    let activated = 0;
    const onActivate = () => { activated += 1; };
    window.addEventListener('zoe-orb-activate', onActivate);
    FakeRecognition.instances.at(-1)?.say('hey zoe what is the news');
    expect(activated).toBe(0);
    FakeRecognition.instances.at(-1)?.say('zoe wake');
    expect(activated).toBe(1);
    expect(muteGate.isZoeMuted()).toBe(false);
    window.removeEventListener('zoe-orb-activate', onActivate);
    zoeBackgroundListener.disable();
  });
});
