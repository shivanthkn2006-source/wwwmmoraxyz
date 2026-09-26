/**
 * Today's humor drops for the signed-in member's mood metal. Birth date →
 * sun-sign element → metal; no birth date falls back to Mercury/quicksilver.
 * Read-only and non-blocking: failures simply mean no humor posts.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { isHumorCategory, type HumorCategory } from '@/lib/humor';

export interface HumorDrop {
  id: string;
  metal: 'iron' | 'silver' | 'lead' | 'quicksilver';
  headline: string;
  lines: { speaker: 'A' | 'B'; text: string }[];
  created_at: string;
  image_url?: string | null;
  category: HumorCategory;
  origin: 'zoe' | 'member';
  author_id: string | null;
  scheduled_for: string;
}

const CACHE_KEY = 'mmora:humor-drops:v2';

function readCache(): HumorDrop[] {
  try {
    const rows = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]') as HumorDrop[];
    return rows.filter((row) => row?.id && Array.isArray(row.lines));
  } catch { return []; }
}

export function useHumorDrops(limit = 6): HumorDrop[] {
  const [drops, setDrops] = useState<HumorDrop[]>(() => readCache().slice(0, limit));
  const { user } = useAuth();
  const uid = user?.id ?? null;
  useEffect(() => {
    let alive = true;
    if (!uid) return () => { alive = false; };
    const load = async () => {
      try {
        const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
        const { data, error } = await supabase
          .from('humor_drops')
          .select('id, metal, headline, lines, created_at, image_url, category, origin, author_id, scheduled_for')
          .eq('is_published', true)
          .lte('scheduled_for', new Date().toISOString())
          .gte('scheduled_for', since)
          .order('scheduled_for', { ascending: false })
          .limit(limit);
        if (error) throw error;
        const valid = ((data ?? []) as unknown as HumorDrop[]).filter((d) => Array.isArray(d.lines) && d.lines.length > 0 && isHumorCategory(d.category));
        if (alive) setDrops(valid);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(valid.slice(0, 24))); } catch { /* private mode */ }
      } catch { /* optional content */ }
    };
    void load();
    const onRefresh = () => void load();
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    const channel = supabase.channel(`humor-drops-${uid}`).on('postgres_changes', { event: '*', schema: 'public', table: 'humor_drops' }, onRefresh).subscribe();
    window.addEventListener('focus', onRefresh);
    window.addEventListener('mmora:humor-refresh', onRefresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      window.removeEventListener('focus', onRefresh);
      window.removeEventListener('mmora:humor-refresh', onRefresh);
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(channel);
    };
  }, [limit, uid]);
  return drops;
}

export default useHumorDrops;
