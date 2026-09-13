import { describe, expect, it } from 'vitest';
import { resolveMusicIntent } from './musicIntent';

describe('resolveMusicIntent', () => {
  it('understands named playback and transport commands', () => {
    expect(resolveMusicIntent('play relaxing music')).toMatchObject({ kind: 'play', lookup: 'mood', query: 'relaxing' });
    expect(resolveMusicIntent('pause the music')).toMatchObject({ kind: 'pause' });
    expect(resolveMusicIntent('next song')).toMatchObject({ kind: 'next' });
    expect(resolveMusicIntent('skip this')).toMatchObject({ kind: 'next' });
    expect(resolveMusicIntent('previous track')).toMatchObject({ kind: 'previous' });
    expect(resolveMusicIntent('open music player')).toMatchObject({ kind: 'open' });
    expect(resolveMusicIntent('play jazz satellite radio')).toMatchObject({ kind: 'play', lookup: 'radio', query: 'jazz' });
  });

  it('does not hijack ordinary conversation or other media', () => {
    expect(resolveMusicIntent('stop')).toBeNull();
    expect(resolveMusicIntent('pause the video')).toBeNull();
    expect(resolveMusicIntent('what is the latest news')).toBeNull();
    expect(resolveMusicIntent('play fair')).toBeNull();
  });
});