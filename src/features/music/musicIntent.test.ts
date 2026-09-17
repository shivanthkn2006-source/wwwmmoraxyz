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
    expect(resolveMusicIntent('start the god mode scan')).toBeNull();
    expect(resolveMusicIntent('play the video I posted')).toBeNull();
  });

  it('only treats a bare "start" as music when it sounds like a track', () => {
    expect(resolveMusicIntent('start my day')).toBeNull();
    expect(resolveMusicIntent('start over')).toBeNull();
    expect(resolveMusicIntent('start a call with Marc')).toBeNull();
    expect(resolveMusicIntent('start the upload')).toBeNull();
    expect(resolveMusicIntent('start the deployment')).toBeNull();
    expect(resolveMusicIntent('start the song Bohemian Rhapsody')).toMatchObject({ kind: 'play', lookup: 'track' });
    expect(resolveMusicIntent('start Shape of You by Ed Sheeran')).toMatchObject({ kind: 'play', lookup: 'track' });
    expect(resolveMusicIntent('start some lofi')).toMatchObject({ kind: 'play' });
    expect(resolveMusicIntent('play the upload')).toBeNull();
    expect(resolveMusicIntent('play Mission Impossible theme')).toMatchObject({ kind: 'play', lookup: 'track' });
  });

  it('routes personal taste requests without an AI query', () => {
    expect(resolveMusicIntent('Zoe play my favorites')).toMatchObject({ kind: 'personal', scope: 'favorite' });
    expect(resolveMusicIntent('play my playlist')).toMatchObject({ kind: 'personal', scope: 'playlist' });
    expect(resolveMusicIntent('play my recent music')).toMatchObject({ kind: 'personal', scope: 'history' });
    expect(resolveMusicIntent('play a song based on my current mood')).toMatchObject({ kind: 'personal', scope: 'mood' });
  });
});
