/**
 * Music social layer — reactions, listen logging and community lists.
 *
 * All rows live in `music_reactions` and `music_listens`. Reads are open to
 * signed-in members (that is what powers the loved / recommended / shared /
 * most-listened lists); writes are always scoped to the current user by RLS.
 */
import { supabase } from '@/integrations/supabase/client';
import type { MusicTrack } from '@/features/music/musicProviders';

export const MUSIC_REACTIONS = [
  { id: 'happy', label: 'Happy', emoji: '😄' },
  { id: 'cool', label: 'Cool', emoji: '😎' },
  { id: 'loved', label: 'Loved it', emoji: '❤️' },
  { id: 'recommend', label: 'Recommend', emoji: '🙌' },
  { id: 'share', label: 'Share', emoji: '📣' },
] as const;

export type MusicReactionId = typeof MUSIC_REACTIONS[number]['id'];

export interface MusicSocialTrack {
  track_id: string;
  track_title: string;
  track_artist: string | null;
  track_artwork: string | null;
  count: number;
}

function trackColumns(track: MusicTrack) {
  return {
    track_id: track.id,
    track_title: track.title,
    track_artist: track.artist ?? null,
    track_artwork: track.artwork ?? null,
    track_source: track.source ?? null,
  };
}

/** Reaction ids the current user has already left on the given track. */
export async function fetchMyReactions(trackIds: string[]): Promise<Record<string, MusicReactionId[]>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user || !trackIds.length) return {};
  const { data } = await supabase
    .from('music_reactions')
    .select('track_id, reaction')
    .eq('user_id', auth.user.id)
    .in('track_id', trackIds);
  const map: Record<string, MusicReactionId[]> = {};
  (data ?? []).forEach((row) => {
    map[row.track_id] = [...(map[row.track_id] ?? []), row.reaction as MusicReactionId];
  });
  return map;
}

/** Adds the reaction, or removes it when it is already present. */
export async function toggleReaction(track: MusicTrack, reaction: MusicReactionId): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return false;
  const { data: existing } = await supabase
    .from('music_reactions')
    .select('id')
    .eq('user_id', auth.user.id)
    .eq('track_id', track.id)
    .eq('reaction', reaction)
    .maybeSingle();

  if (existing?.id) {
    await supabase.from('music_reactions').delete().eq('id', existing.id);
    return false;
  }
  await supabase.from('music_reactions').insert({ user_id: auth.user.id, reaction, ...trackColumns(track) });
  return true;
}

/**
 * Records that the current user played a track. A database trigger turns this
 * into a feed notification for friends who marked the same track as loved.
 */
export async function logListen(track: MusicTrack): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return;
  await supabase.from('music_listens').insert({ user_id: auth.user.id, ...trackColumns(track) });
}

function tally(rows: { track_id: string; track_title: string; track_artist: string | null; track_artwork: string | null }[]): MusicSocialTrack[] {
  const map = new Map<string, MusicSocialTrack>();
  rows.forEach((row) => {
    const current = map.get(row.track_id);
    if (current) current.count += 1;
    else map.set(row.track_id, { ...row, count: 1 });
  });
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 25);
}

/** Community list for one reaction across all members. */
export async function fetchReactionChart(reaction: MusicReactionId): Promise<MusicSocialTrack[]> {
  const { data } = await supabase
    .from('music_reactions')
    .select('track_id, track_title, track_artist, track_artwork')
    .eq('reaction', reaction)
    .order('created_at', { ascending: false })
    .limit(400);
  return tally(data ?? []);
}

/** Most listened tracks across all members. */
export async function fetchMostListened(): Promise<MusicSocialTrack[]> {
  const { data } = await supabase
    .from('music_listens')
    .select('track_id, track_title, track_artist, track_artwork')
    .order('created_at', { ascending: false })
    .limit(400);
  return tally(data ?? []);
}
