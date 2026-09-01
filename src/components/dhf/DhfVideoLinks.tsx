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

interface Props {
  headline: string;
  category?: string;
  /** Fired with the platform id whenever the member opens one. */
  onOpen?: (platform: 'youtube' | 'tiktok' | 'instagram', url: string) => void;
}

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

  const open = (platform: 'youtube' | 'tiktok' | 'instagram', url: string | null) => (
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (!url) return;
    onOpen?.(platform, url);
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2" data-dhf-links="ready">
      {links.youtube_url && (
        <a
          href={links.youtube_url}
          target="_blank"
          rel="noopener noreferrer"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={open('youtube', links.youtube_url)}
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
      {links.youtube_channel && (
        <span className="text-[10px] text-muted-foreground/80">via {links.youtube_channel}</span>
      )}
    </div>
  );
};

export default DhfVideoLinks;
