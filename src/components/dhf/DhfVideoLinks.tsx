/**
 * DHF VIDEO LINKS — the row of real destinations under a compass card.
 *
 * Nothing here is decorative: every button opens a URL the backend resolved
 * (a real YouTube video where one exists, and the live TikTok / Instagram
 * search pages for the card's keywords) so a tap never lands on a dead link.
 * While resolution is in flight the row shows a quiet placeholder; if it fails
 * we fall back to the platforms' own search URLs rather than hiding the row.
 */
import React, { useEffect, useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { resolveDhfSocialLinks, searchFallback, type DhfSocialLinks } from '@/lib/dhfSocialLinks';
import { openShare } from '@/lib/shareTargets';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface Props {
  headline: string;
  category?: string;
  /** Fired with the platform id whenever the member opens one. */
  onOpen?: (platform: 'youtube' | 'tiktok' | 'instagram' | 'x', url: string) => void;
}

const XGlyph: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
    <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.96 6.82H1.68l7.73-8.84L1.25 2.25h6.82l4.71 6.23 5.46-6.23zm-1.16 17.52h1.83L7.01 4.13H5.05l12.03 15.64z" />
  </svg>
);


const TikTokGlyph: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
    <path d="M16.5 3c.4 2 1.6 3.4 3.5 3.7v2.4c-1.3.1-2.6-.3-3.7-1v6.2a5.6 5.6 0 1 1-4.8-5.5v2.5a3.1 3.1 0 1 0 2.3 3V3h2.7z" />
  </svg>
);

const InstagramGlyph: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const linkClass =
  'inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export const DhfVideoLinks: React.FC<Props> = ({ headline, category, onOpen }) => {
  const [links, setLinks] = useState<DhfSocialLinks | null>(null);
  const [pending, setPending] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let alive = true;
    setPending(true);
    void resolveDhfSocialLinks(headline, category).then((result) => {
      if (!alive) return;
      setLinks(result ?? searchFallback(headline));
      setPending(false);
    });
    return () => {
      alive = false;
    };
  }, [headline, category]);

  if (pending) {
    return (
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground" data-dhf-links="loading">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        Finding a video for this story…
      </div>
    );
  }

  if (!links) return null;

  const open = (platform: 'youtube' | 'tiktok' | 'instagram' | 'x', url: string | null) => (
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (!url) return;
    onOpen?.(platform, url);
  };

  // Share the story itself to X — the video link when we resolved one,
  // otherwise the headline on its own.
  const shareToX = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const used = openShare('x', {
      text: headline,
      url: links.youtube_video_id ? links.youtube_url ?? undefined : undefined,
      hashtags: category ? [category] : undefined,
    });
    if (used) onOpen?.('x', used);
  };


  // Real videos play inside M'Mora; search fallbacks still open YouTube.
  const playInApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!links.youtube_video_id) return;
    e.preventDefault();
    setPlaying(true);
    if (links.youtube_url) onOpen?.('youtube', links.youtube_url);
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2" data-dhf-links="ready">
      {links.youtube_video_id && (
        <Dialog open={playing} onOpenChange={setPlaying}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <DialogTitle className="sr-only">{links.youtube_title ?? headline}</DialogTitle>
            {playing && (
              <div className="aspect-video w-full">
                <iframe
                  data-dhf-player="youtube"
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(links.youtube_video_id)}?autoplay=1&playsinline=1&rel=0`}
                  title={links.youtube_title ?? headline}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
      {links.youtube_url && (
        <a
          href={links.youtube_url}
          target="_blank"
          rel="noopener noreferrer"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={links.youtube_video_id ? playInApp : open('youtube', links.youtube_url)}
          className={linkClass}
          title={links.youtube_title ?? 'Watch on YouTube'}
          data-dhf-link="youtube"
        >
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
          {links.youtube_video_id ? 'Watch the video' : 'Watch on YouTube'}
        </a>
      )}
      {links.tiktok_url && (
        <a
          href={links.tiktok_url}
          target="_blank"
          rel="noopener noreferrer"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={open('tiktok', links.tiktok_url)}
          className={linkClass}
          data-dhf-link="tiktok"
        >
          <TikTokGlyph />
          TikTok
        </a>
      )}
      {links.instagram_url && (
        <a
          href={links.instagram_url}
          target="_blank"
          rel="noopener noreferrer"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={open('instagram', links.instagram_url)}
          className={linkClass}
          data-dhf-link="instagram"
        >
          <InstagramGlyph />
          Instagram
        </a>
      )}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={shareToX}
        className={linkClass}
        aria-label="Share this story on X"
        data-dhf-link="x"
      >
        <XGlyph />
        Share on X
      </button>
      {links.youtube_channel && (

        <span className="text-[10px] text-muted-foreground/80">via {links.youtube_channel}</span>
      )}
    </div>
  );
};

export default DhfVideoLinks;
