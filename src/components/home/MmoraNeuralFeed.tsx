/**
 * MMORA DHF NEURAL FEED
 * Renders the personalised video recommendations injected by zoe-dhf-brain.
 * Off-white / black palette only — no new design tokens, no layout changes.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDailyArchetype } from '@/lib/dayLord';

interface FeedVideoItem {
  id: string;
  video_id: string;
  title: string;
  channel_title: string;
  thumbnail_url: string;
  triggered_by_query: string | null;
  astrological_tag: string | null;
  is_viewed: boolean;
}

export const MmoraNeuralFeed: React.FC = () => {
  const [feed, setFeed] = useState<FeedVideoItem[]>([]);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const telemetry = getDailyArchetype();

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('mmora_feed_items')
      .select('id, video_id, title, channel_title, thumbnail_url, triggered_by_query, astrological_tag, is_viewed')
      .order('created_at', { ascending: false })
      .limit(24);
    if (err) setError(err.message);
    setFeed((data as FeedVideoItem[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadFeed();
    const onUpdate = () => void loadFeed();
    window.addEventListener('mmora:dhf-feed-updated', onUpdate);
    return () => window.removeEventListener('mmora:dhf-feed-updated', onUpdate);
  }, [loadFeed]);

  const openVideo = useCallback(async (item: FeedVideoItem) => {
    setActiveVideo(item.video_id);
    if (!item.is_viewed) {
      await supabase.from('mmora_feed_items').update({ is_viewed: true }).eq('id', item.id);
      setFeed((prev) => prev.map((f) => (f.id === item.id ? { ...f, is_viewed: true } : f)));
    }
  }, []);

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-2">
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">DHF Neural Feed</span>
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          {telemetry.dayName} · {telemetry.rulingPlanet}
        </span>
      </div>

      {activeVideo && (
        <div className="mb-5">
          <button
            onClick={() => setActiveVideo(null)}
            className="mb-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            [ Close player ]
          </button>
          <div className="aspect-video w-full overflow-hidden rounded-md border border-border/60 bg-background">
            <iframe
              title="M'Mora neural feed player"
              src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1&rel=0`}
              className="h-full w-full"
              allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {loading && <p className="py-8 text-center text-xs text-muted-foreground">Aligning feed…</p>}
      {!loading && error && (
        <p className="py-6 text-center text-xs text-destructive">Feed unavailable — {error}</p>
      )}
      {!loading && !error && feed.length === 0 && (
        <p className="py-8 text-center text-xs text-muted-foreground">
          Nothing aligned yet. Search anything on M'Mora and Zoe will curate this stream.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {feed.map((item) => (
          <button
            key={item.id}
            onClick={() => void openVideo(item)}
            className="group cursor-pointer rounded-md border border-border/60 bg-background p-3 text-left transition-colors hover:border-foreground/40"
          >
            <div className="relative mb-3 aspect-video overflow-hidden rounded bg-muted">
              {item.thumbnail_url ? (
                <img
                  src={item.thumbnail_url}
                  alt={item.title}
                  loading="lazy"
                  className="h-full w-full object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
                />
              ) : null}
              <span className="absolute left-2 top-2 rounded border border-border/60 bg-background/85 px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                {item.triggered_by_query || item.astrological_tag || 'Aligned core'}
              </span>
            </div>
            <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{item.title}</h3>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">{item.channel_title}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MmoraNeuralFeed;
