import React from 'react';
import { Camera, ListVideo, Loader2, Search, X } from 'lucide-react';
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
import { KIND_LABEL, tagsForItem, type FeedSearchItem, type FeedSearchKind } from '@/lib/feedSearchItems';



interface HomeFloatingToolsProps {
  query: string;
  onQueryChange: (query: string) => void;
  onOpenEditor: () => void;
  hasInjectedVideos?: boolean;
}

const ICON_SIZE = 36;
const GAP = 6;
const EDGE_GAP = 8;

/** Platform chips + internet lanes, so one bar covers every result universe. */
export type HomeFilter = SearchFilter | 'web' | 'news' | 'shopping' | 'weather';

const ALL_FILTERS: { id: HomeFilter; label: string }[] = [
  ...SEARCH_FILTERS,
  { id: 'web', label: 'Web' },
  { id: 'news', label: 'News' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'weather', label: 'Weather' },
];

const INTERNAL_FILTERS = new Set<string>(SEARCH_FILTERS.map((chip) => chip.id));

const FILTER_TO_EXTERNAL_KINDS: Partial<Record<HomeFilter, FeedSearchKind[]>> = {
  images: ['image'],
  videos: ['video'],
  web: ['web', 'music'],
  news: ['news'],
  shopping: ['shopping'],
  weather: ['weather'],
};

export default function HomeFloatingTools({ query, onQueryChange, onOpenEditor, hasInjectedVideos = false }: HomeFloatingToolsProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [iconPosition, setIconPosition] = React.useState<{ x: number; y: number }>({ x: 8, y: 80 });
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const { results: allResults, loading, error, counts } = useHomeSearch(query, searchOpen);
  const [filter, setFilter] = React.useState<HomeFilter>('all');
  const results = React.useMemo(
    () =>
      filter === 'all'
        ? allResults
        : INTERNAL_FILTERS.has(filter)
          ? allResults.filter((item) => (item.facets?.length ? item.facets : [item.filter]).includes(filter as SearchFilter))
          : [],
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


  // Outside-the-platform results (web, images, news, videos, weather,
  // shopping, music) via the external-search function.
  const [externalResults, setExternalResults] = React.useState<FeedSearchItem[]>([]);
  const [externalLoading, setExternalLoading] = React.useState(false);

  // Feed icon lifecycle: hidden when nothing is injected, loading while the
  // search videos are being pushed into the feed, active once they render.
  const [feedIconState, setFeedIconState] = React.useState<'hidden' | 'injecting' | 'ready'>('hidden');
  React.useEffect(() => {
    const onInject = () => setFeedIconState((s) => (s === 'ready' ? s : 'injecting'));
    window.addEventListener('mmora:feed-external-videos', onInject);
    return () => {
      window.removeEventListener('mmora:feed-external-videos', onInject);
    };
  }, []);

  // The parent feed is the source of truth. This prevents an event race from
  // leaving a stale exit control visible after the injected slides are gone.
  React.useEffect(() => {
    setFeedIconState(hasInjectedVideos ? 'ready' : 'hidden');
  }, [hasInjectedVideos]);


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


  // The internet block follows the active chip. Every chip maps to the external
  // kinds it owns so no lane (web/images/news/shopping/weather) is ever hidden.
  const externalVisible = React.useMemo(() => {
    if (filter === 'all') return externalResults;
    const kinds = FILTER_TO_EXTERNAL_KINDS[filter] ?? [];
    if (!kinds.length) return [];
    return externalResults.filter((item) => kinds.includes(item.kind));
  }, [filter, externalResults]);

  const externalCounts = React.useMemo(() => {
    const counter: Partial<Record<HomeFilter, number>> = {};
    for (const chip of ALL_FILTERS) {
      const kinds = FILTER_TO_EXTERNAL_KINDS[chip.id] ?? [];
      counter[chip.id] = kinds.length
        ? externalResults.filter((item) => kinds.includes(item.kind)).length
        : 0;
    }
    return counter;
  }, [externalResults]);

  /**
   * Everything opens INSIDE the M'Mora feed — external tabs are never used for
   * playback/browsing. The whole visible result set is injected so the user can
   * swipe through web/news/image/shopping/video cards like any other feed.
   */
  const openInFeed = React.useCallback((items: FeedSearchItem[], activeId?: string) => {
    const payload = items.filter((item) => item && (item.kind === 'video' ? !!item.url : true));
    if (!payload.length) return;
    window.dispatchEvent(new CustomEvent('mmora:feed-external-videos', {
      detail: { items: payload, videos: payload, activeId: activeId ?? payload[0].id },
    }));
    setSearchOpen(false);
  }, []);

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



  const handleInputKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setSearchOpen(false);
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      // Enter submits; Shift+Enter keeps the query on a new visual line.
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
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

  // Viewport-aware sizing: the bar and its dropdown re-fit on every resize /
  // orientation change so phones, tablets, laptops and ultrawides all get a
  // correctly proportioned search surface.
  const [viewport, setViewport] = React.useState(() => ({
    w: typeof window === 'undefined' ? 1024 : window.innerWidth,
    h: typeof window === 'undefined' ? 768 : window.innerHeight,
  }));
  React.useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  // The open search surface is pinned to the very top of the viewport (above
  // the M'Mora logo) so phones get the maximum reading area underneath it.
  const CLOSE_SLOT = 52;
  const barTop = 8;
  const barLeft = CLOSE_SLOT + EDGE_GAP;
  const barWidth = Math.max(160, viewport.w - barLeft - EDGE_GAP);
  const barRef = React.useRef<HTMLDivElement>(null);
  const [barHeight, setBarHeight] = React.useState(52);
  React.useEffect(() => {
    const node = barRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setBarHeight(node.offsetHeight || 52));
    observer.observe(node);
    setBarHeight(node.offsetHeight || 52);
    return () => observer.disconnect();
  }, [searchOpen]);
  // The dropdown starts at the left edge so it uses every pixel of width.
  const panelLeft = EDGE_GAP;
  const panelWidth = Math.max(200, viewport.w - EDGE_GAP * 2);
  const dropdownTop = barTop + barHeight + 8;
  const dropdownMaxHeight = Math.max(180, viewport.h - dropdownTop - 16);

  /** Cyber-Night glass: real transparency + blur, never a solid panel. */
  const glassSurface =
    'border border-white/15 bg-white/[0.06] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/[0.06]';

  return (
    <>
      <DraggableHomeControl
        storageKey="mmora.home.search-position.v3"
        defaultPosition={{ x: 8, y: 80 }}
        ariaLabel={searchOpen ? 'Close home search' : 'Search home'}
        className={searchOpen ? 'pointer-events-none opacity-0' : 'rounded-full bg-white/5 backdrop-blur-xl backdrop-saturate-150'}
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

      {feedIconState !== 'hidden' && (
        <DraggableHomeControl
          storageKey="mmora.home.feed-position.v3"
          defaultPosition={{ x: 8, y: 168 }}
          ariaLabel={
            feedIconState === 'injecting'
              ? 'Loading search videos — exit to my feed will be available shortly'
              : 'Exit search videos and go back to my feed'
          }
          disabled={feedIconState === 'injecting'}
          busy={feedIconState === 'injecting'}
          onActivate={() => window.dispatchEvent(new CustomEvent('mmora:exit-search-videos'))}
        >
          {feedIconState === 'injecting' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ListVideo className="h-5 w-5" />
          )}
        </DraggableHomeControl>
      )}


      {/* Bare close control — sits left of the bar, no outline, no box */}
      {searchOpen && (
        <button
          type="button"
          aria-label="Close home search"
          onClick={() => setSearchOpen(false)}
          className="fixed z-[9997] flex h-11 w-11 items-center justify-center rounded-full bg-transparent text-white/90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] focus-visible:outline-none"
          style={{ left: EDGE_GAP, top: barTop + Math.max(0, (barHeight - 44) / 2) }}
        >
          <X className="h-5 w-5" />
        </button>
      )}

      <div
        ref={barRef}
        className={`fixed z-[9996] flex items-start overflow-hidden rounded-3xl p-1.5 text-white transition-[opacity] duration-200 ease-out ${glassSurface}`}
        style={{
          left: barLeft,
          top: barTop,
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
        <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 items-start gap-2 px-2 py-1">
          <Search className="mt-2 h-4 w-4 shrink-0 text-white/60" />
          <textarea
            ref={inputRef}
            role="searchbox"
            rows={1}
            onKeyDown={handleInputKeyDown}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search posts, shorts, tags or creators"
            tabIndex={searchOpen ? 0 : -1}
            /* Auto-grows as the user types so long queries stay fully visible. */
            className="max-h-32 min-h-[36px] w-full resize-none bg-transparent py-2 text-sm leading-5 text-white outline-none placeholder:text-white/45"
            style={{ height: 'auto' }}
            onInput={(event) => {
              const node = event.currentTarget;
              node.style.height = 'auto';
              node.style.height = `${Math.min(node.scrollHeight, 128)}px`;
            }}
          />
          {query && (
            <button
              type="button"
              className="mt-1 rounded-full p-1 text-white/60 transition hover:text-white"
              aria-label="Clear search"
              onClick={() => onQueryChange('')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
      </div>

      {searchOpen && query.trim().length >= 1 && (
        <div
          className={`fixed z-[9996] overflow-y-auto overscroll-contain rounded-3xl p-1.5 text-white ${glassSurface}`}
          style={{
            left: panelLeft,
            top: dropdownTop,
            width: panelWidth,
            maxHeight: dropdownMaxHeight,
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >

          {indexEmpty && (
            <p role="alert" className="px-3 py-2 text-xs text-white/55">
              Search index is empty — Zoe is rebuilding it now. Results will appear shortly.
            </p>
          )}
          {insightLines.length > 0 && (
            <div className="border-b border-white/10 pb-1" role="list" aria-label="Platform answers">
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
                  className="block w-full rounded-xl px-3 py-1.5 text-left text-[11px] leading-snug text-white/90 hover:bg-white/10"
                >
                  {line.text}
                </button>
              ))}
            </div>
          )}
          {(allResults.length > 0 || externalResults.length > 0) && (
            <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-2 py-1.5" role="group" aria-label="Filter search results">
              {ALL_FILTERS.map((chip) => {
                const internal = INTERNAL_FILTERS.has(chip.id) ? counts[chip.id as SearchFilter] ?? 0 : 0;
                const total = chip.id === 'all'
                  ? internal + externalResults.length
                  : internal + (externalCounts[chip.id] ?? 0);
                return (
                  <button
                    key={chip.id}
                    type="button"
                    aria-pressed={filter === chip.id}
                    onClick={() => setFilter(chip.id)}
                    className={`shrink-0 bg-transparent px-2 py-0.5 text-[11px] ${
                      filter === chip.id
                        ? 'font-semibold text-white'
                        : 'text-white/50 hover:text-white/80'
                    }`}
                  >
                    {chip.label} {total}
                  </button>
                );
              })}
            </div>
          )}
          {loading && <p role="status" className="px-3 py-2 text-xs text-white/55">Searching…</p>}
          {!loading && error && <p role="alert" className="px-3 py-2 text-xs text-white/55">{error}</p>}
          {!loading && !error && results.length === 0 && insightLines.length === 0 && !ambient && !isSynthesizing && (
            <p role="status" className="px-3 py-2 text-xs text-white/55">No results for "{query.trim()}"</p>
          )}

          {results.map((result, index) => (
            <button
              key={`${result.type}-${result.id}`}
              type="button"
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setActiveIndex(index)}
              aria-selected={index === activeIndex}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-white/10 ${index === activeIndex ? 'bg-white/10' : ''}`}
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
                <span className="block truncate text-sm text-white">{result.title}</span>
                {result.subtitle && (
                  <span className="block truncate text-[11px] text-white/55">{result.subtitle}</span>
                )}
                <span className="mt-0.5 flex flex-wrap gap-1">
                  {result.signals.map((signal) => (
                    <span
                      key={signal}
                      className="rounded-full bg-white/10 px-1.5 py-[1px] text-[9px] uppercase tracking-wide text-white/55"
                    >
                      {SIGNAL_LABEL[signal]}
                    </span>
                  ))}
                </span>
              </span>
            </button>
          ))}

          {isSynthesizing && (
            <p role="status" className="px-3 py-2 text-xs text-white/55">Zoe is synthesizing…</p>
          )}
          {!isSynthesizing && ambientError && (
            <p role="alert" className="px-3 py-2 text-xs text-white/55">{ambientError}</p>
          )}
          {!isSynthesizing && ambient?.synthesis && (
            <p className="px-3 py-2 text-xs leading-relaxed text-white/90">{ambient.synthesis}</p>
          )}
          {!isSynthesizing && (ambient?.records ?? []).map((record) => (
            <button
              key={`ambient-${record.id}`}
              type="button"
              onClick={() => handleAmbientRecord(record)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-white/10"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-white">{labelForRecord(record)}</span>
                <span className="block truncate text-[11px] text-white/55">{record.entity_type}</span>
              </span>
            </button>
          ))}

          {(externalLoading || externalVisible.length > 0) && (
            <div className="mt-1 border-t border-white/10 pt-1">
              <div className="flex items-center justify-between gap-2 px-3 py-1">
                <p className="text-[10px] uppercase tracking-wide text-white/55">From the internet</p>
                {externalVisible.length > 0 && (
                  <button
                    type="button"
                    onClick={() => openInFeed(externalVisible)}
                    className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium text-white"
                  >
                    Open {externalVisible.length} in feed
                  </button>
                )}
              </div>
              {externalLoading && externalVisible.length === 0 && (
                <p role="status" className="px-3 py-1.5 text-xs text-white/55">Searching the web…</p>
              )}
              {externalVisible.map((item) => {
                const expanded = expandedId === item.id;
                return (
                  <div key={`ext-${item.id}`} className="rounded-xl">
                    <button
                      type="button"
                      data-testid="external-result"
                      aria-expanded={expanded}
                      // Videos need the feed for playback; everything else
                      // expands right here, Google-style, and only opens in the
                      // feed when the user asks for it.
                      onClick={() =>
                        item.kind === 'video'
                          ? openInFeed(externalVisible, item.id)
                          : setExpandedId(expanded ? null : item.id)
                      }
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-white/10"
                    >
                      {(item.thumbnail || item.image) && (
                        <img src={item.thumbnail || item.image} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm text-white ${expanded ? '' : 'truncate'}`}>{item.title}</span>
                        {item.subtitle && (
                          <span className={`block text-[11px] text-white/55 ${expanded ? '' : 'truncate'}`}>{item.subtitle}</span>
                        )}
                        {tagsForItem(item).length > 0 && (
                          <span className="mt-0.5 flex flex-wrap gap-1">
                            {tagsForItem(item).slice(0, 4).map((tag) => (
                              <span key={tag} className="rounded-full bg-white/10 px-1.5 py-[1px] text-[9px] text-white/55">
                                {tag}
                              </span>
                            ))}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-[9px] uppercase tracking-wide text-white/45">
                        {KIND_LABEL[item.kind] ?? item.kind}
                      </span>
                    </button>

                    {expanded && (
                      <div className="mb-1 rounded-xl bg-white/[0.04] px-3 py-2" data-testid="external-result-expanded">
                        {item.image && (
                          <img
                            src={item.image}
                            alt=""
                            loading="lazy"
                            className="mb-2 max-h-48 w-full rounded-lg object-cover"
                          />
                        )}
                        <p className="text-[12px] leading-relaxed text-white/85">
                          {item.subtitle || item.title}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openInFeed(externalVisible, item.id)}
                            className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-white"
                          >
                            Open in feed
                          </button>
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-full bg-white/[0.08] px-3 py-1 text-[11px] text-white/80"
                            >
                              Source{portalForItem(item) ? ` · ${portalForItem(item)}` : ''}
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}


      <SearchDebugPanel debug={ambientDebug} />
    </>
  );
}
