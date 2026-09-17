/**
 * Playlist sharing — a member can send one of their playlists to a friend.
 * The songs are copied at the moment of sharing, so the friend keeps a stable
 * copy they can open (and play) inside their own VR world.
 */
import { supabase } from '@/integrations/supabase/client';
import type { MusicTrack } from '@/features/music/musicProviders';
import type { Json } from '@/integrations/supabase/types';

export interface MusicFriend {
  id: string;
  name: string;
}

export interface SharedPlaylist {
  id: string;
  name: string;
  tracks: MusicTrack[];
  fromName: string;
  at: string;
}

function toTracks(value: unknown): MusicTrack[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is MusicTrack =>
    Boolean(item) && typeof item === 'object'
    && typeof (item as MusicTrack).id === 'string'
    && typeof (item as MusicTrack).title === 'string');
}

/** Friends a playlist can be sent to. */
export async function fetchMusicFriends(): Promise<MusicFriend[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const me = auth.user.id;
  const { data, error } = await supabase
    .from('friendships')
    .select('user1_id,user2_id')
    .or(`user1_id.eq.${me},user2_id.eq.${me}`);
  if (error) throw error;
  const ids = Array.from(new Set((data ?? [])
    .map((row) => (row.user1_id === me ? row.user2_id : row.user1_id) as string)
    .filter((id) => id && id !== me)));
  if (!ids.length) return [];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id,display_name,username')
    .in('user_id', ids);
  return ids.map((id) => {
    const profile = (profiles ?? []).find((row) => row.user_id === id) as
      { display_name?: string | null; username?: string | null } | undefined;
    return { id, name: profile?.display_name || profile?.username || 'Friend' };
  });
}

/** Sends a playlist to a friend and alerts them so it shows up in their VR world. */
export async function sharePlaylistWithFriend(
  playlist: { id: string; name: string; tracks: MusicTrack[] },
  friendId: string,
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sign in to share a playlist.');
  if (!playlist.tracks.length) throw new Error('Add a song to the playlist before sharing it.');

  const { data, error } = await supabase
    .from('music_playlist_shares')
    .insert({
      playlist_id: playlist.id,
      owner_id: auth.user.id,
      recipient_id: friendId,
      name: playlist.name,
      tracks: playlist.tracks as unknown as Json,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  const first = playlist.tracks[0];
  await supabase.from('notifications').insert({
    user_id: friendId,
    from_user_id: auth.user.id,
    type: 'playlist_share',
    context_data: {
      share_id: data.id,
      playlist_name: playlist.name,
      track_count: playlist.tracks.length,
      track_title: first.title,
      track_artist: first.artist ?? '',
      track_artwork: first.artwork ?? '',
    } as unknown as Json,
  });
}

/** Playlists friends have sent to the signed-in member. */
export async function fetchSharedWithMe(): Promise<SharedPlaylist[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from('music_playlist_shares')
    .select('id,name,tracks,owner_id,created_at')
    .eq('recipient_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  const rows = data ?? [];
  const owners = Array.from(new Set(rows.map((row) => row.owner_id as string)));
  const { data: profiles } = owners.length
    ? await supabase.from('profiles').select('user_id,display_name,username').in('user_id', owners)
    : { data: [] as Array<{ user_id: string; display_name?: string | null; username?: string | null }> };
  return rows.map((row) => {
    const owner = (profiles ?? []).find((profile) => profile.user_id === row.owner_id) as
      { display_name?: string | null; username?: string | null } | undefined;
    return {
      id: row.id as string,
      name: row.name as string,
      tracks: toTracks(row.tracks),
      fromName: owner?.display_name || owner?.username || 'Friend',
      at: new Date(row.created_at as string).toLocaleString(),
    };
  });
}

/** Loads a single shared playlist, used when an in-world alert is opened. */
export async function fetchSharedPlaylist(shareId: string): Promise<SharedPlaylist | null> {
  const { data, error } = await supabase
    .from('music_playlist_shares')
    .select('id,name,tracks,owner_id,created_at')
    .eq('id', shareId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id as string,
    name: data.name as string,
    tracks: toTracks(data.tracks),
    fromName: 'Friend',
    at: new Date(data.created_at as string).toLocaleString(),
  };
}
