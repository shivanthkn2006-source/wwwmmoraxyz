import { supabase } from '@/integrations/supabase/client';
import { ensureLiveSession } from '@/lib/sessionGuard';
import { getLibrary, playlistTracks } from '@/features/music/musicLibrary';
import { fetchMyListening } from '@/features/music/musicSocial';
import { searchMusicCatalog, type MusicTrack } from '@/features/music/musicProviders';
import { faithKeywordsFor } from '@/features/music/musicFaith';
import type { Json } from '@/integrations/supabase/types';

export type MusicSignalType = 'play' | 'skip' | 'complete' | 'replay' | 'save' | 'unsave' | 'reaction' | 'search' | 'suggestion_select' | 'playlist_add' | 'explicit_preference';

export interface MusicConnectContext {
  suggestions: string[];
  taste: { genres: string[]; moods: string[]; artists: string[]; recentTracks: string[]; religion: string };
  planetary: Record<string, unknown>;
  expiresAt: string | null;
}

export const SUGGESTION_COUNT = 10;

const FALLBACKS = [
  'calm music', 'focus music', 'uplifting music', 'melodic music', 'evening chill',
  'morning uplifting', 'sleep ambient', 'devotional music', 'workout energy', 'instrumental meditation',
];

function cleanFive(values: unknown): string[] {
  const input = Array.isArray(values) ? values : [];
  const result = [...new Set(input.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).map((value) => value.trim()))].slice(0, SUGGESTION_COUNT);
  for (const fallback of FALLBACKS) if (result.length < SUGGESTION_COUNT && !result.includes(fallback)) result.push(fallback);
  return result.slice(0, SUGGESTION_COUNT);
}

function mapContext(row: Record<string, unknown> | null): MusicConnectContext {
  const taste = row?.taste_vector && typeof row.taste_vector === 'object' ? row.taste_vector as Record<string, unknown> : {};
  const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  const religion = typeof taste.religion === 'string' ? taste.religion : '';
  // A member's faith always contributes devotional search words, even when the
  // planetary words alone would have filled the list.
  const faith = faithKeywordsFor(religion);
  const keywords = Array.isArray(row?.suggestion_keywords) ? strings(row?.suggestion_keywords) : [];
  const withFaith = faith.length
    ? [...keywords.slice(0, 6), ...faith.slice(0, 2), ...keywords.slice(6)]
    : keywords;
  return {
    suggestions: cleanFive(withFaith),
    taste: { genres: strings(taste.genres), moods: strings(taste.moods), artists: strings(taste.artists), recentTracks: strings(taste.recentTracks), religion },
    planetary: row?.planetary_context && typeof row.planetary_context === 'object' ? row.planetary_context as Record<string, unknown> : {},
    expiresAt: typeof row?.expires_at === 'string' ? row.expires_at : null,
  };
}

/** Natural search completions, the way a search engine offers them. */
const TYPED_COMPLETIONS = ['songs', 'music', 'live', 'instrumental', 'remix', 'playlist', 'album', 'devotional', 'lyrics', 'best songs'];

export function filterMusicSuggestions(suggestions: string[], query: string): string[] {
  const term = query.trim();
  const needle = term.toLowerCase();
  if (!needle) return cleanFive(suggestions);
  // While typing, only real completions of what was typed are shown — never the
  // typed text glued in front of unrelated mood keywords.
  const matching = suggestions.filter((item) => item.toLowerCase().includes(needle));
  const completions = TYPED_COMPLETIONS.map((word) => `${term} ${word}`);
  const result = [...new Set([term, ...matching, ...completions])].slice(0, SUGGESTION_COUNT);
  return result;
}

export async function fetchMusicConnectContext(force = false): Promise<MusicConnectContext> {
  // Never call the function without a live token: it would answer as a signed-out
  // visitor and the failed request would surface as a runtime error.
  if (!(await ensureLiveSession())) return mapContext(null);
  if (!force) {
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const { data } = await supabase.from('music_connect_context').select('taste_vector,suggestion_keywords,planetary_context,expires_at').eq('user_id', auth.user.id).maybeSingle();
      if (data && Date.parse(data.expires_at) > Date.now()) return mapContext(data as Record<string, unknown>);
    }
  }
  const { data, error } = await supabase.functions.invoke('music-connect-context', { body: { force } });
  if (error) return mapContext(null);
  return mapContext((data ?? null) as Record<string, unknown> | null);
}

const WEIGHTS: Record<MusicSignalType, number> = { play: 0.5, skip: -1, complete: 2, replay: 2.5, save: 3, unsave: -2, reaction: 2, search: 0.25, suggestion_select: 1, playlist_add: 3, explicit_preference: 5 };

export async function recordMusicSignal(eventType: MusicSignalType, options: { track?: MusicTrack | null; query?: string; mood?: string; genre?: string; progressRatio?: number; context?: Record<string, unknown> } = {}): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const track = options.track;
  const { error } = await supabase.from('music_preference_signals').insert({
    user_id: auth.user.id, event_type: eventType, signal_weight: WEIGHTS[eventType],
    track_id: track?.id ?? null, track_title: track?.title ?? null, track_artist: track?.artist ?? null,
    track_source: track?.source ?? null, query_text: options.query?.slice(0, 240) ?? null,
    mood: options.mood ?? null, genre: options.genre ?? null,
    progress_ratio: options.progressRatio == null ? null : Math.max(0, Math.min(1, options.progressRatio)),
    context: (options.context ?? {}) as Json,
  });
  if (error) console.warn('[music-connect] signal not saved:', error.message);
}

export async function resolvePersonalMusicQueue(scope: 'favorite' | 'playlist' | 'history' | 'mood' | 'chart'): Promise<MusicTrack[]> {
  const library = getLibrary();
  if (scope === 'chart') {
    // Keywords already derive from real Swiss-Ephemeris positions and the current
    // dasha period, so no model call is needed to pick what to play.
    const context = await fetchMusicConnectContext();
    for (const keyword of context.suggestions) {
      const { tracks } = await searchMusicCatalog(keyword, 'track').catch(() => ({ tracks: [] as MusicTrack[] }));
      if (tracks.length) return tracks;
    }
    return library.saved;
  }
  if (scope === 'favorite') return library.saved;
  if (scope === 'playlist') return Object.keys(library.playlists).flatMap(playlistTracks).filter((track, index, all) => all.findIndex((item) => item.id === track.id) === index);
  const history = await fetchMyListening();
  if (scope === 'history') return history;
  const context = await fetchMusicConnectContext();
  const artists = new Set(context.taste.artists.map((artist) => artist.toLowerCase()));
  const matched = [...library.saved, ...history].filter((track) => artists.has(track.artist.toLowerCase()));
  return matched.length ? matched : [...library.saved, ...history].filter((track, index, all) => all.findIndex((item) => item.id === track.id) === index);
}