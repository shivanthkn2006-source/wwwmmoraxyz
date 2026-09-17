import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ListPlus, Play, Sparkles, Stars } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { musicEngine } from '@/services/MusicEngine';
import TrackArtwork from '@/components/music/TrackArtwork';
import { fetchMusicConnectContext, recordMusicSignal, type MusicConnectContext } from '@/features/music/musicConnect';
import { searchMusicCatalog, type MusicTrack } from '@/features/music/musicProviders';
import { addTrackToPlaylistByName } from '@/features/music/musicPlaylists';
import { addToTray } from '@/features/music/musicTray';

interface ChartGroup { keyword: string; tracks: MusicTrack[] }

/**
 * Songs chosen from the member's own planetary picture — real Swiss-Ephemeris
 * positions and the current planetary period, plus the genres and moods they
 * saved — resolved by the same Zoe resolver the Music page uses.
 */
export default function MusicBirthChartPage() {
  const navigate = useNavigate();
  const [context, setContext] = useState<MusicConnectContext | null>(null);
  const [groups, setGroups] = useState<ChartGroup[]>([]);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const ctx = await fetchMusicConnectContext();
        if (cancelled) return;
        setContext(ctx);
        const found = await Promise.all(ctx.suggestions.slice(0, 5).map(async (keyword) => {
          const { tracks } = await searchMusicCatalog(keyword, 'track').catch(() => ({ tracks: [] as MusicTrack[] }));
          return { keyword, tracks: tracks.slice(0, 12) };
        }));
        if (cancelled) return;
        const seen = new Set<string>();
        setGroups(found
          .map((group) => ({ keyword: group.keyword, tracks: group.tracks.filter((track) => !seen.has(track.id) && seen.add(track.id)) }))
          .filter((group) => group.tracks.length));
      } catch {
        if (!cancelled) setNotice('Your chart picks could not be loaded. Check your connection and try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const play = async (tracks: MusicTrack[], index: number, keyword: string) => {
    musicEngine.unlock();
    const started = await musicEngine.playQueue(tracks, index);
    void recordMusicSignal('play', { track: tracks[index], mood: keyword });
    if (!started) setNotice(musicEngine.getState().error ?? 'That song could not be played. Please try another one.');
  };

  const savePlaylist = async (group: ChartGroup) => {
    try {
      for (const track of group.tracks.slice(0, 12)) await addTrackToPlaylistByName(group.keyword, track);
      setNotice(`Saved “${group.keyword}” to your playlists.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'That playlist could not be saved.');
    }
  };

  const planetLabels = Object.entries(context?.planetary ?? {})
    .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
    .slice(0, 8);

  return (
    <main className="music-liquid-page flex min-h-[100dvh] flex-col p-0 text-white">
      <Helmet>
        <title>Birth Chart Music Picks — Planetary Moods & Your Genres</title>
        <meta name="description" content="Songs and playlists chosen from your birth chart, your current planetary period and the genres and moods you saved, all playable in one tap." />
      </Helmet>
      <div className="music-liquid-shell flex min-h-[100dvh] w-full flex-col overflow-hidden">
        <header className="music-align-search flex items-center gap-2 p-3">
          <Button variant="ghost" size="icon" aria-label="Back to Music" onClick={() => navigate('/music')}><ArrowLeft /></Button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">My birth chart picks</h1>
          <Button variant="ghost" size="icon" aria-label="Edit my music taste" onClick={() => navigate('/music/profile')}><Stars className="h-4 w-4" /></Button>
        </header>

        {notice && <p role="status" aria-live="polite" className="px-4 text-[11px] text-white/60">{notice}</p>}

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
          <section aria-label="What your chart says right now">
            <p className="music-liquid-side-title flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Right now in your chart</p>
            <div className="flex flex-wrap gap-1.5">
              {planetLabels.map(([key, value]) => (
                <span key={key} className="music-liquid-chip">{key.replace(/_/g, ' ')}: {String(value)}</span>
              ))}
              {!planetLabels.length && <p className="text-[11px] text-white/40">Save your birth date, time and place with Zoe and your planetary picture appears here.</p>}
            </div>
            {(context?.taste.genres.length || context?.taste.moods.length) ? (
              <p className="mt-2 text-[11px] text-white/50">Mixed with your saved taste: {[...(context?.taste.genres ?? []), ...(context?.taste.moods ?? [])].slice(0, 6).join(', ')}</p>
            ) : null}
          </section>

          {loading && <p role="status" className="text-[11px] text-white/60">Reading your chart and finding real songs…</p>}
          {!loading && !groups.length && !notice && (
            <p className="text-sm text-white/60">No playable songs came back for your chart just now. Try again in a moment.</p>
          )}

          {groups.map((group) => (
            <section key={group.keyword} aria-label={`Songs for ${group.keyword}`} className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="music-liquid-side-title min-w-0 flex-1 truncate">{group.keyword}</p>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Play all ${group.keyword} songs`} onClick={() => void play(group.tracks, 0, group.keyword)}><Play className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Save ${group.keyword} as a playlist`} onClick={() => void savePlaylist(group)}><ListPlus className="h-4 w-4" /></Button>
              </div>
              <ul className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                {group.tracks.map((track, index) => (
                  <li key={`${group.keyword}-${track.id}`} className="music-liquid-control flex items-center gap-2 rounded-2xl p-2">
                    <TrackArtwork
                      src={track.artwork}
                      trackId={track.id}
                      alt={track.title}
                      className="h-9 w-9 shrink-0 rounded-lg object-cover"
                      fallback={<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[10px] text-white/50">♪</span>}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs">{track.title}</span>
                      <span className="block truncate text-[11px] text-white/50">{track.artist}</span>
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Play ${track.title}`} onClick={() => void play(group.tracks, index, group.keyword)}><Play className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white" aria-label={`Send ${track.title} to my playlists page`} onClick={() => { addToTray(track); setNotice(`“${track.title}” is waiting on your playlists page.`); }}><ListPlus className="h-4 w-4" /></Button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
