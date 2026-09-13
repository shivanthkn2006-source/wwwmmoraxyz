import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/NativeZoeMusicBridge', () => ({
  nativeZoeMusicBridge: {
    isAvailable: () => false,
    initialize: vi.fn(), load: vi.fn(), play: vi.fn(), pause: vi.fn(), stop: vi.fn(), seek: vi.fn(), setVolume: vi.fn(),
  },
}));

class AudioDouble {
  src = '';
  preload = '';
  crossOrigin: string | null = null;
  volume = 1;
  currentTime = 0;
  duration = 120;
  muted = false;
  onplaying: (() => void) | null = null;
  onpause: (() => void) | null = null;
  onwaiting: (() => void) | null = null;
  ontimeupdate: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn(async () => { this.onplaying?.(); });
  pause = vi.fn(() => this.onpause?.());
  removeAttribute = vi.fn();
}

describe('MusicEngine', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('Audio', AudioDouble);
    vi.stubGlobal('MediaMetadata', class { constructor(public value: unknown) {} });
  });

  it('plays and publishes a route-independent queue', async () => {
    const { musicEngine } = await import('@/services/MusicEngine');
    const states: string[] = [];
    const unsub = musicEngine.subscribe((state) => states.push(state.status));
    const ok = await musicEngine.playQueue([{ id: '1', title: 'One', artist: 'A', url: 'https://audio.test/one.mp3', source: 'archive', credit: 'Archive' }]);
    expect(ok).toBe(true);
    expect(musicEngine.getState()).toMatchObject({ status: 'playing', index: 0, track: { title: 'One' } });
    expect(states).toContain('buffering');
    unsub();
  });

  it('refuses an empty queue honestly', async () => {
    const { musicEngine } = await import('@/services/MusicEngine');
    await expect(musicEngine.playQueue([])).resolves.toBe(false);
    expect(musicEngine.getState().error).toContain('could not find');
  });
});