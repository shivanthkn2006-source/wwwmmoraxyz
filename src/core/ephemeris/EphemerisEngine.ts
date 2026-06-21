// ═══════════════════════════════════════════════════════════════════════════════
// EPHEMERIS ENGINE — Swiss Ephemeris-style Planetary Calculator
// Full-spectrum astronomical computation: ~4713 BCE → 3000+ CE
// Uses VSOP87-derived perturbation series + Chapront lunar theory
// Lahiri Ayanamsa for sidereal (Vedic) longitudes
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Planet identifiers used throughout the engine
 */
export type Planet = 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn' | 'Rahu' | 'Ketu';

export interface PlanetaryPosition {
  planet: Planet;
  longitude: number;       // Tropical longitude 0-360°
  siderealLongitude: number; // Sidereal (Lahiri) longitude 0-360°
  zodiacSign: string;      // Tropical sign
  siderealSign: string;    // Sidereal sign
  signDegree: number;      // Degree within tropical sign (0-30)
  siderealSignDegree: number; // Degree within sidereal sign (0-30)
  isRetrograde: boolean;
  nakshatra: string;       // Vedic lunar mansion (from sidereal)
  nakshatraPada: number;   // Pada (quarter) 1-4
  speed: number;           // Degrees per day
  declination: number;     // Declination in degrees
}

export interface TransitResult {
  planet: Planet;
  fromSign: string;
  toSign: string;
  transitDate: Date;
  durationDays: number;
}

export interface DasaPeriod {
  planet: Planet;
  startDate: Date;
  endDate: Date;
  durationYears: number;
  subPeriods: Array<{
    planet: Planet;
    startDate: Date;
    endDate: Date;
  }>;
}

export interface EphemerisMetadata {
  julianDay: number;
  deltaT: number;          // TT - UT in seconds
  ayanamsa: number;        // Lahiri ayanamsa for the date
  obliquity: number;       // Mean obliquity of ecliptic
  nutationLongitude: number;
  nutationObliquity: number;
  siderealTime: number;    // Greenwich mean sidereal time (hours)
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZODIAC & NAKSHATRA DATA
// ═══════════════════════════════════════════════════════════════════════════════

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashirsha', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

/** Vimshottari Dasa sequence and durations (years) */
const DASA_SEQUENCE: Array<{ planet: Planet; years: number }> = [
  { planet: 'Ketu', years: 7 },
  { planet: 'Venus', years: 20 },
  { planet: 'Sun', years: 6 },
  { planet: 'Moon', years: 10 },
  { planet: 'Mars', years: 7 },
  { planet: 'Rahu', years: 18 },
  { planet: 'Jupiter', years: 16 },
  { planet: 'Saturn', years: 19 },
  { planet: 'Mercury', years: 17 },
];

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

// ═══════════════════════════════════════════════════════════════════════════════
// JULIAN DAY & TIME CONVERSIONS (Full range — no date restrictions)
// Handles Julian Calendar (before Oct 15, 1582) and Gregorian Calendar
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a Date object for a BCE/CE year.
 * astronomicalYear: 1 CE = 1, 1 BCE = 0, 2 BCE = -1, 3000 BCE = -2999
 * JS Date.setUTCFullYear handles year 0 and negative years correctly.
 */
export function createHistoricalDate(
  astronomicalYear: number,
  month: number = 1,   // 1-12
  day: number = 1,
  hour: number = 0,
  minute: number = 0,
  second: number = 0
): Date {
  const d = new Date(Date.UTC(2000, 0, 1)); // safe base
  d.setUTCFullYear(astronomicalYear);
  d.setUTCMonth(month - 1);
  d.setUTCDate(day);
  d.setUTCHours(hour, minute, second, 0);
  return d;
}

/**
 * Convert year/month/day directly to Julian Day Number (Meeus algorithm).
 * Correctly handles Julian Calendar (before Oct 15, 1582) vs Gregorian.
 * astronomicalYear: 1 BCE = 0, 2 BCE = -1, etc.
 */
export function calendarToJulianDay(
  year: number,
  month: number,
  day: number // can be fractional to encode hours
): number {
  let Y = year;
  let M = month;
  if (M <= 2) { Y -= 1; M += 12; }

  // Gregorian calendar reform: Oct 15, 1582
  let B = 0;
  const isGregorian = (year > 1582) ||
    (year === 1582 && month > 10) ||
    (year === 1582 && month === 10 && day >= 15);

  if (isGregorian) {
    const A = Math.floor(Y / 100);
    B = 2 - A + Math.floor(A / 4);
  }

  return Math.floor(365.25 * (Y + 4716)) +
    Math.floor(30.6001 * (M + 1)) +
    day + B - 1524.5;
}

/**
 * Convert a JS Date to Julian Day Number.
 * Automatically detects Julian vs Gregorian calendar.
 */
export function dateToJulianDay(date: Date): number {
  const Y = date.getUTCFullYear(); // astronomical year (0 = 1 BCE)
  const M = date.getUTCMonth() + 1;
  const D = date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400 +
    date.getUTCMilliseconds() / 86400000;

  return calendarToJulianDay(Y, M, D);
}

/**
 * Convert Julian Day back to calendar date
 */
export function julianDayToDate(jd: number): { year: number; month: number; day: number; hour: number; minute: number } {
  const Z = Math.floor(jd + 0.5);
  const F = (jd + 0.5) - Z;

  let A: number;
  if (Z < 2299161) {
    // Julian calendar
    A = Z;
  } else {
    // Gregorian calendar
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }

  const B2 = A + 1524;
  const C = Math.floor((B2 - 122.1) / 365.25);
  const D2 = Math.floor(365.25 * C);
  const E = Math.floor((B2 - D2) / 30.6001);

  const day = B2 - D2 - Math.floor(30.6001 * E);
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;

  const totalHours = F * 24;
  const hour = Math.floor(totalHours);
  const minute = Math.round((totalHours - hour) * 60);

  return { year, month, day, hour, minute };
}

/**
 * Helper: format an astronomical year for display
 * year 0 → "1 BCE", year -2999 → "3000 BCE", year 1990 → "1990 CE"
 */
export function formatHistoricalYear(astronomicalYear: number): string {
  if (astronomicalYear <= 0) {
    return `${1 - astronomicalYear} BCE`;
  }
  return `${astronomicalYear} CE`;
}

/**
 * Julian Centuries since J2000.0 (fundamental time argument)
 */
function julianCenturies(jd: number): number {
  return (jd - 2451545.0) / 36525.0;
}

/**
 * Delta-T approximation (TT - UT) in seconds
 * Polynomial expressions from Espenak & Meeus for wide date range
 */
function deltaT(year: number): number {
  const y = year;
  if (y < -500) {
    const u = (y - 1820) / 100;
    return -20 + 32 * u * u;
  } else if (y < 500) {
    const u = y / 100;
    return 10583.6 - 1014.41 * u + 33.78311 * u * u
      - 5.952053 * u * u * u - 0.1798452 * u ** 4
      + 0.022174192 * u ** 5 + 0.0090316521 * u ** 6;
  } else if (y < 1600) {
    const u = (y - 1000) / 100;
    return 1574.2 - 556.01 * u + 71.23472 * u * u
      + 0.319781 * u ** 3 - 0.8503463 * u ** 4
      - 0.005050998 * u ** 5 + 0.0083572073 * u ** 6;
  } else if (y < 1700) {
    const t = y - 1600;
    return 120 - 0.9808 * t - 0.01532 * t * t + t ** 3 / 7129;
  } else if (y < 1800) {
    const t = y - 1700;
    return 8.83 + 0.1603 * t - 0.0059285 * t * t
      + 0.00013336 * t ** 3 - t ** 4 / 1174000;
  } else if (y < 1860) {
    const t = y - 1800;
    return 13.72 - 0.332447 * t + 0.0068612 * t * t
      + 0.0041116 * t ** 3 - 0.00037436 * t ** 4
      + 0.0000121272 * t ** 5 - 0.0000001699 * t ** 6
      + 0.000000000875 * t ** 7;
  } else if (y < 1900) {
    const t = y - 1860;
    return 7.62 + 0.5737 * t - 0.251754 * t * t
      + 0.01680668 * t ** 3 - 0.0004473624 * t ** 4
      + t ** 5 / 233174;
  } else if (y < 1920) {
    const t = y - 1900;
    return -2.79 + 1.494119 * t - 0.0598939 * t * t
      + 0.0061966 * t ** 3 - 0.000197 * t ** 4;
  } else if (y < 1941) {
    const t = y - 1920;
    return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t ** 3;
  } else if (y < 1961) {
    const t = y - 1950;
    return 29.07 + 0.407 * t - t * t / 233 + t ** 3 / 2547;
  } else if (y < 1986) {
    const t = y - 1975;
    return 45.45 + 1.067 * t - t * t / 260 - t ** 3 / 718;
  } else if (y < 2005) {
    const t = y - 2000;
    return 63.86 + 0.3345 * t - 0.060374 * t * t
      + 0.0017275 * t ** 3 + 0.000651814 * t ** 4
      + 0.00002373599 * t ** 5;
  } else if (y < 2050) {
    const t = y - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t * t;
  } else if (y < 2150) {
    return -20 + 32 * ((y - 1820) / 100) ** 2 - 0.5628 * (2150 - y);
  } else {
    const u = (y - 1820) / 100;
    return -20 + 32 * u * u;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NUTATION & OBLIQUITY (IAU 2000B simplified)
// ═══════════════════════════════════════════════════════════════════════════════

interface NutationResult {
  dPsi: number;   // nutation in longitude (degrees)
  dEps: number;   // nutation in obliquity (degrees)
}

function calcNutation(T: number): NutationResult {
  // Fundamental arguments (degrees)
  const D = normalize360(297.85036 + 445267.111480 * T - 0.0019142 * T * T + T ** 3 / 189474);
  const M = normalize360(357.52772 + 35999.050340 * T - 0.0001603 * T * T - T ** 3 / 300000);
  const Mp = normalize360(134.96298 + 477198.867398 * T + 0.0086972 * T * T + T ** 3 / 56250);
  const F = normalize360(93.27191 + 483202.017538 * T - 0.0036825 * T * T + T ** 3 / 327270);
  const Om = normalize360(125.04452 - 1934.136261 * T + 0.0020708 * T * T + T ** 3 / 450000);

  // Dominant nutation terms (arcseconds)
  const dPsi = (-17.20 * Math.sin(Om * DEG) - 1.32 * Math.sin(2 * (F + Om) * DEG)
    - 0.23 * Math.sin(2 * Mp * DEG) + 0.21 * Math.sin(2 * Om * DEG)
    - 0.10 * Math.sin(M * DEG) - 0.09 * Math.sin((2 * F + Om) * DEG)) / 3600;

  const dEps = (9.20 * Math.cos(Om * DEG) + 0.57 * Math.cos(2 * (F + Om) * DEG)
    + 0.10 * Math.cos(2 * Mp * DEG) - 0.09 * Math.cos(2 * Om * DEG)) / 3600;

  return { dPsi, dEps };
}

function meanObliquity(T: number): number {
  // IAU 2006 precession — valid over millennia
  const U = T / 100;
  return 23.439291111 - 1.300258333 * U - 0.000430556 * U * U
    + 0.555347222 * U ** 3 - 0.014272222 * U ** 4
    - 0.069352778 * U ** 5 - 0.010847222 * U ** 6
    + 0.001977778 * U ** 7 + 0.007741667 * U ** 8
    + 0.001608333 * U ** 9 + 0.000680556 * U ** 10;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAHIRI AYANAMSA — Sidereal offset (valid for full date range)
// Based on Lahiri's original constant + precession rate
// ═══════════════════════════════════════════════════════════════════════════════

export function lahiriAyanamsa(jd: number): number {
  const T = julianCenturies(jd);
  // Lahiri ayanamsa: 23°51'15" at J2000.0, precession ~50.2878"/year
  const ayanamsa = 23.855417 + (50.2878 / 3600) * T * 100;
  // Add small correction terms
  const omega = 125.04 - 1934.136 * T;
  const correction = -0.00478 * Math.sin(omega * DEG);
  return ayanamsa + correction;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOLAR POSITION — VSOP87 truncated (accurate to ~1 arcminute over millennia)
// ═══════════════════════════════════════════════════════════════════════════════

function solarLongitude(T: number): { longitude: number; speed: number } {
  // Geometric mean longitude
  const L0 = normalize360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  // Mean anomaly
  const M = normalize360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Mrad = M * DEG;

  // Equation of center (principal perturbation terms)
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad)
    + 0.000289 * Math.sin(3 * Mrad);

  // Sun's true longitude
  const sunLong = normalize360(L0 + C);

  // Apparent longitude (nutation + aberration)
  const omega = 125.04 - 1934.136 * T;
  const apparent = sunLong - 0.00569 - 0.00478 * Math.sin(omega * DEG);

  // Daily speed (approximate)
  const speed = 0.9856474 + 0.0334 * Math.cos(Mrad) + 0.000349 * Math.cos(2 * Mrad);

  return { longitude: normalize360(apparent), speed };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LUNAR POSITION — Chapront ELP2000 truncated
// ═══════════════════════════════════════════════════════════════════════════════

function lunarLongitude(T: number): { longitude: number; speed: number } {
  // Mean elements
  const Lp = normalize360(218.3164477 + 481267.88123421 * T
    - 0.0015786 * T * T + T ** 3 / 538841 - T ** 4 / 65194000);
  const D = normalize360(297.8501921 + 445267.1114034 * T
    - 0.0018819 * T * T + T ** 3 / 545868 - T ** 4 / 113065000);
  const M = normalize360(357.5291092 + 35999.0502909 * T
    - 0.0001536 * T * T + T ** 3 / 24490000);
  const Mp = normalize360(134.9633964 + 477198.8675055 * T
    + 0.0087414 * T * T + T ** 3 / 69699 - T ** 4 / 14712000);
  const F = normalize360(93.2720950 + 483202.0175233 * T
    - 0.0036539 * T * T - T ** 3 / 3526000 + T ** 4 / 863310000);

  const E = 1 - 0.002516 * T - 0.0000074 * T * T;

  // Principal longitude perturbation terms (Chapront)
  let sumL = 0;
  sumL += 6288774 * Math.sin(Mp * DEG);
  sumL += 1274027 * Math.sin((2 * D - Mp) * DEG);
  sumL += 658314 * Math.sin(2 * D * DEG);
  sumL += 213618 * Math.sin(2 * Mp * DEG);
  sumL += -185116 * E * Math.sin(M * DEG);
  sumL += -114332 * Math.sin(2 * F * DEG);
  sumL += 58793 * Math.sin((2 * D - 2 * Mp) * DEG);
  sumL += 57066 * E * Math.sin((2 * D - Mp - M) * DEG);
  sumL += 53322 * Math.sin((2 * D + Mp) * DEG);
  sumL += 45758 * E * Math.sin((2 * D - M) * DEG);
  sumL += -40923 * E * Math.sin((Mp - M) * DEG);
  sumL += -34720 * Math.sin(D * DEG);
  sumL += -30383 * E * Math.sin((Mp + M) * DEG);
  sumL += 15327 * Math.sin((2 * D - 2 * F) * DEG);
  sumL += -12528 * Math.sin((Mp + 2 * F) * DEG);
  sumL += 10980 * Math.sin((Mp - 2 * F) * DEG);
  sumL += 10675 * Math.sin((4 * D - Mp) * DEG);
  sumL += 10034 * Math.sin(3 * Mp * DEG);
  sumL += 8548 * Math.sin((4 * D - 2 * Mp) * DEG);
  sumL += -7888 * E * Math.sin((2 * D + M - Mp) * DEG);
  sumL += -6766 * E * Math.sin((2 * D + M) * DEG);
  sumL += -5163 * Math.sin((D - Mp) * DEG);
  sumL += 4987 * E * Math.sin((D + M) * DEG);
  sumL += 4036 * E * Math.sin((2 * D - M + Mp) * DEG);

  const moonLong = normalize360(Lp + sumL / 1000000);

  // Moon's mean daily motion ~13.176°/day + perturbation estimate
  const speed = 13.1763966
    + 1.0963 * Math.cos(Mp * DEG)
    + 0.2216 * Math.cos((2 * D - Mp) * DEG)
    + 0.1145 * Math.cos(2 * D * DEG);

  return { longitude: moonLong, speed };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VSOP87 TRUNCATED SERIES — HELIOCENTRIC ECLIPTIC COORDINATES
// Each term: [amplitude, phase, frequency] → A * cos(B + C*T)
// L = heliocentric longitude (radians), B = latitude (radians), R = radius (AU)
// Accuracy: ~1 arcminute for inner planets, ~10 arcseconds for outer
// ═══════════════════════════════════════════════════════════════════════════════

type VSOP87Term = [number, number, number]; // [A, B, C]
interface VSOP87Series { L: VSOP87Term[][]; B: VSOP87Term[][]; R: VSOP87Term[][]; }

// ── EARTH (required for geocentric conversion) ──
const EARTH_VSOP: VSOP87Series = {
  L: [
    // L0
    [
      [175347046, 0, 0],
      [3341656, 4.6692568, 6283.0758500],
      [34894, 4.6261, 12566.1517],
      [3497, 2.7441, 5753.3849],
      [3418, 2.8289, 3.5232],
      [3136, 3.6277, 77713.7715],
      [2676, 4.4181, 7860.4194],
      [2343, 6.1352, 3930.2097],
      [1324, 0.7425, 11506.7698],
      [1273, 2.0371, 529.6910],
      [1199, 1.1096, 1577.3435],
      [990, 5.233, 5884.927],
      [902, 2.045, 26.298],
      [857, 3.508, 398.149],
      [780, 1.179, 5223.694],
      [753, 2.533, 5507.553],
      [505, 4.583, 18849.228],
      [492, 4.205, 775.522],
      [357, 2.920, 0.067],
      [317, 5.849, 11790.629],
      [284, 1.899, 796.298],
      [271, 0.315, 10977.079],
      [243, 0.345, 5486.778],
    ],
    // L1
    [
      [628331966747, 0, 0],
      [206059, 2.678235, 6283.075850],
      [4303, 2.6351, 12566.1517],
      [425, 1.590, 3.523],
      [119, 5.796, 26.298],
      [109, 2.966, 1577.344],
      [93, 2.59, 18849.23],
      [72, 1.14, 529.69],
      [68, 1.87, 398.15],
      [67, 4.41, 5507.55],
      [59, 2.89, 5223.69],
      [56, 2.17, 155.42],
      [45, 0.40, 796.30],
      [36, 0.47, 775.52],
      [29, 2.65, 7.11],
      [21, 5.34, 0.98],
    ],
    // L2
    [
      [52919, 0, 0],
      [8720, 1.0721, 6283.0758],
      [309, 0.867, 12566.152],
      [27, 0.05, 3.52],
      [16, 5.19, 26.30],
    ],
    // L3
    [
      [289, 5.844, 6283.076],
      [35, 0, 0],
      [17, 5.49, 12566.15],
    ],
    // L4
    [
      [114, 3.142, 0],
      [8, 4.13, 6283.08],
      [1, 3.84, 12566.15],
    ],
  ],
  B: [
    // B0
    [
      [280, 3.199, 84334.662],
      [102, 5.422, 5507.553],
      [80, 3.88, 5223.69],
      [44, 3.70, 2352.87],
      [32, 4.00, 1577.34],
    ],
    // B1
    [
      [9, 3.90, 5507.55],
      [6, 1.73, 5223.69],
    ],
  ],
  R: [
    // R0
    [
      [100013989, 0, 0],
      [1670700, 3.0984635, 6283.0758500],
      [13956, 3.0525, 12566.1517],
      [3084, 5.1985, 77713.7715],
      [1628, 1.1739, 5753.3849],
      [1576, 2.8469, 7860.4194],
      [925, 5.453, 11506.770],
      [542, 4.564, 3930.210],
      [472, 3.661, 5884.927],
      [346, 0.964, 5507.553],
      [329, 5.900, 5223.694],
      [307, 0.299, 5573.143],
      [243, 4.273, 11790.629],
      [212, 5.847, 1577.344],
      [186, 5.022, 10977.079],
      [175, 3.012, 18849.228],
      [110, 5.055, 5486.778],
      [98, 0.89, 6069.78],
      [86, 5.69, 15720.84],
      [86, 1.27, 161000.69],
      [65, 0.27, 17260.15],
      [63, 0.92, 529.69],
      [57, 2.01, 83996.85],
    ],
    // R1
    [
      [103019, 1.107490, 6283.075850],
      [1721, 1.0644, 12566.1517],
      [702, 3.142, 0],
      [32, 1.02, 18849.23],
      [31, 2.84, 5507.55],
      [25, 1.32, 5223.69],
      [18, 1.42, 1577.34],
      [10, 5.91, 10977.08],
      [9, 1.42, 6275.96],
      [9, 0.27, 5486.78],
    ],
    // R2
    [
      [4359, 5.7846, 6283.0758],
      [124, 5.579, 12566.152],
      [12, 3.14, 0],
      [9, 3.63, 77713.77],
      [6, 1.87, 5573.14],
      [3, 5.47, 18849.23],
    ],
    // R3
    [
      [145, 4.273, 6283.076],
      [7, 3.92, 12566.15],
    ],
  ],
};

// ── MERCURY ──
const MERCURY_VSOP: VSOP87Series = {
  L: [
    [
      [440250710, 0, 0],
      [40989415, 1.48302034, 26087.90314157],
      [5046294, 4.47785489, 52175.80628315],
      [855347, 1.16520322, 78263.70942472],
      [165590, 4.11969163, 104351.61256630],
      [34562, 0.77931, 130439.51571],
      [7583, 3.71348, 156527.41885],
      [3560, 1.51203, 1109.09946],
      [1803, 4.10333, 5661.33205],
      [1726, 0.35832, 182615.32199],
      [1590, 2.99510, 25028.52122],
      [1365, 4.59918, 27197.28169],
      [1017, 0.88031, 31749.23519],
      [714, 1.5414, 24978.5246],
      [644, 5.3035, 21535.9496],
      [451, 6.0499, 51116.4244],
      [404, 3.2821, 208703.2251],
    ],
    [
      [2608814706223, 0, 0],  // Note: this is the mean motion term
      [1126008, 6.2170397, 26087.9031416],
      [303471, 3.055655, 52175.806283],
      [80538, 6.10455, 78263.70942],
      [21245, 2.83532, 104351.61257],
      [5592, 5.82676, 130439.51571],
      [1472, 2.51529, 156527.41885],
      [388, 5.4804, 182615.3220],
      [352, 3.0522, 1109.0995],
    ],
    [
      [53050, 0, 0],
      [16904, 4.69072, 26087.90314],
      [7397, 1.3474, 52175.8063],
      [3018, 4.4564, 78263.7094],
      [1107, 1.2623, 104351.6126],
      [378, 4.3200, 130439.5157],
    ],
  ],
  B: [
    [
      [11737529, 1.98357499, 26087.90314157],
      [2388077, 5.03738960, 52175.80628314],
      [1222840, 3.14159265, 0],
      [543252, 1.79644, 78263.70942],
      [129779, 4.83233, 104351.61257],
      [31867, 1.58088, 130439.51571],
      [7963, 4.60972, 156527.41885],
      [2014, 1.35324, 182615.32199],
      [514, 4.37835, 208703.22514],
    ],
    [
      [429151, 3.501698, 26087.903142],
      [146234, 3.14159, 0],
      [22675, 0.01515, 52175.80628],
      [10895, 0.48540, 78263.70942],
      [6353, 3.42943, 104351.61257],
      [2496, 0.16051, 130439.51571],
      [860, 3.18, 156527.41885],
    ],
  ],
  R: [
    [
      [39528272, 0, 0],
      [7834132, 6.19233722, 26087.90314157],
      [795526, 2.95989690, 52175.80628315],
      [121282, 6.01064, 78263.70942],
      [21922, 2.77820, 104351.61257],
      [4354, 5.82895, 130439.51571],
      [918, 2.5967, 156527.41885],
    ],
    [
      [217348, 4.656172, 26087.903142],
      [44142, 1.42386, 52175.80628],
      [10094, 4.47466, 78263.70942],
      [2433, 1.24226, 104351.61257],
      [1624, 0, 0],
      [604, 4.29303, 130439.51571],
    ],
    [
      [3118, 3.0823, 26087.9031],
      [1245, 6.1518, 52175.8063],
      [425, 2.9258, 78263.7094],
      [136, 5.9796, 104351.6126],
    ],
  ],
};

// ── VENUS ──
const VENUS_VSOP: VSOP87Series = {
  L: [
    [
      [317614667, 0, 0],
      [1353968, 5.5931332, 10213.2855462],
      [89892, 5.30650, 20426.57109],
      [5477, 4.4163, 7860.4194],
      [3456, 2.6996, 11790.6291],
      [2373, 2.9938, 3930.2097],
      [1317, 5.1867, 26.2983],
      [1245, 2.0183, 5507.5534],
      [1165, 4.6094, 1577.3435],
      [1013, 1.0895, 18073.7049],
      [854, 3.672, 529.691],
    ],
    [
      [1021352943053, 0, 0],
      [95708, 2.46424, 10213.28555],
      [14445, 0.51625, 20426.57109],
      [213, 1.795, 30639.857],
      [174, 2.655, 26.298],
      [152, 5.708, 1577.344],
      [82, 3.22, 10404.73],
    ],
    [
      [54127, 0, 0],
      [3891, 0.3451, 10213.2855],
      [1338, 2.0201, 20426.5711],
      [24, 2.05, 26.30],
      [19, 3.54, 30639.86],
    ],
  ],
  B: [
    [
      [5923638, 0.2670278, 10213.2855462],
      [40108, 1.14737, 20426.57109],
      [32815, 3.14737, 0],
      [1011, 1.0895, 30639.8566],
      [149, 6.254, 18073.705],
    ],
    [
      [513348, 1.803643, 10213.285546],
      [4380, 3.3862, 20426.5711],
      [199, 0, 0],
      [197, 2.530, 30639.857],
    ],
  ],
  R: [
    [
      [72334821, 0, 0],
      [489824, 4.021518, 10213.285546],
      [1658, 4.9021, 20426.5711],
      [1632, 2.8455, 7860.4194],
      [1378, 1.1285, 11790.6291],
      [498, 2.587, 9683.595],
      [374, 1.423, 3930.210],
      [264, 3.917, 9437.763],
      [237, 2.551, 15720.839],
      [222, 2.013, 19367.189],
    ],
    [
      [34552, 0.89199, 10213.28555],
      [234, 1.772, 20426.571],
      [234, 3.142, 0],
    ],
    [
      [1407, 5.0637, 10213.2855],
      [16, 5.47, 20426.57],
    ],
  ],
};

// ── MARS ──
const MARS_VSOP: VSOP87Series = {
  L: [
    [
      [620347712, 0, 0],
      [18656368, 5.05037100, 3340.61242670],
      [1108217, 5.40099837, 6681.22485340],
      [91798, 5.75479, 10021.83728],
      [27745, 5.97050, 3.52312],
      [12316, 0.84956, 2810.92146],
      [10610, 2.93959, 2281.23050],
      [8927, 4.1570, 0.0173],
      [8716, 6.1101, 13362.4497],
      [7775, 3.3397, 5621.8429],
      [6798, 0.3646, 398.1490],
      [4161, 0.2281, 2942.4634],
      [3575, 1.6619, 2544.3144],
      [3075, 0.8570, 191.4483],
      [2938, 6.0789, 0.0673],
      [2628, 0.6481, 3337.0893],
      [2580, 0.0300, 3344.1355],
      [2389, 5.0390, 796.2983],
      [1799, 0.6563, 529.6910],
      [1546, 2.9158, 1751.5395],
      [1528, 1.1498, 6151.5339],
      [1286, 3.0680, 2146.1654],
      [1264, 3.6228, 5092.1520],
      [1025, 3.6933, 8962.4553],
      [892, 0.183, 16703.062],
    ],
    [
      [334085627474, 0, 0],
      [1458227, 3.6042605, 3340.6124267],
      [164901, 3.92631, 6681.22485],
      [19963, 4.26594, 10021.83728],
      [3452, 4.7321, 3.5231],
      [2485, 4.6128, 13362.4497],
      [842, 4.459, 2281.230],
      [538, 5.016, 398.149],
      [521, 4.994, 3344.136],
      [433, 2.561, 191.448],
    ],
    [
      [58016, 2.04979, 3340.61243],
      [54188, 0, 0],
      [13908, 2.45742, 6681.22485],
      [2465, 2.80000, 10021.83728],
      [398, 3.14, 13362.45],
    ],
  ],
  B: [
    [
      [3197135, 3.7683204, 3340.6124267],
      [298033, 4.10617, 6681.22485],
      [289105, 0, 0],
      [31366, 4.44652, 10021.83728],
      [3484, 4.7881, 13362.4497],
      [443, 5.026, 3344.136],
      [443, 5.652, 3337.089],
      [399, 5.131, 16703.062],
    ],
    [
      [350069, 5.368478, 3340.612427],
      [14116, 3.14159, 0],
      [9671, 5.4788, 6681.2249],
      [1472, 3.2021, 10021.8373],
      [426, 3.408, 13362.450],
      [102, 0.776, 16703.062],
    ],
    [
      [16727, 0.60221, 3340.61243],
      [4987, 4.1416, 6681.2249],
      [302, 3.559, 10021.837],
    ],
  ],
  R: [
    [
      [153033488, 0, 0],
      [14184953, 3.47971284, 3340.61242670],
      [660776, 3.81783, 6681.22485],
      [46179, 4.15595, 10021.83728],
      [8110, 5.5596, 2810.9215],
      [7485, 1.7724, 5621.8429],
      [5523, 1.3644, 2281.2305],
      [3825, 4.4941, 13362.4497],
      [2484, 4.9255, 2942.4634],
      [2435, 2.1700, 3337.0893],
      [1906, 3.8236, 3344.1355],
      [1871, 0.4143, 398.1490],
      [1341, 5.3165, 3340.5452],
      [1194, 3.0199, 3340.6797],
      [1163, 0.1145, 5092.1520],
      [1082, 0.6299, 2544.3144],
    ],
    [
      [1107434, 2.0325052, 3340.6124267],
      [103176, 2.37072, 6681.22485],
      [12877, 0, 0],
      [10816, 2.70888, 10021.83728],
      [1195, 3.0470, 13362.4497],
      [239, 2.037, 2281.230],
    ],
    [
      [44242, 0.47931, 3340.61243],
      [8138, 0.8700, 6681.22485],
      [1275, 1.2259, 10021.83728],
      [187, 1.573, 13362.450],
    ],
  ],
};

// ── JUPITER ──
const JUPITER_VSOP: VSOP87Series = {
  L: [
    [
      [59954691, 0, 0],
      [9695899, 5.0619179, 529.6909651],
      [573610, 1.44406, 7.11355],
      [306389, 5.41735, 1059.38193],
      [97178, 4.14265, 632.78374],
      [72903, 3.64043, 522.57742],
      [64264, 3.41145, 103.09277],
      [39806, 2.29377, 419.48464],
      [38858, 1.27232, 316.39187],
      [27965, 1.78455, 536.80451],
      [13590, 5.77481, 1589.07290],
      [8769, 3.6300, 949.1756],
      [8246, 3.5823, 206.1855],
      [7368, 5.0810, 735.8765],
      [6263, 0.0250, 213.2991],
      [6114, 4.5132, 1162.4747],
      [4905, 1.3208, 110.2063],
      [4137, 2.7222, 1052.2684],
      [3116, 0.6714, 1066.4955],
      [2552, 5.4712, 1265.5675],
    ],
    [
      [52993480757, 0, 0],
      [489741, 4.22067, 529.69097],
      [228919, 6.02647, 7.11355],
      [27655, 4.57266, 1059.38193],
      [20721, 5.45939, 522.57742],
      [12106, 0.16986, 536.80451],
      [6068, 4.4242, 103.0928],
      [5434, 3.9848, 419.4846],
      [4238, 5.8901, 14.2271],
      [2212, 5.2677, 206.1855],
    ],
    [
      [47234, 4.32148, 7.11355],
      [38966, 0, 0],
      [30629, 2.93021, 529.69097],
      [3189, 1.0551, 522.5774],
      [2729, 4.8455, 536.8045],
      [2723, 3.4141, 1059.3819],
      [1721, 4.1873, 14.2271],
      [383, 5.768, 419.485],
    ],
  ],
  B: [
    [
      [2268616, 3.5585261, 529.6909651],
      [110090, 0, 0],
      [109972, 3.90809, 1059.38193],
      [8101, 3.6051, 522.5774],
      [6438, 0.3063, 536.8045],
      [6044, 4.2588, 1589.0729],
      [1107, 2.9853, 1162.4747],
    ],
    [
      [177352, 5.701665, 529.690965],
      [3230, 5.7794, 1059.3819],
      [3081, 5.4746, 522.5774],
      [2212, 4.7348, 536.8045],
      [1694, 3.1416, 0],
      [346, 4.746, 1052.268],
    ],
    [
      [8094, 1.4632, 529.6910],
      [813, 3.1416, 0],
      [742, 0.957, 522.577],
      [399, 2.899, 536.805],
    ],
  ],
  R: [
    [
      [520887429, 0, 0],
      [25209327, 3.49108640, 529.69096509],
      [610600, 3.84115, 1059.38193],
      [282029, 2.57420, 632.78374],
      [187647, 2.07590, 522.57742],
      [86793, 0.71001, 419.48464],
      [72063, 0.21466, 536.80451],
      [65517, 5.97996, 316.39187],
      [30135, 2.16132, 949.17561],
      [29135, 1.67759, 103.09277],
      [23947, 0.27458, 7.11355],
      [23453, 3.54023, 735.87651],
      [22284, 4.19363, 1589.07290],
      [13033, 2.96043, 1162.47470],
      [12749, 2.71550, 1052.26838],
      [9703, 1.9067, 206.1855],
      [9161, 4.4135, 213.2991],
      [7895, 2.4791, 426.5982],
      [7058, 2.1818, 1265.5675],
      [6138, 6.2642, 846.0828],
    ],
    [
      [1271802, 2.6493751, 529.6909651],
      [61662, 3.00076, 1059.38193],
      [53444, 3.89718, 522.57742],
      [41390, 0, 0],
      [31185, 4.88277, 536.80451],
      [11847, 2.41330, 419.48464],
      [9166, 4.7598, 7.1136],
      [3404, 3.3469, 1589.0729],
      [3203, 5.2108, 735.8765],
      [3176, 2.7930, 103.0928],
      [2806, 3.7422, 515.4639],
    ],
    [
      [79645, 1.35866, 529.69097],
      [8252, 5.7777, 522.5774],
      [7030, 3.2748, 536.8045],
      [5314, 1.8384, 1059.3819],
      [1861, 2.9768, 7.1136],
      [964, 5.480, 515.464],
    ],
  ],
};

// ── SATURN ──
const SATURN_VSOP: VSOP87Series = {
  L: [
    [
      [87401354, 0, 0],
      [11107660, 3.96205090, 213.29909544],
      [1414151, 4.58581516, 7.11354700],
      [398379, 0.52112, 206.18554],
      [350769, 3.30330, 426.59819],
      [206816, 0.24658, 103.09277],
      [79271, 3.84007, 220.41264],
      [23990, 4.66977, 110.20632],
      [16574, 0.43719, 419.48464],
      [15820, 0.93809, 632.78374],
      [14395, 1.71085, 11.04570],
      [13374, 1.00075, 95.97923],
      [11303, 3.40770, 14.22709],
      [9796, 5.2048, 316.3919],
      [7857, 5.8491, 529.6910],
      [4433, 6.0260, 202.2534],
    ],
    [
      [21354295596, 0, 0],
      [1296855, 1.82821, 213.29910],
      [564348, 2.88500, 7.11355],
      [107679, 2.27770, 206.18554],
      [98323, 1.08070, 426.59819],
      [40255, 2.04128, 220.41264],
      [19942, 1.27955, 103.09277],
      [10512, 2.74880, 14.22709],
      [6939, 0.4049, 639.8973],
      [4803, 2.4419, 419.4846],
      [4056, 2.9217, 110.2063],
      [3769, 3.6497, 3.9322],
    ],
    [
      [116441, 1.17988, 7.11355],
      [91921, 0.07425, 213.29910],
      [90592, 0, 0],
      [15277, 4.06492, 206.18554],
      [10631, 0.25778, 220.41264],
      [6168, 4.6613, 14.2271],
      [5765, 5.3095, 426.5982],
      [3834, 0.4681, 419.4846],
    ],
  ],
  B: [
    [
      [4330678, 3.60284104, 213.29909544],
      [240348, 2.85238, 426.59819],
      [84746, 0, 0],
      [34116, 0.57297, 206.18554],
      [30863, 3.48442, 220.41264],
      [14734, 2.11847, 639.89729],
      [9917, 5.7900, 419.4846],
      [6994, 4.7360, 7.1135],
      [4808, 5.4331, 316.3919],
      [4788, 4.9651, 110.2063],
      [3432, 2.7326, 433.7117],
      [1506, 6.013, 103.093],
    ],
    [
      [397555, 5.332900, 213.299095],
      [49479, 3.14159, 0],
      [18572, 6.09919, 426.59819],
      [14801, 2.30586, 206.18554],
      [9644, 1.6967, 220.4126],
      [3757, 1.2543, 419.4846],
      [2717, 5.9117, 639.8973],
      [1455, 0.8516, 433.7117],
    ],
    [
      [20630, 0.50482, 213.29910],
      [3720, 3.9983, 206.1855],
      [1627, 6.1819, 220.4126],
      [1346, 0, 0],
    ],
  ],
  R: [
    [
      [955758136, 0, 0],
      [52921382, 2.39226220, 213.29909544],
      [3515015, 2.32794, 206.18554],
      [1898120, 4.59452, 426.59819],
      [1590130, 2.93130, 220.41264],
      [1365725, 5.61283, 7.11355],
      [396405, 3.28390, 14.22709],
      [337415, 5.09244, 419.48464],
      [318710, 0.74519, 316.39187],
      [198995, 1.95684, 110.20632],
      [167739, 3.36280, 632.78374],
      [155949, 0.01095, 103.09277],
      [106285, 0.12006, 529.69097],
      [75781, 3.17789, 95.97923],
      [48776, 3.83713, 302.16477],
      [37306, 1.88061, 323.50542],
    ],
    [
      [6182981, 0.2584352, 213.2990954],
      [506578, 0.71115, 206.18554],
      [341394, 5.79636, 426.59819],
      [188491, 0.47216, 220.41264],
      [186262, 3.14159, 0],
      [143891, 1.40745, 7.11355],
      [49621, 6.01744, 14.22709],
      [20928, 5.09246, 110.20632],
      [18840, 0.71706, 419.48464],
      [13877, 0.75886, 103.09277],
      [12893, 5.94330, 316.39187],
    ],
    [
      [436902, 4.78672, 213.29910],
      [71923, 2.50070, 206.18554],
      [49767, 4.97168, 220.41264],
      [43221, 3.86940, 426.59819],
      [29646, 5.96310, 7.11355],
      [4721, 2.4753, 14.2271],
      [4142, 4.1067, 419.4846],
      [3789, 3.0977, 110.2063],
    ],
  ],
};

/**
 * Evaluate a VSOP87 series: sum of A * cos(B + C * T) for each power of T
 */
function evalVSOP(series: VSOP87Term[][], T: number): number {
  let result = 0;
  let Tpower = 1;
  for (let i = 0; i < series.length; i++) {
    let sum = 0;
    for (const [A, B, C] of series[i]) {
      sum += A * Math.cos(B + C * T);
    }
    result += sum * Tpower;
    Tpower *= T;
  }
  return result;
}

/**
 * Get heliocentric ecliptic coordinates (L, B, R) for a planet
 * L in radians, B in radians, R in AU
 */
interface HeliocentricCoords {
  L: number;  // longitude (radians)
  B: number;  // latitude (radians)
  R: number;  // radius vector (AU)
}

function getHeliocentricVSOP(vsop: VSOP87Series, T: number): HeliocentricCoords {
  // CRITICAL: VSOP87 uses Julian millennia (τ), NOT Julian centuries (T)
  const tau = T / 10;
  let L = evalVSOP(vsop.L, tau) / 1e8; // VSOP amplitudes are scaled by 1e8
  const B = evalVSOP(vsop.B, tau) / 1e8;
  const R = evalVSOP(vsop.R, tau) / 1e8;

  // FK5 frame correction (VSOP87 dynamical ecliptic → J2000 equinox)
  // Meeus, Astronomical Algorithms, Ch. 32
  // CRITICAL: FK5 correction uses Julian centuries T, NOT millennia tau
  const Tcent = tau * 10; // convert back to centuries for FK5 formula
  const Lp = L - 1.397 * DEG * Tcent - 0.00031 * DEG * Tcent * Tcent;
  const dL = (-0.09033 + 0.03916 * (Math.cos(Lp) + Math.sin(Lp)) * Math.tan(B)) / 3600 * DEG;
  const dB = (0.03916 * (Math.cos(Lp) - Math.sin(Lp))) / 3600 * DEG;
  L += dL;

  return { L, B: B + dB, R };
}

const PLANET_VSOP: Record<string, VSOP87Series> = {
  Mercury: MERCURY_VSOP,
  Venus: VENUS_VSOP,
  Mars: MARS_VSOP,
  Jupiter: JUPITER_VSOP,
  Saturn: SATURN_VSOP,
};

// ═══════════════════════════════════════════════════════════════════════════════
// GEOCENTRIC CONVERSION — Full 3D heliocentric → geocentric vector transform
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert heliocentric ecliptic (L, B, R) to rectangular (x, y, z)
 */
function helioToRect(h: HeliocentricCoords): { x: number; y: number; z: number } {
  const cosB = Math.cos(h.B);
  return {
    x: h.R * cosB * Math.cos(h.L),
    y: h.R * cosB * Math.sin(h.L),
    z: h.R * Math.sin(h.B),
  };
}

/**
 * Get geocentric ecliptic longitude and latitude for a planet
 * Uses full VSOP87 Earth vectors for proper conversion
 */
function getGeocentricPosition(planet: string, T: number): { longitude: number; latitude: number; distance: number } {
  const vsop = PLANET_VSOP[planet];
  if (!vsop) return { longitude: 0, latitude: 0, distance: 1 };

  // Heliocentric coordinates of Earth at observer time
  const hEarth = getHeliocentricVSOP(EARTH_VSOP, T);
  const rEarth = helioToRect(hEarth);

  // First pass: planet at observer time (to get approximate distance)
  let hPlanet = getHeliocentricVSOP(vsop, T);
  let rPlanet = helioToRect(hPlanet);
  let dx = rPlanet.x - rEarth.x;
  let dy = rPlanet.y - rEarth.y;
  let dz = rPlanet.z - rEarth.z;
  let distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Light-time iteration: planet position at retarded time (t - Δ/c)
  // Light travels 1 AU in ~499.005 seconds = 0.00577552 days
  const lightTimeDays = distance * 0.00577552; // days
  const lightTimeCenturies = lightTimeDays / 36525;
  const Tretarded = T - lightTimeCenturies;

  // Second pass: planet at retarded time
  hPlanet = getHeliocentricVSOP(vsop, Tretarded);
  rPlanet = helioToRect(hPlanet);
  dx = rPlanet.x - rEarth.x;
  dy = rPlanet.y - rEarth.y;
  dz = rPlanet.z - rEarth.z;
  distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Geocentric ecliptic longitude and latitude
  let longitude = Math.atan2(dy, dx) * RAD;
  if (longitude < 0) longitude += 360;
  const latitude = Math.asin(dz / distance) * RAD;

  return { longitude: normalize360(longitude), latitude, distance };
}

/**
 * Compute geocentric ecliptic longitude for a planet with light-time correction
 */
function toGeocentricLongitude(planet: string, T: number): number {
  const pos = getGeocentricPosition(planet, T);

  // Apply aberration correction (Meeus Ch. 23)
  // κ = 20.4955" = 0.005694°, includes cos(β) denominator
  const sunLong = solarLongitude(T).longitude;
  const cosB = Math.cos(pos.latitude * DEG) || 1; // avoid division by zero
  const kappa = 0.005694; // constant of aberration in degrees
  // Earth's orbital eccentricity and perihelion longitude
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const pi = 102.93735 + 1.71946 * T + 0.00046 * T * T; // longitude of perihelion
  const aberration = (-kappa * Math.cos((sunLong - pos.longitude) * DEG) 
    + e * kappa * Math.cos((pi - pos.longitude) * DEG)) / cosB;

  // Apply nutation
  const nut = calcNutation(T);

  return normalize360(pos.longitude + aberration + nut.dPsi);
}

/**
 * Compute geocentric daily speed via proper finite difference (±0.5 day)
 */
function geocentricSpeed(planet: string, T: number): number {
  const dt = 0.5 / 36525; // 0.5 day in Julian centuries
  const l1 = getGeocentricPosition(planet, T - dt).longitude;
  const l2 = getGeocentricPosition(planet, T + dt).longitude;
  let diff = l2 - l1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff; // degrees per day (since span is 1 day)
}

/**
 * Rahu (Mean North Node) — valid for all dates
 */
function rahuLongitude(T: number): number {
  return normalize360(125.0446 - 1934.1363 * T + 0.0020754 * T * T + T ** 3 / 467441);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DECLINATION
// ═══════════════════════════════════════════════════════════════════════════════

function calcDeclination(longitude: number, latitude: number, T: number): number {
  const eps = meanObliquity(T) * DEG;
  const lonRad = longitude * DEG;
  const latRad = latitude * DEG;
  // Full formula including ecliptic latitude
  return Math.asin(
    Math.sin(latRad) * Math.cos(eps) +
    Math.cos(latRad) * Math.sin(eps) * Math.sin(lonRad)
  ) * RAD;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════════════════════

function normalize360(deg: number): number {
  let r = deg % 360;
  if (r < 0) r += 360;
  return r;
}

function getZodiacSign(longitude: number): string {
  return ZODIAC_SIGNS[Math.floor(normalize360(longitude) / 30)];
}

function getSignDegree(longitude: number): number {
  return normalize360(longitude) % 30;
}

function getNakshatra(siderealLongitude: number): string {
  const idx = Math.floor(normalize360(siderealLongitude) / (360 / 27));
  return NAKSHATRAS[idx % 27];
}

function getNakshatraPada(siderealLongitude: number): number {
  const nakshatraSpan = 360 / 27; // 13.333°
  const posInNakshatra = normalize360(siderealLongitude) % nakshatraSpan;
  return Math.floor(posInNakshatra / (nakshatraSpan / 4)) + 1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get full ephemeris metadata for a date
 */
export function getEphemerisMetadata(date: Date): EphemerisMetadata {
  const jd = dateToJulianDay(date);
  const T = julianCenturies(jd);
  const nut = calcNutation(T);
  const eps = meanObliquity(T);
  const ayan = lahiriAyanamsa(jd);

  // Greenwich Mean Sidereal Time (hours)
  const gmst = normalize360(280.46061837 + 360.98564736629 * (jd - 2451545.0)
    + 0.000387933 * T * T - T ** 3 / 38710000) / 15;

  return {
    julianDay: jd,
    deltaT: deltaT(date.getUTCFullYear() + date.getUTCMonth() / 12),
    ayanamsa: ayan,
    obliquity: eps + nut.dEps,
    nutationLongitude: nut.dPsi,
    nutationObliquity: nut.dEps,
    siderealTime: gmst,
  };
}

/**
 * Calculate planetary position for ANY date (full Swiss Ephemeris-style)
 */
export function getPlanetaryPosition(planet: Planet, date: Date): PlanetaryPosition {
  const jd = dateToJulianDay(date);
  const T = julianCenturies(jd);
  const ayan = lahiriAyanamsa(jd);

  let longitude: number;
  let speed: number;
  let retro = false;

  if (planet === 'Sun') {
    const sun = solarLongitude(T);
    longitude = sun.longitude;
    speed = sun.speed;
  } else if (planet === 'Moon') {
    const moon = lunarLongitude(T);
    longitude = moon.longitude;
    speed = moon.speed;
  } else if (planet === 'Rahu') {
    longitude = rahuLongitude(T);
    speed = -0.0529539;
    retro = true;
  } else if (planet === 'Ketu') {
    longitude = normalize360(rahuLongitude(T) + 180);
    speed = -0.0529539;
    retro = true;
  } else {
    longitude = toGeocentricLongitude(planet, T);
    speed = geocentricSpeed(planet, T);
    retro = speed < 0;
  }

  // Get ecliptic latitude for declination calculation
  let eclipticLat = 0;
  if (planet !== 'Sun' && planet !== 'Moon' && planet !== 'Rahu' && planet !== 'Ketu') {
    const geoPos = getGeocentricPosition(planet, T);
    eclipticLat = geoPos.latitude;
  }

  const siderealLong = normalize360(longitude - ayan);
  const decl = calcDeclination(longitude, eclipticLat, T);

  return {
    planet,
    longitude: Math.round(longitude * 1000) / 1000,
    siderealLongitude: Math.round(siderealLong * 1000) / 1000,
    zodiacSign: getZodiacSign(longitude),
    siderealSign: getZodiacSign(siderealLong),
    signDegree: Math.round(getSignDegree(longitude) * 100) / 100,
    siderealSignDegree: Math.round(getSignDegree(siderealLong) * 100) / 100,
    isRetrograde: retro,
    nakshatra: getNakshatra(siderealLong),
    nakshatraPada: getNakshatraPada(siderealLong),
    speed: Math.round(speed * 10000) / 10000,
    declination: Math.round(decl * 1000) / 1000,
  };
}

/**
 * Get all planetary positions for a given date
 */
export function getAllPositions(date: Date): PlanetaryPosition[] {
  const planets: Planet[] = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Rahu', 'Ketu'];
  return planets.map(p => getPlanetaryPosition(p, date));
}

/**
 * Calculate when a planet transits from one sign to the next
 */
export function getNextTransit(planet: Planet, startDate: Date, maxDays: number = 365): TransitResult | null {
  const startPos = getPlanetaryPosition(planet, startDate);
  const startSign = startPos.zodiacSign;

  for (let day = 1; day <= maxDays; day++) {
    const checkDate = new Date(startDate.getTime() + day * 86400000);
    const pos = getPlanetaryPosition(planet, checkDate);

    if (pos.zodiacSign !== startSign) {
      let duration = 0;
      const newSign = pos.zodiacSign;
      for (let d2 = 1; d2 <= maxDays; d2++) {
        const futureDate = new Date(checkDate.getTime() + d2 * 86400000);
        if (getPlanetaryPosition(planet, futureDate).zodiacSign !== newSign) {
          duration = d2;
          break;
        }
      }
      return {
        planet,
        fromSign: startSign,
        toSign: newSign,
        transitDate: checkDate,
        durationDays: duration || maxDays,
      };
    }
  }
  return null;
}

/**
 * Calculate Vimshottari Dasa periods from birth date
 * Uses Moon's sidereal nakshatra at birth
 */
export function calculateDasaPeriods(birthDate: Date, yearsForward: number = 120): DasaPeriod[] {
  const moonPos = getPlanetaryPosition('Moon', birthDate);
  const nakshatraIndex = NAKSHATRAS.indexOf(moonPos.nakshatra || 'Ashwini');

  const nakshatraDasaMap = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const startingDasaIndex = nakshatraDasaMap[nakshatraIndex % 9];

  const nakshatraSpan = 360 / 27;
  const positionInNakshatra = moonPos.siderealLongitude % nakshatraSpan;
  const fractionCompleted = positionInNakshatra / nakshatraSpan;
  const firstDasa = DASA_SEQUENCE[startingDasaIndex];
  const remainingYears = firstDasa.years * (1 - fractionCompleted);

  const periods: DasaPeriod[] = [];
  let currentDate = new Date(birthDate);
  const endLimit = new Date(birthDate.getTime() + yearsForward * 365.25 * 86400000);

  // First (partial) Dasa
  const firstEndDate = new Date(currentDate.getTime() + remainingYears * 365.25 * 86400000);
  if (firstEndDate <= endLimit) {
    periods.push({
      planet: firstDasa.planet,
      startDate: new Date(currentDate),
      endDate: firstEndDate,
      durationYears: Math.round(remainingYears * 100) / 100,
      subPeriods: generateBhuktis(firstDasa.planet, startingDasaIndex, new Date(currentDate), firstEndDate),
    });
  }
  currentDate = firstEndDate;

  let dasaIndex = (startingDasaIndex + 1) % 9;
  while (currentDate < endLimit) {
    const dasa = DASA_SEQUENCE[dasaIndex];
    const dasaEnd = new Date(currentDate.getTime() + dasa.years * 365.25 * 86400000);

    if (currentDate >= endLimit) break;

    const actualEnd = dasaEnd > endLimit ? endLimit : dasaEnd;
    periods.push({
      planet: dasa.planet,
      startDate: new Date(currentDate),
      endDate: actualEnd,
      durationYears: dasa.years,
      subPeriods: generateBhuktis(dasa.planet, dasaIndex, new Date(currentDate), actualEnd),
    });

    currentDate = dasaEnd;
    dasaIndex = (dasaIndex + 1) % 9;
  }

  return periods;
}

/**
 * Generate Bhukti (sub-periods) within a Maha Dasa
 */
function generateBhuktis(
  dasaLord: Planet,
  dasaIndex: number,
  start: Date,
  end: Date
): Array<{ planet: Planet; startDate: Date; endDate: Date }> {
  const totalMs = end.getTime() - start.getTime();
  const totalDasaYears = DASA_SEQUENCE.reduce((s, d) => s + d.years, 0); // 120
  const bhuktis: Array<{ planet: Planet; startDate: Date; endDate: Date }> = [];

  let bhuktiIndex = dasaIndex;
  let currentMs = start.getTime();

  for (let i = 0; i < 9; i++) {
    const bhuktiLord = DASA_SEQUENCE[bhuktiIndex];
    const bhuktiDuration = (DASA_SEQUENCE[dasaIndex].years * bhuktiLord.years / totalDasaYears) * 365.25 * 86400000;
    const bhuktiEnd = Math.min(currentMs + bhuktiDuration, end.getTime());

    bhuktis.push({
      planet: bhuktiLord.planet,
      startDate: new Date(currentMs),
      endDate: new Date(bhuktiEnd),
    });

    currentMs = bhuktiEnd;
    if (currentMs >= end.getTime()) break;
    bhuktiIndex = (bhuktiIndex + 1) % 9;
  }

  return bhuktis;
}

/**
 * Validate a planetary claim against calculated position
 */
export function validatePlanetaryClaim(
  planet: Planet,
  date: Date,
  claimedSign: string,
  toleranceDegrees: number = 2,
  useSidereal: boolean = true
): boolean {
  const actual = getPlanetaryPosition(planet, date);
  const actualSign = useSidereal ? actual.siderealSign : actual.zodiacSign;
  const actualDeg = useSidereal ? actual.siderealSignDegree : actual.signDegree;

  if (actualSign === claimedSign) return true;

  // Check cusp tolerance
  if (actualDeg < toleranceDegrees || actualDeg > 30 - toleranceDegrees) {
    const signIndex = ZODIAC_SIGNS.indexOf(actualSign);
    const prevSign = ZODIAC_SIGNS[(signIndex + 11) % 12];
    const nextSign = ZODIAC_SIGNS[(signIndex + 1) % 12];
    return claimedSign === prevSign || claimedSign === nextSign;
  }

  return false;
}

export default {
  getPlanetaryPosition,
  getAllPositions,
  getNextTransit,
  calculateDasaPeriods,
  validatePlanetaryClaim,
  getEphemerisMetadata,
  dateToJulianDay,
  calendarToJulianDay,
  julianDayToDate,
  createHistoricalDate,
  formatHistoricalYear,
  lahiriAyanamsa,
};
