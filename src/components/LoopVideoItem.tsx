import React, { useRef, useState, useEffect } from 'react';
import { AlertTriangle, Loader2, Play, RotateCcw } from 'lucide-react';
import { appendMediaVersion, makeFallbackVideoPoster } from '@/lib/mediaUtils';

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
  const [canPaintVideo, setCanPaintVideo] = useState(false);
  const [decodeFailureReason, setDecodeFailureReason] = useState('');
  const version = post.updated_at || post.created_at || post.id;
  const mediaSrc = appendMediaVersion(post.media_url, version);
  const backendPosterSrc = appendMediaVersion(post.media_preview_url, version);
  const generatedPosterSrc = React.useMemo(() => makeFallbackVideoPoster(), []);
  const posterSrc = backendPosterSrc || generatedPosterSrc || undefined;
  const shouldShowVideoPreview = canPaintVideo && (!backendPosterSrc || isPlaying);

  const getVideoErrorReason = () => {
    const error = videoRef.current?.error;
    if (!error) return 'Unknown decode error';
    const names: Record<number, string> = {
      1: 'Playback aborted while loading',
      2: 'Network error while loading media',
      3: 'Decode failed in this browser',
      4: 'Media source or format is not supported',
    };
    return error.message || names[error.code] || `Media error ${error.code}`;
  };

  // Preload enough data to paint the first frame on mount / when src changes.
  // Metadata alone often leaves mobile browsers with a black tile.
  useEffect(() => {
    if (!videoRef.current || !post.media_url) {
      setIsLoading(false);
      setHasError(true);
      setDecodeFailureReason('Missing media source URL');
      onDecodeStatus?.(post.id, 'missing-source');
      return;
    }
    setIsLoading(true);
    setHasError(false);
    setCanPaintVideo(false);
    setDecodeFailureReason('');
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
        setDecodeFailureReason('Preview timed out before the browser decoded a frame');
        onDecodeStatus?.(post.id, 'timeout');
      }
    }, 12000);
    return () => clearTimeout(stallTimer);
  }, [post.media_url, post.id, onDecodeStatus]);

  const handleMouseEnter = () => {
    if (videoRef.current && !hasError && canPaintVideo) {
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
    setCanPaintVideo(true);
    setDecodeFailureReason('');
    onDecodeStatus?.(post.id, 'ready');
  };

  const handleError = () => {
    const reason = getVideoErrorReason();
    setIsLoading(false);
    console.error('[LoopVideoItem] preview failed', { postId: post.id, src: post.media_url, poster: post.media_preview_url, reason, error: videoRef.current?.error });
    setHasError(true);
    setCanPaintVideo(false);
    setDecodeFailureReason(reason);
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
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ${isPlaying && canPaintVideo && !hasError ? 'opacity-0' : 'opacity-100'}`}
          loading="lazy"
          data-testid="loop-poster-image"
        />
      )}
      {mediaSrc && !hasError && (
        <video
          ref={videoRef}
          src={mediaSrc}
          poster={posterSrc}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ${shouldShowVideoPreview ? 'opacity-100' : 'opacity-0'}`}
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
      {isLoading && !hasError && !posterSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      )}
      
      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/35 p-1 text-center backdrop-blur-[1px]">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="rounded bg-background/80 px-1 text-[8px] leading-tight text-foreground">Playback not supported</span>
          <span className="max-w-full truncate rounded bg-background/80 px-1 text-[7px] leading-tight text-muted-foreground" title={decodeFailureReason || 'No decode reason reported'}>
            {decodeFailureReason || 'No decode reason reported'}
          </span>
          <span className="max-w-full truncate rounded bg-background/80 px-1 text-[7px] leading-tight text-muted-foreground" title={backendPosterSrc || 'No backend poster URL'}>
            Poster: {backendPosterSrc ? 'available' : 'generated fallback'}
          </span>
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
      {!isPlaying && !isLoading && !hasError && canPaintVideo && (
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
