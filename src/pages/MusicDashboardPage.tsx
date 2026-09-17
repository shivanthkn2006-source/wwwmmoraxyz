import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, ListMusic, Play, Sparkles, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { musicEngine } from '@/services/MusicEngine';
import TrackArtwork from '@/components/music/TrackArtwork';
import { fetchMyListening } from '@/features/music/musicSocial';
import { fetchMyMusicProfile, EMPTY_TASTE, type MusicTasteProfile } from '@/features/music/musicProfile';
import { fetchMusicConnectContext, resolvePersonalMusicQueue } from '@/features/music/musicConnect';
import type { MusicTrack } from '@/features/music/musicProviders';

/** One place to see what I listen to, what I love, and what Zoe suggests today. */
export default function MusicDashboardPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<MusicTrack[]>([]);
  const [taste, setTaste] = useState<MusicTasteProfile>(EMPTY_TASTE);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([fetchMyListening(), fetchMyMusicProfile(), fetchMusicConnectContext()])
      .then(([listens, profile, connect]) => {
        if (cancelled) return;
        if (listens.status === 'fulfilled') setHistory(listens.value);
        if (profile.status === 'fulfilled') setTaste(profile.value);
        if (connect.status === 'fulfilled') setSuggestions(connect.value.suggestions);
        if (listens.status === 'rejected') setNotice('Some of your music data could not be loaded.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const playList = (tracks: MusicTrack[], index = 0) => {
    if (!tracks.length) return;
    musicEngine.unlock();
    void musicEngine.playQueue(tracks, index);
  };

  const playSuggestion = async (keyword: string) => {
    setNotice(`Finding ${keyword}…`);
    musicEngine.unlock();
    const tracks = await resolvePersonalMusicQueue('chart').catch(() => [] as MusicTrack[]);
    if (!tracks.length) { setNotice('Nothing playable came back from the music sources just now.'); return; }
    await musicEngine.playQueue(tracks);
    setNotice(`Playing ${keyword}.`);
  };

  const trackList = (tracks: MusicTrack[]) => (
    <ul className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
      {tracks.map((track, index) => (
        <li key={`${track.id}-${index}`} className="music-liquid-control flex items-center gap-2 rounded-2xl p-2">
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
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Play ${track.title}`} onClick={() => playList(tracks, index)}><Play className="h-4 w-4" /></Button>
        </li>
      ))}
    </ul>
  );

  return (
    <main className="music-liquid-page flex min-h-[100dvh] flex-col p-0 text-white">
      <Helmet>
        <title>My Music Dashboard — History, Favourites & Zoe Picks</title>
        <meta name="description" content="See your listening history, favourite tracks and Zoe's mood and chart based music picks in one place, and play any of them instantly." />
      </Helmet>
      <div className="music-liquid-shell flex min-h-[100dvh] w-full flex-col overflow-hidden">
        <header className="music-align-search flex items-center justify-between gap-2 p-3">
          <Button variant="ghost" size="icon" aria-label="Back to Music" onClick={() => navigate('/music')}><ArrowLeft /></Button>
          <h1 className="text-sm font-semibold">My music dashboard</h1>
          <span className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="My birth chart music picks" onClick={() => navigate('/music/birth-chart')}><Sparkles className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label="My playlists" onClick={() => navigate('/music/playlists')}><ListMusic className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label="Edit my music taste" onClick={() => navigate('/music/profile')}><User className="h-4 w-4" /></Button>
          </span>
        </header>

        {notice && <p role="status" className="px-4 text-[11px] text-white/60">{notice}</p>}

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
          <section aria-label="Zoe's picks for today">
            <p className="music-liquid-side-title flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Zoe suggests today</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((keyword) => (
                <button key={keyword} type="button" className="music-liquid-chip" onClick={() => void playSuggestion(keyword)}>{keyword}</button>
              ))}
              {!suggestions.length && <p className="text-[11px] text-white/40">Zoe’s picks appear once your birth details and a little listening are saved.</p>}
            </div>
          </section>

          <section aria-label="Favourite tracks">
            <p className="music-liquid-side-title flex items-center gap-1"><Heart className="h-3.5 w-3.5" aria-hidden="true" /> Favourite tracks ({taste.favoriteTracks.length})</p>
            {taste.favoriteTracks.length ? trackList(taste.favoriteTracks) : <p className="text-[11px] text-white/40">Mark favourites on your music taste page and they show here.</p>}
          </section>

          <section aria-label="Listening history">
            <p className="music-liquid-side-title flex items-center gap-1"><ListMusic className="h-3.5 w-3.5" aria-hidden="true" /> Recently played ({history.length})</p>
            {history.length ? trackList(history.slice(0, 30)) : <p className="text-[11px] text-white/40">Play a few songs and they appear here.</p>}
          </section>

          {loading && <p className="text-[11px] text-white/50">Loading your music…</p>}
        </div>
      </div>
    </main>
  );
}
