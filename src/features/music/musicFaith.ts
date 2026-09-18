/**
 * Faith-based music keywords (client mirror of the same table used by the
 * music-connect-context function). A member's declared faith is only ever used
 * to add devotional search words they would actually listen to.
 */

export const FAITH_KEYWORDS: Record<string, string[]> = {
  hindu: ['bhajan', 'sanskrit chants'],
  christian: ['worship songs', 'gospel'],
  muslim: ['naat', 'sufi qawwali'],
  islam: ['naat', 'sufi qawwali'],
  buddhist: ['buddhist chants', 'zen meditation'],
  sikh: ['shabad kirtan', 'gurbani'],
  jain: ['jain stavan', 'peaceful chants'],
  jewish: ['niggun', 'jewish prayer songs'],
  spiritual: ['sacred chants', 'meditation music'],
  none: [],
};

/** Devotional keywords for a declared faith; empty when none is set. */
export function faithKeywordsFor(religion: string | null | undefined): string[] {
  const key = (religion ?? '').trim().toLowerCase();
  if (!key) return [];
  const known = FAITH_KEYWORDS[key];
  if (known) return [...known];
  return [`${key} devotional`];
}

/** True when a typed query is already a devotional search for this faith. */
export function isFaithQuery(query: string, religion: string | null | undefined): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return false;
  return faithKeywordsFor(religion).some((word) => needle.includes(word) || word.includes(needle));
}
