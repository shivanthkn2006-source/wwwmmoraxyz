import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { insightForDate } from '@/lib/curatedInsights';

export interface DailyQuote { quote: string; author: string; source: string; sourceUrl?: string }

const KEY = 'mmora.dailyQuote';
const today = () => new Date().toISOString().slice(0, 10);

const fallback = (): DailyQuote => ({ ...insightForDate(), source: 'M\'Mora curated list' });

function cached(): DailyQuote | null {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || 'null');
    return c?.day === today() ? c.q : null;
  } catch { return null; }
}

/** Rotating quote of the day from ZenQuotes; curated list is the never-blank fallback. */
export function useDailyQuote(): DailyQuote {
  const [q, setQ] = useState<DailyQuote>(() => cached() ?? fallback());
  useEffect(() => {
    if (cached()) return;
    let off = false;
    void supabase.functions.invoke('daily-quote').then(({ data, error }) => {
      if (off || error || !data?.quote) return;
      const next = { quote: data.quote, author: data.author, source: data.source, sourceUrl: data.source_url };
      try { localStorage.setItem(KEY, JSON.stringify({ day: today(), q: next })); } catch { /* ignore */ }
      setQ(next);
    });
    return () => { off = true; };
  }, []);
  return q;
}
