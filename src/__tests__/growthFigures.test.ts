import { describe, it, expect } from 'vitest';
import {
  GROWTH_FIGURES,
  pickFigure,
  birthResonance,
  FIGURE_HISTORY_WINDOW,
} from '../../supabase/functions/_shared/growth-figures';

describe('growth figures roster', () => {
  it('is large enough that the exclusion window can never empty the pool', () => {
    expect(GROWTH_FIGURES.length).toBeGreaterThan(FIGURE_HISTORY_WINDOW);
  });

  it('has unique slugs', () => {
    const slugs = GROWTH_FIGURES.map((f) => f.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('includes the famous names rather than banning them', () => {
    // Earlier the roster excluded the model's favourite answers outright. That
    // was the wrong fix: a growth product without Newton or Gandhi is worse.
    // Assignment (not exclusion) is what caps their share — see the fair-share
    // test below.
    const names = new Set(GROWTH_FIGURES.map((f) => f.name.toLowerCase()));
    for (const expected of [
      'benjamin franklin',
      'mahatma gandhi',
      'albert einstein',
      'isaac newton',
      'nikola tesla',
      'napoleon bonaparte',
      'elon musk',
      'steve jobs',
      'thomas edison',
    ]) {
      expect(names.has(expected)).toBe(true);
    }
  });

  it('spans many disciplines and regions, not just science', () => {
    expect(new Set(GROWTH_FIGURES.map((f) => f.discipline)).size).toBeGreaterThanOrEqual(10);
    expect(new Set(GROWTH_FIGURES.map((f) => f.region)).size).toBeGreaterThanOrEqual(20);
  });

  it('covers every birth month so month-resonance always has candidates', () => {
    const months = new Set(
      GROWTH_FIGURES.filter((f) => f.born).map((f) => Number(f.born!.split('-')[1])),
    );
    for (let m = 1; m <= 12; m++) expect(months.has(m)).toBe(true);
  });

  it('only claims a milestone when it also states what happened', () => {
    for (const f of GROWTH_FIGURES) {
      expect(f.milestoneAge == null).toBe(f.milestone == null);
    }
  });

  it('is deterministic: the same seed always resolves to the same figure', () => {
    const seed = 'user-abc_2026-03-04_morning';
    expect(pickFigure(seed).slug).toBe(pickFigure(seed).slug);
  });

  it('never returns an excluded figure while any alternative remains', () => {
    const seed = 'user-abc_2026-03-04_morning';
    const first = pickFigure(seed);
    const second = pickFigure(seed, [first.slug]);
    expect(second.slug).not.toBe(first.slug);
  });

  it('still returns a figure when every roster entry is excluded', () => {
    const all = GROWTH_FIGURES.map((f) => f.slug);
    expect(pickFigure('any-seed', all)).toBeTruthy();
  });

  it('gives no single figure more than a fair share across many members', () => {
    // The original defect: Franklin in ~70% of biographical cards. Assignment
    // must keep any one name near 1/N, which is what makes including the
    // famous names safe.
    const counts = new Map<string, number>();
    for (let i = 0; i < 400; i++) {
      const slug = pickFigure(`user-${i}_2026-03-04_morning`, [], { slot: 'morning' }).slug;
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
    const top = Math.max(...counts.values());
    expect(top / 400).toBeLessThan(0.12);
    expect(counts.size).toBeGreaterThan(15);
  });

  it('does not repeat for one user across a rolling window of days', () => {
    const seen: string[] = [];
    for (let day = 1; day <= FIGURE_HISTORY_WINDOW; day++) {
      const seed = `user-fixed_2026-03-${String(day).padStart(2, '0')}_morning`;
      seen.push(pickFigure(seed, seen).slug);
    }
    expect(new Set(seen).size).toBe(seen.length);
  });
});

describe('slot affinity', () => {
  it('prefers a documented early riser for the morning card', () => {
    let early = 0;
    for (let i = 0; i < 60; i++) {
      const f = pickFigure(`u${i}_2026-03-04_morning`, [], { slot: 'morning' });
      if (f.chronotype === 'early') early++;
    }
    // The roster is mostly 'any', so a majority here can only come from the
    // slot weighting actually being applied.
    expect(early).toBeGreaterThan(30);
  });

  it('prefers reflective disciplines for the evening card', () => {
    let reflective = 0;
    for (let i = 0; i < 60; i++) {
      const f = pickFigure(`u${i}_2026-03-04_evening`, [], { slot: 'evening' });
      if (['philosophy', 'letters', 'arts'].includes(f.discipline)) reflective++;
    }
    expect(reflective).toBeGreaterThan(30);
  });

  it('still varies within a slot rather than collapsing onto one figure', () => {
    const picks = new Set<string>();
    for (let i = 0; i < 100; i++) {
      picks.add(pickFigure(`u${i}_2026-03-04_evening`, [], { slot: 'evening' }).slug);
    }
    expect(picks.size).toBeGreaterThan(8);
  });
});

describe('birth resonance', () => {
  const today = new Date('2026-09-01T00:00:00Z');

  it('prefers a figure born in the member\'s birth month', () => {
    let sameMonth = 0;
    for (let i = 0; i < 60; i++) {
      const f = pickFigure(`u${i}_2026-03-04_afternoon`, [], { birthMonth: 7 });
      if (f.born && Number(f.born.split('-')[1]) === 7) sameMonth++;
    }
    expect(sameMonth).toBeGreaterThan(40);
  });

  it('surfaces an "at exactly your age" line when the milestone matches', () => {
    const figure = GROWTH_FIGURES.find((f) => f.slug === 'albert-einstein')!;
    // Einstein's milestone age is 26; a member born in 2000 is 26 on this date.
    const line = birthResonance(figure, '2000-01-05', today);
    expect(line).toContain('26');
    expect(line).toContain('Albert Einstein');
  });

  it('reports an exact shared birthday', () => {
    const figure = GROWTH_FIGURES.find((f) => f.slug === 'marie-curie')!;
    const line = birthResonance(figure, '1990-11-07', today);
    expect(line).toContain('birthday');
  });

  it('returns null rather than inventing a link when none exists', () => {
    const figure = GROWTH_FIGURES.find((f) => f.slug === 'archimedes')!; // no birth date
    expect(birthResonance(figure, '1990-11-07', today)).toBeNull();
  });

  it('returns null when the member has no birth date on file', () => {
    const figure = GROWTH_FIGURES.find((f) => f.slug === 'marie-curie')!;
    expect(birthResonance(figure, null, today)).toBeNull();
    expect(birthResonance(figure, 'not-a-date', today)).toBeNull();
  });
});
