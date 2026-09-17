/**
 * Cloud playlists — owner-scoped rows in `music_playlists`, so a member's
 * playlists follow them to any device. Existing on-device playlists
 * (`musicLibrary`) are left untouched; they can be imported once.
 */
import { supabase } from '@/integrations/supabase/client';
import type { MusicTrack } from '@/features/music/musicProviders';
import { getLibrary, playlistTracks } from '@/features/music/musicLibrary';
import type { Json } from '@/integrations/supabase/types';

export interface MusicPlaylist {
  id: string;
  name: string;
  tracks: MusicTrack[];
  position: number;
}

type Row = { id: string; name: string; tracks: unknown; position: number };

function toTracks(value: unknown): MusicTrack[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is MusicTrack =>
    Boolean(item) && typeof item === 'object'
    && typeof (item as MusicTrack).id === 'string'
    && typeof (item as MusicTrack).title === 'string');
}

function toPlaylist(row: Row): MusicPlaylist {
  return { id: row.id, name: row.name, tracks: toTracks(row.tracks), position: row.position ?? 0 };
}

async function requireUser(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Sign in to manage your playlists.');
  return data.user.id;
}

export async function fetchMyPlaylists(): Promise<MusicPlaylist[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from('music_playlists')
    .select('id,name,tracks,position')
    .eq('user_id', auth.user.id)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => toPlaylist(row as Row));
}

export async function createPlaylist(name: string, tracks: MusicTrack[] = []): Promise<MusicPlaylist> {
  const userId = await requireUser();
  const clean = name.trim().slice(0, 80);
  if (!clean) throw new Error('Give the playlist a name.');
  const { data, error } = await supabase
    .from('music_playlists')
    .insert({ user_id: userId, name: clean, tracks: tracks as unknown as Json })
    .select('id,name,tracks,position')
    .single();
  if (error) throw new Error(error.code === '23505' ? 'You already have a playlist with that name.' : error.message);
  return toPlaylist(data as Row);
}

export async function renamePlaylist(id: string, name: string): Promise<void> {
  const clean = name.trim().slice(0, 80);
  if (!clean) throw new Error('Give the playlist a name.');
  const { error } = await supabase.from('music_playlists').update({ name: clean }).eq('id', id);
  if (error) throw new Error(error.code === '23505' ? 'You already have a playlist with that name.' : error.message);
}

export async function deletePlaylist(id: string): Promise<void> {
  const { error } = await supabase.from('music_playlists').delete().eq('id', id);
  if (error) throw error;
}

export async function savePlaylistTracks(id: string, tracks: MusicTrack[]): Promise<void> {
  const { error } = await supabase
    .from('music_playlists')
    .update({ tracks: tracks as unknown as Json })
    .eq('id', id);
  if (error) throw error;
}

/** Adds a track once; keeps the order songs were added in. */
export function withTrack(tracks: MusicTrack[], track: MusicTrack): MusicTrack[] {
  return tracks.some((item) => item.id === track.id) ? tracks : [...tracks, track];
}

export function withoutTrack(tracks: MusicTrack[], trackId: string): MusicTrack[] {
  return tracks.filter((track) => track.id !== trackId);
}

/** Result of dragging one song from one playlist onto another. */
export function moveTrackBetween(
  playlists: MusicPlaylist[],
  fromId: string,
  toId: string,
  trackId: string,
): MusicPlaylist[] {
  if (fromId === toId) return playlists;
  const source = playlists.find((playlist) => playlist.id === fromId);
  const track = source?.tracks.find((item) => item.id === trackId);
  if (!track) return playlists;
  return playlists.map((playlist) => {
    if (playlist.id === fromId) return { ...playlist, tracks: withoutTrack(playlist.tracks, trackId) };
    if (playlist.id === toId) return { ...playlist, tracks: withTrack(playlist.tracks, track) };
    return playlist;
  });
}

/** Adds a song to a cloud playlist, creating it when the name is new. */
export async function addTrackToPlaylistByName(name: string, track: MusicTrack): Promise<void> {
  const existing = await fetchMyPlaylists();
  const match = existing.find((playlist) => playlist.name.toLowerCase() === name.trim().toLowerCase());
  if (!match) { await createPlaylist(name, [track]); return; }
  await savePlaylistTracks(match.id, withTrack(match.tracks, track));
}

/** One-time copy of the on-device playlists into the cloud. Never deletes anything. */
export async function importDevicePlaylists(): Promise<number> {
  const local = Object.keys(getLibrary().playlists);
  if (!local.length) return 0;
  const existing = await fetchMyPlaylists();
  const names = new Set(existing.map((playlist) => playlist.name.toLowerCase()));
  let created = 0;
  for (const name of local) {
    if (names.has(name.toLowerCase())) continue;
    const tracks = playlistTracks(name);
    if (!tracks.length) continue;
    await createPlaylist(name, tracks);
    created += 1;
  }
  return created;
}
