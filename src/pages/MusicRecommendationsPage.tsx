import { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { musicEngine } from '@/services/MusicEngine';
import TrackArtwork from '@/components/music/TrackArtwork';
import { fetchMusicRecommendations, type MusicRecommendationSection } from '@/features/music/musicRecommendations';

/** Songs rendered at first paint, and added on each scroll step, to stay light on phones. */
const PAGE_SIZE = 18;

export default function MusicRecommendationsPage() {
  const navigate = useNavigate();
  const [sections, setSections] = useState<MusicRecommendationSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const sentinel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchMusicRecommendations()
      .then((rows) => { if (!cancelled) setSections(rows); })
      .catch(() => { if (!cancelled) setNotice('Recommendations could not be loaded. Check your connection and try again.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const total = useMemo(() => sections.reduce((sum, section) => sum + section.tracks.length, 0), [sections]);

  /** Sections trimmed to the songs shown so far; indexes still match the full section list. */
  const paged = useMemo(() => {
    let left = visible;
    const out: MusicRecommendationSection[] = [];
    for (const section of sections) {
      if (left <= 0) break;
      out.push({ ...section, tracks: section.tracks.slice(0, left) });
      left -= Math.min(left, section.tracks.length);
    }
    return out;
  }, [sections, visible]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || visible >= total) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setVisible((count) => Math.min(count + PAGE_SIZE, total));
    }, { rootMargin: '240px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible, total]);


  return (
    <main className="music-liquid-page flex min-h-[100dvh] flex-col p-0 text-white">
      <Helmet>
        <title>Recommended Songs For You — MMora Music</title>
        <meta name="description" content="Song recommendations built from your real listening history, your friends' plays and the music taste saved on your profile." />
      </Helmet>
      <div className="music-liquid-shell music-align-search flex min-h-[100dvh] w-full flex-col gap-3 overflow-hidden p-3 sm:p-4">
      <section className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-4 overflow-y-auto lg:max-w-5xl">

        <header className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Back to Home" onClick={() => navigate('/')}><ArrowLeft /></Button>
          <h1 className="text-sm font-semibold text-white">Recommended for you</h1>
          <Button className="ml-auto" variant="ghost" size="icon" aria-label="Edit my music taste" onClick={() => navigate('/music/profile')}><SlidersHorizontal /></Button>
        </header>


        {loading && <p role="status" className="text-xs text-white/70">Looking at what you and your friends played…</p>}
        {notice && <p role="status" aria-live="polite" className="text-xs text-white/70">{notice}</p>}
        {!loading && !notice && !sections.length && (
          <p className="text-sm text-white/60">Play a few songs, or set your favourite genres and artists, and recommendations will appear here.</p>
        )}

        {paged.map((section) => (
          <section key={section.id} className="space-y-2">
            <div>
              <p className="music-liquid-side-title">{section.label}</p>
              <p className="text-[11px] text-white/50">{section.reason}</p>
            </div>
            <ol className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
              {section.tracks.map((track, index) => (
                <li key={`${section.id}-${track.id}`} className="music-liquid-track flex min-w-0 items-center gap-3 rounded-2xl px-2 py-2">

                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full">
                    <TrackArtwork src={track.artwork} trackId={track.id} uploadId={(track as typeof track & { uploadId?: string }).uploadId} className="h-full w-full object-cover" fallback="♪" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{track.title}</span>
                    <span className="block truncate text-xs text-white/60">{track.artist}</span>
                    <span className="block truncate text-[10px] text-white/40">{track.credit}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Play ${track.title}`}
                    onClick={async () => {
                      musicEngine.unlock();
                      const queue = sections.find((row) => row.id === section.id)?.tracks ?? section.tracks;
                      const started = await musicEngine.playQueue(queue, index);
                      if (!started) setNotice(musicEngine.getState().error ?? 'That song could not be played. Please try another one.');
                    }}
                  >
                    <Play />
                  </Button>
                </li>
              ))}
            </ol>
          </section>
        ))}

        {visible < total && (
          <div ref={sentinel} className="flex justify-center py-3">
            <Button variant="ghost" className="text-xs text-white/70" onClick={() => setVisible((count) => Math.min(count + PAGE_SIZE, total))}>
              Show more songs
            </Button>
          </div>
        )}

      </section>
      </div>
    </main>

  );
}
