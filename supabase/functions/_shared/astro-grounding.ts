/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ASTRO GROUNDING — anti-hallucination guardrail for Zoe's chat backends.
 *
 * Zoe must NEVER invent planetary positions. When a turn touches astrology,
 * this module computes the real numbers with the precision ephemeris
 * (`ephemeris-precision.ts`: VSOP87/ELP-grade positions, Lahiri sidereal,
 * nakshatras, Vimshottari dasha) plus the deterministic weekday rulership in
 * `day-lord.ts`, and injects them as an authoritative FACTS block together
 * with a hard rule forbidding any figure not present in the block.
 *
 * Returns '' when the turn is not astrological, so the prompt stays lean.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  getPrecisePositions,
  precisTransits,
  vimshottariDasha,
  lahiriAyanamsa,
  PRECISE_BODIES,
} from './ephemeris-precision.ts';
import { getSwissPositions, swissHouses, swissEngineMode } from './swiss-ephemeris.ts';
import { zonedTimeToUtc } from './astro-engine.ts';
import { dayLordPromptLine } from './day-lord.ts';

/** Topics that require real ephemeris numbers rather than model intuition. */
const ASTRO_QUERY = /\b(astro|astrolog|horoscope|zodiac|rashi|nakshatra|dasha|dosha|jathakam|kundli|kundali|natal|birth\s*chart|transit|retrograde|planet|planetary|mercury|venus|mars|jupiter|saturn|rahu|ketu|moon\s*sign|sun\s*sign|ascendant|lagna|vedic|panchang|muhurat|graha)\b/i;

export function needsAstroGrounding(text: string): boolean {
  return ASTRO_QUERY.test(text || '');
}

export interface AstroBirthProfile {
  birth_date?: string | null;
  birth_time?: string | null;
  birth_timezone?: string | null;
  birth_latitude?: number | null;
  birth_longitude?: number | null;
}

const deg = (n: number) => `${n.toFixed(2)}°`;
const day = (iso: string) => iso.slice(0, 10);

/**
 * Swiss Ephemeris first (real Astrodienst library via WASM); the VSOP87/ELP
 * engine is only used if the WASM module cannot initialise in this sandbox.
 */
async function skyFor(date: Date): Promise<{ positions: ReturnType<typeof getPrecisePositions>; engine: string; ayanamsa: number }> {
  try {
    const positions = await getSwissPositions(date);
    const ayanamsa = Number((positions.Sun.longitude - positions.Sun.siderealLongitude + 360) % 360);
    return {
      positions,
      engine: `Swiss Ephemeris ${swissEngineMode() === 'swieph' ? '(JPL DE431 .se1 files)' : '(Moshier model)'} via WASM`,
      ayanamsa,
    };
  } catch (err) {
    console.warn('[astro-grounding] Swiss Ephemeris unavailable, falling back', err);
    return {
      positions: getPrecisePositions(date),
      engine: 'VSOP87/ELP fallback (astronomy-engine)',
      ayanamsa: lahiriAyanamsa(date),
    };
  }
}

/**
 * Build the FACTS block. `birth` is optional — without it Zoe still gets the
 * real current sky and the day lord, but no natal/transit/dasha numbers.
 */
export async function buildAstroGroundingBlock(
  birth: AstroBirthProfile | null,
  timeZone = 'Asia/Kolkata',
  now: Date = new Date(),
): Promise<string> {

  const lines: string[] = [];

  try {
    const sky = getPrecisePositions(now);
    lines.push(
      `ENGINE: precision ephemeris (VSOP87/ELP), Lahiri ayanamsa ${deg(lahiriAyanamsa(now))}. Every figure below is computed, not estimated.`,
    );
    lines.push('');
    lines.push('CURRENT SKY (tropical longitude | sidereal/Vedic | nakshatra):');
    for (const p of PRECISE_BODIES) {
      const pos = sky[p];
      lines.push(
        `- ${p}: ${deg(pos.longitude)} ${pos.sign} | sidereal ${deg(pos.siderealLongitude)} ${pos.siderealSign} | ${pos.nakshatra} pada ${pos.pada}` +
          `${pos.isRetrograde ? ' | RETROGRADE' : ''} | ${pos.speed.toFixed(3)}°/day`,
      );
    }

    if (birth?.birth_date) {
      const tz = birth.birth_timezone || timeZone;
      const time = (birth.birth_time || '12:00').slice(0, 5);
      const natalUtc = zonedTimeToUtc(String(birth.birth_date).slice(0, 10), time, tz);
      const natal = getPrecisePositions(natalUtc);

      lines.push('');
      lines.push(
        `NATAL CHART (born ${String(birth.birth_date).slice(0, 10)} ${time} ${tz}` +
          (birth.birth_latitude != null && birth.birth_longitude != null
            ? `, ${birth.birth_latitude.toFixed(4)}, ${birth.birth_longitude.toFixed(4)}`
            : ', coordinates unknown') +
          '):',
      );
      for (const p of PRECISE_BODIES) {
        const n = natal[p];
        lines.push(
          `- Natal ${p}: ${deg(n.longitude)} ${n.sign} | sidereal ${deg(n.siderealLongitude)} ${n.siderealSign} | ${n.nakshatra} pada ${n.pada}`,
        );
      }

      // Vimshottari dasha — what "which period am I in?" actually needs.
      const dasha = vimshottariDasha(natalUtc);
      lines.push('');
      lines.push('VIMSHOTTARI DASHA (from natal Moon nakshatra):');
      lines.push(
        `- Birth balance: ${dasha.balanceAtBirth.lord} until ${day(dasha.balanceAtBirth.end)}`,
      );
      if (dasha.current) {
        lines.push(`- RUNNING NOW: ${dasha.current.maha} mahadasha / ${dasha.current.antar} antardasha`);
      }
      for (const period of dasha.timeline.slice(1, 5)) {
        lines.push(`- ${period.lord}: ${day(period.start)} → ${day(period.end)}`);
      }

      const transits = precisTransits(natal, sky).slice(0, 8);
      lines.push('');
      lines.push('ACTIVE TRANSITS (tightest first):');
      if (transits.length === 0) {
        lines.push('- None within orb right now.');
      } else {
        for (const t of transits) {
          lines.push(
            `- Transiting ${t.transitBody}${t.retrograde ? ' (R)' : ''} ${t.aspect} natal ${t.natalBody} — orb ${deg(t.orb)}`,
          );
        }
      }

      if (birth.birth_latitude == null || birth.birth_longitude == null) {
        lines.push('');
        lines.push(
          'NOTE: birth coordinates are missing, so house/ascendant positions CANNOT be computed. Say so plainly and invite the user to add their birth place; never guess an ascendant.',
        );
      }
    } else {
      lines.push('');
      lines.push(
        'NOTE: this user has no stored birth date/time, so there is NO natal chart and NO dasha timeline. Do not invent one — invite them to add their birth details.',
      );
    }
  } catch (error) {
    console.warn('[astro-grounding] computation failed', error);
    return '';
  }

  return (
    '\n\n═══ VERIFIED ASTRONOMICAL FACTS (authoritative) ═══\n' +
    `${dayLordPromptLine(now, timeZone)}\n\n` +
    lines.join('\n') +
    '\n\nHARD RULE — ASTROLOGY ANTI-HALLUCINATION:\n' +
    '- Every degree, sign, nakshatra, dasha period, retrograde state, transit or aspect you state MUST come verbatim from the block above.\n' +
    '- If a figure is not listed above, say you do not have it. NEVER estimate, round from memory, or invent planetary data.\n' +
    '- Use the sidereal/Vedic values for Vedic questions (rashi, nakshatra, dasha) and tropical for Western ones.\n' +
    '- Interpretation and tone are yours; the numbers are not.\n' +
    '- Speak as insight, not superstition, and never as medical, legal or financial advice.\n' +
    '═══════════════════════════════════════════════════\n'
  );
}
