import { describe, it, expect } from 'vitest';
import {
  GROWTH_ANGLES,
  GROWTH_SLOTS,
  pickAngle,
  ageFromBirthDate,
  TITLE_HISTORY_WINDOW,
} from '../../supabase/functions/_shared/growth-content';

describe('growth angles', () => {
  it('defines a distinct pool for every delivery window', () => {
    for (const slot of GROWTH_SLOTS) {
      const pool = GROWTH_ANGLES[slot];
      expect(pool.length).toBeGreaterThanOrEqual(10);
      expect(new Set(pool).size).toBe(pool.length);
    }
  });

  it('never reuses the same angle text across two windows', () => {
    const all = GROWTH_SLOTS.flatMap((s) => GROWTH_ANGLES[s]);
    expect(new Set(all).size).toBe(all.length);
  });

  it('is deterministic for a given member, date and slot', () => {
    const seed = 'user-1_2026-03-04_midday';
    expect(pickAngle('midday', seed)).toBe(pickAngle('midday', seed));
  });

  it('rotates across consecutive days for one member', () => {
    // The reported bug: "Midday Focus Reset" delivered on four separate days.
    // Fourteen consecutive days must not collapse onto a single angle.
    const angles = new Set<string>();
    for (let day = 1; day <= 14; day++) {
      const seed = `user-fixed_2026-03-${String(day).padStart(2, '0')}_midday`;
      angles.add(pickAngle('midday', seed));
    }
    expect(angles.size).toBeGreaterThanOrEqual(6);
  });

  it('spreads angles across members on the same day', () => {
    const angles = new Set<string>();
    for (let i = 0; i < 100; i++) angles.add(pickAngle('morning', `u${i}_2026-03-04_morning`));
    expect(angles.size).toBe(GROWTH_ANGLES.morning.length);
  });

  it('keeps the title avoid-list larger than any single angle pool', () => {
    // Otherwise a member could cycle back onto an old headline while the
    // avoid-list has already forgotten it.
    for (const slot of GROWTH_SLOTS) {
      expect(TITLE_HISTORY_WINDOW).toBeGreaterThanOrEqual(GROWTH_ANGLES[slot].length);
    }
  });
});

describe('ageFromBirthDate', () => {
  const today = new Date('2026-09-01T00:00:00Z');

  it('computes whole years', () => {
    expect(ageFromBirthDate('2000-09-01', today)).toBe(26);
    expect(ageFromBirthDate('2000-08-31', today)).toBe(26);
  });

  it('does not count a birthday that has not happened yet', () => {
    expect(ageFromBirthDate('2000-09-02', today)).toBe(25);
    expect(ageFromBirthDate('2000-12-31', today)).toBe(25);
  });

  it('rejects malformed or absent input instead of guessing', () => {
    expect(ageFromBirthDate(null, today)).toBeNull();
    expect(ageFromBirthDate('', today)).toBeNull();
    expect(ageFromBirthDate('01-01-2000', today)).toBeNull();
    expect(ageFromBirthDate('1800-01-01', today)).toBeNull();
  });
});
