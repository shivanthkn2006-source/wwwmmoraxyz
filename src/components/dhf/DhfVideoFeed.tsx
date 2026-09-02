/**
 * DHF VIDEO FEED — the ingested video library as cards.
 *
 * Each card is one real video the dispatch cron pulled from YouTube for a DHF
 * figure: thumbnail, title, description and the live destinations (YouTube,
 * TikTok, Instagram, share on X). Nothing here is a placeholder — a card only
 * renders once a row exists, and every button opens a URL stored in the row.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Play, Loader2, RefreshCw, Share2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchDhfVideos, dhfVideoThumbnail, requestDhfVideoIngest, type DhfVideo } from '@/lib/dhfVideos';
import { openShare } from '@/lib/shareTargets';
import DhfShareSheet from '@/components/dhf/DhfShareSheet';

const chip =
  'inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const XGlyph: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
    <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.96 6.82H1.68l7.73-8.84L1.25 2.25h6.82l4.71 6.23 5.46-6.23zm-1.16 17.52h1.83L7.01 4.13H5.05l12.03 15.64z" />
  </svg>
);

interface Props {
  /** Shows the manual ingest control (admin surfaces only). */
  canIngest?: boolean;
  limit?: number;
}

export const DhfVideoFeed: React.FC<Props> = ({ canIngest = false, limit = 24 }) => {
  const [videos, setVideos] = useState<DhfVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [shareVideo, setShareVideo] = useState<DhfVideo | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setVideos(await fetchDhfVideos(limit));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const ingest = async () => {
    setIngesting(true);
    await requestDhfVideoIngest(8);
    await load();
    setIngesting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground" data-dhf-videos="loading">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading the DHF video library…
      </div>
    );
  }

  return (
    <section className="space-y-4" data-dhf-videos={error ? 'error' : 'ready'}>
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Video className="h-4 w-4 text-primary" aria-hidden="true" />
            DHF videos
          </h2>
          <p className="text-xs text-muted-foreground">
            One real video per thinker, refreshed daily by the dispatch job.
          </p>
        </div>
        {canIngest && (
          <Button size="sm" variant="outline" onClick={ingest} disabled={ingesting}>
            {ingesting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
            Ingest more
          </Button>
        )}
      </header>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          The video library could not be loaded. Pull to refresh and try again.
        </p>
      )}

      {!error && videos.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No videos yet — the next daily ingestion will fill this in.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((video) => {
          const thumb = dhfVideoThumbnail(video);
          return (
            <article
              key={video.id}
              className="overflow-hidden rounded-xl border border-border bg-card"
              data-dhf-video={video.figure_slug}
            >
              {video.youtube_url && thumb && (
                <a href={video.youtube_url} target="_blank" rel="noopener noreferrer" className="block">
                  <img
                    src={thumb}
                    alt={`${video.figure_name}: ${video.title}`}
                    loading="lazy"
                    className="aspect-video w-full object-cover"
                  />
                </a>
              )}
              <div className="space-y-2 p-4">
                <p className="text-[11px] uppercase tracking-wide text-primary">{video.figure_name}</p>
                <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{video.title}</h3>
                <p className="line-clamp-3 text-xs text-muted-foreground">{video.description}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {video.youtube_url && (
                    <a href={video.youtube_url} target="_blank" rel="noopener noreferrer" className={chip} data-dhf-link="youtube">
                      <Play className="h-3.5 w-3.5" aria-hidden="true" />
                      YouTube
                    </a>
                  )}
                  {video.tiktok_url && (
                    <a href={video.tiktok_url} target="_blank" rel="noopener noreferrer" className={chip} data-dhf-link="tiktok">
                      TikTok
                    </a>
                  )}
                  {video.instagram_url && (
                    <a href={video.instagram_url} target="_blank" rel="noopener noreferrer" className={chip} data-dhf-link="instagram">
                      Instagram
                    </a>
                  )}
                  <button
                    type="button"
                    className={chip}
                    data-dhf-link="x"
                    aria-label={`Share ${video.title} on X`}
                    onClick={() =>
                      openShare('x', {
                        text: `${video.figure_name}: ${video.title}`,
                        url: video.youtube_url ?? undefined,
                        hashtags: [video.category],
                      })
                    }
                  >
                    <XGlyph />
                    Share
                  </button>
                  <button
                    type="button"
                    className={chip}
                    data-dhf-link="share-all"
                    aria-label={`Share ${video.title} everywhere`}
                    onClick={() => setShareVideo(video)}
                  >
                    <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                    All platforms
                  </button>
                </div>
                {video.youtube_channel && (
                  <p className="text-[10px] text-muted-foreground/80">via {video.youtube_channel}</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <DhfShareSheet
        open={Boolean(shareVideo)}
        onOpenChange={(next) => { if (!next) setShareVideo(null); }}
        title="Share this DHF video"
        payload={{
          text: shareVideo ? `${shareVideo.figure_name}: ${shareVideo.title}` : '',
          url: shareVideo?.youtube_url ?? undefined,
          hashtags: shareVideo ? [shareVideo.category, 'MMora', 'DHF'] : [],
        }}
      />
    </section>
  );
};

export default DhfVideoFeed;
