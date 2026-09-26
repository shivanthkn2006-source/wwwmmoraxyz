import { useEffect, useMemo, useState } from 'react';
import { Flame, MessageCircle, Star, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { HumorDrop } from '@/hooks/useHumorDrops';

type Scores = Record<string, { rating: number; comments: number; views: number }>;

export default function HumorTrendingSection({ drops }: { drops: HumorDrop[] }) {
  const navigate = useNavigate();
  const [scores, setScores] = useState<Scores>({});

  useEffect(() => {
    if (!drops.length) return;
    const ids = drops.map((drop) => drop.id);
    void Promise.all([
      supabase.from('humor_reactions').select('drop_id, reaction').in('drop_id', ids),
      supabase.from('humor_comments').select('drop_id').in('drop_id', ids),
      supabase.from('humor_views' as never).select('drop_id').in('drop_id', ids),
    ]).then(([reactions, comments, views]) => {
      const next: Scores = Object.fromEntries(ids.map((id) => [id, { rating: 0, comments: 0, views: 0 }]));
      reactions.data?.forEach((row) => { if (next[row.drop_id]) next[row.drop_id].rating += row.reaction === 'like' ? 1 : -1; });
      comments.data?.forEach((row) => { if (next[row.drop_id]) next[row.drop_id].comments += 1; });
      ((views.data ?? []) as { drop_id: string }[]).forEach((row) => { if (next[row.drop_id]) next[row.drop_id].views += 1; });
      setScores(next);
    });
  }, [drops]);

  const leaders = useMemo(() => {
    const pick = (key: keyof Scores[string]) => [...drops].sort((a, b) => (scores[b.id]?.[key] ?? 0) - (scores[a.id]?.[key] ?? 0))[0];
    return [
      { label: 'Top rated', icon: Star, drop: pick('rating') },
      { label: 'Most viewed', icon: Eye, drop: pick('views') },
      { label: 'Most commented', icon: MessageCircle, drop: pick('comments') },
    ].filter((item) => item.drop);
  }, [drops, scores]);

  if (!leaders.length) return null;
  return (
    <section className="mx-auto w-full max-w-xl px-4" data-humor-trending>
      <header className="mb-4 flex items-center gap-2"><Flame className="h-5 w-5" /><h2 className="text-lg font-semibold">Trending jokes</h2></header>
      <div className="space-y-2">
        {leaders.map(({ label, icon: Icon, drop }) => (
          <Button key={label} variant="ghost" className="h-auto w-full justify-start gap-3 px-2 py-3 text-left" onClick={() => navigate(`/zoe-lol?mode=${label === 'Top rated' ? 'top' : label === 'Most viewed' ? 'viewed' : 'commented'}`)}>
            <Icon className="h-5 w-5 shrink-0" />
            <span className="min-w-0"><span className="block text-xs text-muted-foreground">{label}</span><span className="block truncate font-medium">{drop.headline}</span></span>
          </Button>
        ))}
      </div>
    </section>
  );
}