import { describe, expect, it } from 'vitest';
import { filterMusicSuggestions } from './musicConnect';

describe('Music Connect suggestions', () => {
  it('always returns five unique deterministic choices', () => {
    expect(filterMusicSuggestions(['Calm', 'Calm', 'Jazz'], '')).toEqual(['Calm', 'Jazz', 'calm music', 'focus music', 'uplifting music']);
  });

  it('adapts cached suggestions locally while typing', () => {
    const result = filterMusicSuggestions(['calm', 'focus', 'jazz', 'romantic', 'ambient'], 'night');
    expect(result).toHaveLength(5);
    expect(result[0]).toBe('night calm');
  });
});