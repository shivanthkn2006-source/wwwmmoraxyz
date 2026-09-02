/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ZOE SEARCH CONSOLE (isolated)
 * Dual-core search surface: intent routing → hybrid retrieval → Zoe synthesis.
 * Rendered as a Cyber-Night glassmorphism overlay. Completely self-contained —
 * it never imports or mutates home feed / loops components.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Globe,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  PlayCircle,
  Search,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useHomeSearch, SIGNAL_LABEL, type HomeSearchResult } from '@/hooks/useHomeSearch';
import { useAmbientSearch } from '@/core/ports/useAmbientSearch';
import { classifyQuery, faviconFor, hostFromUrl, relativeTime, sanitizeText } from '@/lib/searchSanitize';
import { tagsForItem, KIND_LABEL, type FeedSearchItem } from '@/lib/feedSearchItems';

export interface ZoeSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional handler used by the host surface to open results in place. */
  onOpenResults?: (items: FeedSearchItem[], activeId?: string) => void;
  /** Optional handler for platform (in-app) results. */
  onOpenPlatform?: (result: HomeSearchResult) => void;
}

type TabId = 'all' | 'platform' | 'memory' | 'web';

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'platform', label: 'DHF & Posts' },
  { id: 'memory', label: 'Memory' },
  { id: 'web', label: 'Web & Media' },
];

const WEB_KINDS = new Set(['web', 'news', 'video', 'image', 'music', 'shopping', 'weather']);

const glass = 'border border-white/10 bg-black/60 backdrop-blur-2xl';

export const ZoeSearchModal: React.FC<ZoeSearchModalProps> = ({
  isOpen,
  onClose,
  onOpenResults,
  onOpenPlatform,
}) => {
  const [query, setQuery] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [tab, setTab] = React.useState<TabId>('all');
  const [external, setExternal] = React.useState<FeedSearchItem[]>([]);
  const [externalLoading, setExternalLoading] = React.useState(false);
  const [memoryOpen, setMemoryOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const intent = React.useMemo(() => classifyQuery(debounced), [debounced]);

  // 250ms debounce → local classification → retrieval.
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  const { results: platformResults, loading: platformLoading, error: platformError } = useHomeSearch(
    debounced,
    isOpen,
  );
  const {
    executeAmbientSearch,
    isSynthesizing,
    result: ambient,
    error: ambientError,
    reset: resetAmbient,
  } = useAmbientSearch();

  React.useEffect(() => {
    if (!isOpen) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(id);
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Zoe synthesis: skipped for exact-entity lookups (instant entity cards).
  React.useEffect(() => {
    resetAmbient();
    if (!isOpen || debounced.length < 3 || intent === 'entity') return;
    void executeAmbientSearch(debounced);
  }, [debounced, isOpen, intent, executeAmbientSearch, resetAmbient]);

  // External lanes (web / news / video / image / shopping / music / weather).
  React.useEffect(() => {
    if (!isOpen || debounced.length < 3) {
      setExternal([]);
      return;
    }
    let cancelled = false;
    setExternalLoading(true);
    void (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('external-search', {
          body: { query: debounced },
        });
        if (error) throw error;
        const items: FeedSearchItem[] = (data?.results ?? []).map((item: FeedSearchItem) => ({
          ...item,
          title: sanitizeText(item.title) || item.title,
          subtitle: sanitizeText(item.subtitle),
        }));
        if (!cancelled) setExternal(items);
      } catch (err) {
        console.warn('[zoe-search] external lanes failed', err);
        if (!cancelled) setExternal([]);
      } finally {
        if (!cancelled) setExternalLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, isOpen]);

  const memoryResults = React.useMemo(
    () => platformResults.filter((item) => item.filter === 'chats'),
    [platformResults],
  );
  const highlightResults = React.useMemo(
    () => platformResults.filter((item) => item.filter !== 'chats'),
    [platformResults],
  );
  const webResults = React.useMemo(() => external.filter((item) => WEB_KINDS.has(item.kind)), [external]);

  const counts: Record<TabId, number> = {
    all: platformResults.length + external.length,
    platform: highlightResults.length,
    memory: memoryResults.length,
    web: webResults.length,
  };

  const showPlatform = tab === 'all' || tab === 'platform';
  const showMemory = tab === 'all' || tab === 'memory';
  const showWeb = tab === 'all' || tab === 'web';

  const speak = React.useCallback((text: string) => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis?.speak(utterance);
    } catch {
      /* voice is a progressive enhancement */
    }
  }, []);

  const openWeb = React.useCallback(
    (item: FeedSearchItem) => {
      onOpenResults?.(webResults, item.id);
    },
    [onOpenResults, webResults],
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="zoe-search"
          className="fixed inset-0 z-[10000] flex items-start justify-center px-3 pt-[max(3rem,env(safe-area-inset-top))] pb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Zoe search"
        >
          <button
            type="button"
            aria-label="Close search"
            onClick={onClose}
            className="absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className={`relative flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl shadow-2xl ${glass}`}
          >
            {/* Query bar */}
            <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3">
              <Search className="h-5 w-5 shrink-0 text-blue-400" aria-hidden />
              <input
                ref={inputRef}
                role="searchbox"
                aria-label="Search mmora or ask Zoe"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search mmora or ask Zoe…"
                className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/40 sm:text-lg"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery('')}
                  className="rounded-full p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                aria-label="Close search"
                onClick={onClose}
                className="rounded-full p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {debounced.length > 0 && (
              <div className="flex min-h-0 flex-1 flex-col">
                {/* Category chips */}
                <div className="flex min-h-[52px] shrink-0 items-center gap-2 overflow-x-auto border-b border-white/10 px-4 py-2.5" role="group" aria-label="Result categories">
                  {TABS.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      aria-pressed={tab === entry.id}
                      onClick={() => setTab(entry.id)}
                      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs transition-all ${
                        tab === entry.id
                          ? 'border-blue-500/50 bg-blue-500/20 text-blue-300'
                          : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {entry.label} {counts[entry.id]}
                    </button>
                  ))}
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
                  {/* Zoe synthesis */}
                  {intent !== 'entity' && (
                    <section
                      aria-label="Zoe synthesis"
                      className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 shadow-[0_0_30px_-12px] shadow-blue-500/20"
                    >
                      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-blue-300">
                        <Sparkles className="h-4 w-4" aria-hidden />
                        Zoe synthesis
                      </div>
                      {isSynthesizing && (
                        <p role="status" className="flex items-center gap-2 text-sm text-white/60">
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          Zoe is analysing “{debounced}” across your DHF, memory and the web…
                        </p>
                      )}
                      {!isSynthesizing && ambientError && (
                        <p role="alert" className="text-sm text-white/60">{ambientError}</p>
                      )}
                      {!isSynthesizing && !ambientError && ambient?.synthesis && (
                        <>
                          <p className="text-sm leading-relaxed text-white/90">{sanitizeText(ambient.synthesis)}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => speak(sanitizeText(ambient.synthesis))}
                              className="flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-[11px] text-blue-300 transition hover:bg-blue-500/20"
                            >
                              <Volume2 className="h-3.5 w-3.5" aria-hidden /> Listen
                            </button>
                            <button
                              type="button"
                              onClick={() => void navigator.clipboard?.writeText(sanitizeText(ambient.synthesis))}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70 transition hover:bg-white/10"
                            >
                              Copy
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuery(`${debounced} — tell me more`)}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70 transition hover:bg-white/10"
                            >
                              Ask follow-up
                            </button>
                          </div>
                        </>
                      )}
                    </section>
                  )}

                  {/* Platform highlights */}
                  {showPlatform && (
                    <section aria-label="Platform highlights">
                      <h2 className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-white/50">
                        <ImageIcon className="h-3.5 w-3.5" aria-hidden /> Platform highlights
                      </h2>
                      {platformLoading && (
                        <p role="status" className="text-xs text-white/50">Searching mmora…</p>
                      )}
                      {!platformLoading && platformError && (
                        <p role="alert" className="text-xs text-white/50">{platformError}</p>
                      )}
                      {!platformLoading && !platformError && highlightResults.length === 0 && (
                        <p className="text-xs text-white/40">No platform matches yet.</p>
                      )}
                      {highlightResults.length > 0 && (
                        <div className="flex gap-3 overflow-x-auto pb-1">
                          {highlightResults.map((result) => (
                            <button
                              key={`${result.type}-${result.id}`}
                              type="button"
                              data-testid="platform-result"
                              onClick={() => onOpenPlatform?.(result)}
                              className={`w-56 shrink-0 rounded-2xl p-3 text-left transition hover:bg-white/10 ${glass}`}
                            >
                              {result.avatarUrl && (
                                <img
                                  src={result.avatarUrl}
                                  alt=""
                                  loading="lazy"
                                  className="mb-2 h-24 w-full rounded-xl object-cover"
                                />
                              )}
                              <p className="truncate text-sm text-white">{sanitizeText(result.title)}</p>
                              {result.subtitle && (
                                <p className="mt-0.5 line-clamp-2 text-[11px] text-white/50">
                                  {sanitizeText(result.subtitle)}
                                </p>
                              )}
                              <span className="mt-1.5 flex flex-wrap gap-1">
                                {result.signals.map((signal) => (
                                  <span
                                    key={signal}
                                    className="rounded-full bg-white/10 px-1.5 py-[1px] text-[9px] uppercase tracking-wide text-white/60"
                                  >
                                    {SIGNAL_LABEL[signal]}
                                  </span>
                                ))}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </section>
                  )}

                  {/* Conversational memory drawer */}
                  {showMemory && memoryResults.length > 0 && (
                    <section aria-label="Conversational memory">
                      <button
                        type="button"
                        aria-expanded={memoryOpen || tab === 'memory'}
                        onClick={() => setMemoryOpen((open) => !open)}
                        className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-[11px] uppercase tracking-wide text-white/60"
                      >
                        <span className="flex items-center gap-2">
                          <MessageSquare className="h-3.5 w-3.5" aria-hidden /> Conversational memory
                        </span>
                        <span>{memoryResults.length}</span>
                      </button>
                      {(memoryOpen || tab === 'memory') && (
                        <div className="mt-2 space-y-2">
                          {memoryResults.map((result) => (
                            <button
                              key={`memory-${result.id}`}
                              type="button"
                              onClick={() => onOpenPlatform?.(result)}
                              className="block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:bg-white/10"
                            >
                              <p className="truncate text-sm text-white">{sanitizeText(result.title)}</p>
                              {result.subtitle && (
                                <p className="line-clamp-2 text-[11px] text-white/50">{sanitizeText(result.subtitle)}</p>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </section>
                  )}

                  {/* Web & media */}
                  {showWeb && (
                    <section aria-label="Web and media">
                      <h2 className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-white/50">
                        <Globe className="h-3.5 w-3.5" aria-hidden /> From the web &amp; media
                      </h2>
                      {externalLoading && webResults.length === 0 && (
                        <p role="status" className="text-xs text-white/50">Searching the internet…</p>
                      )}
                      <div className="space-y-2">
                        {webResults.map((item) => {
                          const portal = item.source || hostFromUrl(item.url);
                          const icon = faviconFor(item.url);
                          const when = relativeTime(item.publishedAt);
                          return (
                            <button
                              key={`web-${item.id}`}
                              type="button"
                              data-testid="external-result"
                              onClick={() => openWeb(item)}
                              className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-white/10 ${glass}`}
                            >
                              {item.thumbnail || item.image ? (
                                <span className="relative shrink-0">
                                  <img
                                    src={item.thumbnail || item.image}
                                    alt=""
                                    loading="lazy"
                                    className="h-14 w-20 rounded-xl object-cover"
                                  />
                                  {item.kind === 'video' && (
                                    <PlayCircle className="absolute inset-0 m-auto h-6 w-6 text-white/90" aria-hidden />
                                  )}
                                </span>
                              ) : (
                                <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl bg-white/5">
                                  <Globe className="h-5 w-5 text-white/40" aria-hidden />
                                </span>
                              )}
                              <span className="min-w-0 flex-1">
                                <span className="line-clamp-2 block text-sm text-white">{sanitizeText(item.title)}</span>
                                <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/50">
                                  {icon && <img src={icon} alt="" className="h-3 w-3 rounded-sm" loading="lazy" />}
                                  {portal ?? KIND_LABEL[item.kind]}
                                  {when ? ` · ${when}` : ''}
                                </span>
                                {tagsForItem(item).length > 0 && (
                                  <span className="mt-1 flex flex-wrap gap-1">
                                    {tagsForItem(item).slice(0, 4).map((tag) => (
                                      <span
                                        key={tag}
                                        className="rounded-full bg-white/10 px-1.5 py-[1px] text-[9px] text-white/60"
                                      >
                                        {sanitizeText(tag)}
                                      </span>
                                    ))}
                                  </span>
                                )}
                              </span>
                              <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-[1px] text-[9px] uppercase tracking-wide text-white/60">
                                {KIND_LABEL[item.kind] ?? item.kind}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {!externalLoading && webResults.length === 0 && (
                        <p className="text-xs text-white/40">No web results yet.</p>
                      )}
                    </section>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ZoeSearchModal;
