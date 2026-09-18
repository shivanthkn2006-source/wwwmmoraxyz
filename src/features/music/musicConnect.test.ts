import { describe, expect, it } from 'vitest';
import { filterMusicSuggestions } from './musicConnect';

describe('Music Connect suggestions', () => {
  it('always returns ten unique deterministic choices', () => {
    const result = filterMusicSuggestions(['Calm', 'Calm', 'Jazz'], '');
    expect(result).toHaveLength(10);
    expect(result.slice(0, 4)).toEqual(['Calm', 'Jazz', 'calm music', 'focus music']);
    expect(new Set(result).size).toBe(10);
  });

  it('adapts cached suggestions locally while typing', () => {
    const result = filterMusicSuggestions(['calm', 'focus', 'jazz', 'romantic', 'ambient', 'calm night'], 'night');
    expect(result).toHaveLength(10);
    expect(result[0]).toBe('night');
    expect(result).toContain('calm night');
    expect(result).toContain('night songs');
    // The typed text is never glued in front of an unrelated mood keyword.
    expect(result).not.toContain('night jazz');
  });
});
describe('chart and recommendation intents', () => {
  it('routes birth-chart requests to the local resolver', async () => {
    const { resolveMusicIntent } = await import('./musicIntent');
    expect(resolveMusicIntent('recommend tracks for my birth chart')).toMatchObject({ kind: 'personal', scope: 'chart' });
    expect(resolveMusicIntent('play music for my birth chart')).toMatchObject({ kind: 'personal', scope: 'chart' });
    expect(resolveMusicIntent('suggest songs for my mood')).toMatchObject({ kind: 'personal', scope: 'mood' });
    expect(resolveMusicIntent('recommend a restaurant')).toBeNull();
    expect(resolveMusicIntent('suggest a good time to call')).toBeNull();
  });
});
