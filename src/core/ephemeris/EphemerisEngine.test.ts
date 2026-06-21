import { describe, it, expect } from 'vitest';
import {
  getPlanetaryPosition,
  getAllPositions,
  createHistoricalDate,
  dateToJulianDay,
  calendarToJulianDay,
  julianDayToDate,
  formatHistoricalYear,
  lahiriAyanamsa,
  getEphemerisMetadata,
  calculateDasaPeriods,
  validatePlanetaryClaim,
} from './EphemerisEngine';

describe('EphemerisEngine — Full Historical Range', () => {

  // ══════════════════════════════════════════════════════
  // JULIAN DAY CALCULATIONS
  // ══════════════════════════════════════════════════════

  it('calculates correct JD for J2000.0 epoch (Jan 1, 2000 12:00 TT)', () => {
    const jd = calendarToJulianDay(2000, 1, 1.5);
    expect(jd).toBeCloseTo(2451545.0, 1);
  });

  it('calculates correct JD for a known historical date (Julian calendar)', () => {
    // July 4, 776 BCE (astronomical year -775) — First Olympic Games
    // JD should be ~1442623 (approximate)
    const jd = calendarToJulianDay(-775, 7, 4);
    expect(jd).toBeGreaterThan(1400000);
    expect(jd).toBeLessThan(1500000);
  });

  it('handles Gregorian/Julian calendar boundary correctly', () => {
    // Oct 15, 1582 is the first Gregorian date
    const jdGregorian = calendarToJulianDay(1582, 10, 15);
    // Oct 4, 1582 is the last Julian date
    const jdJulian = calendarToJulianDay(1582, 10, 4);
    // These should be 1 day apart (Oct 5-14 were skipped)
    expect(jdGregorian - jdJulian).toBeCloseTo(1, 0);
  });

  it('converts JD back to calendar date correctly', () => {
    const result = julianDayToDate(2451545.0);
    expect(result.year).toBe(2000);
    expect(result.month).toBe(1);
    expect(result.day).toBe(1);
  });

  // ══════════════════════════════════════════════════════
  // BCE DATE HELPERS
  // ══════════════════════════════════════════════════════

  it('creates historical dates for BCE years', () => {
    const date = createHistoricalDate(-2999, 6, 15); // 3000 BCE
    expect(date.getUTCFullYear()).toBe(-2999);
    expect(date.getUTCMonth()).toBe(5); // June = 5
    expect(date.getUTCDate()).toBe(15);
  });

  it('formats historical years correctly', () => {
    expect(formatHistoricalYear(2024)).toBe('2024 CE');
    expect(formatHistoricalYear(0)).toBe('1 BCE');
    expect(formatHistoricalYear(-2999)).toBe('3000 BCE');
    expect(formatHistoricalYear(-3099)).toBe('3100 BCE');
  });

  // ══════════════════════════════════════════════════════
  // FAMOUS HISTORICAL FIGURES — PLANETARY POSITIONS
  // ══════════════════════════════════════════════════════

  it('calculates positions for Einstein birth (Mar 14, 1879)', () => {
    const einstein = new Date(Date.UTC(1879, 2, 14, 11, 30, 0)); // 11:30 AM
    const positions = getAllPositions(einstein);

    expect(positions).toHaveLength(9);
    positions.forEach(pos => {
      expect(pos.longitude).toBeGreaterThanOrEqual(0);
      expect(pos.longitude).toBeLessThan(360);
      expect(pos.siderealLongitude).toBeGreaterThanOrEqual(0);
      expect(pos.siderealLongitude).toBeLessThan(360);
      expect(pos.signDegree).toBeGreaterThanOrEqual(0);
      expect(pos.signDegree).toBeLessThan(30);
      expect(pos.nakshatraPada).toBeGreaterThanOrEqual(1);
      expect(pos.nakshatraPada).toBeLessThanOrEqual(4);
    });

    // Sun should be in Pisces (tropical) around Mar 14
    const sun = positions.find(p => p.planet === 'Sun')!;
    expect(sun.zodiacSign).toBe('Pisces');
  });

  it('calculates positions for Jesus approximate birth (~4 BCE)', () => {
    // Scholarly consensus: ~4 BCE, spring. Astronomical year = -3
    const jesus = createHistoricalDate(-3, 4, 17, 6, 0, 0);
    const positions = getAllPositions(jesus);

    expect(positions).toHaveLength(9);
    positions.forEach(pos => {
      expect(pos.longitude).toBeGreaterThanOrEqual(0);
      expect(pos.longitude).toBeLessThan(360);
      expect(pos.nakshatra).toBeTruthy();
    });

    // Sun should be in Aries in mid-April (tropical)
    const sun = positions.find(p => p.planet === 'Sun')!;
    expect(sun.zodiacSign).toBe('Aries');
  });

  it('calculates positions for Egyptian Pharaoh Ramesses II (~1303 BCE)', () => {
    // Ramesses II born ~1303 BCE = astronomical year -1302
    const ramesses = createHistoricalDate(-1302, 1, 15);
    const positions = getAllPositions(ramesses);

    expect(positions).toHaveLength(9);
    positions.forEach(pos => {
      expect(pos.longitude).toBeGreaterThanOrEqual(0);
      expect(pos.longitude).toBeLessThan(360);
      expect(pos.siderealLongitude).toBeGreaterThanOrEqual(0);
      expect(pos.siderealLongitude).toBeLessThan(360);
      expect(pos.speed).toBeDefined();
      expect(typeof pos.declination).toBe('number');
    });
  });

  it('calculates positions for Stone Age date (~10000 BCE)', () => {
    // 10000 BCE = astronomical year -9999
    const stoneAge = createHistoricalDate(-9999, 6, 21); // Summer solstice
    const positions = getAllPositions(stoneAge);

    expect(positions).toHaveLength(9);
    positions.forEach(pos => {
      expect(pos.longitude).toBeGreaterThanOrEqual(0);
      expect(pos.longitude).toBeLessThan(360);
      expect(pos.nakshatra).toBeTruthy();
    });
  });

  it('calculates positions for Buddha (~563 BCE)', () => {
    // Siddhartha Gautama born ~563 BCE = astronomical year -562
    const buddha = createHistoricalDate(-562, 5, 8); // Vesak full moon
    const positions = getAllPositions(buddha);
    
    expect(positions).toHaveLength(9);
    const moon = positions.find(p => p.planet === 'Moon')!;
    expect(moon.nakshatra).toBeTruthy();
    expect(moon.nakshatraPada).toBeGreaterThanOrEqual(1);
  });

  it('calculates positions for a modern date (2024)', () => {
    const modern = new Date(Date.UTC(2024, 0, 1, 12, 0, 0));
    const positions = getAllPositions(modern);

    expect(positions).toHaveLength(9);
    // Sun should be in Capricorn or Sagittarius on Jan 1
    const sun = positions.find(p => p.planet === 'Sun')!;
    expect(['Sagittarius', 'Capricorn']).toContain(sun.zodiacSign);
  });

  // ══════════════════════════════════════════════════════
  // METADATA & AYANAMSA
  // ══════════════════════════════════════════════════════

  it('computes correct ayanamsa for J2000.0', () => {
    const jd = calendarToJulianDay(2000, 1, 1.5);
    const ayan = lahiriAyanamsa(jd);
    // Lahiri ayanamsa at J2000 should be ~23.85°
    expect(ayan).toBeGreaterThan(23.5);
    expect(ayan).toBeLessThan(24.2);
  });

  it('computes metadata for ancient dates without errors', () => {
    const ancient = createHistoricalDate(-2999, 3, 20);
    const meta = getEphemerisMetadata(ancient);

    expect(meta.julianDay).toBeGreaterThan(0);
    expect(typeof meta.ayanamsa).toBe('number');
    expect(typeof meta.obliquity).toBe('number');
    expect(meta.obliquity).toBeGreaterThan(22);
    expect(meta.obliquity).toBeLessThan(25);
  });

  // ══════════════════════════════════════════════════════
  // DASA PERIODS
  // ══════════════════════════════════════════════════════

  it('calculates Dasa periods for Einstein', () => {
    const einstein = new Date(Date.UTC(1879, 2, 14, 11, 30, 0));
    const dasas = calculateDasaPeriods(einstein, 120);

    expect(dasas.length).toBeGreaterThan(0);
    dasas.forEach(d => {
      expect(d.planet).toBeTruthy();
      expect(d.startDate).toBeInstanceOf(Date);
      expect(d.endDate).toBeInstanceOf(Date);
      expect(d.durationYears).toBeGreaterThan(0);
      expect(d.subPeriods.length).toBeGreaterThan(0); // Bhukti sub-periods
    });
  });

  // ══════════════════════════════════════════════════════
  // VALIDATION
  // ══════════════════════════════════════════════════════

  it('validates planetary claims correctly', () => {
    const einstein = new Date(Date.UTC(1879, 2, 14, 11, 30, 0));
    // Sun is in Pisces for Einstein — should validate true
    expect(validatePlanetaryClaim('Sun', einstein, 'Pisces', 2, false)).toBe(true);
    // Sun is NOT in Leo — should validate false
    expect(validatePlanetaryClaim('Sun', einstein, 'Leo', 2, false)).toBe(false);
  });

  // ══════════════════════════════════════════════════════
  // RETROGRADE DETECTION
  // ══════════════════════════════════════════════════════

  it('Rahu and Ketu are always retrograde', () => {
    const date = new Date(Date.UTC(2024, 6, 1));
    const rahu = getPlanetaryPosition('Rahu', date);
    const ketu = getPlanetaryPosition('Ketu', date);
    expect(rahu.isRetrograde).toBe(true);
    expect(ketu.isRetrograde).toBe(true);
  });

  it('Ketu is always 180° from Rahu', () => {
    const dates = [
      new Date(Date.UTC(2024, 0, 1)),
      createHistoricalDate(-562, 5, 8),
      createHistoricalDate(-1302, 1, 15),
    ];
    dates.forEach(d => {
      const rahu = getPlanetaryPosition('Rahu', d);
      const ketu = getPlanetaryPosition('Ketu', d);
      let diff = Math.abs(rahu.longitude - ketu.longitude);
      if (diff > 180) diff = 360 - diff;
      expect(diff).toBeCloseTo(180, 0);
    });
  });
});
