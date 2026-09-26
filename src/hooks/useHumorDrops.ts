/**
 * Today's humor drops for the signed-in member's mood metal. Birth date →
 * sun-sign element → metal; no birth date falls back to Mercury/quicksilver.
 * Read-only and non-blocking: failures simply mean no humor posts.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { loadAstroSelf } from '@/features/astro/astroAffinity';
import { elementOf } from '@/features/astro/zodiac';
import { useAuth } from '@/lib/auth';

export interface HumorDrop {
  id: string;
  metal: 'iron' | 'silver' | 'lead' | 'quicksilver';
  headline: string;
  lines: { speaker: 'A' | 'B'; text: string }[];
  created_at: string;
}

const METAL_BY_ELEMENT = { Fire: 'iron', Water: 'silver', Earth: 'lead', Air: 'quicksilver' } as const;

export function useHumorDrops(limit = 3): HumorDrop[] {
  const [drops, setDrops] = useState<HumorDrop[]>([]);
  const { user } = useAuth();
  const uid = user?.id ?? null;
  useEffect(() => {
    let alive = true;
    if (!uid) return;
    void (async () => {
      try {
        const self = await loadAstroSelf().catch(() => null);
        const el = elementOf(self?.sign ?? null);
        const metal = el ? METAL_BY_ELEMENT[el] : 'quicksilver';
        const since = new Date(Date.now() - 36 * 3600_000).toISOString();
        const { data } = await supabase
          .from('humor_drops' as never)
          .select('id, metal, headline, lines, created_at')
          .eq('metal', metal)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (alive) setDrops(((data ?? []) as unknown as HumorDrop[]).filter((d) => Array.isArray(d.lines) && d.lines.length > 0));
      } catch { /* optional content */ }
    })();
    return () => { alive = false; };
  }, [limit, uid]);
  return drops;
}

export default useHumorDrops;
