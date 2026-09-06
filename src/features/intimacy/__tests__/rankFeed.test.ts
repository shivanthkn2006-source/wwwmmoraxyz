import { describe, it, expect } from 'vitest';
import { rankByIntimacy, scoreItem } from '../rankFeed';
import { dwellWeight, EVENT_WEIGHTS } from '../feedEvents';
import { cohortFromBirthDate, toneDirective } from '../generationalTone';

const now = Date.parse('2026-09-01T12:00:00Z');

describe('intimacy ranking', () => {
  it('puts a close friend above a viral stranger', () => {
    const intimacy = new Map([['friend', 40]]);
    const items = [
      { id: 'viral', authorId: 'stranger', createdAt: now - 3600_000, velocity: 50_000 },
      { id: 'friend', authorId: 'friend', createdAt: now - 3600_000, velocity: 2 },
    ];
    expect(rankByIntimacy(items, { intimacy, now })[0].id).toBe('friend');
  });

  it('keeps chronological order when there is no closeness signal', () => {
    const items = [
      { id: 'a', authorId: 'x', createdAt: now - 1000 },
      { id: 'b', authorId: 'y', createdAt: now - 5000 },
    ];
    expect(rankByIntimacy(items, { intimacy: new Map(), now }).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('never lets one author take two of the first five slots', () => {
    const intimacy = new Map([['dom', 90]]);
    const items = Array.from({ length: 6 }, (_, i) => ({
      id: `d${i}`,
      authorId: 'dom',
      createdAt: now - i * 1000,
    })).concat([{ id: 'other', authorId: 'other', createdAt: now - 100_000 }]);
    const ordered = rankByIntimacy(items, { intimacy, now, diversityWindow: 5 });
    const firstFive = ordered.slice(0, 5).filter((i) => i.authorId === 'dom');
    expect(firstFive.length).toBe(1);
  });

  it('caps popularity so virality cannot dominate', () => {
    const opts = { intimacy: new Map<string, number>(), now, velocityCap: 3 };
    const low = scoreItem({ id: 'l', authorId: 'a', createdAt: now, velocity: 10 }, opts);
    const insane = scoreItem({ id: 'h', authorId: 'a', createdAt: now, velocity: 10_000_000 }, opts);
    expect(insane - low).toBeLessThanOrEqual(3);
  });
});

describe('signal weights', () => {
  it('weights conversation above passive views', () => {
    expect(EVENT_WEIGHTS.reply).toBeGreaterThan(EVENT_WEIGHTS.like);
    expect(EVENT_WEIGHTS.like).toBeGreaterThan(EVENT_WEIGHTS.view);
    expect(EVENT_WEIGHTS.skip).toBe(0);
  });

  it('grows dwell sub-linearly and bounds it', () => {
    expect(dwellWeight(1000)).toBeLessThan(dwellWeight(10_000));
    expect(dwellWeight(10_000_000)).toBeLessThanOrEqual(6);
  });
});

describe('generational tone', () => {
  it('maps birth years to cohorts', () => {
    expect(cohortFromBirthDate('2003-05-01')).toBe('genz');
    expect(cohortFromBirthDate('1988-05-01')).toBe('millennial');
    expect(cohortFromBirthDate('1972-05-01')).toBe('genx');
    expect(cohortFromBirthDate(null)).toBe('unspecified');
  });

  it('returns a non-empty style directive for every cohort', () => {
    for (const c of ['genz', 'millennial', 'genx', 'boomer', 'unspecified'] as const) {
      expect(toneDirective(c).length).toBeGreaterThan(10);
    }
  });
});
