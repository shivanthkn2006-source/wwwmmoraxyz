import React from 'react';
import { Camera, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import {
  useHomeSearch,
  recordHomeSearch,
  SEARCH_FILTERS,
  SIGNAL_LABEL,
  type HomeSearchResult,
  type SearchFilter,
} from '@/hooks/useHomeSearch';
import DraggableHomeControl from '@/components/home/DraggableHomeControl';
import { useAmbientSearch, type AmbientSearchRecord } from '@/core/ports/useAmbientSearch';
import { routeForDispatch, routeForEntity, labelForRecord } from '@/lib/ambientDispatch';
import SearchDebugPanel from '@/components/home/SearchDebugPanel';
import { useSearchIndexHealth } from '@/hooks/useSearchIndexHealth';
import { usePlatformInsight } from '@/hooks/usePlatformInsight';
import { supabase } from '@/integrations/supabase/client';



interface HomeFloatingToolsProps {
  query: string;
  onQueryChange: (query: string) => void;
  onOpenEditor: () => void;
}

const ICON_SIZE = 36;
const GAP = 6;
const EDGE_GAP = 8;

export default function HomeFloatingTools({ query, onQueryChange, onOpenEditor }: HomeFloatingToolsProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [iconPosition, setIconPosition] = React.useState<{ x: number; y: number }>({ x: 8, y: 80 });
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { results: allResults, loading, error, counts } = useHomeSearch(query, searchOpen);
  const [filter, setFilter] = React.useState<SearchFilter>('all');
  const results = React.useMemo(
    () =>
      filter === 'all'
        ? allResults
        : allResults.filter((item) => (item.facets?.length ? item.facets : [item.filter]).includes(filter)),
    [allResults, filter],
  );
  // Startup guard: warns and self-heals when the universal index is empty/stale.
  const { isEmpty: indexEmpty } = useSearchIndexHealth({ autoBackfill: true });
  // Live 5-line structural answer (VR world components, features, live counts).
  const { lines: insightLines } = usePlatformInsight(query, searchOpen, 5);

  const {
    executeAmbientSearch,
    isSynthesizing,
    result: ambient,
    error: ambientError,
    reset: resetAmbient,
    debug: ambientDebug,
  } = useAmbientSearch();

  React.useEffect(() => {
    setActiveIndex(-1);
    resetAmbient();
  }, [query, searchOpen, resetAmbient]);

  React.useEffect(() => {
    if (searchOpen) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(id);
    }
  }, [searchOpen]);

  // Home dock search icon opens this same bar; broadcast state so the dock icon can light up.
  React.useEffect(() => {
    const open = () => setSearchOpen(true);
    window.addEventListener('mmora:open-home-search', open);
    return () => window.removeEventListener('mmora:open-home-search', open);
  }, []);

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('mmora:home-search-toggle', { detail: { open: searchOpen } }));
  }, [searchOpen]);


  // Outside-the-platform results (web, music, weather) via the external-search function.
  const [externalResults, setExternalResults] = React.useState<Array<{
    id: string;
    kind: 'web' | 'music' | 'weather' | 'video';
    title: string;
    subtitle?: string;
    url?: string;
    thumbnail?: string;
  }>>([]);
  const [externalLoading, setExternalLoading] = React.useState(false);

  React.useEffect(() => {
    const term = query.trim();
    if (!searchOpen || term.length < 3) {
      setExternalResults([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setExternalLoading(true);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('external-search', {
          body: { query: term },
        });
        if (fnError) throw fnError;
        if (!cancelled) setExternalResults(data?.results ?? []);
      } catch (err) {
        console.warn('[external-search] failed', err);
        if (!cancelled) setExternalResults([]);
      } finally {
        if (!cancelled) setExternalLoading(false);
      }
    }, 550);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, searchOpen]);


  const externalVideos = React.useMemo(
    () => externalResults.filter((item) => item.kind === 'video'),
    [externalResults],
  );
  // The internet block follows the active chip: everything on All, YouTube on Videos.
  const externalVisible = React.useMemo(() => {
    if (filter === 'all') return externalResults;
    if (filter === 'videos') return externalVideos;
    return [];
  }, [filter, externalResults, externalVideos]);

  // Global keyboard: Escape closes the sideways bar from anywhere.
  React.useEffect(() => {
    if (!searchOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  const handleSelect = React.useCallback((result: HomeSearchResult) => {
    void recordHomeSearch(query, result);
    if (result.route) {
      setSearchOpen(false);
      navigate(result.route);
    } else {
      // Post results keep the feed filtered in place.
      setSearchOpen(false);
    }
  }, [navigate, query]);

  const handleSubmit = React.useCallback((event: React.FormEvent) => {
    event.preventDefault();
    if (activeIndex >= 0 && results[activeIndex]) {
      handleSelect(results[activeIndex]);
      return;
    }
    const term = query.trim();
    if (!term || indexEmpty) return;
    void recordHomeSearch(term);

    // Route the submitted query through the ambient retrieval orchestrator.
    void (async () => {
      const started = performance.now();
      const output = await executeAmbientSearch(term);
      const ms = Math.round(performance.now() - started);
      console.info('[ambient-search] submit', {
        query: term,
        ms,
        intent: output?.intent?.intent,
        nodes: output?.nodesEvaluated ?? 0,
        dispatch: output?.dispatchAction?.action ?? null,
      });
      const dispatchRoute = routeForDispatch(output?.dispatchAction);
      if (dispatchRoute) {
        setSearchOpen(false);
        navigate(dispatchRoute);
      }
    })();
  }, [query, activeIndex, results, handleSelect, executeAmbientSearch, navigate, indexEmpty]);

  const handleAmbientRecord = React.useCallback((record: AmbientSearchRecord) => {
    setSearchOpen(false);
    navigate(routeForEntity(record.entity_type, record.entity_id));
  }, [navigate]);



  const handleInputKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setSearchOpen(false);
      return;
    }
    if (!results.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? results.length - 1 : current - 1));
    }
  }, [results]);

  const handleIconPosition = React.useCallback((position: { x: number; y: number }) => {
    setIconPosition(position);
  }, []);

  // Bar grows sideways (left -> right) from the search icon's current spot.
  const availableWidth = Math.max(
    120,
    window.innerWidth - (iconPosition.x + ICON_SIZE + GAP) - EDGE_GAP,
  );
  const barWidth = Math.min(availableWidth, 420);

  return (
    <>
      <DraggableHomeControl
        storageKey="mmora.home.search-position.v3"
        defaultPosition={{ x: 8, y: 80 }}
        ariaLabel={searchOpen ? 'Close home search' : 'Search home'}
        onActivate={() => setSearchOpen((current) => !current)}
        onPositionChange={handleIconPosition}
      >
        {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
      </DraggableHomeControl>

      <DraggableHomeControl
        storageKey="mmora.home.camera-position.v3"
        defaultPosition={{ x: 8, y: 124 }}
        ariaLabel="Create a short"
        onActivate={onOpenEditor}
      >
        <Camera className="h-5 w-5" />
      </DraggableHomeControl>

      <div
        className="fixed z-[9996] flex items-center overflow-hidden rounded-full border border-border/60 bg-background/80 p-1.5 shadow-xl backdrop-blur-2xl transition-[width,opacity] duration-200 ease-out"
        style={{
          left: iconPosition.x + ICON_SIZE + GAP,
          top: iconPosition.y,
          width: searchOpen ? barWidth : 0,
          opacity: searchOpen ? 1 : 0,
          borderWidth: searchOpen ? undefined : 0,
          padding: searchOpen ? undefined : 0,
          pointerEvents: searchOpen ? 'auto' : 'none',
        }}
        aria-hidden={!searchOpen}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 items-center gap-2 px-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            role="searchbox"
            onKeyDown={handleInputKeyDown}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search posts, shorts, tags or creators"
            tabIndex={searchOpen ? 0 : -1}
            className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {query && (
            <button type="button" className="rounded-full p-1 text-muted-foreground hover:text-foreground" aria-label="Clear search" onClick={() => onQueryChange('')}>
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
      </div>

      {searchOpen && query.trim().length >= 1 && (
        <div
          className="fixed z-[9996] max-h-[50vh] overflow-y-auto rounded-2xl border border-border/60 bg-background/90 p-1 shadow-xl backdrop-blur-2xl"
          style={{
            left: iconPosition.x + ICON_SIZE + GAP,
            top: iconPosition.y + 52,
            width: barWidth,
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {indexEmpty && (
            <p role="alert" className="px-3 py-2 text-xs text-muted-foreground">
              Search index is empty — Zoe is rebuilding it now. Results will appear shortly.
            </p>
          )}
          {insightLines.length > 0 && (
            <div className="border-b border-border/50 pb-1" role="list" aria-label="Platform answers">
              {insightLines.map((line) => (
                <button
                  key={line.id}
                  type="button"
                  role="listitem"
                  onClick={() => {
                    if (line.route) {
                      setSearchOpen(false);
                      navigate(line.route);
                    }
                  }}
                  className="block w-full rounded-xl px-3 py-1.5 text-left text-[11px] leading-snug text-foreground/90 hover:bg-muted/60"
                >
                  {line.text}
                </button>
              ))}
            </div>
          )}
          {allResults.length > 0 && (
            <div className="flex gap-1 overflow-x-auto border-b border-border/50 px-2 py-1.5" role="group" aria-label="Filter search results">
              {SEARCH_FILTERS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  aria-pressed={filter === chip.id}
                  onClick={() => setFilter(chip.id)}
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${
                    filter === chip.id
                      ? 'border-foreground/40 bg-foreground/10 text-foreground'
                      : 'border-border/60 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {chip.label} {chip.id === 'videos' ? counts.videos + externalVideos.length : counts[chip.id]}
                </button>
              ))}
            </div>
          )}
          {loading && <p role="status" className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>}
          {!loading && error && <p role="alert" className="px-3 py-2 text-xs text-muted-foreground">{error}</p>}
          {!loading && !error && results.length === 0 && insightLines.length === 0 && !ambient && !isSynthesizing && (
            <p role="status" className="px-3 py-2 text-xs text-muted-foreground">No results for "{query.trim()}"</p>
          )}

          {results.map((result, index) => (
            <button
              key={`${result.type}-${result.id}`}
              type="button"
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setActiveIndex(index)}
              aria-selected={index === activeIndex}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-muted/60 ${index === activeIndex ? 'bg-muted/60' : ''}`}
            >
              {result.avatarUrl && (
                <img
                  src={result.avatarUrl}
                  alt=""
                  className={`h-9 w-9 shrink-0 object-cover ${result.type === 'user' ? 'rounded-full' : 'rounded-md'}`}
                  loading="lazy"
                />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground">{result.title}</span>
                {result.subtitle && (
                  <span className="block truncate text-[11px] text-muted-foreground">{result.subtitle}</span>
                )}
                <span className="mt-0.5 flex flex-wrap gap-1">
                  {result.signals.map((signal) => (
                    <span
                      key={signal}
                      className="rounded-full bg-muted px-1.5 py-[1px] text-[9px] uppercase tracking-wide text-muted-foreground"
                    >
                      {SIGNAL_LABEL[signal]}
                    </span>
                  ))}
                </span>
              </span>
            </button>
          ))}

          {isSynthesizing && (
            <p role="status" className="px-3 py-2 text-xs text-muted-foreground">Zoe is synthesizing…</p>
          )}
          {!isSynthesizing && ambientError && (
            <p role="alert" className="px-3 py-2 text-xs text-muted-foreground">{ambientError}</p>
          )}
          {!isSynthesizing && ambient?.synthesis && (
            <p className="px-3 py-2 text-xs leading-relaxed text-foreground/90">{ambient.synthesis}</p>
          )}
          {!isSynthesizing && (ambient?.records ?? []).map((record) => (
            <button
              key={`ambient-${record.id}`}
              type="button"
              onClick={() => handleAmbientRecord(record)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-muted/60"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground">{labelForRecord(record)}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{record.entity_type}</span>
              </span>
            </button>
          ))}

          {(externalLoading || externalVisible.length > 0) && (
            <div className="mt-1 border-t border-border/50 pt-1">
              <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">From the internet</p>
              {externalLoading && externalVisible.length === 0 && (
                <p role="status" className="px-3 py-1.5 text-xs text-muted-foreground">Searching the web…</p>
              )}
              {externalVisible.map((item) => (
                <button
                  key={`ext-${item.id}`}
                  type="button"
                  onClick={() => {
                    if (item.kind === 'video') {
                      // Play inline in the home feed (new-window navigation is blocked by COOP).
                      window.dispatchEvent(new CustomEvent('mmora:feed-external-videos', {
                        detail: {
                          videos: externalVideos.map((video) => ({
                            id: video.id,
                            title: video.title,
                            subtitle: video.subtitle,
                            url: video.url,
                            thumbnail: video.thumbnail,
                          })),
                          activeId: item.id,
                        },
                      }));
                      setSearchOpen(false);
                      return;
                    }
                    if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-muted/60"
                >

                  {item.thumbnail && (
                    <img src={item.thumbnail} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">{item.title}</span>
                    {item.subtitle && (
                      <span className="block truncate text-[11px] text-muted-foreground">{item.subtitle}</span>
                    )}
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-[1px] text-[9px] uppercase tracking-wide text-muted-foreground">
                    {item.kind}
                  </span>
                </button>
              ))}
            </div>
          )}

        </div>
      )}


      <SearchDebugPanel debug={ambientDebug} />
    </>
  );
}
