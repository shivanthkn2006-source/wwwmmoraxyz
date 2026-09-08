import { describe, it, expect } from 'vitest';
import { sunSignFromBirthDate, elementOf, signAffinity, isDayLordMatch } from '@/features/astro/zodiac';
import { rankByIntimacy } from '@/features/intimacy/rankFeed';

describe('astrology signal', () => {
  it('derives the sun sign from a real birth date only', () => {
    expect(sunSignFromBirthDate('1977-08-16')).toBe('Leo');
    expect(sunSignFromBirthDate('1982-10-24')).toBe('Scorpio');
    expect(sunSignFromBirthDate('2005-02-24')).toBe('Pisces');
    expect(sunSignFromBirthDate('1990-01-05')).toBe('Capricorn');
    expect(sunSignFromBirthDate(null)).toBeNull();
    expect(sunSignFromBirthDate('not-a-date')).toBeNull();
  });

  it('maps elements and affinity', () => {
    expect(elementOf('Leo')).toBe('Fire');
    expect(signAffinity('Leo', 'Aries')).toBe(1);
    expect(signAffinity('Leo', 'Gemini')).toBe(0.7);
    expect(signAffinity('Leo', 'Taurus')).toBe(0.3);
    expect(signAffinity('Leo', null)).toBe(0);
  });

  it('matches the day lord to the sign ruler', () => {
    expect(isDayLordMatch('Leo', 'Sun')).toBe(true);
    expect(isDayLordMatch('Leo', 'Saturn')).toBe(false);
  });

  it('lets astrology break a tie without outranking closeness', () => {
    const now = Date.now();
    const items = [
      { id: 'a', authorId: 'far', createdAt: new Date(now).toISOString() },
      { id: 'b', authorId: 'aligned', createdAt: new Date(now).toISOString() },
    ];
    const astro = new Map([['aligned', 1]]);
    expect(rankByIntimacy(items, { intimacy: new Map(), astro, now })[0].id).toBe('b');

    // A close friend still wins over a merely well-aligned stranger.
    const intimacy = new Map([['far', 20]]);
    expect(rankByIntimacy(items, { intimacy, astro, now })[0].id).toBe('a');
  });
});
