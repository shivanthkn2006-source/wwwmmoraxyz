/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ASTRO GROUNDING — anti-hallucination guardrail for Zoe's chat backends.
 *
 * Zoe must NEVER invent planetary positions. When a turn touches astrology,
 * this module computes the real numbers (Keplerian/Meeus ephemeris in
 * `astro-engine.ts`, deterministic weekday rulership in `day-lord.ts`) and
 * injects them as an authoritative FACTS block, together with a hard rule
 * that forbids the model from producing any figure that is not in the block.
 *
 * Returns '' when the turn is not astrological, so the prompt stays lean.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  julianDay,
  getPositions,
  calculateTransits,
  zonedTimeToUtc,
  PLANETS,
} from './astro-engine.ts';
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

/**
 * Build the FACTS block. `birth` is optional — without it Zoe still gets the
 * real current sky and the day lord, but no natal/transit numbers.
 */
export function buildAstroGroundingBlock(
  birth: AstroBirthProfile | null,
  timeZone = 'Asia/Kolkata',
  now: Date = new Date(),
): string {
  const lines: string[] = [];

  try {
    const skyJd = julianDay(now);
    const sky = getPositions(skyJd);
    lines.push('CURRENT SKY (geocentric ecliptic longitude, computed, not estimated):');
    for (const p of PLANETS) {
      const pos = sky[p];
      lines.push(
        `- ${p}: ${deg(pos.longitude)} (${pos.sign}${pos.isRetrograde ? ', retrograde' : ''}, ${pos.speed.toFixed(3)}°/day)`,
      );
    }

    if (birth?.birth_date) {
      const tz = birth.birth_timezone || timeZone;
      const time = (birth.birth_time || '12:00').slice(0, 5);
      const natalUtc = zonedTimeToUtc(String(birth.birth_date).slice(0, 10), time, tz);
      const natalJd = julianDay(natalUtc);
      const natal = getPositions(natalJd);

      lines.push('');
      lines.push(
        `NATAL CHART (born ${String(birth.birth_date).slice(0, 10)} ${time} ${tz}` +
          (birth.birth_latitude != null && birth.birth_longitude != null
            ? `, ${birth.birth_latitude.toFixed(4)}, ${birth.birth_longitude.toFixed(4)}`
            : ', coordinates unknown') +
          '):',
      );
      for (const p of PLANETS) {
        lines.push(`- Natal ${p}: ${deg(natal[p].longitude)} (${natal[p].sign})`);
      }

      const transits = calculateTransits(natalJd, skyJd).slice(0, 8);
      lines.push('');
      lines.push('ACTIVE TRANSITS (tightest first):');
      if (transits.length === 0) {
        lines.push('- None within orb right now.');
      } else {
        for (const t of transits) {
          lines.push(
            `- Transiting ${t.transit_planet}${t.is_retrograde ? ' (R)' : ''} ${t.aspect} natal ${t.natal_planet} — orb ${deg(t.exactness_deg)}`,
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
        'NOTE: this user has no stored birth date/time, so there is NO natal chart. Do not invent one — invite them to add their birth details.',
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
    '- Every degree, sign, retrograde state, transit or aspect you state MUST come verbatim from the block above.\n' +
    '- If a figure is not listed above, say you do not have it. NEVER estimate, round from memory, or invent planetary data.\n' +
    '- Interpretation and tone are yours; the numbers are not.\n' +
    '- Speak as insight, not superstition, and never as medical, legal or financial advice.\n' +
    '═══════════════════════════════════════════════════\n'
  );
}
