import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type CardSurface = 'morning_takeover' | 'login_greeting';

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Open-rate tracking for the two full-screen Zoe cards.
 * One row per member/surface/day: opened_at when the card is actually shown,
 * dwell_ms + read_completed when it is dismissed. Never blocks rendering.
 */
export function useCardImpression(surface: CardSurface, active: boolean, cardId?: string | null) {
  const openedAt = useRef<number | null>(null);
  const rowId = useRef<string | null>(null);

  useEffect(() => {
    if (!active || openedAt.current !== null) return;
    openedAt.current = Date.now();

    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (!uid) return;
        const { data } = await supabase
          .from('astro_card_impressions' as never)
          .upsert(
            {
              user_id: uid,
              surface,
              card_id: cardId ?? null,
              target_date: localDate(),
              opened_at: new Date().toISOString(),
            } as never,
            { onConflict: 'user_id,surface,target_date' },
          )
          .select('id')
          .maybeSingle();
        rowId.current = (data as { id?: string } | null)?.id ?? null;
      } catch (err) {
        console.warn('[CardImpression] open failed', err);
      }
    })();
  }, [active, surface, cardId]);

  const markDismissed = useCallback(async () => {
    if (openedAt.current === null) return;
    const dwell = Date.now() - openedAt.current;
    openedAt.current = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;
      const patch = {
        dismissed_at: new Date().toISOString(),
        dwell_ms: dwell,
        read_completed: dwell >= 4000,
      } as never;
      if (rowId.current) {
        await supabase.from('astro_card_impressions' as never).update(patch).eq('id', rowId.current);
      } else {
        await supabase
          .from('astro_card_impressions' as never)
          .update(patch)
          .eq('user_id', uid)
          .eq('surface', surface)
          .eq('target_date', localDate());
      }
    } catch (err) {
      console.warn('[CardImpression] dismiss failed', err);
    }
  }, [surface]);

  return { markDismissed };
}

export default useCardImpression;
