/**
 * GROWTH INSIGHTS ARCHIVE
 *
 * Standalone page (same shape as the Zoe Astro dashboard) listing every growth
 * card ever delivered to the signed-in user, newest day first and in window
 * order within each day. Read-only: opening this page never triggers
 * generation, so browsing history costs a database read and nothing else.
 *
 * Scaling contract: rows are paged from the database (never loaded whole),
 * search and date filters run server-side, and the next page is fetched only
 * when the sentinel scrolls into view.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bookmark, Sparkles, Search, Loader2, CalendarRange, X, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CuratedInsightCard, CuratedInsightSkeleton } from '@/components/growth/CuratedInsightCard';
import GrowthInsightDetailsModal from '@/components/growth/GrowthInsightDetailsModal';
import GrowthEngineStatusBanner from '@/components/growth/GrowthEngineStatusBanner';
import GrowthTodayStatusPanel from '@/components/growth/GrowthTodayStatusPanel';
import GrowthEngineSettings from '@/components/growth/GrowthEngineSettings';
import PersonalGrowthOnboarding from '@/components/growth/PersonalGrowthOnboarding';
import { recordGrowthEvent } from '@/lib/growthAnalytics';
import {
import { invokeGrowthDispatch } from '@/lib/growthDispatch';
  slotOrder, sanitizeStyles, FOCUS_AREAS, deviceTimeZone,
  type GrowthSlot, type ReflectionStyle,
} from '@/lib/growthSlot';

interface ArchiveItem {
  id: string;
  slot: GrowthSlot;
  local_date: string;
  title: string;
  category: string;
  content: string;
  actionable_step: string | null;
  created_at: string;
}

const PAGE_SIZE = 20;

const formatDay = (date: string) => {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
};

/** Escapes PostgREST `ilike` wildcards so a search term can never widen the query. */
const escapeLike = (value: string) => value.replace(/[%,()*\\]/g, '').trim().slice(0, 60);

export default function GrowthInsightsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [details, setDetails] = useState<ArchiveItem | null>(null);
  const [engineOff, setEngineOff] = useState(false);
  const [activating, setActivating] = useState(false);
  const [editingPlan, setEditingPlan] = useState(false);
  const [reOnboardingOpen, setReOnboardingOpen] = useState(false);
  const [prefs, setPrefs] = useState<{ focus: string[]; styles: ReflectionStyle[]; tz: string; frequency: number }>({
    focus: [], styles: [], tz: '', frequency: 5,
  });

  const sentinel = useRef<HTMLDivElement | null>(null);
  const requestId = useRef(0);

  // Debounce typing so a fast typist issues one query, not one per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    async (offset: number): Promise<ArchiveItem[]> => {
      if (!user) return [];
      let request = supabase
        .from('growth_feed_items')
        .select('id, slot, local_date, title, category, content, actionable_step, created_at')
        .eq('user_id', user.id)
        .eq('status', 'published');

      const term = escapeLike(query);
      if (term) request = request.or(`title.ilike.%${term}%,content.ilike.%${term}%,category.ilike.%${term}%`);
      if (from) request = request.gte('local_date', from);
      if (to) request = request.lte('local_date', to);

      const { data, error } = await request
        .order('local_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      return (data as ArchiveItem[] | null) ?? [];
    },
    [user, query, from, to],
  );

  const load = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    const id = ++requestId.current;
    setLoading(true);
    try {
      const [page, savedRes, prefRes] = await Promise.all([
        fetchPage(0),
        supabase.from('growth_saved_items').select('item_id').eq('user_id', user.id),
        supabase
          .from('growth_preferences')
          .select('focus_areas, reflection_style, reflection_styles, delivery_frequency, timezone, paused, onboarded_at')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);
      if (id !== requestId.current) return; // a newer query already won
      setItems(page);
      setHasMore(page.length === PAGE_SIZE);
      setSavedIds(new Set(((savedRes.data as { item_id: string }[] | null) ?? []).map((r) => r.item_id)));
      const p = prefRes.data as Record<string, unknown> | null;
      setEngineOff(!p || !p.onboarded_at || p.paused === true);
      if (p) {
        setPrefs({
          focus: (p.focus_areas as string[]) ?? [],
          styles: sanitizeStyles(
            (p.reflection_styles as unknown[])?.length ? (p.reflection_styles as unknown[]) : [p.reflection_style],
          ),
          tz: (p.timezone as string) ?? '',
          frequency: Number(p.delivery_frequency ?? 5),
        });
      }
      setFailed(false);
    } catch {
      if (id === requestId.current) setFailed(true);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [user, fetchPage]);

  useEffect(() => { void load(); }, [load]);

  /**
   * Turns the engine on from the archive. An account that dismissed or skipped
   * onboarding sits paused with no focus areas, which previously looked like an
   * empty, broken page. This writes a working default and immediately asks the
   * worker for today's card so the user sees a result right away.
   */
  const activateEngine = async () => {
    if (!user) return;
    setActivating(true);
    try {
      const { error } = await supabase.from('growth_preferences').upsert(
        {
          user_id: user.id,
          paused: false,
          onboarded_at: new Date().toISOString(),
          focus_areas: prefs.focus.length ? prefs.focus : [FOCUS_AREAS[0]],
          reflection_styles: prefs.styles.length ? prefs.styles : ['actionable'],
          reflection_style: prefs.styles[0] ?? 'actionable',
          timezone: prefs.tz || deviceTimeZone(),
        },
        { onConflict: 'user_id' },
      );
      if (error) throw error;
      // Best-effort first card — the scheduled worker also fills any gap.
      await invokeGrowthDispatch({ action: 'regenerate' });
      toast.success('Daily insights are on — generating your first card');
      await load();
    } catch {
      toast.error('Could not turn the engine on. Please try again.');
    } finally {
      setActivating(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore || savedOnly) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(items.length);
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...page.filter((i) => !seen.has(i.id))];
      });
      setHasMore(page.length === PAGE_SIZE);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, hasMore, savedOnly, fetchPage, items.length]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) void loadMore(); },
      { rootMargin: '400px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const toggleSave = useCallback(async (itemId: string) => {
    if (!user) return;
    const wasSaved = savedIds.has(itemId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.delete(itemId); else next.add(itemId);
      return next;
    });
    const { error } = wasSaved
      ? await supabase.from('growth_saved_items').delete().eq('user_id', user.id).eq('item_id', itemId)
      : await supabase.from('growth_saved_items').insert({ user_id: user.id, item_id: itemId });
    if (error) {
      // Roll the optimistic change back so the UI never lies about saved state.
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.add(itemId); else next.delete(itemId);
        return next;
      });
      toast.error('Could not update your saved insights');
    }
  }, [user, savedIds]);

  const days = useMemo(() => {
    const visible = savedOnly ? items.filter((i) => savedIds.has(i.id)) : items;
    const grouped = new Map<string, ArchiveItem[]>();
    visible.forEach((item) => {
      const bucket = grouped.get(item.local_date) ?? [];
      bucket.push(item);
      grouped.set(item.local_date, bucket);
    });
    return Array.from(grouped.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, list]) => ({
        date,
        list: [...list].sort((a, b) => slotOrder(a.slot) - slotOrder(b.slot)),
      }));
  }, [items, savedIds, savedOnly]);

  const filtersActive = Boolean(query || from || to);
  const clearFilters = () => { setSearch(''); setQuery(''); setFrom(''); setTo(''); };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Growth Insights Archive | Zoe</title>
        <meta
          name="description"
          content="Every daily growth insight Zoe has delivered, ordered by day and delivery window, with search, date filters and your saved cards in one place."
        />
      </Helmet>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <header className="mb-4 flex items-center gap-3">
          <Link
            to="/"
            aria-label="Back to home feed"
            className="rounded-lg border border-border p-2 text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
              Growth insights
            </h1>
            <p className="text-xs text-muted-foreground">
              Every card delivered to you, newest day first.
            </p>
          </div>
          <Button
            variant={savedOnly ? 'default' : 'outline'}
            size="sm"
            aria-pressed={savedOnly}
            onClick={() => setSavedOnly((v) => !v)}
          >
            <Bookmark className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {savedOnly ? 'Saved' : 'All'}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setReOnboardingOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
            Re-select categories with guided setup
          </Button>
        </header>

        <div className="mb-5 space-y-2">
          <Button
            variant={editingPlan ? 'default' : 'outline'}
            className="w-full"
            aria-expanded={editingPlan}
            onClick={() => setEditingPlan((value) => !value)}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden="true" />
            {editingPlan ? 'Close Growth plan' : 'Change my Growth plan'}
          </Button>
          {editingPlan && (
            <div data-growth-plan-editor>
              <GrowthEngineSettings onSaved={() => void load()} />
            </div>
          )}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search past insights"
                aria-label="Search past insights"
                className="pl-9"
              />
            </div>
            <Button
              variant={showFilters || from || to ? 'default' : 'outline'}
              size="icon"
              aria-label="Date range filter"
              aria-pressed={showFilters}
              onClick={() => setShowFilters((v) => !v)}
            >
              <CalendarRange className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {showFilters && (
            <div className="flex items-end gap-2 rounded-lg border border-border p-3">
              <label className="flex-1 text-[11px] text-muted-foreground">
                From
                <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label className="flex-1 text-[11px] text-muted-foreground">
                To
                <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
              </label>
            </div>
          )}

          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" aria-hidden="true" /> Clear filters
            </button>
          )}
        </div>

        {loading && (
          <div className="space-y-3" data-growth-loading>
            <CuratedInsightSkeleton />
            <CuratedInsightSkeleton />
          </div>
        )}

        {!loading && failed && (
          <div className="rounded-xl border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">We could not load your insights right now.</p>
            <Button className="mt-3" size="sm" onClick={() => void load()}>Try again</Button>
          </div>
        )}

        <GrowthEngineStatusBanner onChanged={() => void load()} />
        <GrowthTodayStatusPanel className="mb-4" />

        {!loading && !failed && engineOff && (
          <div className="mb-4 rounded-xl border border-primary/40 bg-primary/5 p-5 text-center" data-growth-engine-off>
            <Sparkles className="mx-auto mb-2 h-5 w-5 text-primary" aria-hidden="true" />
            <p className="text-sm font-medium">Your daily insights are switched off</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              Nothing is generated while the engine is paused, so this archive stays empty. Turn it
              on to start receiving cards at your delivery windows.
            </p>
            <Button className="mt-3" size="sm" disabled={activating} onClick={() => void activateEngine()}>
              {activating ? 'Turning on…' : 'Turn the engine on'}
            </Button>
          </div>
        )}

        {!loading && !failed && days.length === 0 && (
          <div className="rounded-xl border border-border p-8 text-center" data-growth-empty>
            <Sparkles className="mx-auto mb-3 h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">
              {savedOnly
                ? 'No saved insights yet'
                : filtersActive
                  ? 'Nothing matches those filters'
                  : 'No insights yet'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {savedOnly
                ? 'Tap the bookmark on any card to keep it here.'
                : filtersActive
                  ? 'Try a different keyword or widen the date range.'
                  : engineOff
                    ? 'Turn the engine on above to start receiving cards.'
                    : 'Your first cards arrive at your next delivery window.'}
            </p>
            {filtersActive && (
              <Button className="mt-3" size="sm" variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        )}

        <div className="space-y-8">
          {days.map(({ date, list }) => (
            <section key={date} aria-label={formatDay(date)}>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {formatDay(date)}
              </h2>
              <div className="space-y-3">
                {list.map((insight) => (
                  <CuratedInsightCard
                    key={insight.id}
                    insight={insight}
                    saved={savedIds.has(insight.id)}
                    onToggleSave={(id) => void toggleSave(id)}
                    onOpenDetails={(i) => setDetails(i as ArchiveItem)}
                    focusAreas={prefs.focus}
                    deliveryFrequency={prefs.frequency}
                    onImpression={(i) =>
                      void recordGrowthEvent('impression', {
                        userId: user?.id, itemId: i.id, slot: i.slot,
                        category: i.category, focusAreas: prefs.focus, surface: 'archive',
                      })
                    }
                    onCardClick={(i) =>
                      void recordGrowthEvent('click', {
                        userId: user?.id, itemId: i.id, slot: i.slot,
                        category: i.category, focusAreas: prefs.focus, surface: 'archive',
                      })
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        {!loading && !failed && !savedOnly && hasMore && (
          <div ref={sentinel} className="py-6 text-center">
            {loadingMore ? (
              <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Loading more…
              </p>
            ) : (
              <Button size="sm" variant="outline" onClick={() => void loadMore()}>Load more</Button>
            )}
          </div>
        )}

        <GrowthInsightDetailsModal
          insight={details}
          open={Boolean(details)}
          onOpenChange={(v) => { if (!v) setDetails(null); }}
          focusAreas={prefs.focus}
          styles={prefs.styles}
          timezone={prefs.tz}
        />
        <PersonalGrowthOnboarding
          open={reOnboardingOpen}
          onOpenChange={setReOnboardingOpen}
          mode="edit"
          initialTopics={prefs.focus}
          initialStyles={prefs.styles}
          initialFrequency={prefs.frequency}
          onComplete={() => void load()}
        />
      </div>
    </div>
  );
}
