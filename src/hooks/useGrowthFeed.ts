/**
 * READ-ONLY growth feed hook.
 *
 * The home feed subscribes to this and nothing else — it never triggers
 * generation, so refreshing costs a database read, not a model call. If the
 * engine is paused, in shadow mode, or the table is unreachable, the hook
 * returns an empty list and the feed renders exactly as it does today.
 *
 * Catch-up behaviour: every window that has already passed today is returned
 * in chronological order, so a member who signs in at night still sees the
 * morning, midday and afternoon cards they missed.
 *
 * Saved cards are bookmarked rows (any date) the member can revisit any time.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  currentSlot, deviceTimeZone, localDateIn, slotsForFrequency, slotOrder,
  sanitizeStyles, type GrowthSlot, type ReflectionStyle,
} from '@/lib/growthSlot';

export interface GrowthInsight {
  id: string;
  slot: GrowthSlot;
  local_date: string;
  title: string;
  category: string;
  content: string;
  actionable_step: string | null;
  created_at: string;
}

export interface GrowthPreferences {
  focus_areas: string[];
  reflection_style: ReflectionStyle;
  reflection_styles: ReflectionStyle[];
  delivery_frequency: number;
  paused: boolean;
  timezone: string;
  onboarded_at: string | null;
}

interface State {
  preferences: GrowthPreferences | null;
  /** Every published item from today + yesterday, newest first. */
  insights: GrowthInsight[];
  /** Today's already-due cards, in chronological window order. */
  today: GrowthInsight[];
  /** Bookmarked cards, newest save first. */
  saved: GrowthInsight[];
  savedIds: Set<string>;
  current: GrowthInsight | null;
  loading: boolean;
  error: boolean;
  needsOnboarding: boolean;
}

const EMPTY: State = {
  preferences: null, insights: [], today: [], saved: [], savedIds: new Set(),
  current: null, loading: true, error: false, needsOnboarding: false,
};

export function useGrowthFeed() {
  const { user } = useAuth();
  const [state, setState] = useState<State>(EMPTY);

  const load = useCallback(async () => {
    if (!user) { setState({ ...EMPTY, loading: false }); return; }

    const tz = deviceTimeZone();
    const provisionalToday = localDateIn(new Date(), tz);
    const provisionalYesterday = localDateIn(new Date(Date.now() - 86_400_000), tz);

    try {
      const [prefRes, itemRes, savedRes] = await Promise.all([
        supabase
          .from('growth_preferences')
          .select(
            'focus_areas, reflection_style, reflection_styles, delivery_frequency, paused, timezone, onboarded_at',
          )
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('growth_feed_items')
          .select('id, slot, local_date, title, category, content, actionable_step, created_at')
          .eq('user_id', user.id)
          .eq('status', 'published')
          .gte('local_date', provisionalYesterday)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('growth_saved_items')
          .select(
            'item_id, created_at, growth_feed_items!inner(id, slot, local_date, title, category, content, actionable_step, created_at)',
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      const raw = (prefRes.data as Record<string, unknown> | null) ?? null;
      const preferences: GrowthPreferences | null = raw
        ? {
            focus_areas: (raw.focus_areas as string[]) ?? [],
            reflection_style: (raw.reflection_style as ReflectionStyle) ?? 'actionable',
            reflection_styles: sanitizeStyles(
              (raw.reflection_styles as unknown[])?.length
                ? raw.reflection_styles
                : [raw.reflection_style],
            ),
            delivery_frequency: Number(raw.delivery_frequency ?? 5),
            paused: Boolean(raw.paused),
            timezone: (raw.timezone as string) || tz,
            onboarded_at: (raw.onboarded_at as string | null) ?? null,
          }
        : null;

      const insights = ((itemRes.data as GrowthInsight[] | null) ?? []);

      const savedRows = ((savedRes.data as Array<{
        item_id: string;
        growth_feed_items: GrowthInsight | GrowthInsight[] | null;
      }> | null) ?? []);
      const saved: GrowthInsight[] = savedRows
        .map((r) => (Array.isArray(r.growth_feed_items) ? r.growth_feed_items[0] : r.growth_feed_items))
        .filter((i): i is GrowthInsight => Boolean(i?.id));
      const savedIds = new Set(saved.map((i) => i.id));

      const enabled = slotsForFrequency(preferences?.delivery_frequency ?? 5);
      const zone = preferences?.timezone || tz;
      const today = localDateIn(new Date(), zone);
      const slot = currentSlot(new Date(), zone, enabled);

      // Catch-up: everything already delivered today, chronologically.
      const todayItems = insights
        .filter((i) => i.local_date === today && enabled.includes(i.slot))
        .sort((a, b) => slotOrder(a.slot) - slotOrder(b.slot));

      const current =
        todayItems.find((i) => i.slot === slot) ??
        todayItems[todayItems.length - 1] ??
        insights[0] ??
        null;

      const paused = Boolean(preferences?.paused);
      setState({
        preferences,
        insights,
        today: paused ? [] : todayItems,
        saved,
        savedIds,
        current: paused ? null : current,
        loading: false,
        error: false,
        needsOnboarding: !preferences?.onboarded_at,
      });
    } catch {
      // Never break the home feed on a growth-engine failure.
      setState({ ...EMPTY, loading: false, error: true });
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const toggleSave = useCallback(
    async (itemId: string) => {
      if (!user || !itemId) return false;
      const wasSaved = state.savedIds.has(itemId);
      // Optimistic — reconciled by the reload below.
      setState((prev) => {
        const ids = new Set(prev.savedIds);
        if (wasSaved) ids.delete(itemId); else ids.add(itemId);
        return { ...prev, savedIds: ids };
      });
      try {
        if (wasSaved) {
          await supabase
            .from('growth_saved_items')
            .delete()
            .eq('user_id', user.id)
            .eq('item_id', itemId);
        } else {
          await supabase
            .from('growth_saved_items')
            .upsert({ user_id: user.id, item_id: itemId }, { onConflict: 'user_id,item_id' });
        }
        void load();
        return !wasSaved;
      } catch {
        void load();
        return wasSaved;
      }
    },
    [user, state.savedIds, load],
  );

  const isSaved = useCallback((id: string) => state.savedIds.has(id), [state.savedIds]);

  /** Saved cards that are not already shown in today's catch-up run. */
  const savedExtras = useMemo(() => {
    const todayIds = new Set(state.today.map((i) => i.id));
    return state.saved.filter((i) => !todayIds.has(i.id));
  }, [state.saved, state.today]);

  return { ...state, savedExtras, toggleSave, isSaved, refresh: load };
}

export default useGrowthFeed;
