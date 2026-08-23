import React, { useEffect, useRef } from 'react';
import { X, Bookmark, BookmarkCheck } from 'lucide-react';

export interface ExternalVideoItem {
  id: string;
  title: string;
  subtitle?: string;
  url?: string;
  thumbnail?: string;
}

/** Extract a YouTube video id from a watch/shorts/youtu.be URL. */
export const youTubeIdFromUrl = (url?: string): string | null => {
  if (!url) return null;
  const patterns = [
    /[?&]v=([\w-]{6,})/,
    /youtu\.be\/([\w-]{6,})/,
    /\/shorts\/([\w-]{6,})/,
    /\/embed\/([\w-]{6,})/,
  ];
  for (const re of patterns) {
    const match = url.match(re);
    if (match?.[1]) return match[1];
  }
  return null;
};

interface Props {
  item: ExternalVideoItem;
  autoPlay?: boolean;
  /** True only for the slide currently on screen — every other slide is paused. */
  active?: boolean;
  onDismiss?: () => void;
  /** Leaves the search results and returns to the user's own feed. */
  onExit?: () => void;
  onToggleSave?: () => void;
  saved?: boolean;
}

/**
 * Renders an external (YouTube) search result inline in the M'Mora feed using
 * the exact same full-viewport shorts frame as PostCard, so no layout changes.
 * Playing in-page avoids the Cross-Origin-Opener-Policy failure that breaks
 * opening youtube.com in a new window from the preview shell.
 */
export default function ExternalVideoCard({
  item,
  autoPlay = false,
  active,
  onDismiss,
  onExit,
  onToggleSave,
  saved = false,
}: Props) {
  const videoId = youTubeIdFromUrl(item.url);
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  // Only the on-screen slide keeps playing; every other iframe is paused via the
  // YouTube iframe API so two videos can never sound at once.
  useEffect(() => {
    if (active === undefined) return;
    const win = frameRef.current?.contentWindow;
    if (!win) return;
    const command = active ? 'playVideo' : 'pauseVideo';
    try {
      win.postMessage(JSON.stringify({ event: 'command', func: command, args: [] }), '*');
    } catch {
      /* cross-origin timing — ignore */
    }
  }, [active]);

  const lang = typeof navigator !== 'undefined' ? (navigator.language || 'en').split('-')[0] : 'en';

  return (
    <div className="relative h-full w-full bg-black" data-testid="external-video-card" data-video-id={videoId ?? ''}>
      <div className="flex h-full w-full items-center justify-center">
        {videoId ? (
          <iframe
            ref={frameRef}
            data-testid="external-video-frame"
            title={item.title}
            src={
              `https://www.youtube-nocookie.com/embed/${videoId}` +
              `?rel=0&modestbranding=1&playsinline=1&enablejsapi=1` +
              `&cc_load_policy=1&cc_lang_pref=${lang}&hl=${lang}` +
              `&autoplay=${autoPlay && active !== false ? 1 : 0}`
            }
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="aspect-[9/16] h-full max-h-full w-auto max-w-full border-0"
          />
        ) : (
          <div className="px-6 text-center text-sm text-muted-foreground">
            This result can't be played inline.
            {item.url && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-2 block underline">
                Open the source link
              </a>
            )}
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-6 pt-10">
        <p className="line-clamp-2 text-sm font-semibold text-white">{item.title}</p>
        {item.subtitle && <p className="mt-0.5 line-clamp-1 text-xs text-white/70">{item.subtitle}</p>}
        <p className="mt-1 text-[10px] uppercase tracking-wide text-white/50">From search · YouTube</p>
      </div>

      <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            aria-label="Back to my feed"
            className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1.5 text-[11px] font-medium text-white backdrop-blur hover:bg-black/80"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            My feed
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Remove this search video from the feed"
            className="rounded-full bg-black/60 p-1.5 text-white backdrop-blur hover:bg-black/80"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {onToggleSave && (
        <button
          type="button"
          onClick={onToggleSave}
          aria-label={saved ? 'Remove this video from saved' : 'Save this video'}
          aria-pressed={saved}
          className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-1.5 text-white backdrop-blur hover:bg-black/80"
        >
          {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
