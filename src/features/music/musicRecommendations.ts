/**
 * Song recommendations built from real signals only:
 *  - the member's own listening history (`music_listens`),
 *  - what their friends actually played (friendships + `music_listens`),
 *  - the taste they saved on their music profile (`music_profiles`).
 *
 * Nothing is invented: when there is no signal, the section is simply absent.
 */
import { supabase } from '@/integrations/supabase/client';
import { searchMusicCatalog, type MusicTrack } from '@/features/music/musicProviders';
import { fetchMyListening } from '@/features/music/musicSocial';
import { fetchMyMusicProfile, type MusicTasteProfile } from '@/features/music/musicProfile';

export interface MusicRecommendationSection {
  id: string;
  label: string;
  reason: string;
  tracks: MusicTrack[];
}

async function myFriendIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('friendships')
    .select('user1_id,user2_id')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
  const ids = new Set<string>();
  (data ?? []).forEach((row) => {
    const pair = row as { user1_id: string; user2_id: string };
    const other = pair.user1_id === userId ? pair.user2_id : pair.user1_id;
    if (other) ids.add(other);
  });
  return [...ids];
}

/**
 * Songs friends played that the member has not played themselves.
 * Ranked by how many friend plays a song has (popularity among friends),
 * then by how recently it was played. Each song appears once.
 */
async function friendPlays(friendIds: string[], skip: Set<string>): Promise<MusicTrack[]> {
  if (!friendIds.length) return [];
  const { data } = await supabase
    .from('music_listens')
    .select('track_id,track_title,track_artist,track_artwork,track_source,track_url,created_at')
    .in('user_id', friendIds)
    .order('created_at', { ascending: false })
    .limit(300);
  const ranked = new Map<string, { track: MusicTrack; plays: number; order: number }>();
  (data ?? []).forEach((row, order) => {
    const id = row.track_id;
    const url = row.track_url;
    // Another member's private upload cannot be opened, so it is never suggested.
    if (!id || !url || row.track_source === 'upload' || skip.has(id)) return;
    const existing = ranked.get(id);
    if (existing) { existing.plays += 1; return; }
    ranked.set(id, {
      plays: 1,
      order,
      track: {
        id,
        title: row.track_title || 'Untitled',
        artist: row.track_artist || 'Unknown artist',
        artwork: row.track_artwork || undefined,
        url,
        source: (row.track_source as MusicTrack['source']) || 'archive',
        credit: 'Played by a friend',
      },
    });
  });
  return [...ranked.values()]
    .sort((a, b) => (b.plays - a.plays) || (a.order - b.order))
    .slice(0, 20)
    .map((entry) => entry.track);
}


function seeds(profile: MusicTasteProfile, history: MusicTrack[]): string[] {
  const fromHistory = [...new Set(history.map((track) => track.artist).filter((artist) => artist && artist !== 'Unknown artist'))].slice(0, 2);
  return [...new Set([...profile.artists.slice(0, 2), ...profile.genres.slice(0, 2), ...profile.moods.slice(0, 1), ...fromHistory])]
    .filter(Boolean)
    .slice(0, 4);
}

export async function fetchMusicRecommendations(): Promise<MusicRecommendationSection[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const [history, profile] = await Promise.all([fetchMyListening(), fetchMyMusicProfile()]);
  const played = new Set(history.map((track) => track.id));
  const sections: MusicRecommendationSection[] = [];
  // A song is only suggested once across the whole page.
  const suggested = new Set<string>(played);
  const take = (tracks: MusicTrack[], max: number) => {
    const out: MusicTrack[] = [];
    for (const track of tracks) {
      if (suggested.has(track.id)) continue;
      suggested.add(track.id);
      out.push(track);
      if (out.length >= max) break;
    }
    return out;
  };

  const friends = await myFriendIds(auth.user.id);
  const fromFriends = take(await friendPlays(friends, played), 20);
  if (fromFriends.length) {
    sections.push({ id: 'friends', label: 'Your friends are playing', reason: 'Real plays from people you are connected with', tracks: fromFriends });
  }

  const searches = await Promise.all(seeds(profile, history).map(async (seed) => {
    try {
      const result = await searchMusicCatalog(seed, 'track');
      return { seed, tracks: result.tracks };
    } catch { return { seed, tracks: [] as MusicTrack[] }; }
  }));
  searches.forEach(({ seed, tracks }) => {
    const picked = take(tracks, 12);
    if (picked.length) sections.push({ id: `seed-${seed}`, label: `Because you like ${seed}`, reason: 'From your music profile and listening history', tracks: picked });
  });


  if (history.length) {
    sections.push({ id: 'again', label: 'Play it again', reason: 'Your most played songs', tracks: history.slice(0, 12) });
  }
  return sections;
}
