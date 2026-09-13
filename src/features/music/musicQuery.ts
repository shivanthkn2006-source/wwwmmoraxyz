export interface MusicQueryNormalization {
  original: string;
  query: string;
  variants: string[];
  corrected: boolean;
}

const MUSIC_TERMS = [
  'ambient', 'blues', 'carnatic', 'classical', 'country', 'devotional',
  'electronic', 'folk', 'gospel', 'ghazal', 'hip hop', 'house',
  'instrumental', 'jazz', 'kirtan', 'lofi', 'mantra', 'meditation',
  'metal', 'pop', 'qawwali', 'reggae', 'rock', 'techno',
  'bengali', 'english', 'french', 'german', 'gujarati', 'hindi',
  'kannada', 'korean', 'malayalam', 'marathi', 'punjabi', 'spanish',
  'tamil', 'telugu', 'urdu',
] as const;

const ALIASES: Record<string, string> = {
  artiste: 'artist',
  bhajans: 'bhajan',
  carnatik: 'carnatic',
  filmy: 'film',
  gazal: 'ghazal',
  gazals: 'ghazal',
  kawali: 'qawwali',
  kawwali: 'qawwali',
  lofi: 'lofi',
  'lo-fi': 'lofi',
  malyalam: 'malayalam',
  panjabi: 'punjabi',
  qawali: 'qawwali',
  quawali: 'qawwali',
  tamizh: 'tamil',
  telegu: 'telugu',
};

const PHRASE_ALIASES: Record<string, string> = {
  'ketty perry': 'katy perry',
};

function comparable(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9' -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function distance(left: string, right: string): number {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const held = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (left[i - 1] === right[j - 1] ? 0 : 1));
      previous = held;
    }
  }
  return row[right.length];
}

function correctToken(token: string): string {
  if (ALIASES[token]) return ALIASES[token];
  if (token.length < 5) return token;
  const match = MUSIC_TERMS
    .filter((term) => !term.includes(' ') && Math.abs(term.length - token.length) <= 2)
    .map((term) => ({ term, score: distance(token, term) }))
    .sort((a, b) => a.score - b.score)[0];
  return match && match.score <= (token.length >= 8 ? 2 : 1) ? match.term : token;
}

/** Corrects only bounded music vocabulary; open title/artist text is never guessed. */
export function normalizeMusicQuery(raw: string): MusicQueryNormalization {
  const original = raw.trim().replace(/\s+/g, ' ');
  const comparableOriginal = comparable(original);
  const cleaned = comparableOriginal
    .replace(/^(?:zoe\s+)?(?:please\s+)?(?:search(?: for)?|find|play|put on)\s+/, '')
    .replace(/\b(?:song|track|music)\s+(?:called|named)\s+/g, '')
    .replace(/\b(?:by the (?:singer|artist)|by artiste)\b/g, 'by')
    .trim();
  const phraseCorrected = PHRASE_ALIASES[cleaned] ?? cleaned;
  const correctedQuery = phraseCorrected.split(' ').map(correctToken).join(' ').replace(/\s+/g, ' ').trim();
  const variants = Array.from(new Set([correctedQuery, cleaned, original].filter(Boolean)));
  const corrected = correctedQuery.split(' ').some((token, index) => token !== cleaned.split(' ')[index]);
  return { original, query: correctedQuery, variants, corrected };
}

/** Detects an explicit music lookup without stealing ordinary people/post searches. */
export function parsePlatformMusicSearch(raw: string): string | null {
  const normalized = comparable(raw);
  if (!normalized) return null;
  const explicit = normalized.match(
    /^(?:search|find|show|play|listen to)?\s*(?:music|musics|song|songs|track|tracks|artist|artists|singer|singers|album|albums|playlist|playlists|radio)\s*(?:for|by|from|called|named)?\s+(.+)$/,
  );
  if (explicit?.[1]?.trim()) return explicit[1].trim();
  const trailing = normalized.match(/^(.+?)\s+(?:music|song|songs|tracks?|artist|albums?)$/);
  return trailing?.[1]?.trim() || null;
}

export function musicMatchScore(track: { title: string; artist: string; album?: string }, query: string): number {
  const needle = comparable(query);
  const title = comparable(track.title);
  const artist = comparable(track.artist);
  const album = comparable(track.album ?? '');
  if (title === needle) return 100;
  if (`${title} ${artist}` === needle || `${artist} ${title}` === needle) return 98;
  if (artist === needle) return 96;
  if (title.startsWith(needle)) return 90;
  if (title.includes(needle)) return 82;
  if (album === needle) return 74;
  const terms = needle.split(' ').filter((term) => term.length > 1);
  const haystack = `${title} ${artist} ${album}`;
  return terms.length ? terms.filter((term) => haystack.includes(term)).length / terms.length * 60 : 0;
}