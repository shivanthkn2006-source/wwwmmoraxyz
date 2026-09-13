import { describe, expect, it } from 'vitest';
import { resolveMusicIntent } from './musicIntent';

describe('resolveMusicIntent', () => {
  it('understands named playback and transport commands', () => {
    expect(resolveMusicIntent('play relaxing music')).toMatchObject({ kind: 'play', lookup: 'mood', query: 'relaxing' });
    expect(resolveMusicIntent('pause the music')).toMatchObject({ kind: 'pause' });
    expect(resolveMusicIntent('next song')).toMatchObject({ kind: 'next' });
    expect(resolveMusicIntent('open music player')).toMatchObject({ kind: 'open' });
  });

  it('does not hijack ordinary conversation or other media', () => {
    expect(resolveMusicIntent('stop')).toBeNull();
    expect(resolveMusicIntent('pause the video')).toBeNull();
    expect(resolveMusicIntent('what is the latest news')).toBeNull();
  });
});