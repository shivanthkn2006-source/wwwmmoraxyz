/**
 * MMORA DHF NEURAL FEED
 * Renders the personalised video recommendations injected by zoe-dhf-brain.
 * Off-white / black palette only — no new design tokens, no layout changes.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDailyArchetype } from '@/lib/dayLord';
import { useDhfBrain, type DhfYoutubeDiagnosis } from '@/hooks/useDhfBrain';

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

const FEED_REASON_COPY: Record<string, string> = {
  missing_youtube_key: 'YouTube API key is not configured on the server.',
  no_results: 'YouTube returned no matching videos for this alignment.',
  query_too_short: 'Search intent was too short to curate a feed.',
  skipped: 'Feed injection was skipped for this run.',
};

function describeFeedReason(reason?: string): string | null {
  if (!reason) return null;
  if (FEED_REASON_COPY[reason]) return FEED_REASON_COPY[reason];
  if (reason.startsWith('quota_')) return 'YouTube quota or rate limit reached — try again later.';
  if (reason.startsWith('youtube_')) return `YouTube API error (${reason.replace('youtube_', 'HTTP ')}).`;
  if (reason.startsWith('db_')) return 'Feed could not be saved to the database.';
  return `Feed injection issue: ${reason}`;
}

export const MmoraNeuralFeed: React.FC = () => {
  const [feed, setFeed] = useState<FeedVideoItem[]>([]);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [youtube, setYoutube] = useState<DhfYoutubeDiagnosis | null>(null);
  const telemetry = getDailyArchetype();
  const { ingest, diagnose, lastResult, lastError } = useDhfBrain();

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

  /** Manual re-ingestion: runs a birth/day-lord aligned DHF pass, then reloads. */
  const refreshNeuralFeed = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const result = await ingest('', 'manual', { allowEmpty: true });
      let message: string | null = null;
      if (!result) message = lastError ?? 'Neural ingestion did not complete. Please retry.';
      else if (result.feed?.injected === 0 && result.feed?.reason) {
        message = describeFeedReason(result.feed.reason);
      }
      await loadFeed();
      if (message) setError(message);
    } finally {
      setRefreshing(false);
    }
  }, [ingest, lastError, loadFeed]);

  const runDiagnostics = useCallback(async () => {
    setShowDiagnostics(true);
    setYoutube(await diagnose());
  }, [diagnose]);

  const openVideo = useCallback(async (item: FeedVideoItem) => {
    setActiveVideo(item.video_id);
    if (!item.is_viewed) {
      await supabase.from('mmora_feed_items').update({ is_viewed: true }).eq('id', item.id);
      setFeed((prev) => prev.map((f) => (f.id === item.id ? { ...f, is_viewed: true } : f)));
    }
  }, []);

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">DHF Neural Feed</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refreshNeuralFeed()}
            disabled={refreshing}
            aria-busy={refreshing}
            className="rounded border border-border/60 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
          >
            {refreshing ? 'Refreshing…' : 'Refresh Neural Feed'}
          </button>
          <button
            type="button"
            onClick={() => (showDiagnostics ? setShowDiagnostics(false) : void runDiagnostics())}
            aria-expanded={showDiagnostics}
            className="rounded border border-border/60 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Diagnostics
          </button>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {telemetry.dayName} · {telemetry.rulingPlanet}
          </span>
        </div>
      </div>

      {showDiagnostics && (
        <div className="mb-4 space-y-1 rounded-md border border-border/60 bg-background p-3 font-mono text-[10px] text-muted-foreground">
          <p>Day lord: {telemetry.rulingPlanet} · {telemetry.archetype}</p>
          <p>Focus: {telemetry.dailyFocus}</p>
          <p>
            YouTube key:{' '}
            {youtube
              ? `${youtube.keySource} · ${youtube.configured ? 'configured' : 'missing'} · quota ${youtube.quota}${youtube.reason ? ` · ${youtube.reason}` : ''}`
              : 'probing…'}
          </p>
          <p>
            Last ingestion:{' '}
            {lastResult
              ? `query "${lastResult.usedQuery ?? '—'}" · memory ${lastResult.memoryStored ? 'stored' : 'failed'} · injected ${lastResult.feed?.injected ?? 0}`
              : 'none this session'}
          </p>
          <p>Degraded: {lastResult?.degraded?.length ? lastResult.degraded.join(', ') : 'none'}</p>
          <p>Profile birth data: {lastResult?.hasProfile ? 'present' : 'not set'}</p>
          {lastError && <p className="text-destructive">Last error: {lastError}</p>}
        </div>
      )}

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
        <div role="alert" className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-center">
          <p className="text-xs text-destructive">{error}</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => void refreshNeuralFeed()}
              disabled={refreshing}
              className="rounded border border-border/60 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => void loadFeed()}
              className="rounded border border-border/60 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Reload cached feed
            </button>
          </div>
        </div>
      )}

      {!loading && !error && feed.length === 0 && (
        <p className="py-8 text-center text-xs text-muted-foreground">
          Nothing aligned yet. Search anything on M'Mora or hit Refresh Neural Feed and Zoe will curate this stream.
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
