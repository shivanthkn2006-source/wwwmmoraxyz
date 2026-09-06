/**
 * Generational phrasing adapter.
 *
 * Same truth, different register. Derives a cohort from the member's birth date
 * (or the stored `age_cohort` on their profile) and returns a short style
 * directive Zoe appends to her prompt. It never changes facts, only tone.
 */
export type AgeCohort = 'genz' | 'millennial' | 'genx' | 'boomer' | 'unspecified';

export function cohortFromBirthDate(birthDate?: string | null): AgeCohort {
  if (!birthDate) return 'unspecified';
  const year = new Date(birthDate).getFullYear();
  if (!Number.isFinite(year)) return 'unspecified';
  if (year >= 1997) return 'genz';
  if (year >= 1981) return 'millennial';
  if (year >= 1965) return 'genx';
  if (year >= 1946) return 'boomer';
  return 'unspecified';
}

const STYLES: Record<AgeCohort, string> = {
  genz: 'Speak in short, low-key, unpolished lines. No corporate polish, no exclamation stacking. Dry warmth.',
  millennial: 'Speak conversationally with light self-awareness. Clear structure, a little humour, no jargon.',
  genx: 'Speak plainly and directly. Get to the point first, context second. No hype.',
  boomer: 'Speak warmly and completely, with full sentences and clear explanations. Avoid slang and abbreviations.',
  unspecified: 'Speak naturally and plainly, matching the register the member uses.',
};

export function toneDirective(cohort: AgeCohort): string {
  return STYLES[cohort] ?? STYLES.unspecified;
}
