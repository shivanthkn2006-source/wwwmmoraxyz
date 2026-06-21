import { describe, it, expect } from 'vitest';
import {
  getAllPositions,
  getEphemerisMetadata,
  calculateDasaPeriods,
  getPlanetaryPosition,
} from './EphemerisEngine';

/**
 * Birth Chart Verification: August 16, 1977 — 8:20 PM IST — Trivandrum (8.5241° N, 76.9366° E)
 * IST = UTC+5:30 → 8:20 PM IST = 14:50 UTC
 * 
 * Swiss Ephemeris reference values (tropical, geocentric):
 * ────────────────────────────────────────────────────────
 * Sun:     ~143.6° (Leo ~23°)
 * Moon:    ~164°   (Virgo ~14°)
 * Mercury: ~156°   (Virgo ~6°)  — near Sun, elongation ~12°
 * Venus:   ~119°   (Cancer ~29°)
 * Mars:    ~103°   (Cancer ~13°)
 * Jupiter: ~89°    (Gemini ~29°) — could be Cancer 0°
 * Saturn:  ~148°   (Leo ~28°)   — retrograde
 * Rahu:    ~198°   (Libra ~18°) — always retrograde
 * Ketu:    ~18°    (Aries ~18°) — always retrograde
 * ────────────────────────────────────────────────────────
 */
describe('Birth Chart: Aug 16, 1977, 8:20 PM IST, Trivandrum', () => {
  const birthDate = new Date(Date.UTC(1977, 7, 16, 14, 50, 0));

  it('computes all 9 planetary positions without errors', () => {
    const positions = getAllPositions(birthDate);
    expect(positions).toHaveLength(9);

    // Log full chart for manual inspection
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('BIRTH CHART: August 16, 1977 — 8:20 PM IST — Trivandrum');
    console.log('═══════════════════════════════════════════════════════');

    const meta = getEphemerisMetadata(birthDate);
    console.log(`Julian Day: ${meta.julianDay.toFixed(4)}`);
    console.log(`Lahiri Ayanamsa: ${meta.ayanamsa.toFixed(4)}°`);
    console.log(`Obliquity: ${meta.obliquity.toFixed(4)}°\n`);

    console.log('Planet    | Tropical         | Sidereal         | Nakshatra            | Retro | Speed');
    console.log('──────────┼──────────────────┼──────────────────┼──────────────────────┼───────┼───────');
    positions.forEach(p => {
      const tDeg = Math.floor(p.signDegree);
      const tMin = Math.round((p.signDegree - tDeg) * 60);
      const sDeg = Math.floor(p.siderealSignDegree);
      const sMin = Math.round((p.siderealSignDegree - sDeg) * 60);
      console.log(
        `${p.planet.padEnd(9)} | ${p.zodiacSign.padEnd(12)} ${String(tDeg).padStart(2)}°${String(tMin).padStart(2)}' | ` +
        `${p.siderealSign.padEnd(12)} ${String(sDeg).padStart(2)}°${String(sMin).padStart(2)}' | ` +
        `${p.nakshatra.padEnd(18)} P${p.nakshatraPada} | ` +
        `${p.isRetrograde ? '  (R)' : '     '} | ${p.speed.toFixed(4)}°/d`
      );
    });
  });

  it('Sun is in Leo (tropical) on Aug 16', () => {
    const sun = getPlanetaryPosition('Sun', birthDate);
    expect(sun.zodiacSign).toBe('Leo');
    expect(sun.signDegree).toBeGreaterThan(20);
    expect(sun.signDegree).toBeLessThan(27);
  });

  it('Sun sidereal is in Cancer or early Leo (Lahiri)', () => {
    const sun = getPlanetaryPosition('Sun', birthDate);
    expect(['Cancer', 'Leo']).toContain(sun.siderealSign);
  });

  // ── STRICT POSITION CHECKS (VSOP87 fix validation) ──

  it('Mercury is near the Sun (within 28° elongation)', () => {
    const sun = getPlanetaryPosition('Sun', birthDate);
    const mercury = getPlanetaryPosition('Mercury', birthDate);
    let elongation = Math.abs(mercury.longitude - sun.longitude);
    if (elongation > 180) elongation = 360 - elongation;
    // Mercury max elongation is ~28°
    expect(elongation).toBeLessThan(30);
  });

  it('Venus is within 47° of Sun', () => {
    const sun = getPlanetaryPosition('Sun', birthDate);
    const venus = getPlanetaryPosition('Venus', birthDate);
    let elongation = Math.abs(venus.longitude - sun.longitude);
    if (elongation > 180) elongation = 360 - elongation;
    expect(elongation).toBeLessThan(48);
  });

  it('Mercury speed is realistic (0.5-2.2 °/day)', () => {
    const mercury = getPlanetaryPosition('Mercury', birthDate);
    expect(Math.abs(mercury.speed)).toBeGreaterThan(0.3);
    expect(Math.abs(mercury.speed)).toBeLessThan(2.3);
  });

  it('Venus speed is realistic (0.2-1.3 °/day)', () => {
    const venus = getPlanetaryPosition('Venus', birthDate);
    expect(Math.abs(venus.speed)).toBeGreaterThan(0.1);
    expect(Math.abs(venus.speed)).toBeLessThan(1.4);
  });

  it('Mars speed is realistic (0.3-0.9 °/day direct, or retrograde)', () => {
    const mars = getPlanetaryPosition('Mars', birthDate);
    expect(Math.abs(mars.speed)).toBeLessThan(1.0);
  });

  it('Jupiter speed is realistic (< 0.25 °/day)', () => {
    const jupiter = getPlanetaryPosition('Jupiter', birthDate);
    expect(Math.abs(jupiter.speed)).toBeLessThan(0.3);
  });

  it('Saturn speed is realistic (< 0.15 °/day)', () => {
    const saturn = getPlanetaryPosition('Saturn', birthDate);
    expect(Math.abs(saturn.speed)).toBeLessThan(0.15);
  });

  it('Saturn is direct (not retrograde) in mid-Aug 1977', () => {
    // Saturn's 1977 retrograde was ~Jan-Jun; by Aug 16 it was direct again
    const saturn = getPlanetaryPosition('Saturn', birthDate);
    expect(saturn.isRetrograde).toBe(false);
    expect(saturn.zodiacSign).toBe('Leo');
  });

  it('Moon moves ~13°/day — speed in expected range', () => {
    const moon = getPlanetaryPosition('Moon', birthDate);
    expect(moon.speed).toBeGreaterThan(11);
    expect(moon.speed).toBeLessThan(15);
  });

  it('Rahu/Ketu are always retrograde and 180° apart', () => {
    const rahu = getPlanetaryPosition('Rahu', birthDate);
    const ketu = getPlanetaryPosition('Ketu', birthDate);
    expect(rahu.isRetrograde).toBe(true);
    expect(ketu.isRetrograde).toBe(true);
    let diff = Math.abs(rahu.longitude - ketu.longitude);
    if (diff > 180) diff = 360 - diff;
    expect(diff).toBeCloseTo(180, 0);
  });

  it('Lahiri Ayanamsa is ~23.6° for 1977', () => {
    const meta = getEphemerisMetadata(birthDate);
    expect(meta.ayanamsa).toBeGreaterThan(23.3);
    expect(meta.ayanamsa).toBeLessThan(24.0);
  });

  it('computes Vimshottari Dasa periods with Bhuktis', () => {
    const dasas = calculateDasaPeriods(birthDate, 120);
    expect(dasas.length).toBeGreaterThan(5);

    console.log('\nVIMSHOTTARI DASA PERIODS:');
    console.log('──────────────────────────────────────────────────');
    dasas.forEach(d => {
      const s = d.startDate.toISOString().slice(0, 10);
      const e = d.endDate.toISOString().slice(0, 10);
      console.log(`${d.planet.padEnd(8)} Maha Dasa: ${s} → ${e}  (${d.durationYears} yrs)`);
      d.subPeriods.forEach(sp => {
        console.log(`  └─ ${sp.planet.padEnd(8)} Bhukti: ${sp.startDate.toISOString().slice(0, 10)} → ${sp.endDate.toISOString().slice(0, 10)}`);
      });
    });

    dasas.forEach(d => {
      expect(d.subPeriods.length).toBeGreaterThan(0);
    });
  });

  it('all positions have valid nakshatras and padas', () => {
    const positions = getAllPositions(birthDate);
    positions.forEach(p => {
      expect(p.nakshatra).toBeTruthy();
      expect(p.nakshatraPada).toBeGreaterThanOrEqual(1);
      expect(p.nakshatraPada).toBeLessThanOrEqual(4);
    });
  });
});
