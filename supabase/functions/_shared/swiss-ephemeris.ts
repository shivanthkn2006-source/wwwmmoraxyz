/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SWISS EPHEMERIS (real) — Astrodienst's Swiss Ephemeris C library compiled to
 * WebAssembly (`sweph-wasm`), running inside the edge runtime.
 *
 * This is the genuine article, not an approximation: the same `swe_calc_ut`,
 * `swe_houses`, `swe_get_ayanamsa_ut` entry points, backed by the JPL DE431
 * derived .se1 ephemeris files (sub-milliarcsecond agreement with JPL) with
 * the library's own Moshier model as an automatic fallback when the .se1
 * files are not reachable from the function sandbox.
 *
 * Output shape is deliberately identical to `ephemeris-precision.ts`
 * (`PrecisePosition`), so dasha, transit and grounding code is unchanged and
 * `astronomy-engine` remains only as a last-resort fallback.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  TROPICAL_SIGNS,
  NAKSHATRAS,
  PRECISE_BODIES,
  type PreciseBody,
  type PrecisePosition,
} from './ephemeris-precision.ts';

// Swiss Ephemeris planet numbers (swephexp.h)
const SE_BODY: Record<PreciseBody, number> = {
  Sun: 0, Moon: 1, Mercury: 2, Venus: 3, Mars: 4, Jupiter: 5, Saturn: 6,
  Uranus: 7, Neptune: 8, Pluto: 9,
  Rahu: 11 /* SE_TRUE_NODE */, Ketu: 11,
};

const SEFLG_SWIEPH = 2;
const SEFLG_MOSEPH = 4;
const SEFLG_SPEED = 256;
const SE_SIDM_LAHIRI = 1;

const norm360 = (d: number) => ((d % 360) + 360) % 360;

let swePromise: Promise<any> | null = null;
let sweFlag = SEFLG_SWIEPH | SEFLG_SPEED;

async function getSwe(): Promise<any> {
  if (!swePromise) {
    swePromise = (async () => {
      const mod: any = await import('npm:sweph-wasm@2.6.9');
      const SwissEPH = mod.default ?? mod;
      const swe = await SwissEPH.init();
      try {
        await swe.swe_set_ephe_path();
      } catch {
        sweFlag = SEFLG_MOSEPH | SEFLG_SPEED;
      }
      // Lahiri (Chitrapaksha) — the official Indian sidereal zero point.
      swe.swe_set_sid_mode?.(SE_SIDM_LAHIRI, 0, 0);
      return swe;
    })().catch((err) => {
      swePromise = null;
      throw err;
    });
  }
  return swePromise;
}

function julianDayUt(swe: any, date: Date): number {
  return swe.swe_julday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600,
    1, // Gregorian
  );
}

function calc(swe: any, jd: number, body: number): number[] {
  let res = swe.swe_calc_ut(jd, body, sweFlag);
  if (!Array.isArray(res) || !Number.isFinite(res[0])) {
    // Fall back to the library's built-in analytical model.
    sweFlag = SEFLG_MOSEPH | SEFLG_SPEED;
    res = swe.swe_calc_ut(jd, body, sweFlag);
  }
  if (!Array.isArray(res) || !Number.isFinite(res[0])) {
    throw new Error(`swe_calc_ut failed for body ${body}`);
  }
  return res;
}

function build(body: PreciseBody, lon: number, lat: number, speed: number, ayanamsa: number): PrecisePosition {
  const tropical = norm360(lon);
  const sidereal = norm360(tropical - ayanamsa);
  const nakIndex = Math.floor(sidereal / (360 / 27));
  return {
    body,
    longitude: Number(tropical.toFixed(4)),
    siderealLongitude: Number(sidereal.toFixed(4)),
    latitude: Number(lat.toFixed(4)),
    speed: Number(speed.toFixed(4)),
    isRetrograde: speed < 0,
    sign: TROPICAL_SIGNS[Math.floor(tropical / 30)],
    siderealSign: TROPICAL_SIGNS[Math.floor(sidereal / 30)],
    nakshatra: NAKSHATRAS[nakIndex],
    pada: Math.floor((sidereal % (360 / 27)) / (360 / 108)) + 1,
  };
}

/** True Lahiri ayanamsa straight out of Swiss Ephemeris. */
export async function swissAyanamsa(date: Date): Promise<number> {
  const swe = await getSwe();
  return swe.swe_get_ayanamsa_ut(julianDayUt(swe, date));
}

/** Which model actually answered: 'swieph' (JPL .se1 files) or 'moseph'. */
export function swissEngineMode(): 'swieph' | 'moseph' {
  return (sweFlag & SEFLG_SWIEPH) === SEFLG_SWIEPH ? 'swieph' : 'moseph';
}

/** Full sky for one instant, computed by Swiss Ephemeris. */
export async function getSwissPositions(date: Date = new Date()): Promise<Record<PreciseBody, PrecisePosition>> {
  const swe = await getSwe();
  const jd = julianDayUt(swe, date);
  const ayanamsa = swe.swe_get_ayanamsa_ut(jd);

  const out = {} as Record<PreciseBody, PrecisePosition>;
  for (const body of PRECISE_BODIES) {
    if (body === 'Ketu') continue;
    const r = calc(swe, jd, SE_BODY[body]);
    out[body] = build(body, r[0], r[1] ?? 0, r[3] ?? 0, ayanamsa);
  }
  // Ketu is exactly opposite the true node.
  const rahu = out.Rahu;
  out.Ketu = build('Ketu', rahu.longitude + 180, 0, rahu.speed, ayanamsa);
  return out;
}

/** Placidus houses + ascendant/MC for a birth place. */
export async function swissHouses(
  date: Date,
  latitude: number,
  longitude: number,
  system: string = 'P',
): Promise<{ cusps: number[]; ascendant: number; mc: number; ayanamsa: number } | null> {
  try {
    const swe = await getSwe();
    const jd = julianDayUt(swe, date);
    const h = swe.swe_houses(jd, latitude, longitude, system);
    if (!h?.ascmc) return null;
    return {
      cusps: (h.cusps ?? []).map((c: number) => norm360(c)),
      ascendant: norm360(h.ascmc[0]),
      mc: norm360(h.ascmc[1]),
      ayanamsa: swe.swe_get_ayanamsa_ut(jd),
    };
  } catch (err) {
    console.warn('[swiss-ephemeris] houses failed', err);
    return null;
  }
}

export type { PreciseBody, PrecisePosition };
