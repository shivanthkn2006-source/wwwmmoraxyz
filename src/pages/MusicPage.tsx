import { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { Disc3, ListMusic, Pause, Play, Repeat, Search, Shuffle, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { musicEngine } from '@/services/MusicEngine';
import { useMusicEngine } from '@/hooks/useMusicEngine';
import { searchMusicCatalog, type MusicSearchResult } from '@/features/music/musicProviders';

const SEARCH_CACHE_KEY = 'mmora.music.lastSearch';

function readSearchCache(): { query: string; result: MusicSearchResult } | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(SEARCH_CACHE_KEY) ?? 'null');
    return parsed?.result?.tracks && typeof parsed.query === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function clock(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

function IconControl({ label, children, ...props }: React.ComponentProps<typeof Button> & { label: string }) {
  return <Tooltip><TooltipTrigger asChild><Button aria-label={label} {...props}>{children}</Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}

export default function MusicPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const cachedSearch = readSearchCache();
  const state = useMusicEngine();
  const [query, setQuery] = useState(cachedSearch?.query ?? '');
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [results, setResults] = useState<MusicSearchResult | null>(cachedSearch?.result ?? null);
  const active = state.status === 'playing' || state.status === 'buffering';
  const routedQueryRef = useRef<string | null>(null);

  const search = useCallback(async (requestedQuery?: string) => {
    const value = (requestedQuery ?? query).trim();
    if (!value || searching) return;
    if (requestedQuery) setQuery(value);
    setSearching(true);
    setNotice(null);
    try {
      const kind = /\b(radio|station|fm)\b/i.test(value) ? 'radio' : 'track';
      const result = await searchMusicCatalog(value, kind);
      try { sessionStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify({ query: value, result })); } catch { /* storage is optional */ }
      setResults(result);
      if (!result.tracks.length) {
        const unavailable = result.providers.filter((provider) => provider.status === 'unavailable').map((provider) => provider.name);
        setNotice(unavailable.length === result.providers.length
          ? 'The connected music sources are temporarily unavailable. Please try again.'
          : 'No playable match was found. Try a title, artist, album, language, genre, lyric line, or radio station.');
      } else {
        if (!requestedQuery) musicEngine.unlock();
        const played = await musicEngine.playQueue(result.tracks);
        const correction = result.corrected ? ` Interpreted as “${result.query}”.` : '';
        setNotice(played ? `Playing the best match. ${result.tracks.length} results from connected sources.${correction}` : musicEngine.getState().error);
      }
    } catch {
      setNotice('Music search could not finish. Please check your connection and try again.');
    } finally {
      setSearching(false);
    }
  }, [query, searching]);

  useEffect(() => {
    const routedQuery = searchParams.get('q')?.trim();
    if (!routedQuery || routedQueryRef.current === routedQuery) return;
    routedQueryRef.current = routedQuery;
    void search(routedQuery).finally(() => {
      setSearchParams({}, { replace: true });
    });
  }, [search, searchParams, setSearchParams]);

  return (
    <TooltipProvider>
    <main className="music-liquid-page min-h-[100dvh] px-3 pb-[max(7rem,env(safe-area-inset-bottom))] pt-[max(4.5rem,env(safe-area-inset-top))] text-foreground sm:px-6 lg:px-8">
      <Helmet>
        <title>Music Player | M'Mora</title>
        <meta name="description" content="Play music and live radio with Zoe across M'Mora." />
      </Helmet>
      <div className="music-liquid-shell mx-auto max-w-6xl overflow-hidden border border-border/70">
        <header className="music-liquid-header flex items-center justify-between border-b border-border/60 px-5 py-4 sm:px-7">
          <div>
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Now listening</p>
            <p className="mt-1 text-2xl font-semibold uppercase">Music</p>
          </div>
          <div className="music-liquid-status flex h-10 w-10 items-center justify-center rounded-full border border-border" aria-label={active ? 'Music is playing' : 'Music is ready'}>
            <Disc3 className={active ? 'h-4 w-4 animate-spin motion-reduce:animate-none' : 'h-4 w-4'} aria-hidden="true" />
          </div>
        </header>

        <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(18rem,360px)]">
        <section className="flex min-h-0 flex-col justify-between border-b border-border/60 p-4 sm:p-6 xl:min-h-[620px] xl:border-b-0 xl:border-r">
          <form className="music-liquid-control flex gap-2 rounded-lg border border-border/70 p-1.5" onSubmit={(event) => { event.preventDefault(); void search(); }}>
             <Input className="h-11 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Song, artist, album, lyrics, language, genre or radio" aria-label="Search music" autoComplete="off" spellCheck="true" />
             <IconControl className="h-11 w-11 rounded-full" type="submit" size="icon" disabled={searching} label={searching ? 'Searching music' : 'Search music'}><Search /></IconControl>
          </form>

           <div className="flex flex-1 flex-col items-center justify-center py-6 text-center sm:py-8 xl:py-10">
             <div className="music-liquid-art relative flex aspect-square w-full max-w-[min(22rem,52dvh)] items-center justify-center overflow-hidden rounded-lg border border-border">
              {state.track?.artwork ? <img src={state.track.artwork} alt="" className="h-full w-full object-cover grayscale" /> : <Disc3 className="h-24 w-24 text-muted-foreground" aria-hidden="true" />}
              <div className="music-liquid-art-glint pointer-events-none absolute inset-0" aria-hidden="true" />
            </div>
             <h1 className="mt-5 max-w-xl break-words text-2xl font-semibold sm:text-3xl">{state.track?.title ?? 'Music'}</h1>
            <p className="mt-2 text-muted-foreground">{state.track?.artist ?? 'Ask Zoe to play something, or search above.'}</p>
            {state.track && <p className="mt-1 text-xs text-muted-foreground">{state.track.credit}</p>}
            {(state.error || notice) && <p role="status" className="mt-4 max-w-md text-sm text-muted-foreground">{state.error ?? notice}</p>}
          </div>

          <div className="music-liquid-control mx-auto w-full max-w-2xl space-y-5 rounded-lg border border-border/70 p-4 sm:p-5">
            <div>
               <Slider className="music-liquid-slider" value={[state.position]} max={Math.max(state.duration, state.position, 1)} step={1} disabled={!state.duration || Boolean(state.track?.live)} onValueChange={([value]) => musicEngine.seek(value)} aria-label="Playback position" aria-valuetext={clock(state.position)} />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{clock(state.position)}</span><span>{state.track?.live ? 'LIVE' : clock(state.duration)}</span></div>
            </div>
            <div className="flex items-center justify-center gap-2 sm:gap-3">
                <IconControl className="h-11 w-11 rounded-full sm:h-12 sm:w-12" variant={state.shuffle ? 'secondary' : 'ghost'} size="icon" onClick={() => musicEngine.toggleShuffle()} label={state.shuffle ? 'Turn shuffle off' : 'Turn shuffle on'}><Shuffle /></IconControl>
                <IconControl className="h-11 w-11 rounded-full sm:h-12 sm:w-12" variant="ghost" size="icon" onClick={() => void musicEngine.previous()} label="Previous track"><SkipBack /></IconControl>
               <IconControl size="icon" className="music-liquid-play h-14 w-14 rounded-full" onClick={() => { musicEngine.unlock(); musicEngine.toggle(); }} label={active ? 'Pause music' : 'Play music'}>{active ? <Pause /> : <Play />}</IconControl>
                <IconControl className="h-11 w-11 rounded-full sm:h-12 sm:w-12" variant="ghost" size="icon" onClick={() => void musicEngine.next()} label="Next track"><SkipForward /></IconControl>
                <IconControl className="h-11 w-11 rounded-full sm:h-12 sm:w-12" variant={state.repeat !== 'off' ? 'secondary' : 'ghost'} size="icon" onClick={() => musicEngine.cycleRepeat()} label={`Repeat: ${state.repeat}`}><Repeat /></IconControl>
            </div>
             <div className="flex items-center gap-3"><Volume2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" /><Slider className="music-liquid-slider" value={[state.volume * 100]} max={100} step={1} onValueChange={([value]) => musicEngine.setVolume(value / 100)} aria-label="Music volume" aria-valuetext={`${Math.round(state.volume * 100)} percent`} /><span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{Math.round(state.volume * 100)}%</span></div>
          </div>
        </section>

        <aside className="music-liquid-queue max-h-[50dvh] overflow-y-auto p-4 sm:p-6 xl:max-h-none" aria-label="Music queue">
          {results && (
            <section className="mb-7" aria-labelledby="music-search-results-heading">
              <h2 id="music-search-results-heading" className="mb-1 flex items-center gap-2 text-lg font-semibold"><Search className="h-5 w-5" /> Results</h2>
              <p className="mb-4 text-xs text-muted-foreground">
                {results.tracks.length ? `${results.tracks.length} playable matches` : 'No playable matches'}
                {results.corrected ? ` · searched “${results.query}”` : ''}
              </p>
              {results.tracks.length > 0 && (
                <ol className="space-y-2">
                  {results.tracks.map((track, index) => (
                    <li key={`result-${track.id}`}>
                      <Button variant="ghost" className="music-liquid-track h-auto w-full justify-start whitespace-normal rounded-lg border border-transparent px-3 py-3 text-left" aria-label={`Play ${track.title} by ${track.artist}`} onClick={() => { musicEngine.unlock(); void musicEngine.playQueue(results.tracks, index); }}>
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="music-liquid-track-index flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs tabular-nums">
                            {track.artwork ? <img src={track.artwork} alt="" className="h-full w-full object-cover grayscale" loading="lazy" /> : String(index + 1).padStart(2, '0')}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{track.title}</span>
                            <span className="block truncate text-xs text-muted-foreground">{track.artist}{track.album ? ` · ${track.album}` : ''}</span>
                            <span className="block truncate text-[10px] text-muted-foreground">{track.live ? 'LIVE · ' : ''}{track.credit}</span>
                          </span>
                        </span>
                      </Button>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}
          <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold"><ListMusic className="h-5 w-5" /> Queue</h2>
          {state.queue.length === 0 ? <p className="text-sm text-muted-foreground">Your queue is empty.</p> : (
            <ol className="space-y-2">
              {state.queue.map((track, index) => (
                <li key={track.id}>
                   <Button variant={index === state.index ? 'secondary' : 'ghost'} className="music-liquid-track h-auto w-full justify-start whitespace-normal rounded-lg border border-transparent px-3 py-3 text-left" aria-label={`Play ${track.title} by ${track.artist}`} aria-current={index === state.index ? 'true' : undefined} onClick={() => { musicEngine.unlock(); void musicEngine.playIndex(index); }}>
                    <span className="flex min-w-0 items-center gap-3"><span className="music-liquid-track-index flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs tabular-nums">{String(index + 1).padStart(2, '0')}</span><span className="min-w-0"><span className="block truncate text-sm font-medium">{track.title}</span><span className="block truncate text-xs text-muted-foreground">{track.artist}</span></span></span>
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </aside>
        </div>
      </div>
    </main>
    </TooltipProvider>
  );
}