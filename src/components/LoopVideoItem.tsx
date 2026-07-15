import React, { useRef, useState, useEffect } from 'react';
import { Loader2, Play } from 'lucide-react';

interface LoopVideoItemProps {
  post: {
    id: string;
    media_url: string | null;
    media_preview_url?: string | null;
  };
  index: number;
  onVideoClick: (index: number) => void;
  onPreviewError?: (postId: string) => void;
}

const LoopVideoItem: React.FC<LoopVideoItemProps> = ({ post, index, onVideoClick, onPreviewError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Preload enough data to paint the first frame on mount / when src changes.
  // Metadata alone often leaves mobile browsers with a black tile.
  useEffect(() => {
    if (!videoRef.current || !post.media_url) {
      setIsLoading(false);
      setHasError(true);
      return;
    }
    setIsLoading(true);
    setHasError(false);
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
      }
    }, 12000);
    return () => clearTimeout(stallTimer);
  }, [post.media_url]);

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
  };

  const handleError = () => {
    setIsLoading(false);
    if (post.media_preview_url) {
      console.warn('[LoopVideoItem] video decode failed; showing poster fallback', { postId: post.id });
      setHasError(false);
      return;
    }
    console.error('[LoopVideoItem] preview failed', { postId: post.id, src: post.media_url, error: videoRef.current?.error });
    setHasError(true);
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
    >
      {post.media_preview_url && (
        <img
          src={post.media_preview_url}
          alt="Loop preview"
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}
      {post.media_url && (
        <video
          ref={videoRef}
          src={post.media_url}
          poster={post.media_preview_url || undefined}
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
      
      {/* Loading State */}
      {isLoading && !hasError && !post.media_preview_url && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      )}
      
      {/* Error State */}
      {hasError && !post.media_preview_url && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
          <span className="text-[8px] text-muted-foreground text-center px-1">Unable to preview</span>
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
