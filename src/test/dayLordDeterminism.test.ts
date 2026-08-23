import { describe, it, expect } from 'vitest';
import { getDailyArchetype, DAY_LORDS } from '@/lib/dayLord';

/**
 * Deterministic regression fixtures for the day-lord / ephemeris grounding layer.
 * These values must never drift — Zoe's prompts and feed tags depend on them.
 */
const FIXTURES: { iso: string; zone: string; planet: string; day: string }[] = [
  { iso: '2026-08-23T09:00:00Z', zone: 'UTC', planet: 'Sun', day: 'Sunday' },
  { iso: '2026-08-23T20:30:00Z', zone: 'Asia/Kolkata', planet: 'Moon', day: 'Monday' }, // +5:30 rolls the date
  { iso: '2026-01-01T12:00:00Z', zone: 'UTC', planet: 'Jupiter', day: 'Thursday' },
  { iso: '1977-11-04T06:15:00Z', zone: 'Asia/Kolkata', planet: 'Venus', day: 'Friday' },
];

describe('day-lord determinism', () => {
  it.each(FIXTURES)('resolves $iso in $zone to $planet', ({ iso, zone, planet, day }) => {
    const t = getDailyArchetype(new Date(iso), zone);
    expect(t.rulingPlanet).toBe(planet);
    expect(t.dayName).toBe(day);
  });

  it('is stable across repeated calls', () => {
    const d = new Date('2026-03-11T04:00:00Z');
    expect(getDailyArchetype(d, 'UTC')).toEqual(getDailyArchetype(d, 'UTC'));
  });

  it('fails safe to a valid archetype when the timezone is invalid', () => {
    const t = getDailyArchetype(new Date('2026-08-23T09:00:00Z'), 'Not/AZone');
    expect(Object.values(DAY_LORDS)).toContainEqual(t);
    expect(t.rulingPlanet).toBeTruthy();
  });

  it('covers all seven weekdays with complete telemetry', () => {
    for (let i = 0; i < 7; i++) {
      const l = DAY_LORDS[i];
      expect(l.dayName && l.rulingPlanet && l.archetype && l.dailyFocus).toBeTruthy();
    }
  });
});
