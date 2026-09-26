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
  const [mode, setMode] = useState<'latest' | 'trending' | 'top' | 'viewed' | 'following'>('latest');
  const [engagement, setEngagement] = useState<Record<string, { likes: number; dislikes: number; comments: number; views: number }>>({});
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  useEffect(() => {
    const load = () => void supabase.from('humor_follows' as never).select('category').then(({ data }) => setFollowed(new Set(((data ?? []) as { category: string }[]).map((r) => r.category))));
    load();
    window.addEventListener('mmora:humor-follows', load);
    return () => window.removeEventListener('mmora:humor-follows', load);
  }, []);
  useEffect(() => {
    if (!drops.length) return;
    const ids = drops.map((drop) => drop.id);
    void Promise.all([
      supabase.from('humor_reactions').select('drop_id, reaction').in('drop_id', ids),
      supabase.from('humor_comments').select('drop_id').in('drop_id', ids),
      supabase.from('humor_views' as never).select('drop_id').in('drop_id', ids),
    ]).then(([reactionResult, commentResult, viewResult]) => {
      const next: Record<string, { likes: number; dislikes: number; comments: number; views: number }> = {};
      ids.forEach((id) => { next[id] = { likes: 0, dislikes: 0, comments: 0, views: 0 }; });
      ((viewResult.data ?? []) as { drop_id: string }[]).forEach((row) => { if (next[row.drop_id]) next[row.drop_id].views += 1; });
      reactionResult.data?.forEach((row) => { const score = next[row.drop_id]; if (score) score[row.reaction === 'like' ? 'likes' : 'dislikes'] += 1; });
      commentResult.data?.forEach((row) => { if (next[row.drop_id]) next[row.drop_id].comments += 1; });
      setEngagement(next);
    });
  }, [drops]);
  const visible = useMemo(() => {
    let filtered = category === 'all' ? drops : drops.filter((drop) => drop.category === category);
    if (mode === 'following') filtered = filtered.filter((drop) => followed.has(drop.category));
    if (mode === 'latest' || mode === 'following') return filtered;
    const zero = { likes: 0, dislikes: 0, comments: 0, views: 0 };
    return [...filtered].sort((a, b) => {
      const sa = engagement[a.id] ?? zero;
      const sb = engagement[b.id] ?? zero;
      if (mode === 'top') return (sb.likes - sb.dislikes) - (sa.likes - sa.dislikes);
      if (mode === 'viewed') return sb.views - sa.views;
      return humorTrendingScore(sb.likes, sb.dislikes, sb.comments, b.scheduled_for) - humorTrendingScore(sa.likes, sa.dislikes, sa.comments, a.scheduled_for);
    });
  }, [category, drops, engagement, followed, mode]);
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
        <Button size="sm" variant={mode === 'top' ? 'default' : 'ghost'} onClick={() => setMode('top')}>Top rated</Button>
        <Button size="sm" variant={mode === 'viewed' ? 'default' : 'ghost'} onClick={() => setMode('viewed')}>Most viewed</Button>
        <Button size="sm" variant={mode === 'following' ? 'default' : 'ghost'} onClick={() => setMode('following')}>Following</Button>
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
