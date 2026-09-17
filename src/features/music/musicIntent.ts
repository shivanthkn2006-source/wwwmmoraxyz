/**
 * SPOKEN MUSIC INTENTS
 *
 * Deterministic, non-blocking parsing of music commands. Returns `null` for
 * anything that is not clearly about playback, so ordinary conversation is
 * never hijacked ("stop" alone, "what's the news", "pause the video", …).
 */

export type MusicIntent =
  | { kind: 'play'; query: string; lookup: 'track' | 'mood' | 'genre' | 'radio' | 'devotional'; speak: string }
  | { kind: 'personal'; scope: 'favorite' | 'playlist' | 'history' | 'mood'; speak: string }
  | { kind: 'resume'; speak: string }
  | { kind: 'pause'; speak: string }
  | { kind: 'stop'; speak: string }
  | { kind: 'next'; speak: string }
  | { kind: 'previous'; speak: string }
  | { kind: 'open'; speak: string };

const MUSIC_WORD = /\b(music|song|songs|track|tracks|playlist|radio|station|satellite|album|tune|tunes)\b/;
const OTHER_MEDIA_OR_ACTION = /\b(video|movie|film|reel|post|game|scan|audit|check|resume|presentation|slideshow|animation|recording)\b/;
// Ordinary "play/start …" sentences that are never about music playback.
const NON_MUSIC_REQUEST = /\b(over|again from|my day|a call|the call|meeting|timer|stopwatch|workout|session|conversation|chat|onboarding|tutorial|upload|download|backup|sync|test|tests|diagnostics|report|deployment|build|scan|search for|recording|stream|livestream|broadcast|countdown|quiz|challenge|journey)\b/;


const MOODS: Record<string, string> = {
  happy: 'happy',
  sad: 'melancholic',
  calm: 'calm',
  relax: 'relaxing',
  relaxed: 'relaxing',
  relaxing: 'relaxing',
  focus: 'focus',
  study: 'focus',
  work: 'focus',
  energetic: 'energetic',
  upbeat: 'upbeat',
  sleep: 'sleep',
  romantic: 'romantic',
  angry: 'intense',
  motivated: 'motivational',
};

const GENRES = [
  'devotional',
  'bhajan',
  'classical',
  'carnatic',
  'jazz',
  'lofi',
  'lo-fi',
  'rock',
  'pop',
  'hip hop',
  'electronic',
  'techno',
  'house',
  'ambient',
  'instrumental',
  'blues',
  'metal',
  'country',
  'reggae',
  'folk',
  'gospel',
  'qawwali',
  'ghazal',
  'kirtan',
  'meditation',
  'mantra',
];

function clean(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s'’-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveMusicIntent(raw: string): MusicIntent | null {
  const text = clean(raw).replace(/^(?:hey\s+)?zoe[,\s]+/, '');
  if (!text) return null;

  // ── transport controls: only when music is clearly the subject ──
  if (/^(pause|stop|mute)( the)?( music| song| radio| track| playlist)$/.test(text)
      || /^(pause|stop) playing( music| the music| the song)?$/.test(text)) {
    const stop = /^stop/.test(text);
    return stop
      ? { kind: 'stop', speak: 'Stopped the music.' }
      : { kind: 'pause', speak: 'Paused.' };
  }
  if (/^(resume|continue|unpause|keep playing)( the)?( music| song| track| playlist)?$/.test(text)
      || /^play( the)?( music| song) again$/.test(text)) {
    return { kind: 'resume', speak: 'Resuming.' };
  }
  if (/^(next|skip)( song| track| this song| this| please)?$/.test(text) || /\bnext (song|track)\b/.test(text)) {
    return { kind: 'next', speak: 'Next one.' };
  }
  if (/^(previous|last|go back)( song| track)?$/.test(text) || /\bprevious (song|track)\b/.test(text)) {
    return { kind: 'previous', speak: 'Going back one.' };
  }
  if (/^(open|show|go to)( the)? (music|player|music player|music page)$/.test(text)) {
    return { kind: 'open', speak: 'Opening music.' };
  }

  // ── playback requests ──
  // "play …" / "put on …" / "start playing …" are treated as playback verbs.
  // A bare "start …" only counts when the rest clearly sounds like a track
  // (mentions music, names an artist with "by", or is a quoted title).
  const play = text.match(/^(?:play|put on|start playing|start)\s+(.+)$/);
  if (!play) return null;
  const bareStart = /^start\s/.test(text) && !/^start playing\s/.test(text);
  let body = play[1]
    .replace(/^(?:me|us)\s+/, '')
    .replace(/^(?:a|an|the|some)\s+/, '')
    .replace(/\bfor me\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!body) return null;
  if (/^(fair|nice|safe|along|dead|dumb|pretend|with (me|us)|a game)$/.test(body)) return null;
  if (NON_MUSIC_REQUEST.test(body)) return null;
  if (OTHER_MEDIA_OR_ACTION.test(body) && !MUSIC_WORD.test(body)) return null;
  if (bareStart) {
    const soundsLikeATrack = MUSIC_WORD.test(body)
      || /\bby\s+\w+/.test(body)
      || /['’"]/.test(raw)
      || GENRES.some((g) => body.includes(g))
      || Object.keys(MOODS).some((m) => new RegExp(`\\b${m}\\b`).test(body));
    if (!soundsLikeATrack) return null;
  }

  if (/\b(my favou?rites?|my songs?|songs? i (?:love|like)|what i usually play)\b/.test(body)) {
    return { kind: 'personal', scope: 'favorite', speak: 'Starting music you love.' };
  }
  if (/\b(my playlists?|from my playlists?)\b/.test(body)) {
    return { kind: 'personal', scope: 'playlist', speak: 'Starting your playlist music.' };
  }
  if (/\b(my recent music|what i played|my listening history)\b/.test(body)) {
    return { kind: 'personal', scope: 'history', speak: 'Starting something from your listening history.' };
  }


  // "play a song based on my current mood" / "play something for my mood"
  if (/\b(my (current )?mood|how i (feel|am feeling)|based on my mood)\b/.test(body)) {
    return { kind: 'personal', scope: 'mood', speak: 'Reading your preferences and starting something that fits.' };
  }

  // "play relaxing music" / "play something upbeat"
  for (const [word, tag] of Object.entries(MOODS)) {
    if (new RegExp(`\\b${word}\\b`).test(body)) {
      return { kind: 'play', query: tag, lookup: 'mood', speak: `Starting something ${tag}.` };
    }
  }

  // "play a Hindi devotional song" / "play a Tamil pop station"
  const genre = /\b(radio|station|fm|satellite)\b/.test(body) ? undefined : GENRES.find((g) => body.includes(g));
  if (genre) {
    const devotional = /devotional|bhajan|kirtan|mantra|gospel|qawwali/.test(genre);
    const query = body.replace(/\b(song|songs|music|track|tracks|playlist|station|radio)\b/g, '').trim() || genre;
    return {
      kind: 'play',
      query,
      lookup: devotional ? 'devotional' : 'genre',
      speak: `Looking for ${query}.`,
    };
  }

  // "play radio" / "play a Spanish station"
  if (/\b(radio|station|fm|satellite)\b/.test(body)) {
    const query = body.replace(/\b(radio|station|fm|satellite|live)\b/g, '').trim() || 'top';
    return { kind: 'play', query, lookup: 'radio', speak: `Tuning in to ${query} radio.` };
  }

  // Anything else that mentions music, or a named title: exact search.
  const named = body.replace(/\b(song|songs|track|music|theme song)\b/g, '').replace(/\s+/g, ' ').trim();
  if (MUSIC_WORD.test(body) || named.length >= 4) {
    const query = named || body;
    return { kind: 'play', query, lookup: 'track', speak: `Looking for ${query}.` };
  }
  return null;
}
