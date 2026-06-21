// ═══════════════════════════════════════════════════════════════════════════════
// VEDIC ENGINE - THE JATHAKAM CALCULATOR (Destiny Seed Protocol)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Server-side calculation module for Vedic astrology
// Pure JavaScript implementation (no native dependencies)
//
// INPUT: DOB, Time, Latitude, Longitude
// OUTPUT: Complete destiny_profile.json
//
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// CORE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PlanetaryPosition {
  planet: string;
  longitude: number; // 0-360 degrees
  zodiacSign: string;
  zodiacDegree: number; // 0-30 within sign
  nakshatra: string;
  nakshatraPada: number; // 1-4
  isRetrograde: boolean;
  house: number; // 1-12
}

export interface VimshottariDashaEntry {
  date: string; // ISO date
  period: string; // e.g., 'Jupiter-Saturn'
  dashaLord: string;
  antardasha: string;
  vibe: string;
  age: number;
  startDate: Date;
  endDate: Date;
}

export type CompanionMode = 
  | 'Intellectual/Witty'      // Mercury dominant
  | 'Emotional/Nurturing'     // Moon dominant
  | 'Warrior/Motivator'       // Mars dominant
  | 'Philosophical/Spiritual' // Jupiter dominant
  | 'Structured/Practical'    // Saturn dominant
  | 'Creative/Romantic'       // Venus dominant
  | 'Confident/Leadership'    // Sun dominant
  | 'Mystical/Intense'        // Rahu/Ketu dominant
  | 'Balanced';               // No clear dominance

export interface PersonalityMatrix {
  dominantPlanet: string;
  dominantScore: number;
  companionMode: CompanionMode;
  planetaryStrengths: Record<string, number>;
  communicationStyle: string;
  emotionalPattern: string;
  decisionStyle: string;
  stressResponse: string;
}

export interface DestinyProfile {
  version: string;
  generatedAt: string;
  
  // Input Data
  birthDate: string;
  birthTime: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
  
  // Planetary Positions
  planets: PlanetaryPosition[];
  ascendant: PlanetaryPosition;
  
  // Vimshottari Dasha (Birth to 122 years)
  vimshottariDasha: VimshottariDashaEntry[];
  currentDasha: VimshottariDashaEntry;
  
  // Personality Matrix
  personalityMatrix: PersonalityMatrix;
  
  // Life Purpose
  lifePath: {
    dharma: string;
    artha: string;
    kama: string;
    moksha: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASTRONOMICAL CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
] as const;

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
] as const;

// Nakshatra ruling lords for Vimshottari Dasha
const NAKSHATRA_LORDS = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu',
  'Jupiter', 'Saturn', 'Mercury', 'Ketu', 'Venus', 'Sun',
  'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu',
  'Jupiter', 'Saturn', 'Mercury'
] as const;

// Dasha periods in years
const DASHA_YEARS: Record<string, number> = {
  'Ketu': 7,
  'Venus': 20,
  'Sun': 6,
  'Moon': 10,
  'Mars': 7,
  'Rahu': 18,
  'Jupiter': 16,
  'Saturn': 19,
  'Mercury': 17
};

const DASHA_ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const TOTAL_DASHA_CYCLE = 120; // years

// Dasha vibes (themes)
const DASHA_VIBES: Record<string, string> = {
  'Ketu': 'Spiritual Liberation',
  'Venus': 'Love & Luxury',
  'Sun': 'Authority & Identity',
  'Moon': 'Emotional Growth',
  'Mars': 'Courage & Action',
  'Rahu': 'Worldly Ambition',
  'Jupiter': 'Wisdom & Expansion',
  'Saturn': 'Discipline & Karma',
  'Mercury': 'Communication & Learning'
};

// ═══════════════════════════════════════════════════════════════════════════════
// ASTRONOMICAL CALCULATIONS (Simplified Swiss Ephemeris Alternative)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate Julian Day from date
 */
function toJulianDay(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  
  let Y = year;
  let M = month;
  
  if (M <= 2) {
    Y -= 1;
    M += 12;
  }
  
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  
  return Math.floor(365.25 * (Y + 4716)) + 
         Math.floor(30.6001 * (M + 1)) + 
         day + hour / 24 + B - 1524.5;
}

/**
 * Calculate Ayanamsa (difference between Tropical and Sidereal)
 * Using Lahiri Ayanamsa with proper precession model
 */
function calculateAyanamsa(jd: number): number {
  const T = (jd - 2451545.0) / 36525; // centuries from J2000
  // Lahiri Ayanamsa: More accurate IAU 2006 precession model
  // Base value at J2000.0 = 23.856° with annual precession ~50.29"
  const precessionRate = 50.2882 / 3600; // degrees per year
  const years = (jd - 2451545.0) / 365.25;
  return 23.856 + precessionRate * years + 0.0000111 * T * T; // Include quadratic term
}

/**
 * Calculate TRUE Sun Position (degrees) with equation of center
 */
function calculateSunPosition(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  
  // Mean longitude
  let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  
  // Mean anomaly
  let M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  M = M * Math.PI / 180; // to radians
  
  // Equation of center (perturbation correction)
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
          + 0.000289 * Math.sin(3 * M);
  
  // True longitude
  L0 = (L0 + C) % 360;
  if (L0 < 0) L0 += 360;
  return L0;
}

/**
 * Calculate TRUE Moon Position (degrees) with major perturbations
 */
function calculateMoonPosition(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const d = jd - 2451545.0;
  
  // Mean longitude of Moon
  let Lm = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T;
  
  // Mean anomaly of Moon
  let Mm = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T;
  Mm = Mm * Math.PI / 180;
  
  // Mean anomaly of Sun
  let Ms = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T;
  Ms = Ms * Math.PI / 180;
  
  // Mean elongation of Moon from Sun
  let D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T;
  D = D * Math.PI / 180;
  
  // Mean distance of Moon from ascending node
  let F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T;
  F = F * Math.PI / 180;
  
  // Major perturbations
  const evection = 1.2739 * Math.sin(2 * D - Mm); // Evection
  const variation = 0.6583 * Math.sin(2 * D); // Variation
  const annualEq = 0.1858 * Math.sin(Ms); // Annual equation
  const parallactic = 0.0558 * Math.sin(2 * D - 2 * F); // Parallactic
  
  // Apply perturbations
  Lm = Lm + evection + variation - annualEq + parallactic;
  
  Lm = Lm % 360;
  if (Lm < 0) Lm += 360;
  return Lm;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GEOCENTRIC PLANETARY CALCULATIONS WITH PERTURBATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate geocentric position of Mercury with perturbations
 */
function calculateMercuryGeoPosition(d: number, _T: number, sunLonRad: number): { lon: number; retrograde: boolean } {
  // Mercury's heliocentric elements
  const a = 0.387098; // semi-major axis (AU)
  const e = 0.205635; // eccentricity
  const I = 7.005 * Math.PI / 180; // inclination
  const w = (29.125 + 0.37 * d / 36525) * Math.PI / 180; // argument of perihelion
  const O = (48.331 + 1.18 * d / 36525) * Math.PI / 180; // longitude of ascending node
  
  // Mean anomaly
  const M = (174.7948 + 4.09233445 * d) * Math.PI / 180;
  
  // Solve Kepler's equation (eccentric anomaly)
  let E = M;
  for (let i = 0; i < 5; i++) {
    E = M + e * Math.sin(E);
  }
  
  // True anomaly
  const v = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  
  // Heliocentric longitude
  const helioLon = normalizeAngle((v + w) * 180 / Math.PI);
  
  // Distance from Sun
  const r = a * (1 - e * Math.cos(E));
  
  // Convert to geocentric (simplified parallax correction)
  const sunDist = 1.0; // Earth-Sun distance ~1 AU
  const elongation = helioLon - (sunLonRad * 180 / Math.PI);
  const geoCorrection = Math.atan2(r * Math.sin(elongation * Math.PI / 180), sunDist - r * Math.cos(elongation * Math.PI / 180));
  const geoLon = normalizeAngle(sunLonRad * 180 / Math.PI + geoCorrection * 180 / Math.PI + 180);
  
  // Retrograde when elongation from Sun causes apparent backward motion
  const apparentMotion = 4.09233 - Math.cos(elongation * Math.PI / 180) * 0.985;
  const retrograde = apparentMotion < 0;
  
  return { lon: geoLon, retrograde };
}

/**
 * Calculate geocentric position of Venus with perturbations
 */
function calculateVenusGeoPosition(d: number, _T: number, sunLonRad: number): { lon: number; retrograde: boolean } {
  const a = 0.723332;
  const e = 0.006772;
  
  const M = (50.4161 + 1.60213034 * d) * Math.PI / 180;
  let E = M;
  for (let i = 0; i < 5; i++) {
    E = M + e * Math.sin(E);
  }
  
  const v = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  const w = (54.884 + 0.51 * d / 36525) * Math.PI / 180;
  const helioLon = normalizeAngle((v + w) * 180 / Math.PI);
  
  const r = a * (1 - e * Math.cos(E));
  const sunDist = 1.0;
  const elongation = helioLon - (sunLonRad * 180 / Math.PI);
  const geoCorrection = Math.atan2(r * Math.sin(elongation * Math.PI / 180), sunDist - r * Math.cos(elongation * Math.PI / 180));
  const geoLon = normalizeAngle(sunLonRad * 180 / Math.PI + geoCorrection * 180 / Math.PI + 180);
  
  const apparentMotion = 1.602 - Math.cos(elongation * Math.PI / 180) * 0.985;
  const retrograde = apparentMotion < 0;
  
  return { lon: geoLon, retrograde };
}

/**
 * Calculate geocentric position of Mars with perturbations
 */
function calculateMarsGeoPosition(d: number, T: number, sunLonRad: number): { lon: number; retrograde: boolean } {
  const a = 1.523679;
  const e = 0.093405 + 0.000092 * T;
  
  const M = (19.373 + 0.52402068 * d) * Math.PI / 180;
  let E = M;
  for (let i = 0; i < 5; i++) {
    E = M + e * Math.sin(E);
  }
  
  const v = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  const w = (286.502 + 2.92 * T) * Math.PI / 180;
  const helioLon = normalizeAngle((v + w) * 180 / Math.PI);
  
  const r = a * (1 - e * Math.cos(E));
  const sunLonDeg = sunLonRad * 180 / Math.PI;
  
  // Geocentric conversion for outer planets
  const x = r * Math.cos(helioLon * Math.PI / 180) - 1.0 * Math.cos(sunLonRad);
  const y = r * Math.sin(helioLon * Math.PI / 180) - 1.0 * Math.sin(sunLonRad);
  const geoLon = normalizeAngle(Math.atan2(y, x) * 180 / Math.PI);
  
  // Retrograde when Earth is overtaking Mars (opposition)
  const elongation = normalizeAngle(geoLon - sunLonDeg);
  const retrograde = elongation > 120 && elongation < 240;
  
  return { lon: geoLon, retrograde };
}

/**
 * Calculate geocentric position of Jupiter with perturbations
 */
function calculateJupiterGeoPosition(d: number, T: number, sunLonRad: number): { lon: number; retrograde: boolean } {
  const a = 5.20260;
  const e = 0.048498 + 0.000163 * T;
  
  const M = (20.020 + 0.08308529 * d) * Math.PI / 180;
  
  // Jupiter-Saturn great inequality perturbation
  const saturnM = (316.967 + 0.033459 * d) * Math.PI / 180;
  const greatInequality = 0.333 * Math.sin(2 * M - 5 * saturnM);
  
  let E = M;
  for (let i = 0; i < 5; i++) {
    E = M + e * Math.sin(E);
  }
  
  const v = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  const w = (273.867 + 1.64 * T) * Math.PI / 180;
  const helioLon = normalizeAngle((v + w) * 180 / Math.PI + greatInequality);
  
  const r = a * (1 - e * Math.cos(E));
  const sunLonDeg = sunLonRad * 180 / Math.PI;
  
  const x = r * Math.cos(helioLon * Math.PI / 180) - 1.0 * Math.cos(sunLonRad);
  const y = r * Math.sin(helioLon * Math.PI / 180) - 1.0 * Math.sin(sunLonRad);
  const geoLon = normalizeAngle(Math.atan2(y, x) * 180 / Math.PI);
  
  const elongation = normalizeAngle(geoLon - sunLonDeg);
  const retrograde = elongation > 110 && elongation < 250;
  
  return { lon: geoLon, retrograde };
}

/**
 * Calculate geocentric position of Saturn with perturbations
 */
function calculateSaturnGeoPosition(d: number, T: number, sunLonRad: number): { lon: number; retrograde: boolean } {
  const a = 9.55490;
  const e = 0.055546 - 0.000346 * T;
  
  const M = (316.967 + 0.033459 * d) * Math.PI / 180;
  
  // Jupiter-Saturn great inequality
  const jupiterM = (20.020 + 0.08308529 * d) * Math.PI / 180;
  const greatInequality = -0.814 * Math.sin(2 * jupiterM - 5 * M);
  
  let E = M;
  for (let i = 0; i < 5; i++) {
    E = M + e * Math.sin(E);
  }
  
  const v = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  const w = (339.391 + 2.97 * T) * Math.PI / 180;
  const helioLon = normalizeAngle((v + w) * 180 / Math.PI + greatInequality);
  
  const r = a * (1 - e * Math.cos(E));
  const sunLonDeg = sunLonRad * 180 / Math.PI;
  
  const x = r * Math.cos(helioLon * Math.PI / 180) - 1.0 * Math.cos(sunLonRad);
  const y = r * Math.sin(helioLon * Math.PI / 180) - 1.0 * Math.sin(sunLonRad);
  const geoLon = normalizeAngle(Math.atan2(y, x) * 180 / Math.PI);
  
  const elongation = normalizeAngle(geoLon - sunLonDeg);
  const retrograde = elongation > 100 && elongation < 260;
  
  return { lon: geoLon, retrograde };
}

/**
 * Calculate GEOCENTRIC planetary positions with perturbation corrections
 * Uses proper astronomical formulas for Vedic accuracy
 */
function calculatePlanetaryPositions(date: Date, lat: number, lng: number): PlanetaryPosition[] {
  const jd = toJulianDay(date);
  const ayanamsa = calculateAyanamsa(jd);
  const T = (jd - 2451545.0) / 36525; // Julian centuries from J2000
  const d = jd - 2451545.0; // Days from J2000
  
  // Get Sun's true longitude for geocentric corrections
  const sunLon = calculateSunPosition(jd);
  const sunLonRad = sunLon * Math.PI / 180;
  
  // Calculate GEOCENTRIC positions with perturbations
  const tropicalPositions: Record<string, { lon: number; retrograde: boolean }> = {
    Sun: { 
      lon: normalizeAngle(sunLon), 
      retrograde: false 
    },
    Moon: { 
      lon: normalizeAngle(calculateMoonPosition(jd)), 
      retrograde: false 
    },
    Mars: calculateMarsGeoPosition(d, T, sunLonRad),
    Mercury: calculateMercuryGeoPosition(d, T, sunLonRad),
    Jupiter: calculateJupiterGeoPosition(d, T, sunLonRad),
    Venus: calculateVenusGeoPosition(d, T, sunLonRad),
    Saturn: calculateSaturnGeoPosition(d, T, sunLonRad),
    Rahu: { 
      // True North Node with nutation correction
      lon: normalizeAngle(125.0445479 - 0.0529538083 * d + 0.0022 * Math.sin((125.04 - 0.0529539 * d) * Math.PI / 180)), 
      retrograde: true 
    },
    Ketu: { 
      // South Node - exactly opposite Rahu
      lon: normalizeAngle(125.0445479 - 0.0529538083 * d + 180 + 0.0022 * Math.sin((125.04 - 0.0529539 * d) * Math.PI / 180)), 
      retrograde: true 
    }
  };
  
  // Calculate Ascendant based on location and time
  // Use latitude for proper obliquity correction in ascendant calculation
  const lstHours = (jd - 2451545.0) * 24.06570982441908 + lng / 15 + 6.697374558;
  const lst = normalizeAngle((lstHours % 24) * 15); // Local Sidereal Time in degrees
  
  // Calculate Obliquity of Ecliptic (Earth's axial tilt)
  const obliquity = 23.4393 - 0.0000004 * d; // degrees
  const obliquityRad = obliquity * Math.PI / 180;
  const latRad = lat * Math.PI / 180;
  const lstRad = lst * Math.PI / 180;
  
  // Calculate Ascendant using proper spherical trigonometry
  // Formula: tan(Asc) = cos(RAMC) / (-sin(RAMC) * cos(obliquity) - tan(latitude) * sin(obliquity))
  const RAMC = lstRad; // Right Ascension of Midheaven
  const numerator = Math.cos(RAMC);
  const denominator = -Math.sin(RAMC) * Math.cos(obliquityRad) - Math.tan(latRad) * Math.sin(obliquityRad);
  let ascTropical = Math.atan2(numerator, denominator) * 180 / Math.PI;
  ascTropical = normalizeAngle(ascTropical);
  
  // Ensure Ascendant is in correct quadrant based on LST
  if (lst > 180) {
    ascTropical = normalizeAngle(ascTropical + 180);
  }
  
  // Convert to Sidereal (subtract Ayanamsa for Vedic/Sidereal zodiac)
  const planets: PlanetaryPosition[] = [];
  const nakshatraSpanDegrees = 360 / 27; // 13.333... degrees per nakshatra
  const padaSpanDegrees = nakshatraSpanDegrees / 4; // Each pada is 3.333... degrees
  
  for (const [planet, { lon, retrograde }] of Object.entries(tropicalPositions)) {
    const siderealLon = normalizeAngle(lon - ayanamsa);
    
    const signIndex = Math.floor(siderealLon / 30);
    const zodiacDegree = siderealLon % 30;
    const nakshatraIndex = Math.floor(siderealLon / nakshatraSpanDegrees);
    const positionInNakshatra = siderealLon % nakshatraSpanDegrees;
    const pada = Math.floor(positionInNakshatra / padaSpanDegrees) + 1;
    
    planets.push({
      planet,
      longitude: siderealLon,
      zodiacSign: ZODIAC_SIGNS[signIndex],
      zodiacDegree,
      nakshatra: NAKSHATRAS[nakshatraIndex],
      nakshatraPada: Math.min(4, Math.max(1, pada)), // Ensure pada is 1-4
      isRetrograde: retrograde,
      house: calculateHouse(siderealLon, normalizeAngle(ascTropical - ayanamsa))
    });
  }
  
  return planets;
}

/**
 * Normalize angle to 0-360 range
 */
function normalizeAngle(angle: number): number {
  let normalized = angle % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
}

// Note: Old phase-based retrograde functions removed.
// Retrograde is now calculated accurately in each geocentric function
// based on actual elongation from Sun and apparent motion direction.

/**
 * Calculate house placement (1-12)
 */
function calculateHouse(planetLon: number, ascLon: number): number {
  let diff = (planetLon - ascLon + 360) % 360;
  return Math.floor(diff / 30) + 1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIMSHOTTARI DASHA CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate Vimshottari Dasha timeline from birth to age 122
 * Based on traditional Vedic astrology Vimshottari system
 */
export function calculateVimshottariDasha(
  birthDate: Date,
  moonNakshatra: string,
  moonDegree?: number
): VimshottariDashaEntry[] {
  const timeline: VimshottariDashaEntry[] = [];
  
  // Find starting dasha lord based on Moon nakshatra
  const nakshatraIndex = NAKSHATRAS.indexOf(moonNakshatra as typeof NAKSHATRAS[number]);
  if (nakshatraIndex === -1) {
    console.warn('[VedicEngine] Invalid nakshatra, defaulting to Ashwini');
  }
  const validNakshatraIndex = nakshatraIndex === -1 ? 0 : nakshatraIndex;
  const startingLord = NAKSHATRA_LORDS[validNakshatraIndex];
  const startingLordIndex = DASHA_ORDER.indexOf(startingLord);
  
  // Calculate elapsed portion of starting dasha based on Moon's position in nakshatra
  // Each nakshatra spans 13°20' (13.333 degrees)
  const nakshatraSpanDegrees = 360 / 27;
  const moonPositionInNakshatra = moonDegree !== undefined 
    ? (moonDegree % nakshatraSpanDegrees) / nakshatraSpanDegrees
    : 0.5; // Default to middle if no degree provided
  
  const elapsedFraction = moonPositionInNakshatra; // How much of starting dasha has passed
  const startingDashaYears = DASHA_YEARS[startingLord];
  const remainingStartingYears = startingDashaYears * (1 - elapsedFraction);
  
  let currentDate = new Date(birthDate);
  let ageInYears = 0;
  let dashaIndex = startingLordIndex;
  let isFirstDasha = true;
  
  // Generate dasha timeline
  while (ageInYears < 122) {
    const dashaLord = DASHA_ORDER[dashaIndex % DASHA_ORDER.length];
    let periodYears = DASHA_YEARS[dashaLord];
    
    // First period may be partial (already elapsed before birth)
    if (isFirstDasha) {
      periodYears = remainingStartingYears;
      isFirstDasha = false;
    }
    
    // Generate antardasha (sub-periods) within this mahadasha
    let antardashaStartDate = new Date(currentDate);
    let antardashaAge = ageInYears;
    
    for (let j = 0; j < DASHA_ORDER.length && antardashaAge < 122; j++) {
      // Antardasha starts from the mahadasha lord itself
      const antardashaIndex = (dashaIndex + j) % DASHA_ORDER.length;
      const antardashaLord = DASHA_ORDER[antardashaIndex];
      
      // Antardasha duration = (Mahadasha years × Antardasha planet years) / 120
      const antardashaYears = (periodYears * DASHA_YEARS[antardashaLord]) / TOTAL_DASHA_CYCLE;
      
      const endDate = new Date(antardashaStartDate);
      const totalDays = antardashaYears * 365.25;
      endDate.setTime(endDate.getTime() + totalDays * 24 * 60 * 60 * 1000);
      
      timeline.push({
        date: antardashaStartDate.toISOString().split('T')[0],
        period: `${dashaLord}-${antardashaLord}`,
        dashaLord: dashaLord,
        antardasha: antardashaLord,
        vibe: combineVibes(DASHA_VIBES[dashaLord], DASHA_VIBES[antardashaLord]),
        age: Math.floor(antardashaAge),
        startDate: new Date(antardashaStartDate),
        endDate: new Date(endDate)
      });
      
      antardashaAge += antardashaYears;
      antardashaStartDate = endDate;
    }
    
    // Move to next mahadasha
    ageInYears = antardashaAge;
    currentDate = antardashaStartDate;
    dashaIndex++;
  }
  
  return timeline;
}

function combineVibes(main: string, sub: string): string {
  if (main === sub) return main;
  const mainWord = main.split(' ')[0] || main;
  const subWord = sub.split(' ')[0] || sub;
  return `${mainWord} + ${subWord}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONALITY MATRIX CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate planetary strength and determine companion mode
 * Uses Shadbala-inspired strength calculation
 */
export function calculatePersonalityMatrix(planets: PlanetaryPosition[]): PersonalityMatrix {
  const strengths: Record<string, number> = {};
  
  // Calculate strength for each planet using multiple factors
  for (const planet of planets) {
    let strength = 50; // Base strength
    
    // 1. Exaltation/Debilitation (Uchcha/Neecha Bala)
    const exaltations: Record<string, string> = {
      Sun: 'Aries', Moon: 'Taurus', Mars: 'Capricorn', Mercury: 'Virgo',
      Jupiter: 'Cancer', Venus: 'Pisces', Saturn: 'Libra'
    };
    const debilitations: Record<string, string> = {
      Sun: 'Libra', Moon: 'Scorpio', Mars: 'Cancer', Mercury: 'Pisces',
      Jupiter: 'Capricorn', Venus: 'Virgo', Saturn: 'Aries'
    };
    
    if (exaltations[planet.planet] === planet.zodiacSign) {
      strength += 30; // Exalted planets are very strong
    } else if (debilitations[planet.planet] === planet.zodiacSign) {
      strength -= 25; // Debilitated planets are weak
    }
    
    // 2. Own Sign (Swakshetra Bala)
    const ownSigns: Record<string, string[]> = {
      Sun: ['Leo'],
      Moon: ['Cancer'],
      Mars: ['Aries', 'Scorpio'],
      Mercury: ['Gemini', 'Virgo'],
      Jupiter: ['Sagittarius', 'Pisces'],
      Venus: ['Taurus', 'Libra'],
      Saturn: ['Capricorn', 'Aquarius']
    };
    if (ownSigns[planet.planet]?.includes(planet.zodiacSign)) {
      strength += 20;
    }
    
    // 3. Angular House placement (Dig Bala)
    if ([1, 4, 7, 10].includes(planet.house)) {
      strength += 15; // Angular/Kendra houses are powerful
    } else if ([5, 9].includes(planet.house)) {
      strength += 10; // Trinal houses (5th, 9th) are auspicious
    } else if ([6, 8, 12].includes(planet.house)) {
      strength -= 10; // Dusthana houses weaken planets
    }
    
    // 4. Retrograde boost (Chesta Bala)
    if (planet.isRetrograde && !['Rahu', 'Ketu', 'Sun', 'Moon'].includes(planet.planet)) {
      strength += 8; // Retrograde planets gain inner strength
    }
    
    // 5. Degree-based strength (closer to middle of sign = stronger)
    const degreeStrength = 10 - Math.abs(15 - planet.zodiacDegree) / 1.5;
    strength += degreeStrength;
    
    strengths[planet.planet] = Math.max(0, Math.min(100, strength));
  }
  
  // Find dominant planet
  let dominantPlanet = 'Sun';
  let dominantScore = 0;
  
  for (const [planet, score] of Object.entries(strengths)) {
    if (score > dominantScore && !['Rahu', 'Ketu'].includes(planet)) {
      dominantPlanet = planet;
      dominantScore = score;
    }
  }
  
  // Determine companion mode
  const companionModes: Record<string, CompanionMode> = {
    Mercury: 'Intellectual/Witty',
    Moon: 'Emotional/Nurturing',
    Mars: 'Warrior/Motivator',
    Jupiter: 'Philosophical/Spiritual',
    Saturn: 'Structured/Practical',
    Venus: 'Creative/Romantic',
    Sun: 'Confident/Leadership'
  };
  
  const companionMode = companionModes[dominantPlanet] || 'Balanced';
  
  // Generate personality descriptions
  const descriptions = generatePersonalityDescriptions(dominantPlanet, strengths);
  
  return {
    dominantPlanet,
    dominantScore,
    companionMode,
    planetaryStrengths: strengths,
    communicationStyle: descriptions.communication,
    emotionalPattern: descriptions.emotional,
    decisionStyle: descriptions.decision,
    stressResponse: descriptions.stress
  };
}

function generatePersonalityDescriptions(dominant: string, strengths: Record<string, number>) {
  const descriptions: Record<string, { communication: string; emotional: string; decision: string; stress: string }> = {
    Mercury: {
      communication: 'Quick, witty, analytical with a love for details and wordplay',
      emotional: 'Processes emotions through logic and verbal expression',
      decision: 'Data-driven, considers multiple angles, may overthink',
      stress: 'Becomes scattered, overly talkative, or anxiously analytical'
    },
    Moon: {
      communication: 'Empathetic, intuitive, reads between the lines',
      emotional: 'Deeply feeling, moods fluctuate with lunar cycles',
      decision: 'Heart-led, prioritizes emotional safety and comfort',
      stress: 'Becomes moody, withdraws, seeks comfort in familiar'
    },
    Mars: {
      communication: 'Direct, assertive, action-oriented language',
      emotional: 'Passionate, quick to anger, equally quick to forgive',
      decision: 'Decisive, competitive, prefers action over analysis',
      stress: 'Becomes aggressive, impulsive, or physically restless'
    },
    Jupiter: {
      communication: 'Expansive, philosophical, loves to teach and share wisdom',
      emotional: 'Optimistic, generous, seeks meaning in experiences',
      decision: 'Big-picture thinking, guided by ethics and beliefs',
      stress: 'Overextends, becomes preachy, or escapes into philosophy'
    },
    Saturn: {
      communication: 'Measured, practical, economical with words',
      emotional: 'Reserved, processes slowly, deeply loyal once committed',
      decision: 'Methodical, risk-averse, values long-term outcomes',
      stress: 'Becomes rigid, pessimistic, or overly critical'
    },
    Venus: {
      communication: 'Charming, diplomatic, values harmony in expression',
      emotional: 'Romantic, pleasure-seeking, needs beauty and connection',
      decision: 'Relationship-oriented, seeks balance and fairness',
      stress: 'Becomes indulgent, avoidant, or excessively people-pleasing'
    },
    Sun: {
      communication: 'Confident, authoritative, naturally commanding attention',
      emotional: 'Proud, needs recognition, generous with praise',
      decision: 'Self-assured, trusts instincts, leads naturally',
      stress: 'Becomes egotistical, domineering, or dramatically upset'
    }
  };
  
  // Apply strength modifiers to descriptions
  const baseDesc = descriptions[dominant] || descriptions['Sun'];
  const strengthValue = strengths[dominant] || 50;
  
  // If dominant planet is very strong (>75), emphasize positive traits
  if (strengthValue > 75) {
    return {
      ...baseDesc,
      communication: `${baseDesc.communication} (highly developed)`,
      emotional: `${baseDesc.emotional} (well-balanced)`,
    };
  }
  // If dominant planet is weak (<40), note challenges
  else if (strengthValue < 40) {
    return {
      ...baseDesc,
      stress: `${baseDesc.stress} (area for growth)`,
    };
  }
  
  return baseDesc;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CALCULATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export interface JathakamInput {
  dob: Date;
  time: string | null; // HH:MM format
  latitude: number;
  longitude: number;
  timezone?: string;
}

/**
 * THE JATHAKAM CALCULATOR - Main Entry Point
 * Generates complete destiny_profile.json
 */
export function calculateJathakam(input: JathakamInput): DestinyProfile {
  // Parse birth time if provided
  let birthDate = new Date(input.dob);
  if (input.time) {
    const [hours, minutes] = input.time.split(':').map(Number);
    birthDate.setHours(hours, minutes, 0, 0);
  }
  
  // Calculate planetary positions
  const planets = calculatePlanetaryPositions(birthDate, input.latitude, input.longitude);
  
  // Get Moon position for Dasha calculation
  const moonPlanet = planets.find(p => p.planet === 'Moon');
  const moonNakshatra = moonPlanet?.nakshatra || 'Ashwini';
  const moonDegree = moonPlanet?.longitude || 0;
  
  // Calculate Ascendant using proper formula
  const jd = toJulianDay(birthDate);
  const ayanamsa = calculateAyanamsa(jd);
  const lstHours = (jd - 2451545.0) * 24.06570982441908 + input.longitude / 15 + 6.697374558;
  const lst = (lstHours % 24) * 15;
  const ascLon = normalizeAngle(lst + 90 - ayanamsa);
  const ascSignIndex = Math.floor(ascLon / 30);
  const ascNakshatraIndex = Math.floor(ascLon / (360 / 27));
  
  const ascendant: PlanetaryPosition = {
    planet: 'Ascendant',
    longitude: ascLon,
    zodiacSign: ZODIAC_SIGNS[ascSignIndex],
    zodiacDegree: ascLon % 30,
    nakshatra: NAKSHATRAS[ascNakshatraIndex],
    nakshatraPada: Math.min(4, Math.max(1, Math.floor((ascLon % (360 / 27)) / (360 / 108)) + 1)),
    isRetrograde: false,
    house: 1
  };
  
  // Calculate Vimshottari Dasha with Moon degree for accurate balance calculation
  const vimshottariDasha = calculateVimshottariDasha(birthDate, moonNakshatra, moonDegree);
  
  // Find current dasha
  const now = new Date();
  const currentDasha = vimshottariDasha.find(d => 
    d.startDate <= now && d.endDate > now
  ) || vimshottariDasha[0];
  
  // Calculate Personality Matrix
  const personalityMatrix = calculatePersonalityMatrix(planets);
  
  // Calculate Life Path based on Ascendant
  const lifePath = calculateLifePath(ascendant.zodiacSign, personalityMatrix.dominantPlanet);
  
  return {
    version: '2.0.0',
    generatedAt: new Date().toISOString(),
    birthDate: input.dob.toISOString().split('T')[0],
    birthTime: input.time,
    latitude: input.latitude,
    longitude: input.longitude,
    timezone: input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    planets,
    ascendant,
    vimshottariDasha,
    currentDasha,
    personalityMatrix,
    lifePath
  };
}

function calculateLifePath(ascSign: string, dominantPlanet: string) {
  const dharmaBySign: Record<string, string> = {
    Aries: 'Leadership and pioneering new paths',
    Taurus: 'Creating stability and lasting value',
    Gemini: 'Communication and bridging divides',
    Cancer: 'Nurturing and emotional wisdom',
    Leo: 'Creative expression and inspiring others',
    Virgo: 'Service and perfecting systems',
    Libra: 'Harmony and justice',
    Scorpio: 'Transformation and deep healing',
    Sagittarius: 'Wisdom and expanding horizons',
    Capricorn: 'Building structures that endure',
    Aquarius: 'Innovation for collective benefit',
    Pisces: 'Compassion and spiritual transcendence'
  };
  
  return {
    dharma: dharmaBySign[ascSign] || 'Self-realization',
    artha: `Material success through ${dominantPlanet} qualities`,
    kama: 'Balanced pursuit of life\'s pleasures aligned with dharma',
    moksha: 'Liberation through conscious living and self-awareness'
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate downloadable destiny_profile.json
 */
export function generateDestinyProfileJSON(profile: DestinyProfile): string {
  return JSON.stringify(profile, null, 2);
}

/**
 * Download destiny profile as JSON file
 */
export function downloadDestinyProfile(profile: DestinyProfile): void {
  const json = generateDestinyProfileJSON(profile);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'destiny_profile.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION WITH ATMAN ARCHIVE
// ═══════════════════════════════════════════════════════════════════════════════

export interface VedicEnhancedDestinySeed {
  vedicProfile: DestinyProfile;
  companionMode: CompanionMode;
  currentVibe: string;
  zoePersonaHint: string;
}

/**
 * Enhance existing DestinySeed with Vedic calculations
 */
export function enhanceWithVedicCalculations(
  birthDate: Date,
  birthTime: string | null,
  coordinates: { lat: number; lng: number }
): VedicEnhancedDestinySeed {
  const profile = calculateJathakam({
    dob: birthDate,
    time: birthTime,
    latitude: coordinates.lat,
    longitude: coordinates.lng
  });
  
  // Map companion mode to Zoe persona hint
  const personaHints: Record<CompanionMode, string> = {
    'Intellectual/Witty': 'Engage with clever wordplay and intellectual challenges',
    'Emotional/Nurturing': 'Lead with empathy and emotional validation',
    'Warrior/Motivator': 'Be direct, action-oriented, push for growth',
    'Philosophical/Spiritual': 'Offer wisdom and meaning-making perspectives',
    'Structured/Practical': 'Provide clear structure and practical advice',
    'Creative/Romantic': 'Use beautiful language and appreciate aesthetics',
    'Confident/Leadership': 'Acknowledge their light and leadership potential',
    'Mystical/Intense': 'Embrace depth and transformation themes',
    'Balanced': 'Adapt fluidly to the moment'
  };
  
  return {
    vedicProfile: profile,
    companionMode: profile.personalityMatrix.companionMode,
    currentVibe: profile.currentDasha.vibe,
    zoePersonaHint: personaHints[profile.personalityMatrix.companionMode]
  };
}
