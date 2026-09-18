import { describe, expect, it } from 'vitest';
import { describeDailyPlanetaryMood, readDailyPlanetaryMood } from './dailyPlanetaryMood';
import { faithKeywordsFor } from './musicFaith';
import type { MusicConnectContext } from './musicConnect';

const base: MusicConnectContext = {
  suggestions: ['calm', 'bhajan'],
  taste: { genres: [], moods: [], artists: [], recentTracks: [], religion: 'Hindu' },
  planetary: {},
  expiresAt: null,
};

describe('daily planetary mood', () => {
  it('reads only the values the calculation really produced', () => {
    const mood = readDailyPlanetaryMood({
      ...base,
      planetary: {
        hora: { lord: 'Venus', index: 3 },
        dayLord: { day: 'Friday', planet: 'Venus', focus: 'Aesthetic Purity' },
        currentMoon: { sign: 'Kanya', nakshatra: 'Hasta', pada: 2 },
        completeBirthData: false,
      },
    });
    expect(mood.horaLord).toBe('Venus');
    expect(mood.dayLord?.planet).toBe('Venus');
    expect(mood.moon?.nakshatra).toBe('Hasta');
    expect(mood.dasha).toBeNull();
    expect(mood.transit).toBeNull();
    expect(mood.completeBirthData).toBe(false);
    expect(describeDailyPlanetaryMood(mood)).toContain('Venus hour');
  });

  it('falls back to the saved faith when the reading has no faith words', () => {
    const mood = readDailyPlanetaryMood(base);
    expect(mood.faithKeywords.slice(0, 2)).toEqual(['bhajan', 'sanskrit chants']);
    expect(mood.faithKeywords.length).toBeGreaterThan(3);
  });

  it('gives devotional words for each supported faith and none when unset', () => {
    expect(faithKeywordsFor('Christian').slice(0, 2)).toEqual(['worship songs', 'gospel']);
    expect(faithKeywordsFor('Buddhist').slice(0, 2)).toEqual(['buddhist chants', 'zen meditation']);
    expect(faithKeywordsFor('')).toEqual([]);
    expect(faithKeywordsFor('None')).toEqual([]);
    expect(faithKeywordsFor('Zoroastrian')).toEqual(['zoroastrian devotional', 'zoroastrian prayer songs']);
  });
});
