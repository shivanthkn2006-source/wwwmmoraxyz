/**
 * Faith-based music keywords (client mirror of the same table used by the
 * music-connect-context function). A member's declared faith is only ever used
 * to add devotional search words they would actually listen to.
 *
 * Each faith carries several real, searchable devotional genres so the
 * devotional row keeps growing instead of repeating the same two words.
 */

export const FAITH_KEYWORDS: Record<string, string[]> = {
  hindu: ['bhajan', 'sanskrit chants', 'carnatic devotional', 'aarti', 'kirtan', 'vedic mantra'],
  christian: ['worship songs', 'gospel', 'hymns', 'contemporary christian', 'choir praise', 'gregorian chant'],
  muslim: ['naat', 'sufi qawwali', 'nasheed', 'islamic dhikr', 'quran recitation'],
  islam: ['naat', 'sufi qawwali', 'nasheed', 'islamic dhikr', 'quran recitation'],
  buddhist: ['buddhist chants', 'zen meditation', 'tibetan singing bowls', 'pali suttas', 'mantra om mani padme hum'],
  sikh: ['shabad kirtan', 'gurbani', 'japji sahib', 'sikh simran'],
  jain: ['jain stavan', 'peaceful chants', 'navkar mantra', 'jain bhakti'],
  jewish: ['niggun', 'jewish prayer songs', 'cantorial chazzanut', 'shabbat songs'],
  spiritual: ['sacred chants', 'meditation music', 'healing frequencies', 'devotional instrumental'],
  none: [],
};

/** Devotional keywords for a declared faith; empty when none is set. */
export function faithKeywordsFor(religion: string | null | undefined): string[] {
  const key = (religion ?? '').trim().toLowerCase();
  if (!key) return [];
  const known = FAITH_KEYWORDS[key];
  if (known) return [...known];
  return [`${key} devotional`, `${key} prayer songs`];
}

/** True when a typed query is already a devotional search for this faith. */
export function isFaithQuery(query: string, religion: string | null | undefined): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return false;
  return faithKeywordsFor(religion).some((word) => needle.includes(word) || word.includes(needle));
}
