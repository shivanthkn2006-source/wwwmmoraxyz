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
