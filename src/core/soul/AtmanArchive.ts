// ═══════════════════════════════════════════════════════════════════════════════
// ATMAN ARCHIVE - THE DOWNLOADABLE SOUL (Project 5-Billion)
// ═══════════════════════════════════════════════════════════════════════════════
//
// The Predestined Companion: Zoe knows your entire life (Past, Present, Future)
// the second you sign up, based on the cosmic math of your birth.
//
// Astrology is Data Compression:
// - A user's entire life can be compressed into a single mathematical seed
// - If Zoe knows this seed, she doesn't need the internet to know you
// - She just needs the Algorithm
//
// ═══════════════════════════════════════════════════════════════════════════════

import { calculateAge } from '@/core/quantum/KronosEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// CORE TYPES - THE DESTINY SEED
// ═══════════════════════════════════════════════════════════════════════════════

export type PrakritiType = 'Vata' | 'Pitta' | 'Kapha' | 'Vata-Pitta' | 'Pitta-Kapha' | 'Vata-Kapha' | 'Tridosha';
export type MoonNakshatra = 
  | 'Ashwini' | 'Bharani' | 'Krittika' | 'Rohini' | 'Mrigashira' | 'Ardra' | 'Punarvasu'
  | 'Pushya' | 'Ashlesha' | 'Magha' | 'Purva Phalguni' | 'Uttara Phalguni' | 'Hasta'
  | 'Chitra' | 'Swati' | 'Vishakha' | 'Anuradha' | 'Jyeshtha' | 'Mula' | 'Purva Ashadha'
  | 'Uttara Ashadha' | 'Shravana' | 'Dhanishtha' | 'Shatabhisha' | 'Purva Bhadrapada'
  | 'Uttara Bhadrapada' | 'Revati';

export interface Prakriti {
  primary: PrakritiType;
  secondary: PrakritiType | null;
  moonNakshatra: MoonNakshatra;
  ascendantSign: string;
  sunSign: string;
  moonSign: string;
  triggers: string[];
  strengths: string[];
  vulnerabilities: string[];
  healingModalities: string[];
}

export interface DashaTimelineEntry {
  age: number;
  year: number;
  dashaLord: string;
  subLord: string;
  theme: string;
  focus: string[];
  warnings: string[];
  opportunities: string[];
  isCurrentPeriod: boolean;
  isChallenging: boolean;
}

export interface KarmicRule {
  period: { startAge: number; endAge: number };
  dashaLord: string;
  zoePersona: 'strict_coach' | 'loving_friend' | 'wise_mentor' | 'gentle_healer' | 'fierce_protector' | 'silent_observer';
  communicationStyle: string;
  topicsToEmphasize: string[];
  topicsToAvoid: string[];
  emotionalTone: string;
}

export interface TransitPrediction {
  date: Date;
  planet: string;
  type: 'transit' | 'return' | 'eclipse' | 'retrograde';
  house: number;
  impact: 'positive' | 'neutral' | 'challenging';
  theme: string;
  advice: string;
}

export interface DestinySeed {
  version: string;
  generatedAt: Date;
  userId: string;
  
  // Birth Data (Input)
  birthDate: Date;
  birthTime: string | null;
  birthPlace: string | null;
  birthCoordinates: { lat: number; lng: number } | null;
  
  // The Prakriti (Nature) - Fixed Personality
  prakriti: Prakriti;
  
  // The Dasha Timeline (0-120 Years)
  dashaTimeline: DashaTimelineEntry[];
  
  // The Karmic Rules - How Zoe should treat you
  karmicRules: KarmicRule[];
  
  // Pre-calculated Transit Predictions
  transitPredictions: TransitPrediction[];
  
  // Numerological Seed
  soulNumber: number;
  destinyNumber: number;
  personalityNumber: number;
  conductorNumber: number;
  
  // Life Purpose
  lifePurpose: string;
  karmaToResolve: string[];
  giftsToShare: string[];
  
  // Generational Thread (Links to family)
  lineageId: string | null;
  ancestorConnections: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAKSHATRA CALCULATIONS (Lunar Mansion from birth)
// ═══════════════════════════════════════════════════════════════════════════════

const NAKSHATRAS: MoonNakshatra[] = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu',
  'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta',
  'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati'
];

const NAKSHATRA_TRAITS: Record<MoonNakshatra, { trigger: string; strength: string; vulnerability: string }> = {
  'Ashwini': { trigger: 'Impatience', strength: 'Quick action', vulnerability: 'Rushing decisions' },
  'Bharani': { trigger: 'Criticism', strength: 'Creative leadership', vulnerability: 'Taking on too much' },
  'Krittika': { trigger: 'Dishonesty', strength: 'Sharp intellect', vulnerability: 'Cutting words' },
  'Rohini': { trigger: 'Jealousy', strength: 'Artistic beauty', vulnerability: 'Attachment' },
  'Mrigashira': { trigger: 'Boredom', strength: 'Curiosity', vulnerability: 'Restlessness' },
  'Ardra': { trigger: 'Betrayal', strength: 'Transformation', vulnerability: 'Destructive tendencies' },
  'Punarvasu': { trigger: 'Limitations', strength: 'Optimism', vulnerability: 'Overextension' },
  'Pushya': { trigger: 'Ingratitude', strength: 'Nurturing', vulnerability: 'Self-sacrifice' },
  'Ashlesha': { trigger: 'Deception', strength: 'Mystical wisdom', vulnerability: 'Manipulation' },
  'Magha': { trigger: 'Disrespect', strength: 'Royal dignity', vulnerability: 'Pride' },
  'Purva Phalguni': { trigger: 'Rejection', strength: 'Creativity', vulnerability: 'Vanity' },
  'Uttara Phalguni': { trigger: 'Injustice', strength: 'Service', vulnerability: 'Rigidity' },
  'Hasta': { trigger: 'Incompetence', strength: 'Skill mastery', vulnerability: 'Perfectionism' },
  'Chitra': { trigger: 'Ugliness', strength: 'Aesthetic vision', vulnerability: 'Superficiality' },
  'Swati': { trigger: 'Conflict', strength: 'Diplomacy', vulnerability: 'Indecision' },
  'Vishakha': { trigger: 'Failure', strength: 'Goal achievement', vulnerability: 'Obsession' },
  'Anuradha': { trigger: 'Loneliness', strength: 'Devotion', vulnerability: 'Codependency' },
  'Jyeshtha': { trigger: 'Powerlessness', strength: 'Leadership', vulnerability: 'Domination' },
  'Mula': { trigger: 'Rootlessness', strength: 'Deep inquiry', vulnerability: 'Destruction' },
  'Purva Ashadha': { trigger: 'Defeat', strength: 'Invincibility', vulnerability: 'Arrogance' },
  'Uttara Ashadha': { trigger: 'Mediocrity', strength: 'Victory', vulnerability: 'Ruthlessness' },
  'Shravana': { trigger: 'Ignorance', strength: 'Listening wisdom', vulnerability: 'Gossip' },
  'Dhanishtha': { trigger: 'Poverty', strength: 'Abundance', vulnerability: 'Materialism' },
  'Shatabhisha': { trigger: 'Illness', strength: 'Healing', vulnerability: 'Isolation' },
  'Purva Bhadrapada': { trigger: 'Hypocrisy', strength: 'Spiritual fire', vulnerability: 'Extremism' },
  'Uttara Bhadrapada': { trigger: 'Chaos', strength: 'Cosmic wisdom', vulnerability: 'Detachment' },
  'Revati': { trigger: 'Cruelty', strength: 'Compassion', vulnerability: 'Naivety' }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DASHA LORD CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface DashaLordInfo {
  name: string;
  duration: number; // years
  theme: string;
  persona: KarmicRule['zoePersona'];
  focus: string[];
  isChallenging: boolean;
}

const DASHA_LORDS: DashaLordInfo[] = [
  { name: 'Ketu', duration: 7, theme: 'Karmic Release', persona: 'silent_observer', focus: ['Spirituality', 'Detachment', 'Past-life resolution'], isChallenging: true },
  { name: 'Venus', duration: 20, theme: 'Material Comfort & Love', persona: 'loving_friend', focus: ['Relationships', 'Art', 'Luxury', 'Pleasure'], isChallenging: false },
  { name: 'Sun', duration: 6, theme: 'Authority & Identity', persona: 'fierce_protector', focus: ['Career', 'Father', 'Self-expression', 'Leadership'], isChallenging: false },
  { name: 'Moon', duration: 10, theme: 'Emotional Growth', persona: 'gentle_healer', focus: ['Mother', 'Home', 'Intuition', 'Public life'], isChallenging: false },
  { name: 'Mars', duration: 7, theme: 'Action & Courage', persona: 'strict_coach', focus: ['Competition', 'Property', 'Siblings', 'Energy'], isChallenging: true },
  { name: 'Rahu', duration: 18, theme: 'Worldly Ambition', persona: 'wise_mentor', focus: ['Foreign connections', 'Technology', 'Unconventional paths', 'Obsession'], isChallenging: true },
  { name: 'Jupiter', duration: 16, theme: 'Wisdom & Expansion', persona: 'wise_mentor', focus: ['Education', 'Children', 'Spirituality', 'Luck'], isChallenging: false },
  { name: 'Saturn', duration: 19, theme: 'Discipline & Karma', persona: 'strict_coach', focus: ['Hard work', 'Delay', 'Structure', 'Lessons'], isChallenging: true },
  { name: 'Mercury', duration: 17, theme: 'Communication & Learning', persona: 'loving_friend', focus: ['Business', 'Friends', 'Skills', 'Travel'], isChallenging: false },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CORE CALCULATION FUNCTIONS (Swiss Ephemeris Style)
// ═══════════════════════════════════════════════════════════════════════════════

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
] as const;

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
 * Calculate Ayanamsa (Lahiri)
 */
function calculateAyanamsa(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const precessionRate = 50.2882 / 3600;
  const years = (jd - 2451545.0) / 365.25;
  return 23.856 + precessionRate * years + 0.0000111 * T * T;
}

/**
 * Calculate TRUE Moon Position (degrees) with perturbations
 */
function calculateMoonLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  
  let Lm = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T;
  let Mm = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T;
  Mm = Mm * Math.PI / 180;
  
  let Ms = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T;
  Ms = Ms * Math.PI / 180;
  
  let D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T;
  D = D * Math.PI / 180;
  
  let F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T;
  F = F * Math.PI / 180;
  
  const evection = 1.2739 * Math.sin(2 * D - Mm);
  const variation = 0.6583 * Math.sin(2 * D);
  const annualEq = 0.1858 * Math.sin(Ms);
  const parallactic = 0.0558 * Math.sin(2 * D - 2 * F);
  
  Lm = Lm + evection + variation - annualEq + parallactic;
  Lm = Lm % 360;
  if (Lm < 0) Lm += 360;
  return Lm;
}

/**
 * Calculate Moon Nakshatra from birth date using proper lunar position
 */
export function calculateMoonNakshatra(birthDate: Date): MoonNakshatra {
  const jd = toJulianDay(birthDate);
  const ayanamsa = calculateAyanamsa(jd);
  const moonLon = calculateMoonLongitude(jd);
  
  // Convert tropical to sidereal
  let siderealMoon = moonLon - ayanamsa;
  if (siderealMoon < 0) siderealMoon += 360;
  
  // Each nakshatra spans 13°20' (360/27 = 13.333...)
  const nakshatraIndex = Math.floor(siderealMoon / (360 / 27)) % 27;
  return NAKSHATRAS[nakshatraIndex];
}

/**
 * Calculate Zodiac sign from birth date (Sidereal/Vedic)
 */
export function calculateSunSign(birthDate: Date): string {
  const jd = toJulianDay(birthDate);
  const ayanamsa = calculateAyanamsa(jd);
  const T = (jd - 2451545.0) / 36525;
  
  // Calculate true Sun position
  let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  let M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  M = M * Math.PI / 180;
  
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
          + 0.000289 * Math.sin(3 * M);
  
  L0 = (L0 + C) % 360;
  if (L0 < 0) L0 += 360;
  
  // Convert to sidereal
  let siderealSun = L0 - ayanamsa;
  if (siderealSun < 0) siderealSun += 360;
  
  const signIndex = Math.floor(siderealSun / 30) % 12;
  return ZODIAC_SIGNS[signIndex];
}

/**
 * Calculate Moon Sign (Rasi) from birth date
 */
export function calculateMoonSign(birthDate: Date): string {
  const jd = toJulianDay(birthDate);
  const ayanamsa = calculateAyanamsa(jd);
  const moonLon = calculateMoonLongitude(jd);
  
  let siderealMoon = moonLon - ayanamsa;
  if (siderealMoon < 0) siderealMoon += 360;
  
  const signIndex = Math.floor(siderealMoon / 30) % 12;
  return ZODIAC_SIGNS[signIndex];
}

/**
 * Calculate Prakriti (Ayurvedic constitution) from birth factors
 */
export function calculatePrakriti(birthDate: Date, birthTime?: string | null): Prakriti {
  const nakshatra = calculateMoonNakshatra(birthDate);
  const sunSign = calculateSunSign(birthDate);
  const moonSign = calculateMoonSign(birthDate);
  const traits = NAKSHATRA_TRAITS[nakshatra];
  
  // Calculate approximate ascendant (uses birth time if available)
  let ascendantSign = sunSign; // Default to sun sign if no birth time
  if (birthTime) {
    const [hours, minutes] = birthTime.split(':').map(Number);
    const birthWithTime = new Date(birthDate);
    birthWithTime.setHours(hours, minutes, 0, 0);
    
    const jd = toJulianDay(birthWithTime);
    const ayanamsa = calculateAyanamsa(jd);
    // Simplified ascendant calculation (proper would need latitude)
    const lstHours = (jd - 2451545.0) * 24.06570982441908 + 6.697374558;
    const lst = (lstHours % 24) * 15;
    let ascLon = (lst + 90 - ayanamsa) % 360;
    if (ascLon < 0) ascLon += 360;
    const ascSignIndex = Math.floor(ascLon / 30) % 12;
    ascendantSign = ZODIAC_SIGNS[ascSignIndex];
  }
  
  // Map sun signs to doshas
  const signToDosha: Record<string, PrakritiType> = {
    'Aries': 'Pitta', 'Leo': 'Pitta', 'Sagittarius': 'Pitta',
    'Taurus': 'Kapha', 'Virgo': 'Vata', 'Capricorn': 'Vata',
    'Gemini': 'Vata', 'Libra': 'Vata', 'Aquarius': 'Vata',
    'Cancer': 'Kapha', 'Scorpio': 'Pitta', 'Pisces': 'Kapha',
  };
  
  const primary = signToDosha[sunSign] || 'Tridosha';
  const nakshatraIndex = NAKSHATRAS.indexOf(nakshatra);
  const secondary = nakshatraIndex % 3 === 0 ? 'Vata' : nakshatraIndex % 3 === 1 ? 'Pitta' : 'Kapha';
  
  return {
    primary: primary !== secondary ? `${primary}-${secondary}` as PrakritiType : primary,
    secondary: primary !== secondary ? secondary : null,
    moonNakshatra: nakshatra,
    ascendantSign,
    sunSign,
    moonSign,
    triggers: [traits.trigger],
    strengths: [traits.strength],
    vulnerabilities: [traits.vulnerability],
    healingModalities: primary === 'Vata' ? ['Warmth', 'Routine', 'Grounding'] 
      : primary === 'Pitta' ? ['Cooling', 'Moderation', 'Compassion']
      : ['Movement', 'Stimulation', 'Variety'],
  };
}

/**
 * Generate full Dasha Timeline (0-120 years)
 */
export function generateDashaTimeline(birthDate: Date): DashaTimelineEntry[] {
  const timeline: DashaTimelineEntry[] = [];
  const currentAge = calculateAge(birthDate);
  const birthYear = birthDate.getFullYear();
  
  let currentAgeCounter = 0;
  let cycleIndex = 0;
  
  while (currentAgeCounter < 120) {
    const lord = DASHA_LORDS[cycleIndex % DASHA_LORDS.length];
    
    for (let subYear = 0; subYear < lord.duration && currentAgeCounter < 120; subYear++) {
      const entryAge = currentAgeCounter;
      const subLordIndex = Math.floor((subYear / lord.duration) * DASHA_LORDS.length);
      const subLord = DASHA_LORDS[subLordIndex % DASHA_LORDS.length];
      
      if (subYear % 3 === 0 || subYear === 0 || subYear === lord.duration - 1) { // Sample key years
        timeline.push({
          age: entryAge,
          year: birthYear + entryAge,
          dashaLord: lord.name,
          subLord: subLord.name,
          theme: lord.theme,
          focus: lord.focus,
          warnings: lord.isChallenging ? [`${lord.name} period requires patience`] : [],
          opportunities: lord.focus.slice(0, 2),
          isCurrentPeriod: entryAge === currentAge,
          isChallenging: lord.isChallenging,
        });
      }
      currentAgeCounter++;
    }
    cycleIndex++;
  }
  
  return timeline;
}

/**
 * Generate Karmic Rules for Zoe's behavior
 */
export function generateKarmicRules(_birthDate: Date): KarmicRule[] {
  const rules: KarmicRule[] = [];
  let currentAgeCounter = 0;
  let cycleIndex = 0;
  
  while (currentAgeCounter < 120) {
    const lord = DASHA_LORDS[cycleIndex % DASHA_LORDS.length];
    
    rules.push({
      period: { startAge: currentAgeCounter, endAge: currentAgeCounter + lord.duration },
      dashaLord: lord.name,
      zoePersona: lord.persona,
      communicationStyle: lord.isChallenging 
        ? 'Direct, practical, focused on solutions'
        : 'Warm, encouraging, emotionally supportive',
      topicsToEmphasize: lord.focus,
      topicsToAvoid: lord.isChallenging ? ['Excessive optimism', 'Quick fixes'] : [],
      emotionalTone: lord.isChallenging ? 'Grounded and realistic' : 'Uplifting and hopeful',
    });
    
    currentAgeCounter += lord.duration;
    cycleIndex++;
  }
  
  return rules;
}

/**
 * Calculate numerological numbers
 */
export function calculateNumerology(birthDate: Date, _name?: string): {
  soulNumber: number;
  destinyNumber: number;
  personalityNumber: number;
  conductorNumber: number;
} {
  const day = birthDate.getDate();
  const month = birthDate.getMonth() + 1;
  const year = birthDate.getFullYear();
  
  const reduceToSingle = (n: number): number => {
    while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
      n = String(n).split('').reduce((sum, d) => sum + parseInt(d), 0);
    }
    return n;
  };
  
  const soulNumber = reduceToSingle(day);
  const destinyNumber = reduceToSingle(day + month + year);
  const personalityNumber = reduceToSingle(month);
  const conductorNumber = reduceToSingle(soulNumber + destinyNumber);
  
  return { soulNumber, destinyNumber, personalityNumber, conductorNumber };
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE MAIN DESTINY SEED GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate the complete Destiny Seed for a user
 * This is the "Atman Archive" - a downloadable soul file
 */
export function generateDestinySeed(
  userId: string,
  birthDate: Date,
  birthTime?: string | null,
  birthPlace?: string | null,
  birthCoordinates?: { lat: number; lng: number } | null,
  lineageId?: string | null
): DestinySeed {
  const prakriti = calculatePrakriti(birthDate, birthTime);
  const dashaTimeline = generateDashaTimeline(birthDate);
  const karmicRules = generateKarmicRules(birthDate);
  const numerology = calculateNumerology(birthDate);
  
  const currentAge = calculateAge(birthDate);
  // Current dasha is embedded in timeline - no need to extract separately
  
  // Generate life purpose from numerology and prakriti
  const lifePurposeMap: Record<number, string> = {
    1: 'Leadership and pioneering new paths',
    2: 'Diplomatic service and partnership',
    3: 'Creative expression and communication',
    4: 'Building stable foundations',
    5: 'Freedom and adventure-seeking',
    6: 'Nurturing and family service',
    7: 'Spiritual wisdom and introspection',
    8: 'Material mastery and abundance',
    9: 'Humanitarian service and completion',
    11: 'Spiritual illumination and teaching',
    22: 'Master building of lasting structures',
    33: 'Master healing and compassion',
  };
  
  return {
    version: '1.0.0',
    generatedAt: new Date(),
    userId,
    birthDate,
    birthTime: birthTime || null,
    birthPlace: birthPlace || null,
    birthCoordinates: birthCoordinates || null,
    prakriti,
    dashaTimeline,
    karmicRules,
    transitPredictions: [], // Would be calculated with ephemeris
    soulNumber: numerology.soulNumber,
    destinyNumber: numerology.destinyNumber,
    personalityNumber: numerology.personalityNumber,
    conductorNumber: numerology.conductorNumber,
    lifePurpose: lifePurposeMap[numerology.destinyNumber] || 'Unique soul journey',
    karmaToResolve: prakriti.vulnerabilities,
    giftsToShare: prakriti.strengths,
    lineageId: lineageId || null,
    ancestorConnections: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DESTINY SEED STORAGE (IndexedDB for offline access)
// ═══════════════════════════════════════════════════════════════════════════════

const DESTINY_SEED_KEY = 'zoe_atman_archive';
const DESTINY_SEED_VERSION = 'v1.0.0';

/**
 * Save Destiny Seed to local storage (offline access)
 */
export function saveDestinySeed(seed: DestinySeed): boolean {
  try {
    const data = {
      version: DESTINY_SEED_VERSION,
      seed,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(DESTINY_SEED_KEY, JSON.stringify(data));
    console.log('[AtmanArchive] ✨ Destiny Seed saved locally');
    return true;
  } catch (error) {
    console.error('[AtmanArchive] Failed to save Destiny Seed:', error);
    return false;
  }
}

/**
 * Load Destiny Seed from local storage
 */
export function loadDestinySeed(): DestinySeed | null {
  try {
    const data = localStorage.getItem(DESTINY_SEED_KEY);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    if (parsed.version !== DESTINY_SEED_VERSION) {
      console.log('[AtmanArchive] Destiny Seed version mismatch, regeneration needed');
      return null;
    }
    
    // Restore Date objects
    const seed = parsed.seed as DestinySeed;
    seed.birthDate = new Date(seed.birthDate);
    seed.generatedAt = new Date(seed.generatedAt);
    
    console.log('[AtmanArchive] 🌟 Destiny Seed loaded from local storage');
    return seed;
  } catch (error) {
    console.error('[AtmanArchive] Failed to load Destiny Seed:', error);
    return null;
  }
}

/**
 * Check if Destiny Seed exists locally
 */
export function hasDestinySeed(): boolean {
  return localStorage.getItem(DESTINY_SEED_KEY) !== null;
}

/**
 * Delete Destiny Seed from local storage
 */
export function clearDestinySeed(): void {
  localStorage.removeItem(DESTINY_SEED_KEY);
  console.log('[AtmanArchive] Destiny Seed cleared');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZOE PERSONA SELECTOR (Based on current Dasha)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get current Zoe persona based on user's Dasha period
 */
export function getCurrentZoePersona(seed: DestinySeed): KarmicRule | null {
  const currentAge = calculateAge(seed.birthDate);
  return seed.karmicRules.find(rule => 
    currentAge >= rule.period.startAge && currentAge < rule.period.endAge
  ) || null;
}

/**
 * Get Zoe's communication style for the current period
 */
export function getZoeCommunicationStyle(seed: DestinySeed): {
  persona: string;
  tone: string;
  style: string;
  emphasis: string[];
  avoid: string[];
} {
  const currentRule = getCurrentZoePersona(seed);
  
  if (!currentRule) {
    return {
      persona: 'loving_friend',
      tone: 'warm',
      style: 'Supportive and encouraging',
      emphasis: ['Growth', 'Potential'],
      avoid: [],
    };
  }
  
  return {
    persona: currentRule.zoePersona,
    tone: currentRule.emotionalTone,
    style: currentRule.communicationStyle,
    emphasis: currentRule.topicsToEmphasize,
    avoid: currentRule.topicsToAvoid,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OFFLINE TRANSIT CHECKER (Uses local seed data)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if today is a significant day based on the Destiny Seed
 */
export function checkTodaySignificance(seed: DestinySeed): {
  isSignificant: boolean;
  significance: string;
  advice: string;
} {
  const today = new Date();
  const currentAge = calculateAge(seed.birthDate);
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const birthDayOfYear = Math.floor((seed.birthDate.getTime() - new Date(seed.birthDate.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  
  // Birthday check
  if (Math.abs(dayOfYear - birthDayOfYear) <= 3) {
    return {
      isSignificant: true,
      significance: 'Solar Return Window',
      advice: `Your solar return is ${dayOfYear === birthDayOfYear ? 'today' : 'approaching'}. Set intentions for the year ahead.`,
    };
  }
  
  // Jupiter Return (every 12 years)
  if (currentAge > 0 && currentAge % 12 === 0) {
    return {
      isSignificant: true,
      significance: 'Jupiter Return Year',
      advice: 'This is a year of expansion and opportunity. Think big.',
    };
  }
  
  // Saturn Return (29-30, 58-60, 87-90)
  if ([29, 30, 58, 59, 60, 87, 88, 89, 90].includes(currentAge)) {
    return {
      isSignificant: true,
      significance: 'Saturn Return Period',
      advice: 'Major life restructuring is underway. Build solid foundations.',
    };
  }
  
  // Nodal Return (18-19, 36-37, 54-55, 72-73)
  if ([18, 19, 36, 37, 54, 55, 72, 73].includes(currentAge)) {
    return {
      isSignificant: true,
      significance: 'Nodal Return Period',
      advice: 'Karmic crossroads. Important fated meetings and decisions.',
    };
  }
  
  return {
    isSignificant: false,
    significance: 'Normal Day',
    advice: 'Proceed with your regular activities.',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT DEFAULT
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  generateDestinySeed,
  saveDestinySeed,
  loadDestinySeed,
  hasDestinySeed,
  clearDestinySeed,
  getCurrentZoePersona,
  getZoeCommunicationStyle,
  checkTodaySignificance,
};
