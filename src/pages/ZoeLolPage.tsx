import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Flame, Plus } from 'lucide-react';
import HumorDropCard from '@/components/humor/HumorDropCard';
import { useHumorDrops } from '@/hooks/useHumorDrops';
import { Button } from '@/components/ui/button';
import { HUMOR_CATEGORIES, HUMOR_CATEGORY_LABELS, humorTrendingScore, type HumorCategory } from '@/lib/humor';
import { supabase } from '@/integrations/supabase/client';

export default function ZoeLolPage() {
  const navigate = useNavigate();
  const drops = useHumorDrops(48);
  const [category, setCategory] = useState<'all' | HumorCategory>('all');
  const [mode, setMode] = useState<'latest' | 'trending'>('latest');
  const [engagement, setEngagement] = useState<Record<string, { likes: number; dislikes: number; comments: number }>>({});
  useEffect(() => {
    if (!drops.length) return;
    const ids = drops.map((drop) => drop.id);
    void Promise.all([
      supabase.from('humor_reactions').select('drop_id, reaction').in('drop_id', ids),
      supabase.from('humor_comments').select('drop_id').in('drop_id', ids),
    ]).then(([reactionResult, commentResult]) => {
      const next: Record<string, { likes: number; dislikes: number; comments: number }> = {};
      ids.forEach((id) => { next[id] = { likes: 0, dislikes: 0, comments: 0 }; });
      reactionResult.data?.forEach((row) => { const score = next[row.drop_id]; if (score) score[row.reaction === 'like' ? 'likes' : 'dislikes'] += 1; });
      commentResult.data?.forEach((row) => { if (next[row.drop_id]) next[row.drop_id].comments += 1; });
      setEngagement(next);
    });
  }, [drops]);
  const visible = useMemo(() => {
    const filtered = category === 'all' ? drops : drops.filter((drop) => drop.category === category);
    if (mode === 'latest') return filtered;
    return [...filtered].sort((a, b) => {
      const sa = engagement[a.id] ?? { likes: 0, dislikes: 0, comments: 0 };
      const sb = engagement[b.id] ?? { likes: 0, dislikes: 0, comments: 0 };
      return humorTrendingScore(sb.likes, sb.dislikes, sb.comments, b.scheduled_for) - humorTrendingScore(sa.likes, sa.dislikes, sa.comments, a.scheduled_for);
    });
  }, [category, drops, engagement, mode]);
  return (
    <main className="min-h-[100dvh] w-full bg-transparent px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] text-white">
      <header className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-xl font-bold">Zoe's LOL</h1>
        <Button asChild size="sm" className="ml-auto"><Link to="/zoe-lol/submit"><Plus className="h-4 w-4" />Share a joke</Link></Button>
      </header>
      <div className="mx-auto mb-4 flex max-w-xl gap-2 overflow-x-auto pb-1">
        <Button size="sm" variant={mode === 'latest' ? 'default' : 'ghost'} onClick={() => setMode('latest')}>Latest</Button>
        <Button size="sm" variant={mode === 'trending' ? 'default' : 'ghost'} onClick={() => setMode('trending')}><Flame className="h-4 w-4" />Trending</Button>
        <Button size="sm" variant={category === 'all' ? 'secondary' : 'ghost'} onClick={() => setCategory('all')}>All</Button>
        {HUMOR_CATEGORIES.map((item) => <Button key={item} size="sm" variant={category === item ? 'secondary' : 'ghost'} onClick={() => setCategory(item)}>{HUMOR_CATEGORY_LABELS[item]}</Button>)}
      </div>
      {visible.length === 0 ? (
        <p className="text-white/80" data-humor-empty>Fresh skits are on the way — check back soon.</p>
      ) : (
        <div className="mx-auto flex max-w-xl flex-col gap-4">
          {visible.map((d) => <HumorDropCard key={d.id} drop={d} />)}
        </div>
      )}
    </main>
  );
}
