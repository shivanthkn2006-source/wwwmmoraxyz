/**
 * VEDIC COMPUTATION ENGINE - "Karma Code" Logic
 * Swiss Ephemeris-style calculations for Sidereal Zodiac
 * 
 * Features:
 * - Lagna (Ascendant) calculation
 * - Rashi (Moon Sign) determination
 * - Nakshatra computation
 * - Numerology: Psychic & Destiny Numbers
 * - Planetary strength analysis
 * 
 * Part of Zoe Infinity DHF Core - Standalone System
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// ═══════════════════════════════════════════════════════════════════
// VEDIC ZODIAC CONSTANTS
// ═══════════════════════════════════════════════════════════════════
const RASHIS = [
  { name: 'Mesha', english: 'Aries', lord: 'Mars', element: 'fire', symbol: '♈' },
  { name: 'Vrishabha', english: 'Taurus', lord: 'Venus', element: 'earth', symbol: '♉' },
  { name: 'Mithuna', english: 'Gemini', lord: 'Mercury', element: 'air', symbol: '♊' },
  { name: 'Karka', english: 'Cancer', lord: 'Moon', element: 'water', symbol: '♋' },
  { name: 'Simha', english: 'Leo', lord: 'Sun', element: 'fire', symbol: '♌' },
  { name: 'Kanya', english: 'Virgo', lord: 'Mercury', element: 'earth', symbol: '♍' },
  { name: 'Tula', english: 'Libra', lord: 'Venus', element: 'air', symbol: '♎' },
  { name: 'Vrishchika', english: 'Scorpio', lord: 'Mars', element: 'water', symbol: '♏' },
  { name: 'Dhanu', english: 'Sagittarius', lord: 'Jupiter', element: 'fire', symbol: '♐' },
  { name: 'Makara', english: 'Capricorn', lord: 'Saturn', element: 'earth', symbol: '♑' },
  { name: 'Kumbha', english: 'Aquarius', lord: 'Saturn', element: 'air', symbol: '♒' },
  { name: 'Meena', english: 'Pisces', lord: 'Jupiter', element: 'water', symbol: '♓' }
];

const NAKSHATRAS = [
  { name: 'Ashwini', lord: 'Ketu', deity: 'Ashwini Kumaras', symbol: '🐎' },
  { name: 'Bharani', lord: 'Venus', deity: 'Yama', symbol: '🔻' },
  { name: 'Krittika', lord: 'Sun', deity: 'Agni', symbol: '🔥' },
  { name: 'Rohini', lord: 'Moon', deity: 'Brahma', symbol: '🐂' },
  { name: 'Mrigashira', lord: 'Mars', deity: 'Soma', symbol: '🦌' },
  { name: 'Ardra', lord: 'Rahu', deity: 'Rudra', symbol: '💧' },
  { name: 'Punarvasu', lord: 'Jupiter', deity: 'Aditi', symbol: '🏹' },
  { name: 'Pushya', lord: 'Saturn', deity: 'Brihaspati', symbol: '🌸' },
  { name: 'Ashlesha', lord: 'Mercury', deity: 'Nagas', symbol: '🐍' },
  { name: 'Magha', lord: 'Ketu', deity: 'Pitris', symbol: '👑' },
  { name: 'Purva Phalguni', lord: 'Venus', deity: 'Bhaga', symbol: '🛏️' },
  { name: 'Uttara Phalguni', lord: 'Sun', deity: 'Aryaman', symbol: '☀️' },
  { name: 'Hasta', lord: 'Moon', deity: 'Savitar', symbol: '✋' },
  { name: 'Chitra', lord: 'Mars', deity: 'Vishwakarma', symbol: '💎' },
  { name: 'Swati', lord: 'Rahu', deity: 'Vayu', symbol: '🌬️' },
  { name: 'Vishakha', lord: 'Jupiter', deity: 'Indra-Agni', symbol: '⚡' },
  { name: 'Anuradha', lord: 'Saturn', deity: 'Mitra', symbol: '🪷' },
  { name: 'Jyeshtha', lord: 'Mercury', deity: 'Indra', symbol: '☂️' },
  { name: 'Mula', lord: 'Ketu', deity: 'Nirrti', symbol: '🦁' },
  { name: 'Purva Ashadha', lord: 'Venus', deity: 'Apas', symbol: '🌊' },
  { name: 'Uttara Ashadha', lord: 'Sun', deity: 'Vishve Devas', symbol: '🐘' },
  { name: 'Shravana', lord: 'Moon', deity: 'Vishnu', symbol: '👂' },
  { name: 'Dhanishta', lord: 'Mars', deity: 'Vasus', symbol: '🥁' },
  { name: 'Shatabhisha', lord: 'Rahu', deity: 'Varuna', symbol: '⭕' },
  { name: 'Purva Bhadrapada', lord: 'Jupiter', deity: 'Aja Ekapada', symbol: '⚔️' },
  { name: 'Uttara Bhadrapada', lord: 'Saturn', deity: 'Ahir Budhnya', symbol: '🐍' },
  { name: 'Revati', lord: 'Mercury', deity: 'Pushan', symbol: '🐟' }
];

const PLANETS = [
  { name: 'Sun', sanskrit: 'सूर्य', careers: ['CEO', 'Government', 'Politics', 'Medicine'] },
  { name: 'Moon', sanskrit: 'चंद्र', careers: ['Nursing', 'Psychology', 'Hospitality', 'Arts'] },
  { name: 'Mars', sanskrit: 'मंगल', careers: ['Military', 'Engineering', 'Surgery', 'Sports'] },
  { name: 'Mercury', sanskrit: 'बुध', careers: ['Business', 'Writing', 'Trading', 'Programming'] },
  { name: 'Jupiter', sanskrit: 'गुरु', careers: ['Teaching', 'Law', 'Finance', 'Consulting'] },
  { name: 'Venus', sanskrit: 'शुक्र', careers: ['Arts', 'Fashion', 'Luxury', 'Entertainment'] },
  { name: 'Saturn', sanskrit: 'शनि', careers: ['Architecture', 'Mining', 'Agriculture', 'Research'] },
  { name: 'Rahu', sanskrit: 'राहु', careers: ['Technology', 'Aviation', 'Occult', 'Foreign'] },
  { name: 'Ketu', sanskrit: 'केतु', careers: ['Spirituality', 'Healing', 'Research', 'Astrology'] }
];

// ═══════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════
export interface VedicChart {
  lagna: typeof RASHIS[0];
  lagnaIndex: number;
  moonSign: typeof RASHIS[0];
  moonSignIndex: number;
  nakshatra: typeof NAKSHATRAS[0];
  nakshatraIndex: number;
  nakshatraPada: number;
  sunSign: typeof RASHIS[0];
  psychicNumber: number;
  destinyNumber: number;
  nameNumber: number;
  strongestPlanet: typeof PLANETS[0];
  planetaryStrengths: { planet: typeof PLANETS[0]; strength: number }[];
}

export interface CareerPath {
  title: string;
  reason: string;
  compatibility: number;
}

export interface DivineDecree {
  cosmicId: string;
  ultimateProfession: string;
  secondaryProfession: string;
  topCareerPaths: CareerPath[];
  sunSignMeaning: string;
  moonSignMeaning: string;
  nakshatraCriticalKey: string;
  numerologyClash: string;
  soulPurpose: string;
  dharmaPath: string;
  karmicDebt: string;
  actionPlan: string;
  warningNote: string;
  auspiciousAge: number[];
  gemstone: string;
  mantra: string;
  deity: string;
  luckyColors: string[];
  luckyNumbers: number[];
}

export interface VedicComputationResult {
  chart: VedicChart;
  decree: DivineDecree;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════
// HOOK: useVedicComputation
// ═══════════════════════════════════════════════════════════════════
export const useVedicComputation = () => {
  const { user } = useAuth();
  const [isComputing, setIsComputing] = useState(false);
  const [result, setResult] = useState<VedicComputationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════
  // NUMEROLOGY CALCULATIONS
  // ═══════════════════════════════════════════════════════════════════
  const calculatePsychicNumber = (day: number): number => {
    let sum = day;
    while (sum > 9) {
      sum = String(sum).split('').reduce((a, b) => a + parseInt(b), 0);
    }
    return sum;
  };

  const calculateDestinyNumber = (date: Date): number => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    let sum = day + month + year;
    while (sum > 9) {
      sum = String(sum).split('').reduce((a, b) => a + parseInt(b), 0);
    }
    return sum;
  };

  const calculateNameNumber = (name: string): number => {
    const letterValues: Record<string, number> = {
      a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9,
      j: 1, k: 2, l: 3, m: 4, n: 5, o: 6, p: 7, q: 8, r: 9,
      s: 1, t: 2, u: 3, v: 4, w: 5, x: 6, y: 7, z: 8
    };
    let sum = name.toLowerCase().split('').reduce((acc, char) => {
      return acc + (letterValues[char] || 0);
    }, 0);
    while (sum > 9) {
      sum = String(sum).split('').reduce((a, b) => a + parseInt(b), 0);
    }
    return sum;
  };

  // ═══════════════════════════════════════════════════════════════════
  // PROTOCOL VARAHAMIHIRA - CORRECTED SIDEREAL CALCULATIONS
  // ═══════════════════════════════════════════════════════════════════
  
  // Default timezone offset (India Standard Time = UTC + 5:30)
  const DEFAULT_TIMEZONE = 5.5;
  
  // Convert local time to UTC for astronomical calculations
  // Accepts "HH:MM" (24-hour) from <input type="time"> and also tolerant formats like "08:20 PM".
  // Now supports custom timezone offset for worldwide support
  const convertLocalToUTC = (date: Date, timeStr?: string, timezoneOffset?: number): { utcDate: Date; utcHours: number } => {
    const tz = timezoneOffset ?? DEFAULT_TIMEZONE;
    
    const parseTimeTo24h = (raw?: string): { h: number; m: number } => {
      if (!raw) return { h: 12, m: 0 };

      const s = raw.trim().toLowerCase();
      const match = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
      if (!match) {
        // Best-effort fallback: split "HH:MM" and ignore any suffix.
        const parts = s.split(':');
        const h = Math.min(23, Math.max(0, parseInt(parts[0] || '12', 10) || 12));
        const m = Math.min(59, Math.max(0, parseInt((parts[1] || '0').replace(/\D/g, ''), 10) || 0));
        return { h, m };
      }

      let h = parseInt(match[1], 10);
      const m = parseInt(match[2] ?? '0', 10);
      const suffix = match[3];

      if (suffix) {
        // 12-hour → 24-hour
        h = h % 12;
        if (suffix.toLowerCase() === 'pm') h += 12;
      }

      // Clamp
      return {
        h: Math.min(23, Math.max(0, h)),
        m: Math.min(59, Math.max(0, m)),
      };
    };

    const { h, m } = parseTimeTo24h(timeStr);
    const localDecimalHours = h + m / 60;

    // Subtract timezone offset to get UTC
    let utcDecimalHours = localDecimalHours - tz;
    let dayOffset = 0;

    if (utcDecimalHours < 0) {
      utcDecimalHours += 24;
      dayOffset = -1;
    } else if (utcDecimalHours >= 24) {
      utcDecimalHours -= 24;
      dayOffset = 1;
    }

    // IMPORTANT: treat the provided Date as a calendar date (not a timestamp).
    const utcDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    utcDate.setDate(utcDate.getDate() + dayOffset);

    return { utcDate, utcHours: utcDecimalHours };
  };
  
  // Legacy function for backwards compatibility (uses IST)
  const convertISTtoUTC = (date: Date, timeStr?: string): { utcDate: Date; utcHours: number } => {
    return convertLocalToUTC(date, timeStr, DEFAULT_TIMEZONE);
  };

  // Calculate Julian Day with proper timezone handling
  const calculateJulianDay = (date: Date, utcHours: number): number => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + 
                Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    return jdn + (utcHours - 12) / 24;
  };

  // Lahiri Ayanamsa calculation (standard Vedic system)
  const calculateLahiriAyanamsa = (jd: number): number => {
    const T = (jd - 2451545.0) / 36525;
    // Lahiri Ayanamsa formula (more accurate)
    const ayanamsa = 23.85 + (50.29 / 3600) * ((jd - 2451545.0) / 365.25);
    return ayanamsa;
  };

  const calculateSiderealPosition = (date: Date, timeStr?: string, tz?: number): number => {
    const { utcDate, utcHours } = convertLocalToUTC(date, timeStr, tz);
    const jd = calculateJulianDay(utcDate, utcHours);
    
    // Tropical longitude (solar position)
    const T = (jd - 2451545.0) / 36525;
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    const Mrad = M * Math.PI / 180;
    const C = (1.914602 - 0.004817 * T) * Math.sin(Mrad) +
              (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
              0.00029 * Math.sin(3 * Mrad);
    let tropicalLongitude = (L0 + C) % 360;
    if (tropicalLongitude < 0) tropicalLongitude += 360;

    // Apply Lahiri Ayanamsa for Sidereal conversion
    const ayanamsa = calculateLahiriAyanamsa(jd);
    let siderealLongitude = (tropicalLongitude - ayanamsa) % 360;
    if (siderealLongitude < 0) siderealLongitude += 360;

    return siderealLongitude;
  };

  // Corrected Lagna calculation using Local Sidereal Time
  const calculateLagna = (date: Date, timeStr?: string, latitude?: number, longitude?: number, tz?: number): number => {
    const { utcDate, utcHours } = convertLocalToUTC(date, timeStr, tz);
    const jd = calculateJulianDay(utcDate, utcHours);
    
    // Default to Trivandrum coordinates if not provided
    const lat = latitude || 8.5241;  // Trivandrum latitude
    const lng = longitude || 76.9366; // Trivandrum longitude
    
    // Calculate Greenwich Sidereal Time
    const T = (jd - 2451545.0) / 36525;
    let GST = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 
              0.000387933 * T * T - T * T * T / 38710000;
    GST = GST % 360;
    if (GST < 0) GST += 360;
    
    // Local Sidereal Time (add longitude correction)
    let LST = (GST + lng) % 360;
    if (LST < 0) LST += 360;
    
    // RAMC (Right Ascension of Midheaven) = LST
    const RAMC = LST * Math.PI / 180;
    
    // Obliquity of ecliptic
    const epsilon = (23.4393 - 0.013 * T) * Math.PI / 180;
    
    // Calculate Ascendant (Lagna) using spherical trigonometry
    const latRad = lat * Math.PI / 180;
    
    // Simplified ascendant formula
    let ascendant = Math.atan2(
      Math.cos(RAMC),
      -(Math.sin(RAMC) * Math.cos(epsilon) + Math.tan(latRad) * Math.sin(epsilon))
    ) * 180 / Math.PI;
    
    if (ascendant < 0) ascendant += 360;
    
    // Apply Lahiri Ayanamsa
    const ayanamsa = calculateLahiriAyanamsa(jd);
    let siderealLagna = (ascendant - ayanamsa) % 360;
    if (siderealLagna < 0) siderealLagna += 360;
    
    return siderealLagna;
  };

  // Corrected Moon position using proper ephemeris
  const calculateMoonPosition = (date: Date, timeStr?: string, tz?: number): number => {
    const { utcDate, utcHours } = convertLocalToUTC(date, timeStr, tz);
    const jd = calculateJulianDay(utcDate, utcHours);
    
    const T = (jd - 2451545.0) / 36525;
    
    // Moon's mean longitude
    const Lm = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T;
    
    // Moon's mean anomaly
    const Mm = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T;
    
    // Moon's argument of latitude
    const F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T;
    
    // Sun's mean anomaly
    const Ms = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T;
    
    // Moon's mean elongation from Sun
    const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T;
    
    const MmRad = Mm * Math.PI / 180;
    const MsRad = Ms * Math.PI / 180;
    const DRad = D * Math.PI / 180;
    const FRad = F * Math.PI / 180;
    
    // Principal periodic terms for longitude
    let moonLong = Lm 
      + 6.288774 * Math.sin(MmRad)
      + 1.274027 * Math.sin(2 * DRad - MmRad)
      + 0.658314 * Math.sin(2 * DRad)
      + 0.213618 * Math.sin(2 * MmRad)
      - 0.185116 * Math.sin(MsRad)
      - 0.114332 * Math.sin(2 * FRad);
    
    moonLong = moonLong % 360;
    if (moonLong < 0) moonLong += 360;
    
    // Apply Lahiri Ayanamsa for Sidereal Moon position
    const ayanamsa = calculateLahiriAyanamsa(jd);
    let siderealMoon = (moonLong - ayanamsa) % 360;
    if (siderealMoon < 0) siderealMoon += 360;
    
    return siderealMoon;
  };

  // ═══════════════════════════════════════════════════════════════════
  // PLANETARY STRENGTH ANALYSIS
  // ═══════════════════════════════════════════════════════════════════
  const calculatePlanetaryStrengths = (
    psychicNum: number,
    destinyNum: number,
    lagnaIndex: number,
    moonIndex: number
  ): { planet: typeof PLANETS[0]; strength: number }[] => {
    const strengths: { planet: typeof PLANETS[0]; strength: number }[] = [];
    
    const planetNumMap: Record<number, number> = {
      1: 0, // Sun
      2: 1, // Moon
      3: 4, // Jupiter
      4: 7, // Rahu
      5: 3, // Mercury
      6: 5, // Venus
      7: 8, // Ketu
      8: 6, // Saturn
      9: 2  // Mars
    };

    PLANETS.forEach((planet, idx) => {
      let strength = 50;
      
      // Psychic number influence
      if (planetNumMap[psychicNum] === idx) strength += 20;
      
      // Destiny number influence
      if (planetNumMap[destinyNum] === idx) strength += 15;
      
      // Lagna lord boost
      const lagnaLord = RASHIS[lagnaIndex].lord;
      if (planet.name === lagnaLord) strength += 25;
      
      // Moon sign lord boost
      const moonLord = RASHIS[moonIndex].lord;
      if (planet.name === moonLord) strength += 20;
      
      // Element compatibility
      const lagnaElement = RASHIS[lagnaIndex].element;
      if (
        (planet.name === 'Mars' || planet.name === 'Sun') && lagnaElement === 'fire' ||
        (planet.name === 'Venus' || planet.name === 'Saturn') && lagnaElement === 'earth' ||
        (planet.name === 'Mercury' || planet.name === 'Rahu') && lagnaElement === 'air' ||
        (planet.name === 'Moon' || planet.name === 'Jupiter') && lagnaElement === 'water'
      ) {
        strength += 10;
      }
      
      strengths.push({ planet, strength: Math.min(100, strength) });
    });

    return strengths.sort((a, b) => b.strength - a.strength);
  };

  // ═══════════════════════════════════════════════════════════════════
  // DIVINE DECREE SYNTHESIS (Enhanced Gemini-style output)
  // ═══════════════════════════════════════════════════════════════════
  const synthesizeDivineDecree = (chart: VedicChart, name: string): DivineDecree => {
    const strongest = chart.strongestPlanet;
    const second = chart.planetaryStrengths[1]?.planet;
    const third = chart.planetaryStrengths[2]?.planet;

    // Sun Sign Meanings
    const sunMeanings: Record<string, string> = {
      Aries: 'Born to Lead. High energy, pioneering spirit. Not a follower; an initiator.',
      Taurus: 'Born for Stability. Grounded determination, artistic sensibilities, material wisdom.',
      Gemini: 'Born to Communicate. Quick mind, versatile talents, intellectual curiosity.',
      Cancer: 'Born to Nurture. Deep emotional intelligence, protective instincts, creative soul.',
      Leo: 'Born to Shine. Natural authority, creative fire, magnetic charisma.',
      Virgo: 'Born to Perfect. Analytical precision, service-oriented, healing abilities.',
      Libra: 'Born for Harmony. Diplomatic grace, aesthetic vision, partnership-oriented.',
      Scorpio: 'Born to Transform. Intense focus, investigative mind, regenerative power.',
      Sagittarius: 'Born to Explore. Philosophical wisdom, expansive vision, teaching abilities.',
      Capricorn: 'Born to Build. Strategic mastery, ambitious discipline, legacy-focused.',
      Aquarius: 'Born to Innovate. Visionary thinking, humanitarian ideals, technological affinity.',
      Pisces: 'Born to Dream. Intuitive depths, artistic soul, spiritual connection.'
    };

    // Moon Sign Meanings
    const moonMeanings: Record<string, string> = {
      Aries: 'Mind seeks Action and Independence. Quick decisions, competitive spirit.',
      Taurus: 'Mind seeks Comfort and Security. Steady emotions, appreciation for beauty.',
      Gemini: 'Mind seeks Knowledge and Variety. Curious, adaptable, communicative.',
      Cancer: 'Mind seeks Emotional Connection. Nurturing, intuitive, memory-focused.',
      Leo: 'Mind seeks Recognition and Creativity. Generous heart, dramatic flair.',
      Virgo: 'Mind seeks Order and Improvement. Detail-oriented, health-conscious.',
      Libra: 'Mind seeks Balance, Beauty, and Diplomacy. Natural eye for aesthetics and design.',
      Scorpio: 'Mind seeks Depth and Transformation. Intense focus, psychological insight.',
      Sagittarius: 'Mind seeks Truth and Expansion. Optimistic, philosophical, adventurous.',
      Capricorn: 'Mind seeks Achievement and Structure. Disciplined, responsible, ambitious.',
      Aquarius: 'Mind seeks Freedom and Innovation. Original thinking, humanitarian concerns.',
      Pisces: 'Mind seeks Transcendence and Connection. Empathic, imaginative, spiritual.'
    };

    // Nakshatra Critical Keys
    const nakshatraKeys: Record<string, string> = {
      Ashwini: 'The Healers - Quick action, medical/healing abilities, pioneering energy.',
      Bharani: 'The Bearer of Life - Transformation, creative destruction, fertility of ideas.',
      Krittika: 'The Cutter - Sharp intellect, purification, military/surgical precision.',
      Rohini: 'The Red One - Artistic beauty, material success, creative growth.',
      Mrigashira: 'The Deer - Searching nature, research abilities, restless curiosity.',
      Ardra: 'The Moist One - Storms of transformation, intellectual brilliance, technology.',
      Punarvasu: 'Return of the Light - Renewal, teaching, philosophical wisdom.',
      Pushya: 'The Nourisher - Peak auspiciousness, nurturing leadership, spiritual authority.',
      Ashlesha: 'The Embracer - Mystical insight, hypnotic charm, serpent wisdom.',
      Magha: 'The Great One - Royal ancestry, leadership, ancestral connections.',
      'Purva Phalguni': 'The Former Red One - Creativity, luxury, romantic arts.',
      'Uttara Phalguni': 'The Latter Red One - Service, philanthropy, organizational ability.',
      Hasta: 'The Hand - Craftsmanship, healing hands, manual dexterity.',
      Chitra: 'The Pearl - Ruled by Vishwakarma (Celestial Architect of the Gods). Star of Designers, Architects, and Builders. Obsession with structure, form, and perfection.',
      Swati: 'The Sword - Independence, business acumen, diplomatic skills.',
      Vishakha: 'The Forked One - Goal-focused, transformative power, determination.',
      Anuradha: 'Following Radha - Devotion, organizational leadership, friendships.',
      Jyeshtha: 'The Eldest - Protective authority, occult knowledge, senior positions.',
      Mula: 'The Root - Investigation, research, getting to the bottom of things.',
      'Purva Ashadha': 'The Former Invincible - Invincibility, philosophical truth, purification.',
      'Uttara Ashadha': 'The Latter Invincible - Final victory, universal leadership, righteousness.',
      Shravana: 'The Ear - Listening, learning, connection, communication mastery.',
      Dhanishta: 'The Wealthiest - Rhythm, music, collective success, adaptability.',
      Shatabhisha: 'Hundred Physicians - Healing, mysticism, hidden knowledge, technology.',
      'Purva Bhadrapada': 'Former Lucky Feet - Transformation, mystical fire, intense dedication.',
      'Uttara Bhadrapada': 'Latter Lucky Feet - Wisdom, cosmic understanding, spiritual depth.',
      Revati: 'The Wealthy - Safe journeys, protection, artistic/musical gifts.'
    };

    // Generate Cosmic ID
    const cosmicIds: Record<string, string> = {
      Sun: 'The Solar Commander',
      Moon: 'The Lunar Empath',
      Mars: 'The Warrior Architect',
      Mercury: 'The Digital Alchemist',
      Jupiter: 'The Wisdom Keeper',
      Venus: 'The Creative Commander',
      Saturn: 'The Master Builder',
      Rahu: 'The Quantum Pioneer',
      Ketu: 'The Mystic Sage'
    };

    // Generate Numerology Clash interpretation
    const psychicPlanet = ['', 'Sun', 'Moon', 'Jupiter', 'Rahu', 'Mercury', 'Venus', 'Ketu', 'Saturn', 'Mars'][chart.psychicNumber];
    const destinyPlanet = ['', 'Sun', 'Moon', 'Jupiter', 'Rahu', 'Mercury', 'Venus', 'Ketu', 'Saturn', 'Mars'][chart.destinyNumber];
    
    const clashDescription = chart.sunSign.element === 'fire' && chart.destinyNumber === 6 
      ? `High Energy (${chart.sunSign.english}) + High Art (Venus ${chart.destinyNumber}) = "Technological Art"`
      : `${psychicPlanet} intuition (${chart.psychicNumber}) + ${destinyPlanet} destiny (${chart.destinyNumber}) = "${chart.sunSign.element === 'fire' ? 'Dynamic Leadership' : chart.sunSign.element === 'earth' ? 'Practical Mastery' : chart.sunSign.element === 'air' ? 'Intellectual Innovation' : 'Creative Flow'}"`;

    // Generate Top 3 Career Paths with reasons
    const careerPaths: CareerPath[] = [];
    
    // Primary career based on strongest planet + nakshatra
    const primaryTitle = chart.nakshatra.name === 'Chitra' 
      ? 'UI/UX Architect / Spatial Designer'
      : `${strongest.careers[0]} / ${strongest.careers[1]}`;
    const primaryReason = chart.nakshatra.name === 'Chitra'
      ? `${chart.nakshatra.name} energy (Architecture) meets ${chart.moonSign.english} mind (${chart.moonSign.element === 'air' ? 'Beauty' : 'Depth'}). Excels at creating Digital Interfaces, VR Worlds, or 3D Environments.`
      : `${chart.nakshatra.name} guides toward ${chart.nakshatra.deity}'s domain. ${chart.moonSign.english} mind provides ${chart.moonSign.element === 'fire' ? 'bold vision' : chart.moonSign.element === 'earth' ? 'practical grounding' : chart.moonSign.element === 'air' ? 'intellectual clarity' : 'creative depth'}.`;
    careerPaths.push({ title: primaryTitle, reason: primaryReason, compatibility: 99.8 });

    // Secondary career
    const secondTitle = second ? `${second.careers[0]} (${chart.sunSign.element === 'fire' ? 'Luxury Sector' : 'Innovation Sector'})` : 'Entrepreneurship';
    const secondReason = `${chart.sunSign.english} Sun gives the ${chart.sunSign.element === 'fire' ? 'CEO mindset' : 'Strategic vision'}, while Destiny ${chart.destinyNumber} draws toward ${chart.destinyNumber === 6 ? 'high-end brands (Fashion Tech, Luxury, Premium)' : 'cutting-edge innovation'}.`;
    careerPaths.push({ title: secondTitle, reason: secondReason, compatibility: 95.2 });

    // Tertiary career
    const thirdTitle = third ? `Creative Director (${third.careers[0]}/Media)` : 'Strategic Consultant';
    const thirdReason = `Has the vision to visualize the final product before it exists. ${chart.nakshatra.name} nakshatra enhances creative visualization abilities.`;
    careerPaths.push({ title: thirdTitle, reason: thirdReason, compatibility: 91.5 });

    // Action Plan
    const actionPlan = `Immediate Action: ${chart.nakshatra.name === 'Chitra' ? 'Do not force into rote work unless it involves Design. Give access to architectural/design tools.' : `Focus on ${strongest.careers[0]} opportunities. Develop ${second?.careers[0] || 'secondary'} skills as backup.`} Tool: Deploy "Zoe-${strongest.name}" Sleeve for enhanced capabilities.`;

    // Warning Note
    const warningNote = chart.sunSign.element === 'fire' || chart.moonSign.element === 'air'
      ? 'Will struggle with "Routine." If work is repetitive, may disengage. Needs Project-Based challenges and creative freedom.'
      : chart.sunSign.element === 'earth' || chart.moonSign.element === 'earth'
      ? 'Needs stability and tangible results. May resist change without clear benefits. Provide structured growth paths.'
      : 'Needs emotional connection to work. May lose interest without meaningful purpose. Align career with values.';

    const gemstones: Record<string, string> = {
      Sun: 'Ruby', Moon: 'Pearl', Mars: 'Red Coral', Mercury: 'Emerald',
      Jupiter: 'Yellow Sapphire', Venus: 'Diamond', Saturn: 'Blue Sapphire',
      Rahu: 'Hessonite', Ketu: "Cat's Eye"
    };

    const deities: Record<string, string> = {
      Sun: 'Lord Surya', Moon: 'Goddess Chandra', Mars: 'Lord Hanuman',
      Mercury: 'Lord Vishnu', Jupiter: 'Lord Brihaspati', Venus: 'Goddess Lakshmi',
      Saturn: 'Lord Shani', Rahu: 'Goddess Durga', Ketu: 'Lord Ganesha'
    };

    const mantras: Record<string, string> = {
      Sun: 'ॐ सूर्याय नमः', Moon: 'ॐ चंद्राय नमः', Mars: 'ॐ मंगलाय नमः',
      Mercury: 'ॐ बुधाय नमः', Jupiter: 'ॐ गुरवे नमः', Venus: 'ॐ शुक्राय नमः',
      Saturn: 'ॐ शनैश्चराय नमः', Rahu: 'ॐ राहवे नमः', Ketu: 'ॐ केतवे नमः'
    };

    const colorMap: Record<string, string[]> = {
      Sun: ['Gold', 'Orange', 'Red'],
      Moon: ['White', 'Silver', 'Cream'],
      Mars: ['Red', 'Coral', 'Maroon'],
      Mercury: ['Green', 'Emerald', 'Parrot Green'],
      Jupiter: ['Yellow', 'Gold', 'Saffron'],
      Venus: ['White', 'Pink', 'Light Blue'],
      Saturn: ['Black', 'Navy Blue', 'Dark Purple'],
      Rahu: ['Grey', 'Smoke', 'Multi-color'],
      Ketu: ['Brown', 'Grey', 'Mixed']
    };

    return {
      cosmicId: cosmicIds[strongest.name] || 'The Awakened Soul',
      ultimateProfession: careerPaths[0].title,
      secondaryProfession: careerPaths[1].title,
      topCareerPaths: careerPaths,
      sunSignMeaning: sunMeanings[chart.sunSign.english] || `${chart.sunSign.english} energy guides your soul expression.`,
      moonSignMeaning: moonMeanings[chart.moonSign.english] || `${chart.moonSign.english} shapes your emotional landscape.`,
      nakshatraCriticalKey: nakshatraKeys[chart.nakshatra.name] || `${chart.nakshatra.name} - Ruled by ${chart.nakshatra.lord}. Guides toward ${chart.nakshatra.deity}'s domain.`,
      numerologyClash: clashDescription,
      soulPurpose: `To master ${strongest.name} energy through ${careerPaths[0].title.toLowerCase()} and serve humanity with ${chart.lagna.english} determination.`,
      dharmaPath: `The ${chart.nakshatra.name} nakshatra guides you toward ${chart.nakshatra.deity}'s blessings. Your ${chart.moonSign.english} mind provides the intuitive compass.`,
      karmicDebt: `Past life patterns from ${chart.moonSign.english} require balancing through service and dedication in your career.`,
      actionPlan,
      warningNote,
      auspiciousAge: [chart.psychicNumber * 4, chart.destinyNumber * 5, 35, 42].sort((a, b) => a - b),
      gemstone: gemstones[strongest.name],
      mantra: mantras[strongest.name],
      deity: deities[strongest.name],
      luckyColors: colorMap[strongest.name],
      luckyNumbers: [chart.psychicNumber, chart.destinyNumber, chart.nameNumber]
    };
  };

  // ═══════════════════════════════════════════════════════════════════
  // MAIN COMPUTATION FUNCTION
  // ═══════════════════════════════════════════════════════════════════
  const computeVedicChart = useCallback(async (data: {
    name: string;
    birthDate: Date;
    birthTime?: string;
    birthPlace?: string;
    latitude?: number;
    longitude?: number;
    timezone?: number; // UTC offset in hours (e.g., 5.5 for IST)
  }): Promise<VedicComputationResult> => {
    setIsComputing(true);
    setError(null);

    try {
      const { name, birthDate, birthTime, latitude, longitude, timezone } = data;

      // Calculate Lagna (Ascendant) with proper timezone conversion
      const lagnaPosition = calculateLagna(birthDate, birthTime, latitude, longitude, timezone);
      const lagnaIndex = Math.floor(lagnaPosition / 30);
      const lagna = RASHIS[lagnaIndex];

      // Calculate Moon Sign with proper timezone handling
      const moonPosition = calculateMoonPosition(birthDate, birthTime, timezone);
      const moonSignIndex = Math.floor(moonPosition / 30);
      const moonSign = RASHIS[moonSignIndex];

      // Calculate Nakshatra
      const nakshatraIndex = Math.floor((moonPosition / 360) * 27);
      const nakshatra = NAKSHATRAS[nakshatraIndex];
      const nakshatraPada = Math.floor(((moonPosition % (360 / 27)) / (360 / 27)) * 4) + 1;

      // Calculate Sun Sign
      const sunPosition = calculateSiderealPosition(birthDate, birthTime, timezone);
      const sunSignIndex = Math.floor(sunPosition / 30);
      const sunSign = RASHIS[sunSignIndex];

      // Numerology
      const psychicNumber = calculatePsychicNumber(birthDate.getDate());
      const destinyNumber = calculateDestinyNumber(birthDate);
      const nameNumber = calculateNameNumber(name);

      // Planetary Strengths
      const planetaryStrengths = calculatePlanetaryStrengths(
        psychicNumber, destinyNumber, lagnaIndex, moonSignIndex
      );
      const strongestPlanet = planetaryStrengths[0].planet;

      const chart: VedicChart = {
        lagna,
        lagnaIndex,
        moonSign,
        moonSignIndex,
        nakshatra,
        nakshatraIndex,
        nakshatraPada,
        sunSign,
        psychicNumber,
        destinyNumber,
        nameNumber,
        strongestPlanet,
        planetaryStrengths
      };

      const decree = synthesizeDivineDecree(chart, name);

      const computationResult: VedicComputationResult = {
        chart,
        decree,
        timestamp: Date.now()
      };

      setResult(computationResult);

      // Log to behavioral events for DHF integration
      if (user) {
        await supabase.from('behavioral_events').insert({
          user_id: user.id,
          event_type: 'vedic_computation',
          event_category: 'agasthya_karma_code',
          metadata: {
            name: data.name,
            lagna: lagna.english,
            moonSign: moonSign.english,
            nakshatra: nakshatra.name,
            strongestPlanet: strongestPlanet.name,
            ultimateProfession: decree.ultimateProfession
          }
        });
      }

      // Dispatch to Zoe Core DHF
      window.dispatchEvent(new CustomEvent('zoe-karma-code-computed', {
        detail: { chart, decree, birthData: data }
      }));

      console.log('[VedicComputation] Karma Code computed:', computationResult);
      return computationResult;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Computation failed';
      setError(errorMsg);
      throw err;
    } finally {
      setIsComputing(false);
    }
  }, [user]);

  return {
    isComputing,
    result,
    error,
    computeVedicChart,
    RASHIS,
    NAKSHATRAS,
    PLANETS
  };
};

export default useVedicComputation;
