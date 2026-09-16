import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Disc3, Heart, ListMusic, Pause, Play, Plus, Repeat, Search, Shuffle, SkipBack, SkipForward, Upload, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { musicEngine } from '@/services/MusicEngine';
import { useMusicEngine } from '@/hooks/useMusicEngine';
import { fetchLiveStations, isFullLengthTrack, searchMusicCatalog, type MusicSearchResult, type MusicTrack } from '@/features/music/musicProviders';
import { MUSIC_GENRES, MUSIC_RADIO_TAGS } from '@/features/music/musicCategories';
import { addToPlaylist, getLibrary, isSaved, playlistTracks, removePlaylist, subscribeLibrary, toggleSaved, type MusicLibrary } from '@/features/music/musicLibrary';
import { fetchMostListened, fetchMyReactions, fetchReactionChart, logListen, MUSIC_REACTIONS, toggleReaction, type MusicReactionId, type MusicSocialTrack } from '@/features/music/musicSocial';


const SEARCH_CACHE_KEY = 'mmora.music.lastSearch';

function readSearchCache(): { query: string; result: MusicSearchResult } | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(SEARCH_CACHE_KEY) ?? 'null');
    return parsed?.result?.tracks && typeof parsed.query === 'string' ? parsed : null;
  } catch { return null; }
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const cachedSearch = readSearchCache();
  const state = useMusicEngine();
  const [query, setQuery] = useState(cachedSearch?.query ?? '');
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [results, setResults] = useState<MusicSearchResult | null>(cachedSearch?.result ?? null);
  const [library, setLibrary] = useState<MusicLibrary>(() => getLibrary());
  const [tab, setTab] = useState<'results' | 'library' | 'community'>('results');
  const [myReactions, setMyReactions] = useState<MusicReactionId[]>([]);
  const [burst, setBurst] = useState<string | null>(null);
  const [chart, setChart] = useState<{ id: string; label: string; tracks: MusicSocialTrack[] }[]>([]);
  const [stations, setStations] = useState<MusicTrack[]>([]);
  const [stationTag, setStationTag] = useState<string | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [fullOnly, setFullOnly] = useState(false);
  const active = state.status === 'playing' || state.status === 'buffering';
  const routedQueryRef = useRef<string | null>(null);
  const searchInputRef = useRef<HTMLTextAreaElement>(null);


  useEffect(() => subscribeLibrary(setLibrary), []);

  useEffect(() => {
    const input = searchInputRef.current;
    if (!input) return;
    input.style.height = '2.5rem';
    input.style.height = `${Math.min(Math.max(input.scrollHeight, 40), 96)}px`;
  }, [query]);

  // Log every started track (friends who love it get a feed notification) and
  // load the current member's reactions for it.
  const trackId = state.track?.id;
  useEffect(() => {
    if (!state.track) { setMyReactions([]); return; }
    const track = state.track;
    void logListen(track);
    let cancelled = false;
    void fetchMyReactions([track.id]).then((map) => { if (!cancelled) setMyReactions(map[track.id] ?? []); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId]);

  const loadCommunity = useCallback(async () => {
    const [loved, recommended, shared, listened] = await Promise.all([
      fetchReactionChart('loved'),
      fetchReactionChart('recommend'),
      fetchReactionChart('share'),
      fetchMostListened(),
    ]);
    setChart([
      { id: 'loved', label: 'Loved by members', tracks: loved },
      { id: 'recommend', label: 'Recommended', tracks: recommended },
      { id: 'share', label: 'Shared', tracks: shared },
      { id: 'listened', label: 'Most listened', tracks: listened },
    ]);
  }, []);

  useEffect(() => { if (tab === 'community') void loadCommunity(); }, [tab, loadCommunity]);

  const react = useCallback(async (reaction: MusicReactionId) => {
    if (!state.track) return;
    setBurst(reaction);
    window.setTimeout(() => setBurst(null), 700);
    const added = await toggleReaction(state.track, reaction);
    setMyReactions((current) => added ? [...current, reaction] : current.filter((item) => item !== reaction));
  }, [state.track]);

  const search = useCallback(async (requestedQuery?: string, requestedKind?: 'radio' | 'track') => {
    const value = (requestedQuery ?? query).trim();
    if (!value || searching) return;
    if (requestedQuery) setQuery(value);
    setSearching(true);
    setNotice(null);
    setTab('results');
    try {
      const kind = requestedKind ?? (/\b(radio|station|fm|satellite)\b/i.test(value) ? 'radio' : 'track');
      const result = await searchMusicCatalog(value, kind);
      try { sessionStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify({ query: value, result })); } catch { /* optional */ }
      setResults(result);
      if (!result.tracks.length) {
        const unavailable = result.providers.filter(p => p.status === 'unavailable').map(p => p.name);
        setNotice(unavailable.length === result.providers.length
          ? 'Connected music sources are temporarily unavailable.'
          : 'No playable match was found. Try a title, artist, or genre.');
      } else {
        if (!requestedQuery) musicEngine.unlock();
        const played = await musicEngine.playQueue(result.tracks);
        const correction = result.corrected ? ` Interpreted as “${result.query}”.` : '';
        setNotice(played ? `Playing the best match. ${result.tracks.length} results.${correction}` : musicEngine.getState().error);
      }
    } catch {
      setNotice('Music search failed. Please check your connection.');
    } finally { setSearching(false); }
  }, [query, searching]);

  useEffect(() => {
    const routedQuery = searchParams.get('q')?.trim();
    if (!routedQuery || routedQueryRef.current === routedQuery) return;
    routedQueryRef.current = routedQuery;
    void search(routedQuery).finally(() => setSearchParams({}, { replace: true }));
  }, [search, searchParams, setSearchParams]);

  /** Loads the real, currently online stations for one radio tag. */
  const loadStations = useCallback(async (tag: string) => {
    setStationTag(tag);
    setNotice(null);
    const live = await fetchLiveStations(tag);
    setStations(live);
    if (!live.length) setNotice(`No live ${tag} station is online right now.`);
  }, []);

  const saveToPlaylist = useCallback((track: MusicTrack) => {
    const name = window.prompt('Add to playlist (name):')?.trim();
    if (!name) return;
    addToPlaylist(name, track);
    setSelectedPlaylist(name);
  }, []);



  const trackRow = (track: MusicTrack, index: number, onPlay: () => void) => (
    <li key={`${track.id}-${index}`} className="flex items-center gap-1">
      <Button variant="ghost" className="music-liquid-track h-auto min-w-0 flex-1 justify-start whitespace-normal px-2.5 py-2.5 text-left" onClick={onPlay}>
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="music-liquid-track-index flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px]">
            {track.artwork ? <img src={track.artwork} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" /> : String(index + 1).padStart(2, '0')}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-white">{track.title}</span>
            <span className="block truncate text-xs text-white/60">{track.artist}{track.album ? ` · ${track.album}` : ''}{track.duration ? ` (${clock(track.duration)})` : ''}</span>
            <span className="block truncate text-[10px] text-white/40">{track.live ? 'LIVE · ' : ''}{track.credit}</span>
          </span>
        </span>
      </Button>
      <IconControl
        className={`music-liquid-save h-9 w-9 shrink-0 rounded-full ${isSaved(track.id) ? 'is-saved' : ''}`}
        variant="ghost"
        size="icon"
        onClick={() => toggleSaved(track)}
        label={isSaved(track.id) ? `Remove ${track.title} from library` : `Save ${track.title} to library`}
      >
        <Heart className={isSaved(track.id) ? 'fill-current' : ''} />
      </IconControl>
      <IconControl
        className="music-liquid-save h-9 w-9 shrink-0 rounded-full"
        variant="ghost"
        size="icon"
        onClick={() => saveToPlaylist(track)}
        label={`Add ${track.title} to a playlist`}
      >
        <Plus />
      </IconControl>
    </li>
  );


  const savedTracks = library.saved;
  const libraryTracks = useMemo(
    () => (selectedPlaylist ? playlistTracks(selectedPlaylist) : savedTracks),
    [selectedPlaylist, savedTracks, library.playlists],
  );
  const visibleResults = useMemo(() => {
    const tracks = results?.tracks ?? [];
    return fullOnly ? tracks.filter(isFullLengthTrack) : tracks;
  }, [results, fullOnly]);
  const artists = useMemo(() => {
    const names = [...(results?.tracks ?? []), ...savedTracks]
      .map((track) => track.artist?.trim())
      .filter((artist): artist is string => Boolean(artist));
    return [...new Set(names)].slice(0, 12);
  }, [results, savedTracks]);


  return (
    <TooltipProvider>
      <main className="music-liquid-page flex min-h-[100dvh] p-0">
        <Helmet>
          <title>MMora Music — Songs, Artists & Live Radio</title>
          <meta name="description" content="Search songs, artists, albums, playlists and live radio on MMora Music, and save what you love to your own library." />
        </Helmet>
        <div className="music-liquid-shell flex min-h-[100dvh] w-full flex-col overflow-hidden">
          <div className="music-liquid-layout grid flex-1 gap-0 lg:grid-cols-[13rem_minmax(0,1fr)_minmax(17rem,22rem)]">
            {/* Browse sidebar */}
            <aside className="music-liquid-side music-align-search order-2 max-h-[34dvh] overflow-y-auto p-3 lg:order-1 lg:max-h-none">
              <p className="music-liquid-side-title">Genres</p>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {MUSIC_GENRES.map((genre) => (
                  <button key={genre.id} type="button" className="music-liquid-chip" onClick={() => { musicEngine.unlock(); void search(genre.query, 'track'); }}>{genre.label}</button>
                ))}
              </div>
              <p className="music-liquid-side-title">Radio</p>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {MUSIC_RADIO_TAGS.map((tag) => (
                  <button key={tag} type="button" className={`music-liquid-chip ${stationTag === tag ? 'is-active' : ''}`} onClick={() => { musicEngine.unlock(); void loadStations(tag); }}>{tag}</button>
                ))}
              </div>
              {stations.length > 0 && (
                <div className="mb-4 flex flex-col gap-1.5">
                  {stations.map((station) => (
                    <button key={station.id} type="button" className="music-liquid-chip text-left" onClick={() => { musicEngine.unlock(); void musicEngine.playQueue(stations, stations.indexOf(station)); }}>{station.title}</button>
                  ))}
                </div>
              )}
              {artists.length > 0 && (
                <>
                  <p className="music-liquid-side-title">Artists</p>
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {artists.map((artist) => (
                      <button key={artist} type="button" className="music-liquid-chip" onClick={() => { musicEngine.unlock(); void search(artist, 'track'); }}>{artist}</button>
                    ))}
                  </div>
                </>
              )}
              <p className="music-liquid-side-title">Playlists</p>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" className={`music-liquid-chip ${tab === 'library' && !selectedPlaylist ? 'is-active' : ''}`} onClick={() => { setSelectedPlaylist(null); setTab('library'); }}>My library ({savedTracks.length})</button>
                {Object.keys(library.playlists).map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={`music-liquid-chip ${selectedPlaylist === name ? 'is-active' : ''}`}
                    onClick={() => { setSelectedPlaylist(name); setTab('library'); }}
                    onDoubleClick={() => { removePlaylist(name); setSelectedPlaylist(null); }}
                    title="Double-tap to delete this playlist"
                  >
                    {name} ({library.playlists[name].length})
                  </button>
                ))}
              </div>
            </aside>


            {/* Search + now listening + transport */}
            <section className="music-liquid-player order-1 flex min-h-0 flex-col gap-3 p-3 sm:p-4 lg:order-2">
              <div className="flex items-start justify-between">
                <div className="music-page-wordmark flex w-fit items-center gap-2" data-music-wordmark>
                  <Disc3 className={active ? 'h-4 w-4 animate-spin motion-reduce:animate-none' : 'h-4 w-4'} aria-hidden="true" />
                  <h1 className="text-sm font-semibold text-white">MMora music</h1>
                </div>
              </div>
              <form className="music-liquid-control music-search-control flex gap-2 rounded-full p-1" onSubmit={(e) => { e.preventDefault(); void search(); }}>
                <Textarea
                  ref={searchInputRef}
                  rows={1}
                  className="music-search-input min-h-10 resize-none overflow-y-auto border-0 bg-transparent px-3 py-2 pr-0.5 text-white shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' || e.shiftKey) return;
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }}
                  aria-label="Search music"
                  autoComplete="off"
                />
                <Button className="music-search-submit h-10 w-9" type="submit" variant="ghost" size="icon" disabled={searching} aria-label={searching ? 'Searching' : 'Search'}><Search aria-hidden="true" /></Button>
              </form>

              {/* Current artwork sits directly under the search bar. */}
              <div className="music-current-track flex min-w-0 items-center gap-3 overflow-hidden">
                <div className="music-liquid-art relative flex aspect-square w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl sm:w-28">
                  {state.track?.artwork ? <img src={state.track.artwork} alt="" className="h-full w-full object-cover" decoding="async" /> : <Disc3 className="h-8 w-8 text-white/40" />}
                  {state.track && <span className="music-liquid-nowtag">Now listening</span>}
                </div>
                <div className="music-current-copy min-w-0 flex-1 overflow-hidden">
                  <p className="line-clamp-2 break-words text-base font-semibold text-white sm:text-lg">{state.track?.title ?? 'Nothing playing'}</p>
                  <p className="truncate text-sm text-white/60">{state.track?.artist ?? 'Search or ask Zoe to play something.'}</p>
                  {state.track?.album && <p className="truncate text-xs text-white/50">{state.track.album}</p>}
                  {state.track && <p className="truncate text-[10px] text-white/40">{state.track.credit}</p>}
                  {state.queue.length > 0 && <p className="mt-1 text-[10px] tabular-nums text-white/40">Queue {state.index + 1} / {state.queue.length}</p>}
                </div>
              </div>

              {state.track && (
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="React to this track">
                  {MUSIC_REACTIONS.map((reaction) => (
                    <button
                      key={reaction.id}
                      type="button"
                      className={`music-liquid-react ${myReactions.includes(reaction.id) ? 'is-on' : ''} ${burst === reaction.id ? 'is-burst' : ''}`}
                      onClick={() => void react(reaction.id)}
                      aria-pressed={myReactions.includes(reaction.id)}
                      aria-label={reaction.label}
                    >
                      <span aria-hidden="true">{reaction.emoji}</span> {reaction.label}
                    </button>
                  ))}
                </div>
              )}

              {(state.error || notice) && <p role="status" className="text-xs text-white/60">{state.error ?? notice}</p>}

              <div className="music-liquid-control music-transport-control space-y-1.5 p-0">
                <div>
                  <Slider className="music-liquid-slider" value={[state.position]} max={Math.max(state.duration, state.position, 1)} step={1} disabled={!state.duration || Boolean(state.track?.live)} onValueChange={([v]) => musicEngine.seek(v)} aria-label="Position" />
                  <div className="mt-0.5 flex justify-between text-[10px] text-white/50"><span>{clock(state.position)}</span><span>{state.track?.live ? 'LIVE' : clock(state.duration)}</span></div>
                </div>
                <div className="music-transport-buttons flex items-center justify-center gap-1">
                  <IconControl className={`music-liquid-round h-8 w-8 rounded-full ${state.shuffle ? 'is-on' : ''}`} variant="ghost" size="icon" onClick={() => musicEngine.toggleShuffle()} label="Shuffle"><Shuffle /></IconControl>
                  <IconControl className="music-liquid-round h-8 w-8 rounded-full" variant="ghost" size="icon" onClick={() => void musicEngine.previous()} label="Previous"><SkipBack /></IconControl>
                  <IconControl size="icon" className="music-liquid-play h-9 w-9 rounded-full" onClick={() => { musicEngine.unlock(); musicEngine.toggle(); }} label={active ? 'Pause' : 'Play'}>{active ? <Pause /> : <Play />}</IconControl>
                  <IconControl className="music-liquid-round h-8 w-8 rounded-full" variant="ghost" size="icon" onClick={() => void musicEngine.next()} label="Next"><SkipForward /></IconControl>
                  <IconControl className={`music-liquid-round h-8 w-8 rounded-full ${state.repeat !== 'off' ? 'is-on' : ''}`} variant="ghost" size="icon" onClick={() => musicEngine.cycleRepeat()} label={`Repeat: ${state.repeat}`}><Repeat /></IconControl>
                </div>
                <div className="flex items-center gap-2"><Volume2 className="h-4 w-4 text-white/50" /><Slider className="music-liquid-slider" value={[state.volume * 100]} max={100} step={1} onValueChange={([v]) => musicEngine.setVolume(v / 100)} aria-label="Volume" /><span className="w-9 text-right text-[10px] tabular-nums text-white/50">{Math.round(state.volume * 100)}%</span></div>
              </div>
            </section>

            {/* Results / library */}
            <aside className="music-liquid-queue music-align-search order-3 max-h-[46dvh] overflow-y-auto p-3 lg:max-h-none">
              <div className="mb-3 flex flex-wrap gap-1.5">
                <button type="button" className={`music-liquid-chip ${tab === 'results' ? 'is-active' : ''}`} onClick={() => setTab('results')}>Results{results ? ` (${results.tracks.length})` : ''}</button>
                <button type="button" className={`music-liquid-chip ${tab === 'library' ? 'is-active' : ''}`} onClick={() => { setSelectedPlaylist(null); setTab('library'); }}>Library ({savedTracks.length})</button>
                <button type="button" className={`music-liquid-chip ${tab === 'community' ? 'is-active' : ''}`} onClick={() => setTab('community')}>Community</button>
                {tab === 'results' && (
                  <button type="button" className={`music-liquid-chip ${fullOnly ? 'is-active' : ''}`} onClick={() => setFullOnly((value) => !value)} aria-pressed={fullOnly}>Full tracks</button>
                )}
              </div>

              {tab === 'results' ? (
                visibleResults.length ? (
                  <>
                    <p className="mb-2 text-[11px] text-white/50">{visibleResults.length} {fullOnly ? 'full-length tracks' : 'matches'}{results?.corrected ? ` for “${results.query}”` : ''}</p>
                    <ol className="space-y-1">
                      {visibleResults.map((track, i) => trackRow(track, i, () => { musicEngine.unlock(); void musicEngine.playQueue(visibleResults, i); }))}
                    </ol>
                  </>
                ) : (
                  <p className="text-sm text-white/50">{results?.tracks.length ? 'No full-length recording in these results. Turn off “Full tracks” to see catalogue previews and live radio.' : 'Search a song, artist, album, genre or station to see results here.'}</p>
                )

              ) : tab === 'community' ? (
                <div className="space-y-4">
                  {chart.every((section) => !section.tracks.length) && <p className="text-sm text-white/50">No reactions yet. Use the smilies to start these lists.</p>}
                  {chart.filter((section) => section.tracks.length).map((section) => (
                    <section key={section.id}>
                      <p className="music-liquid-side-title">{section.label}</p>
                      <ol className="space-y-1">
                        {section.tracks.slice(0, 8).map((item) => (
                          <li key={`${section.id}-${item.track_id}`} className="flex items-center gap-2.5 px-1 py-1">
                            <span className="music-liquid-track-index flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px]">
                              {item.track_artwork ? <img src={item.track_artwork} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" /> : '♪'}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm text-white">{item.track_title}</span>
                              <span className="block truncate text-xs text-white/50">{item.track_artist ?? 'Unknown artist'}</span>
                            </span>
                            <span className="shrink-0 text-[11px] tabular-nums text-white/50">{item.count}</span>
                          </li>
                        ))}
                      </ol>
                    </section>
                  ))}
                </div>
              ) : libraryTracks.length ? (
                <>
                  <p className="mb-2 text-[11px] text-white/50">{selectedPlaylist ? `${selectedPlaylist} · ${libraryTracks.length} tracks` : `Saved songs · ${libraryTracks.length}`}</p>
                  <ol className="space-y-1">
                    {libraryTracks.map((track, i) => trackRow(track, i, () => { musicEngine.unlock(); void musicEngine.playQueue(libraryTracks, i); }))}
                  </ol>
                </>
              ) : (
                <p className="text-sm text-white/50">{selectedPlaylist ? 'This playlist is empty. Use the plus beside any track to add songs.' : 'Tap the heart beside any track to build your library.'}</p>
              )}


              {state.queue.length > 0 && (
                <section className="mt-5">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/50"><ListMusic className="h-3.5 w-3.5" /> Queue</p>
                  <ol className="space-y-1">
                    {state.queue.map((track, i) => (
                      <li key={`q-${track.id}-${i}`}>
                        <Button variant="ghost" className={`music-liquid-track h-auto w-full justify-start whitespace-normal px-2.5 py-2 text-left ${i === state.index ? 'is-current' : ''}`} onClick={() => { musicEngine.unlock(); void musicEngine.playIndex(i); }}>
                          <span className="flex min-w-0 items-center gap-2.5"><span className="music-liquid-track-index flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px]">{String(i + 1).padStart(2, '0')}</span><span className="min-w-0"><span className="block truncate text-sm text-white">{track.title}</span><span className="block truncate text-xs text-white/50">{track.artist}</span></span></span>
                        </Button>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </aside>
          </div>
        </div>
      </main>
    </TooltipProvider>
  );
}
