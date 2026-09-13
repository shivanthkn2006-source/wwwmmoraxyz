import { describe, expect, it } from 'vitest';
import { musicMatchScore, normalizeMusicQuery, parsePlatformMusicSearch } from './musicQuery';

describe('music query normalization', () => {
  it('normalizes spoken wording, accents and bounded music vocabulary', () => {
    expect(normalizeMusicQuery('Zoe, please play carnatik music').query).toBe('carnatic music');
    expect(normalizeMusicQuery('Find Beyoncé').query).toBe('beyonce');
    expect(normalizeMusicQuery('Find Beyoncé').corrected).toBe(false);
    expect(normalizeMusicQuery('telegu qawali').query).toBe('telugu qawwali');
  });

  it('does not guess open song or artist names', () => {
    expect(normalizeMusicQuery('Mishon Impossibel theme').query).toBe('mishon impossibel theme');
  });

  it('corrects a known artist spelling and recognizes explicit platform music searches', () => {
    expect(normalizeMusicQuery('Ketty Perry').query).toBe('katy perry');
    expect(parsePlatformMusicSearch('search songs by Ketty Perry')).toBe('ketty perry');
    expect(parsePlatformMusicSearch('Katy Perry songs')).toBe('katy perry');
    expect(parsePlatformMusicSearch('Katy Perry')).toBeNull();
  });

  it('ranks exact provider metadata above broad matches', () => {
    expect(musicMatchScore({ title: 'Signal', artist: 'Artist' }, 'Signal'))
      .toBeGreaterThan(musicMatchScore({ title: 'Signal Radio', artist: 'Live' }, 'Signal'));
  });
});