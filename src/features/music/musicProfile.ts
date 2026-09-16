/**
 * A member's music taste — favourite genres, moods, artists and songs.
 * Stored in `music_profiles`; every member may read another member's taste so
 * friend-based recommendations can work, but only the owner may change it.
 */
import { supabase } from '@/integrations/supabase/client';
import type { MusicTrack } from '@/features/music/musicProviders';

export interface MusicTasteProfile {
  genres: string[];
  moods: string[];
  artists: string[];
  favoriteTracks: MusicTrack[];
}

export const MUSIC_MOODS = ['Happy', 'Calm', 'Focus', 'Energetic', 'Romantic', 'Sad', 'Devotional', 'Party', 'Sleep', 'Workout'] as const;

export const EMPTY_TASTE: MusicTasteProfile = { genres: [], moods: [], artists: [], favoriteTracks: [] };

type Row = { genres: string[] | null; moods: string[] | null; artists: string[] | null; favorite_tracks: unknown };

function toProfile(row: Row | null): MusicTasteProfile {
  if (!row) return EMPTY_TASTE;
  const favorites = Array.isArray(row.favorite_tracks) ? (row.favorite_tracks as MusicTrack[]) : [];
  return {
    genres: row.genres ?? [],
    moods: row.moods ?? [],
    artists: row.artists ?? [],
    favoriteTracks: favorites.filter((track) => track && typeof track.title === 'string'),
  };
}

export async function fetchMyMusicProfile(): Promise<MusicTasteProfile> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return EMPTY_TASTE;
  const { data } = await supabase
    .from('music_profiles')
    .select('genres,moods,artists,favorite_tracks')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  return toProfile((data ?? null) as Row | null);
}

export async function saveMyMusicProfile(profile: MusicTasteProfile): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sign in to save your music taste.');
  const { error } = await supabase.from('music_profiles').upsert({
    user_id: auth.user.id,
    genres: profile.genres,
    moods: profile.moods,
    artists: profile.artists,
    favorite_tracks: profile.favoriteTracks.map((track) => ({
      id: track.id, title: track.title, artist: track.artist, album: track.album ?? null,
      artwork: track.artwork ?? null, url: track.source === 'upload' ? track.id : track.url,
      uploadId: (track as MusicTrack & { uploadId?: string }).uploadId ?? null,
      source: track.source, credit: track.credit,
    })),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

/** Taste profiles for a set of members, used when blending friends' plays. */
export async function fetchMusicProfilesFor(userIds: string[]): Promise<Map<string, MusicTasteProfile>> {
  if (!userIds.length) return new Map();
  const { data } = await supabase
    .from('music_profiles')
    .select('user_id,genres,moods,artists,favorite_tracks')
    .in('user_id', userIds);
  return new Map((data ?? []).map((row) => [(row as { user_id: string }).user_id, toProfile(row as Row)]));
}
