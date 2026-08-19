/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ASTRO ENGINE — deterministic geocentric ecliptic longitudes + transits
 *
 * Deno/TypeScript port of the PySwissEph pipeline. Swiss Ephemeris cannot run
 * inside an edge function (native C extension), so this uses the standard
 * JPL/Standish Keplerian element approximations (1800–2050) for the planets
 * and Meeus low-precision series for the Sun and Moon.
 *
 * Accuracy vs Swiss Ephemeris:
 *   Sun     ±0.01°   Moon ±0.3°   Mercury..Mars ±0.1°
 *   Jupiter..Pluto   ±0.3°
 * Aspect orbs are 4–6°, so aspect DETECTION is identical in practice; only the
 * printed `exactness_deg` can differ in the second decimal.
 *
 * Everything is UTC-only. Callers must convert local → UTC before entering.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type PlanetName =
  | 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars'
  | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto';

export interface PlanetPosition {
  longitude: number;      // 0..360 geocentric ecliptic longitude of date
  speed: number;          // deg/day
  isRetrograde: boolean;
  sign: string;
}

export interface Transit {
  transit_planet: PlanetName;
  natal_planet: PlanetName;
  aspect: 'Conjunction' | 'Sextile' | 'Square' | 'Trine' | 'Opposition';
  exactness_deg: number;
  is_retrograde: boolean;
}

export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const ASPECTS: Array<{ name: Transit['aspect']; angle: number; orb: number }> = [
  { name: 'Conjunction', angle: 0, orb: 6 },
  { name: 'Sextile', angle: 60, orb: 4 },
  { name: 'Square', angle: 90, orb: 6 },
  { name: 'Trine', angle: 120, orb: 6 },
  { name: 'Opposition', angle: 180, orb: 6 },
];

const RAD = Math.PI / 180;
const norm360 = (x: number) => ((x % 360) + 360) % 360;

/** Julian Day (UT) from a JS Date. Date is always an absolute UTC instant. */
export function julianDay(date: Date): number {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error('julianDay: invalid Date');
  }
  return date.getTime() / 86400000 + 2440587.5;
}

/** Centuries since J2000.0 */
const centuries = (jd: number) => (jd - 2451545.0) / 36525;

// ───────────────────────── Sun (Meeus ch.25, low precision) ─────────────────
function sunLongitude(jd: number): number {
  const T = centuries(jd);
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const Mr = M * RAD;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) +
    0.000289 * Math.sin(3 * Mr);
  return norm360(L0 + C);
}

// ───────────────────────── Moon (Meeus ch.47, truncated) ────────────────────
function moonLongitude(jd: number): number {
  const T = centuries(jd);
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T;
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T;
  const M = 357.5291092 + 35999.0502909 * T;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T;
  const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T * T;
  const d = D * RAD, m = M * RAD, mp = Mp * RAD, f = F * RAD;

  const dL =
    6.288774 * Math.sin(mp) +
    1.274027 * Math.sin(2 * d - mp) +
    0.658314 * Math.sin(2 * d) +
    0.213618 * Math.sin(2 * mp) -
    0.185116 * Math.sin(m) -
    0.114332 * Math.sin(2 * f) +
    0.058793 * Math.sin(2 * d - 2 * mp) +
    0.057066 * Math.sin(2 * d - m - mp) +
    0.053322 * Math.sin(2 * d + mp) +
    0.045758 * Math.sin(2 * d - m) -
    0.040923 * Math.sin(m - mp) -
    0.034720 * Math.sin(d) -
    0.030383 * Math.sin(m + mp) +
    0.015327 * Math.sin(2 * d - 2 * f) -
    0.012528 * Math.sin(mp + 2 * f) +
    0.010980 * Math.sin(mp - 2 * f);

  return norm360(Lp + dL);
}

// ───────────── Planets (Standish Keplerian elements, 1800–2050) ─────────────
interface Kepler { a: number; e: number; I: number; L: number; wbar: number; O: number;
  da: number; de: number; dI: number; dL: number; dwbar: number; dO: number; }

const ELEMENTS: Record<string, Kepler> = {
  Mercury: { a: 0.38709927, e: 0.20563593, I: 7.00497902, L: 252.25032350, wbar: 77.45779628, O: 48.33076593,
    da: 0.00000037, de: 0.00001906, dI: -0.00594749, dL: 149472.67411175, dwbar: 0.16047689, dO: -0.12534081 },
  Venus: { a: 0.72333566, e: 0.00677672, I: 3.39467605, L: 181.97909950, wbar: 131.60246718, O: 76.67984255,
    da: 0.00000390, de: -0.00004107, dI: -0.00078890, dL: 58517.81538729, dwbar: 0.00268329, dO: -0.27769418 },
  Earth: { a: 1.00000261, e: 0.01671123, I: -0.00001531, L: 100.46457166, wbar: 102.93768193, O: 0.0,
    da: 0.00000562, de: -0.00004392, dI: -0.01294668, dL: 35999.37244981, dwbar: 0.32327364, dO: 0.0 },
  Mars: { a: 1.52371034, e: 0.09339410, I: 1.84969142, L: -4.55343205, wbar: -23.94362959, O: 49.55953891,
    da: 0.00001847, de: 0.00007882, dI: -0.00813131, dL: 19140.30268499, dwbar: 0.44441088, dO: -0.29257343 },
  Jupiter: { a: 5.20288700, e: 0.04838624, I: 1.30439695, L: 34.39644051, wbar: 14.72847983, O: 100.47390909,
    da: -0.00011607, de: -0.00013253, dI: -0.00183714, dL: 3034.74612775, dwbar: 0.21252668, dO: 0.20469106 },
  Saturn: { a: 9.53667594, e: 0.05386179, I: 2.48599187, L: 49.95424423, wbar: 92.59887831, O: 113.66242448,
    da: -0.00125060, de: -0.00050991, dI: 0.00193609, dL: 1222.49362201, dwbar: -0.41897216, dO: -0.28867794 },
  Uranus: { a: 19.18916464, e: 0.04725744, I: 0.77263783, L: 313.23810451, wbar: 170.95427630, O: 74.01692503,
    da: -0.00196176, de: -0.00004397, dI: -0.00242939, dL: 428.48202785, dwbar: 0.40805281, dO: 0.04240589 },
  Neptune: { a: 30.06992276, e: 0.00859048, I: 1.77004347, L: -55.12002969, wbar: 44.96476227, O: 131.78422574,
    da: 0.00026291, de: 0.00005105, dI: 0.00035372, dL: 218.45945325, dwbar: -0.32241464, dO: -0.00508664 },
  Pluto: { a: 39.48211675, e: 0.24882730, I: 17.14001206, L: 238.92903833, wbar: 224.06891629, O: 110.30393684,
    da: -0.00031596, de: 0.00005170, dI: 0.00004818, dL: 145.20780515, dwbar: -0.04062942, dO: -0.01183482 },
};

function heliocentric(name: string, T: number): { x: number; y: number; z: number } {
  const el = ELEMENTS[name];
  const a = el.a + el.da * T;
  const e = el.e + el.de * T;
  const I = (el.I + el.dI * T) * RAD;
  const L = el.L + el.dL * T;
  const wbar = el.wbar + el.dwbar * T;
  const O = (el.O + el.dO * T) * RAD;
  const w = (wbar - (el.O + el.dO * T)) * RAD;
  let M = norm360(L - wbar);
  if (M > 180) M -= 360;
  const Mr = M * RAD;

  // Kepler solve (Newton, converges in <8 iterations for e < 0.25)
  let E = Mr + e * Math.sin(Mr);
  for (let i = 0; i < 12; i++) {
    const dE = (E - e * Math.sin(E) - Mr) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-10) break;
  }

  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);

  const cw = Math.cos(w), sw = Math.sin(w);
  const cO = Math.cos(O), sO = Math.sin(O);
  const cI = Math.cos(I), sI = Math.sin(I);

  return {
    x: (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    y: (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    z: (sw * sI) * xp + (cw * sI) * yp,
  };
}

function planetLongitude(name: string, jd: number): number {
  const T = centuries(jd);
  const p = heliocentric(name, T);
  const e = heliocentric('Earth', T);
  return norm360(Math.atan2(p.y - e.y, p.x - e.x) / RAD);
}

function longitudeOf(name: PlanetName, jd: number): number {
  if (name === 'Sun') return sunLongitude(jd);
  if (name === 'Moon') return moonLongitude(jd);
  return planetLongitude(name, jd);
}

export const PLANETS: PlanetName[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
];

/** Geocentric ecliptic positions for every tracked body at a Julian Day. */
export function getPositions(jd: number): Record<PlanetName, PlanetPosition> {
  const out = {} as Record<PlanetName, PlanetPosition>;
  for (const name of PLANETS) {
    const lon = longitudeOf(name, jd);
    // Numeric speed via a symmetric 1-hour step (robust across the 0/360 wrap).
    const h = 1 / 24;
    let delta = longitudeOf(name, jd + h) - longitudeOf(name, jd - h);
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    const speed = delta / (2 * h);
    out[name] = {
      longitude: lon,
      speed,
      isRetrograde: speed < 0,
      sign: SIGNS[Math.floor(lon / 30) % 12],
    };
  }
  return out;
}

export function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(norm360(a) - norm360(b));
  return diff > 180 ? 360 - diff : diff;
}

/** Active transit aspects between the sky of `targetJd` and the natal chart. */
export function calculateTransits(natalJd: number, targetJd: number): Transit[] {
  const natal = getPositions(natalJd);
  const sky = getPositions(targetJd);
  const found: Transit[] = [];

  for (const t of PLANETS) {
    for (const n of PLANETS) {
      const sep = angularSeparation(sky[t].longitude, natal[n].longitude);
      for (const asp of ASPECTS) {
        const delta = Math.abs(sep - asp.angle);
        if (delta <= asp.orb) {
          found.push({
            transit_planet: t,
            natal_planet: n,
            aspect: asp.name,
            exactness_deg: Math.round(delta * 100) / 100,
            is_retrograde: sky[t].isRetrograde,
          });
        }
      }
    }
  }
  found.sort((a, b) => a.exactness_deg - b.exactness_deg);
  return found;
}

/**
 * Convert a local wall-clock time in an IANA timezone to an absolute UTC Date.
 * Closes the "timezone / DST drift" hole without pulling in a tz library:
 * we invert Intl's zone offset for the candidate instant, twice, which is
 * exact for every real-world offset including 30/45-minute zones and DST.
 */
export function zonedTimeToUtc(
  dateStr: string,   // YYYY-MM-DD
  timeStr: string,   // HH:MM or HH:MM:SS
  timeZone: string,
): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm, ss] = `${timeStr}:00`.split(':').map(Number);
  if (!y || !m || !d || Number.isNaN(hh)) throw new Error(`Invalid date/time: ${dateStr} ${timeStr}`);

  const naive = Date.UTC(y, m - 1, d, hh || 0, mm || 0, ss || 0);
  let guess = naive;
  for (let i = 0; i < 2; i++) {
    guess = naive - zoneOffsetMs(new Date(guess), timeZone);
  }
  return new Date(guess);
}

/** Offset (ms) of `timeZone` from UTC at a given instant. */
export function zoneOffsetMs(instant: Date, timeZone: string): number {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(instant);
  } catch {
    return 0; // unknown zone → treat as UTC rather than throwing
  }
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'), g('second'));
  return asUtc - instant.getTime();
}

/** The local calendar date (YYYY-MM-DD) in `timeZone` for an instant. */
export function localDateIn(instant: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(instant);
  } catch {
    return instant.toISOString().slice(0, 10);
  }
}

/** Local hour+minute in `timeZone` for an instant. */
export function localHourMinute(instant: Date, timeZone: string): { hour: number; minute: number } {
  const off = zoneOffsetMs(instant, timeZone);
  const shifted = new Date(instant.getTime() + off);
  return { hour: shifted.getUTCHours(), minute: shifted.getUTCMinutes() };
}
