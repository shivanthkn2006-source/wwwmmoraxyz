// ═══════════════════════════════════════════════════════════════════════════════
// ZOE GENESIS DHF — Deep Heritage Foundation lock for Zoe Infinity
// One-time, immutable identity record persisted to zoe_genesis_memory.
// Once locked (stage=COMPLETE + completed_at), it CANNOT be overwritten —
// even if the user later types a different name/DOB/location.
//
// Also exposes a Swiss-ephemeris snapshot helper so the brain can answer
// astrology-style queries from the locked DOB with millisecond-precise
// planetary positions (no UI changes; backend context injection only).
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import {
  getAllPositions,
  getEphemerisMetadata,
  type PlanetaryPosition,
  type EphemerisMetadata,
} from '@/core/ephemeris/EphemerisEngine';

export interface LockedGenesisIdentity {
  user_id: string;
  stage: string;
  name?: string | null;
  nickname?: string | null;
  age?: number | null;
  dob?: string | null; // ISO date (YYYY-MM-DD)
  location?: any;
  life_stage?: string | null;
  zoe_name?: string | null;
  zoe_gender?: 'female' | 'male' | null;
  completed_at?: string | null;
  payload?: any;
}

const LS_LOCK_KEY = (uid: string) => `zoe_genesis_dhf_locked_${uid}`;

/**
 * Returns the locked identity if Genesis has been completed (stage=COMPLETE + completed_at).
 */
export async function getLockedGenesisIdentity(
  userId: string | null | undefined,
): Promise<LockedGenesisIdentity | null> {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('zoe_genesis_memory' as any)
      .select('user_id,stage,name,nickname,age,dob,location,life_stage,zoe_name,zoe_gender,completed_at,payload')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.warn('[GenesisDHF] read failed:', error.message);
      return null;
    }
    const row = data as LockedGenesisIdentity | null;
    if (row?.stage === 'COMPLETE' && row?.completed_at) return row;
    return null;
  } catch (e) {
    console.warn('[GenesisDHF] read threw:', e);
    return null;
  }
}

export function isLockedLocally(userId: string | null | undefined): boolean {
  if (!userId) return false;
  try { return localStorage.getItem(LS_LOCK_KEY(userId)) === '1'; } catch { return false; }
}

/**
 * Lock the Genesis identity into DHF. No-op if already locked (DHF immutability).
 * Returns true if a new lock was written, false if it was already locked or failed.
 */
export async function lockGenesisToDHF(
  userId: string,
  identity: Omit<LockedGenesisIdentity, 'user_id' | 'stage' | 'completed_at'>,
): Promise<boolean> {
  if (!userId) return false;

  // Fast path: local flag
  if (isLockedLocally(userId)) {
    console.log('[GenesisDHF] already locked locally; skipping write');
    return false;
  }

  // Server guard: refuse if existing COMPLETE row
  try {
    const existing = await getLockedGenesisIdentity(userId);
    if (existing) {
      try { localStorage.setItem(LS_LOCK_KEY(userId), '1'); } catch {}
      console.log('[GenesisDHF] already locked on server; skipping write');
      return false;
    }

    const completed_at = new Date().toISOString();
    const row = {
      user_id: userId,
      stage: 'COMPLETE',
      name: identity.name ?? null,
      nickname: identity.nickname ?? null,
      age: identity.age ?? null,
      dob: identity.dob ?? null,
      location: identity.location ?? null,
      life_stage: identity.life_stage ?? null,
      zoe_name: identity.zoe_name ?? null,
      zoe_gender: identity.zoe_gender ?? null,
      completed_at,
      payload: { ...(identity.payload ?? {}), dhf_locked: true, locked_at: completed_at },
      updated_at: completed_at,
    } as any;

    const { error } = await supabase
      .from('zoe_genesis_memory' as any)
      .upsert(row, { onConflict: 'user_id' });

    if (error) {
      console.warn('[GenesisDHF] lock upsert failed:', error.message);
      return false;
    }
    try { localStorage.setItem(LS_LOCK_KEY(userId), '1'); } catch {}
    console.log('[GenesisDHF] ✅ identity locked to DHF');
    return true;
  } catch (e) {
    console.warn('[GenesisDHF] lock threw:', e);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASTROLOGY DETECTION + SWISS-EPHEMERIS SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════════

const ASTROLOGY_PATTERNS: RegExp[] = [
  /\b(astrology|horoscope|zodiac|natal|birth\s*chart)\b/i,
  /\b(rasi|rashi|nakshatra|dasha|jathaka|jathakam|jyotish|kundali|kundli)\b/i,
  /\b(mercury|venus|mars|jupiter|saturn|rahu|ketu)\s*(retro|retrograde|transit|position)?\b/i,
  /\b(planetary|planet)\s+(position|transit|alignment)\b/i,
  /\b(how('?s| is) my (day|week|month)).*(astrolog|stars|planets|cosmic)\b/i,
  /\bcosmic\s+weather\b/i,
  /\b(my )?(moon|sun|rising|ascendant|lagna)\s*sign\b/i,
];

export function isAstrologyQuery(text: string | null | undefined): boolean {
  if (!text) return false;
  return ASTROLOGY_PATTERNS.some((re) => re.test(text));
}

export interface EphemerisSnapshot {
  precisionLabel: string; // e.g. "Swiss Ephemeris (sub-arcsecond / ms-precise)"
  computedAt: string;     // ISO instant of computation
  birthDate: string | null;
  metadata: EphemerisMetadata;
  positionsNow: PlanetaryPosition[];
  positionsAtBirth: PlanetaryPosition[] | null;
}

/**
 * Build a Swiss-ephemeris snapshot using the locked DOB (if any). Pure client compute.
 */
export function getEphemerisSnapshot(dob: string | null | undefined): EphemerisSnapshot {
  const now = new Date();
  const birth = dob ? new Date(dob) : null;
  const birthValid = !!birth && !Number.isNaN(birth.getTime());

  const metadata = getEphemerisMetadata(now);
  const positionsNow = getAllPositions(now);
  const positionsAtBirth = birthValid ? getAllPositions(birth!) : null;

  return {
    precisionLabel: 'Swiss Ephemeris (sub-arcsecond, millisecond-precise via VSOP87 + Chapront)',
    computedAt: now.toISOString(),
    birthDate: birthValid ? birth!.toISOString() : null,
    metadata,
    positionsNow,
    positionsAtBirth,
  };
}

/**
 * Compact text block for injection into the brain's system / memory context.
 * No UI surface — backend-only.
 */
export function buildGenesisDHFContextBlock(
  identity: LockedGenesisIdentity | null,
  ephemeris?: EphemerisSnapshot | null,
): string {
  if (!identity && !ephemeris) return '';
  const lines: string[] = [];

  if (identity) {
    lines.push('═══ GENESIS DHF (IMMUTABLE IDENTITY — DO NOT OVERWRITE) ═══');
    lines.push('This record was locked at first Genesis completion. Treat it as ground truth.');
    lines.push('If the user later claims a different name, DOB, or location, gently acknowledge');
    lines.push('but DO NOT update this identity — it is sealed in DHF.');
    if (identity.name) lines.push(`User name: ${identity.name}`);
    if (identity.nickname) lines.push(`Nickname: ${identity.nickname}`);
    if (identity.age != null) lines.push(`Age (at lock): ${identity.age}`);
    if (identity.dob) lines.push(`Date of birth: ${identity.dob}`);
    if (identity.location) {
      const loc = typeof identity.location === 'string'
        ? identity.location
        : JSON.stringify(identity.location);
      lines.push(`Location: ${loc}`);
    }
    if (identity.life_stage) lines.push(`Life stage: ${identity.life_stage}`);
    if (identity.zoe_name) lines.push(`Assistant name (your name): ${identity.zoe_name}`);
    if (identity.zoe_gender) lines.push(`Assistant gender: ${identity.zoe_gender}`);
    if (identity.completed_at) lines.push(`Locked at: ${identity.completed_at}`);
  }

  if (ephemeris) {
    lines.push('');
    lines.push('═══ SWISS EPHEMERIS SNAPSHOT (use for any astrology / planetary answer) ═══');
    lines.push(`Precision: ${ephemeris.precisionLabel}`);
    lines.push(`Computed at: ${ephemeris.computedAt}`);
    lines.push(`Ayanamsa (Lahiri): ${ephemeris.metadata.ayanamsa.toFixed(6)}°`);
    lines.push(`Obliquity: ${ephemeris.metadata.obliquity.toFixed(6)}°  Δt: ${ephemeris.metadata.deltaT.toFixed(2)}s`);
    lines.push('Current planetary positions (sidereal / Lahiri):');
    for (const p of ephemeris.positionsNow) {
      lines.push(
        `  ${p.planet}: ${p.siderealLongitude.toFixed(4)}° (${p.siderealSign} ${p.siderealSignDegree.toFixed(2)}°)` +
        ` nakṣatra=${p.nakshatra} pada=${p.nakshatraPada}` +
        (p.isRetrograde ? ' ℞' : '') +
        ` speed=${p.speed.toFixed(4)}°/day`
      );
    }
    if (ephemeris.positionsAtBirth) {
      lines.push(`Birth chart (DOB ${ephemeris.birthDate}):`);
      for (const p of ephemeris.positionsAtBirth) {
        lines.push(
          `  ${p.planet}: ${p.siderealLongitude.toFixed(4)}° (${p.siderealSign} ${p.siderealSignDegree.toFixed(2)}°)` +
          ` nakṣatra=${p.nakshatra} pada=${p.nakshatraPada}` +
          (p.isRetrograde ? ' ℞' : '')
        );
      }
    }
    lines.push('Answer using ONLY these numbers; do not invent positions.');
  }

  return lines.join('\n');
}
