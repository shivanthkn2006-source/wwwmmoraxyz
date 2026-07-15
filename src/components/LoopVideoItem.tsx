import React, { useRef, useState, useEffect } from 'react';
import { AlertTriangle, Loader2, Play, RotateCcw } from 'lucide-react';
import { appendMediaVersion } from '@/lib/mediaUtils';

interface LoopVideoItemProps {
  post: {
    id: string;
    media_url: string | null;
    media_preview_url?: string | null;
    media_type?: string | null;
    updated_at?: string | null;
    created_at?: string | null;
  };
  index: number;
  onVideoClick: (index: number) => void;
  onPreviewError?: (postId: string) => void;
  onDecodeStatus?: (postId: string, status: string) => void;
  onRegeneratePoster?: (postId: string) => void;
  canRegeneratePoster?: boolean;
}

const LoopVideoItem: React.FC<LoopVideoItemProps> = ({
  post,
  index,
  onVideoClick,
  onPreviewError,
  onDecodeStatus,
  onRegeneratePoster,
  canRegeneratePoster = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const version = post.updated_at || post.created_at || post.id;
  const mediaSrc = appendMediaVersion(post.media_url, version);
  const posterSrc = appendMediaVersion(post.media_preview_url, version);

  // Preload enough data to paint the first frame on mount / when src changes.
  // Metadata alone often leaves mobile browsers with a black tile.
  useEffect(() => {
    if (!videoRef.current || !post.media_url) {
      setIsLoading(false);
      setHasError(true);
      onDecodeStatus?.(post.id, 'missing-source');
      return;
    }
    setIsLoading(true);
    setHasError(false);
    onDecodeStatus?.(post.id, 'loading');
    const video = videoRef.current;
    video.load();

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      setIsLoading(false);
    }

    // If nothing loads within 12s on very slow networks, mark as error so the user
    // sees the fallback instead of an endless spinner. Reopening will retry on next mount.
    const stallTimer = setTimeout(() => {
      if (videoRef.current && videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        setIsLoading(false);
        setHasError(true);
        onDecodeStatus?.(post.id, 'timeout');
      }
    }, 12000);
    return () => clearTimeout(stallTimer);
  }, [post.media_url, post.id, onDecodeStatus]);

  const handleMouseEnter = () => {
    if (videoRef.current && !hasError) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Autoplay failed - show play button
        setIsPlaying(false);
      });
      
      // Stop after 2 seconds
      hoverTimeoutRef.current = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
          setIsPlaying(false);
        }
      }, 2000);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleLoadedData = () => {
    setIsLoading(false);
    setHasError(false);
    onDecodeStatus?.(post.id, 'ready');
  };

  const handleError = () => {
    setIsLoading(false);
    console.error('[LoopVideoItem] preview failed', { postId: post.id, src: post.media_url, error: videoRef.current?.error });
    setHasError(true);
    onDecodeStatus?.(post.id, 'decode-failed');
    onPreviewError?.(post.id);
  };

  // Force the first frame to render as a poster preview.
  // iOS Safari (and some Android browsers) don't paint a frame with just
  // preload="metadata"; seeking to 0.1s once metadata is ready forces it.
  const handleLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.currentTime === 0) {
      try {
        const duration = Number.isFinite(videoRef.current.duration) ? videoRef.current.duration : 1;
        videoRef.current.currentTime = Math.min(0.12, Math.max(0.01, duration / 20));
      } catch { /* noop */ }
    }
  };

  return (
    <button
      type="button"
      className="relative w-24 h-40 rounded-lg overflow-hidden bg-muted shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/60 group"
      onClick={() => onVideoClick(index)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid="loop-video-item"
      data-post-id={post.id}
    >
      {posterSrc && (
        <img
          src={posterSrc}
          alt="Loop preview"
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}
      {mediaSrc && !hasError && (
        <video
          ref={videoRef}
          src={mediaSrc}
          poster={posterSrc}
          className="w-full h-full object-cover"
          muted
          loop
          playsInline
          preload="auto"
          onLoadedMetadata={handleLoadedMetadata}
          onLoadedData={handleLoadedData}
          onCanPlay={handleLoadedData}
          onSeeked={handleLoadedData}
          onError={handleError}
        />
      )}
      {canRegeneratePoster && onRegeneratePoster && !hasError && (
        <span
          role="button"
          tabIndex={0}
          aria-label="Re-generate poster"
          title="Re-generate poster"
          className="absolute right-1 top-1 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-background/70 text-primary opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 focus:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onRegeneratePoster(post.id);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onRegeneratePoster(post.id);
            }
          }}
        >
          <RotateCcw className="h-3 w-3" />
        </span>
      )}
      
      {/* Loading State */}
      {isLoading && !hasError && !post.media_preview_url && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      )}
      
      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/70 p-1 text-center backdrop-blur-[1px]">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-[8px] leading-tight text-foreground">Playback not supported for this format</span>
          {canRegeneratePoster && onRegeneratePoster && (
            <span
              role="button"
              tabIndex={0}
              className="mt-1 inline-flex items-center gap-1 rounded border border-border/60 px-1 py-0.5 text-[8px] text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onRegeneratePoster(post.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onRegeneratePoster(post.id);
                }
              }}
            >
              <RotateCcw className="h-2.5 w-2.5" /> Poster
            </span>
          )}
        </div>
      )}
      
      {/* Play indicator on hover (when not playing) */}
      {!isPlaying && !isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          </div>
        </div>
      )}
      
      <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent pointer-events-none" />
    </button>
  );
};

export default LoopVideoItem;
