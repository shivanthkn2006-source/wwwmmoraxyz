import { describe, it, expect } from 'vitest';
import {
  GROWTH_FIGURES,
  pickFigure,
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

  it('does not contain the figures the model kept defaulting to', () => {
    // Franklin appeared in ~70% of generated biographical cards. The roster is
    // the replacement for the model's own choice, so it must not reintroduce
    // the same attractors. Matched on exact name — Rosalind Franklin is a
    // different person and is legitimately on the roster.
    const names = new Set(GROWTH_FIGURES.map((f) => f.name.toLowerCase()));
    for (const banned of [
      'benjamin franklin',
      'mahatma gandhi',
      'albert einstein',
      'steve jobs',
      'thomas edison',
    ]) {
      expect(names.has(banned)).toBe(false);
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

  it('spreads different users across many distinct figures on the same day', () => {
    // The original bug: identical prompt inputs for every user. Distinct user
    // ids must now produce a wide spread rather than one dominant name.
    const picks = new Set<string>();
    for (let i = 0; i < 200; i++) {
      picks.add(pickFigure(`user-${i}_2026-03-04_morning`).slug);
    }
    expect(picks.size).toBeGreaterThan(25);
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
