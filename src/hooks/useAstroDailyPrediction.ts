import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { DailyPrediction } from '@/components/astro/types';
import { localDateKey, pickSlotRow } from '@/lib/astroSlot';

/**
 * Latest published M'Mora Zoe alignment for today, for the signed-in member.
 * Read-only and scoped by RLS to the owner.
 */
export function useAstroDailyPrediction() {
  const { user } = useAuth();
  const [prediction, setPrediction] = useState<DailyPrediction | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) { setPrediction(null); return; }
    setLoading(true);
    try {
      const today = localDateKey();
      const { data, error } = await supabase
        .from('astro_predictions')
        .select('id, target_date, slot, prediction_headline, prediction_body, motivational_quote, poster_image_url, status, transits_summary')
        .eq('user_id', user.id)
        .eq('target_date', today)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      const row = pickSlotRow((data ?? []) as unknown as Array<DailyPrediction & { created_at?: string }>);
      setPrediction((row as unknown as DailyPrediction) ?? null);
    } catch (err) {
      console.error('[AstroDaily] load failed', err);
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  return { prediction, loading, refresh: load };
}

export default useAstroDailyPrediction;
