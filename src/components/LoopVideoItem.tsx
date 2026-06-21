import React, { useRef, useState, useEffect } from 'react';
import { Loader2, Play } from 'lucide-react';

interface LoopVideoItemProps {
  post: {
    id: string;
    media_url: string | null;
  };
  index: number;
  onVideoClick: (index: number) => void;
}

const LoopVideoItem: React.FC<LoopVideoItemProps> = ({ post, index, onVideoClick }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Preload video metadata on mount
  useEffect(() => {
    if (videoRef.current && post.media_url) {
      videoRef.current.load();
    }
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
    setHasError(true);
  };

  return (
    <button
      type="button"
      className="relative w-24 h-40 rounded-lg overflow-hidden bg-muted shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/60 group"
      onClick={() => onVideoClick(index)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {post.media_url && (
        <video
          ref={videoRef}
          src={post.media_url}
          className="w-full h-full object-cover"
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedData={handleLoadedData}
          onError={handleError}
        />
      )}
      
      {/* Loading State */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      )}
      
      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
          <span className="text-[8px] text-muted-foreground text-center px-1">Unable to load</span>
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
