/**
 * READ-ONLY growth feed hook.
 *
 * The home feed subscribes to this and nothing else — it never triggers
 * generation, so refreshing costs a database read, not a model call. If the
 * engine is paused, in shadow mode, or the table is unreachable, the hook
 * returns an empty list and the feed renders exactly as it does today.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  currentSlot, deviceTimeZone, localDateIn, slotsForFrequency,
  type GrowthSlot, type ReflectionStyle,
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
  delivery_frequency: number;
  paused: boolean;
  timezone: string;
  onboarded_at: string | null;
}

interface State {
  preferences: GrowthPreferences | null;
  insights: GrowthInsight[];
  current: GrowthInsight | null;
  loading: boolean;
  needsOnboarding: boolean;
}

const EMPTY: State = {
  preferences: null, insights: [], current: null, loading: true, needsOnboarding: false,
};

export function useGrowthFeed() {
  const { user } = useAuth();
  const [state, setState] = useState<State>(EMPTY);

  const load = useCallback(async () => {
    if (!user) { setState({ ...EMPTY, loading: false }); return; }

    const tz = deviceTimeZone();
    const today = localDateIn(new Date(), tz);
    const yesterday = localDateIn(new Date(Date.now() - 86_400_000), tz);

    try {
      const [prefRes, itemRes] = await Promise.all([
        supabase
          .from('growth_preferences')
          .select('focus_areas, reflection_style, delivery_frequency, paused, timezone, onboarded_at')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('growth_feed_items')
          .select('id, slot, local_date, title, category, content, actionable_step, created_at')
          .eq('status', 'published')
          .gte('local_date', yesterday)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const preferences = (prefRes.data as GrowthPreferences | null) ?? null;
      const insights = ((itemRes.data as GrowthInsight[] | null) ?? []);

      const enabled = slotsForFrequency(preferences?.delivery_frequency ?? 5);
      const slot = currentSlot(new Date(), preferences?.timezone || tz, enabled);
      const current =
        insights.find((i) => i.local_date === today && i.slot === slot) ??
        insights.find((i) => i.local_date === today) ??
        insights[0] ??
        null;

      setState({
        preferences,
        insights,
        current: preferences?.paused ? null : current,
        loading: false,
        needsOnboarding: !preferences?.onboarded_at,
      });
    } catch {
      // Never break the home feed on a growth-engine failure.
      setState({ ...EMPTY, loading: false });
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  return { ...state, refresh: load };
}

export default useGrowthFeed;
