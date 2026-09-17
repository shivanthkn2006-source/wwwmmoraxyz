import { supabase } from '@/integrations/supabase/client';
import { getLibrary, playlistTracks } from '@/features/music/musicLibrary';
import { fetchMyListening } from '@/features/music/musicSocial';
import type { MusicTrack } from '@/features/music/musicProviders';
import type { Json } from '@/integrations/supabase/types';

export type MusicSignalType = 'play' | 'skip' | 'complete' | 'replay' | 'save' | 'unsave' | 'reaction' | 'search' | 'suggestion_select' | 'playlist_add' | 'explicit_preference';

export interface MusicConnectContext {
  suggestions: string[];
  taste: { genres: string[]; moods: string[]; artists: string[]; recentTracks: string[] };
  planetary: Record<string, unknown>;
  expiresAt: string | null;
}

const FALLBACKS = ['calm music', 'focus music', 'uplifting music', 'melodic music', 'evening chill'];

function cleanFive(values: unknown): string[] {
  const input = Array.isArray(values) ? values : [];
  const result = [...new Set(input.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).map((value) => value.trim()))].slice(0, 5);
  for (const fallback of FALLBACKS) if (result.length < 5 && !result.includes(fallback)) result.push(fallback);
  return result.slice(0, 5);
}

function mapContext(row: Record<string, unknown> | null): MusicConnectContext {
  const taste = row?.taste_vector && typeof row.taste_vector === 'object' ? row.taste_vector as Record<string, unknown> : {};
  const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  return {
    suggestions: cleanFive(row?.suggestion_keywords),
    taste: { genres: strings(taste.genres), moods: strings(taste.moods), artists: strings(taste.artists), recentTracks: strings(taste.recentTracks) },
    planetary: row?.planetary_context && typeof row.planetary_context === 'object' ? row.planetary_context as Record<string, unknown> : {},
    expiresAt: typeof row?.expires_at === 'string' ? row.expires_at : null,
  };
}

export function filterMusicSuggestions(suggestions: string[], query: string): string[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return cleanFive(suggestions);
  const matching = suggestions.filter((item) => item.toLowerCase().includes(needle));
  const expanded = suggestions.map((item) => `${query.trim()} ${item}`.trim());
  return cleanFive([...matching, ...expanded]);
}

export async function fetchMusicConnectContext(force = false): Promise<MusicConnectContext> {
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

export async function resolvePersonalMusicQueue(scope: 'favorite' | 'playlist' | 'history' | 'mood'): Promise<MusicTrack[]> {
  const library = getLibrary();
  if (scope === 'favorite') return library.saved;
  if (scope === 'playlist') return Object.keys(library.playlists).flatMap(playlistTracks).filter((track, index, all) => all.findIndex((item) => item.id === track.id) === index);
  const history = await fetchMyListening();
  if (scope === 'history') return history;
  const context = await fetchMusicConnectContext();
  const artists = new Set(context.taste.artists.map((artist) => artist.toLowerCase()));
  const matched = [...library.saved, ...history].filter((track) => artists.has(track.artist.toLowerCase()));
  return matched.length ? matched : [...library.saved, ...history].filter((track, index, all) => all.findIndex((item) => item.id === track.id) === index);
}