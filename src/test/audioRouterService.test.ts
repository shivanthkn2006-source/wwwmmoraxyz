import { describe, expect, it, vi, beforeEach } from 'vitest';
import { audioRouter } from '@/services/AudioRouterService';

describe('AudioRouterService — Bluetooth routing core', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('reports diagnostics with the fields the audio centre renders', () => {
    const d = audioRouter.getDiagnostics();
    expect(typeof d.inputSampleRate).toBe('number');
    expect(typeof d.outputLatencyMs).toBe('number');
    expect(typeof d.isSinkIdSupported).toBe('boolean');
    expect(typeof d.hasMediaSession).toBe('boolean');
    expect(['granted', 'denied', 'prompt', 'unknown']).toContain(d.micPermission);
  });

  it('pins a media element to the chosen sink when setSinkId exists', async () => {
    const setSinkId = vi.fn().mockResolvedValue(undefined);
    const el = { setSinkId } as unknown as HTMLMediaElement;
    await audioRouter.setOutputDevice('bt-headset-1');
    const ok = await audioRouter.applySinkToElement(el);
    expect(ok).toBe(true);
    expect(setSinkId).toHaveBeenCalledWith('bt-headset-1');
  });

  it('falls back gracefully when the browser has no setSinkId', async () => {
    const ok = await audioRouter.applySinkToElement({} as HTMLMediaElement);
    expect(ok).toBe(false);
  });

  it('mutes and unmutes the headset mic track on voice toggle', async () => {
    const track = { enabled: true, stop: vi.fn(), kind: 'audio' };
    // @ts-expect-error test double
    audioRouter.micStream = { getAudioTracks: () => [track], getTracks: () => [track] };
    audioRouter.toggleVoiceInput(false);
    expect(track.enabled).toBe(false);
    audioRouter.toggleVoiceInput(true);
    expect(track.enabled).toBe(true);
  });
});
