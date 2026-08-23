/**
 * DAY-LORD TELEMETRY (client mirror of supabase/functions/_shared/day-lord.ts).
 * Deterministic weekday rulership — no model call, no network.
 */

export interface DayLordTelemetry {
  dayName: string;
  rulingPlanet: string;
  archetype: string;
  recommendedColor: string;
  dailyFocus: string;
  bedtimeCardTheme: string;
}

export const DAY_LORDS: Record<number, DayLordTelemetry> = {
  0: { dayName: 'Sunday', rulingPlanet: 'Sun', archetype: 'Surya / Vitality', recommendedColor: 'Gold / Orange', dailyFocus: 'Clarity, Leadership, Physical Vitality', bedtimeCardTheme: 'Honor Your Internal Sovereignty' },
  1: { dayName: 'Monday', rulingPlanet: 'Moon', archetype: 'Chandra / Mind', recommendedColor: 'Silver / Pure White', dailyFocus: 'Intuition, Emotional Balance, Fluidity', bedtimeCardTheme: 'Calm the Lunar Waves of the Mind' },
  2: { dayName: 'Tuesday', rulingPlanet: 'Mars', archetype: 'Mangal / Drive', recommendedColor: 'Deep Red / Crimson', dailyFocus: 'Discipline, Execution, Overcoming Inertia', bedtimeCardTheme: 'Releasing the Fires of Conflict' },
  3: { dayName: 'Wednesday', rulingPlanet: 'Mercury', archetype: 'Budha / Cognition', recommendedColor: 'Emerald Green', dailyFocus: 'Analytical Precision, Learning, Code', bedtimeCardTheme: 'Restoring Neural Equilibrium' },
  4: { dayName: 'Thursday', rulingPlanet: 'Jupiter', archetype: 'Guru / Brihaspati', recommendedColor: 'Yellow / Saffron', dailyFocus: 'Wisdom, Expansion, Ethical Alignment', bedtimeCardTheme: 'Divine Harmony & Expansion' },
  5: { dayName: 'Friday', rulingPlanet: 'Venus', archetype: 'Shukra / Harmony', recommendedColor: 'White / Pastel Pink', dailyFocus: 'Aesthetic Purity, Creative Architecture', bedtimeCardTheme: 'Integration of Beauty and Silence' },
  6: { dayName: 'Saturday', rulingPlanet: 'Saturn', archetype: 'Shani / Structure', recommendedColor: 'Dark Blue / Black', dailyFocus: 'Patience, Long-term Building, Detachment', bedtimeCardTheme: 'Surrender to the Architecture of Time' },
};

export function getDailyArchetype(date: Date = new Date(), timeZone?: string): DayLordTelemetry {
  let index = date.getDay();
  const zone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  try {
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: zone }).format(date);
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    if (weekday in map) index = map[weekday];
  } catch {
    /* keep local weekday */
  }
  return DAY_LORDS[index];
}
