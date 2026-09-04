import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  claimVoice,
  currentVoiceChannel,
  isUserVoiceActive,
  registerVoiceChannel,
  releaseVoice,
  silenceAllVoices,
} from '@/lib/zoeVoiceArbiter';

describe('Zoe voice arbiter — one voice at a time', () => {
  beforeEach(() => {
    silenceAllVoices();
  });

  it('stops every other channel when a channel claims the floor', () => {
    const stopNarration = vi.fn();
    const off = registerVoiceChannel('narration', stopNarration);
    claimVoice('narration');
    claimVoice('search');
    expect(stopNarration).toHaveBeenCalledTimes(1);
    expect(currentVoiceChannel()).toBe('search');
    off();
  });

  it('keeps ambient narration silent while the user is talking to Zoe', () => {
    claimVoice('search');
    expect(isUserVoiceActive()).toBe(true);
    expect(claimVoice('narration', { ambient: true })).toBe(false);
    expect(currentVoiceChannel()).toBe('search');
  });

  it('lets ambient narration speak once the user channel is released', () => {
    claimVoice('search');
    releaseVoice('search');
    expect(claimVoice('narration', { ambient: true })).toBe(true);
    expect(currentVoiceChannel()).toBe('narration');
  });

  it('silences all channels on demand', () => {
    const stop = vi.fn();
    const off = registerVoiceChannel('chat', stop);
    claimVoice('chat');
    silenceAllVoices();
    expect(stop).toHaveBeenCalled();
    expect(currentVoiceChannel()).toBeNull();
    off();
  });
});
