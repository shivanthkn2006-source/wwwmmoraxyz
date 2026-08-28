/**
 * GROWTH INSIGHTS ARCHIVE
 *
 * Standalone page (same shape as the Zoe Astro dashboard) listing every growth
 * card ever delivered to the signed-in user, newest day first and in window
 * order within each day. Read-only: opening this page never triggers
 * generation, so browsing history costs a database read and nothing else.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bookmark, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CuratedInsightCard } from '@/components/growth/CuratedInsightCard';
import { slotOrder, type GrowthSlot } from '@/lib/growthSlot';

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

const PAGE_SIZE = 120;

const formatDay = (date: string) => {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
};

export default function GrowthInsightsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [itemRes, savedRes] = await Promise.all([
        supabase
          .from('growth_feed_items')
          .select('id, slot, local_date, title, category, content, actionable_step, created_at')
          .eq('user_id', user.id)
          .eq('status', 'published')
          .order('local_date', { ascending: false })
          .limit(PAGE_SIZE),
        supabase.from('growth_saved_items').select('item_id').eq('user_id', user.id),
      ]);
      if (itemRes.error) throw itemRes.error;
      setItems((itemRes.data as ArchiveItem[] | null) ?? []);
      setSavedIds(new Set(((savedRes.data as { item_id: string }[] | null) ?? []).map((r) => r.item_id)));
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Growth Insights Archive | Zoe</title>
        <meta
          name="description"
          content="Every daily growth insight Zoe has delivered, ordered by day and delivery window, with your saved cards in one place."
        />
      </Helmet>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <header className="mb-6 flex items-center gap-3">
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
            Saved
          </Button>
        </header>

        {loading && <p className="text-sm text-muted-foreground">Loading your insights…</p>}

        {!loading && failed && (
          <div className="rounded-xl border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">We could not load your insights right now.</p>
            <Button className="mt-3" size="sm" onClick={() => void load()}>Try again</Button>
          </div>
        )}

        {!loading && !failed && days.length === 0 && (
          <div className="rounded-xl border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {savedOnly
                ? 'No saved insights yet — tap the bookmark on any card to keep it here.'
                : 'No insights yet. Your first cards arrive at your next delivery window.'}
            </p>
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
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
