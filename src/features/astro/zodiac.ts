/**
 * Sun-sign + element resolution from a real birth date.
 *
 * Deterministic, offline, no network: the tropical sun sign only needs the
 * calendar date. Anything deeper (moon, ascendant, transits) comes from the
 * Swiss-Ephemeris-backed `astro_predictions` rows, never from here.
 */

export type ZodiacSign =
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer' | 'Leo' | 'Virgo'
  | 'Libra' | 'Scorpio' | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

export type Element = 'Fire' | 'Earth' | 'Air' | 'Water';

const CUTOFFS: { until: [number, number]; sign: ZodiacSign }[] = [
  { until: [1, 19], sign: 'Capricorn' },
  { until: [2, 18], sign: 'Aquarius' },
  { until: [3, 20], sign: 'Pisces' },
  { until: [4, 19], sign: 'Aries' },
  { until: [5, 20], sign: 'Taurus' },
  { until: [6, 20], sign: 'Gemini' },
  { until: [7, 22], sign: 'Cancer' },
  { until: [8, 22], sign: 'Leo' },
  { until: [9, 22], sign: 'Virgo' },
  { until: [10, 22], sign: 'Libra' },
  { until: [11, 21], sign: 'Scorpio' },
  { until: [12, 21], sign: 'Sagittarius' },
  { until: [12, 31], sign: 'Capricorn' },
];

export const ELEMENT_OF: Record<ZodiacSign, Element> = {
  Aries: 'Fire', Leo: 'Fire', Sagittarius: 'Fire',
  Taurus: 'Earth', Virgo: 'Earth', Capricorn: 'Earth',
  Gemini: 'Air', Libra: 'Air', Aquarius: 'Air',
  Cancer: 'Water', Scorpio: 'Water', Pisces: 'Water',
};

/** Classical planetary rulers — used to match the day-lord to a member. */
export const RULER_OF: Record<ZodiacSign, string> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

/** Returns null when there is no usable birth date — never guesses a sign. */
export function sunSignFromBirthDate(birthDate?: string | null): ZodiacSign | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  for (const c of CUTOFFS) {
    const [m, dd] = c.until;
    if (month < m || (month === m && day <= dd)) return c.sign;
  }
  return 'Capricorn';
}

export function elementOf(sign: ZodiacSign | null): Element | null {
  return sign ? ELEMENT_OF[sign] : null;
}

const COMPLEMENT: Record<Element, Element> = {
  Fire: 'Air',
  Air: 'Fire',
  Earth: 'Water',
  Water: 'Earth',
};

/**
 * Affinity between two members, 0…1.
 *  1.0 same element (trine)  ·  0.7 complementary  ·  0.3 otherwise  ·  0 unknown
 */
export function signAffinity(a: ZodiacSign | null, b: ZodiacSign | null): number {
  if (!a || !b) return 0;
  const ea = ELEMENT_OF[a];
  const eb = ELEMENT_OF[b];
  if (ea === eb) return 1;
  if (COMPLEMENT[ea] === eb) return 0.7;
  return 0.3;
}

/** True when today's ruling planet also rules the member's sign. */
export function isDayLordMatch(sign: ZodiacSign | null, rulingPlanet: string): boolean {
  return !!sign && RULER_OF[sign] === rulingPlanet;
}
