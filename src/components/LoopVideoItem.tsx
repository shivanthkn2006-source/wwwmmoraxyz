import React, { useRef, useState, useEffect } from 'react';
import { Loader2, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { appendMediaVersion, isPrivateStorageUrl, makeFallbackVideoPoster, resolvePrivateStorageUrl } from '@/lib/mediaUtils';
import { supabase } from '@/integrations/supabase/client';
import { usePersistentMediaSound } from '@/hooks/usePersistentMediaSound';

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
  active?: boolean;
  onDuration?: (postId: string, duration: number) => void;
  canRegeneratePoster?: boolean;
}

const LoopVideoItem: React.FC<LoopVideoItemProps> = ({
  post,
  index,
  onVideoClick,
  onPreviewError,
  onDecodeStatus,
  onRegeneratePoster,
  active = false,
  onDuration,
  canRegeneratePoster = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();
  const longPressTimerRef = useRef<number>();
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [canPaintVideo, setCanPaintVideo] = useState(false);
  const [isStalling, setIsStalling] = useState(false);
  const [decodeFailureReason, setDecodeFailureReason] = useState('');
  const [debugOpen, setDebugOpen] = useState(false);
  const [resolvedPosterSrc, setResolvedPosterSrc] = useState<string | undefined>();
  const [soundUnlocked, setSoundUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean((window as any).__mmoraAudioUnlocked);
  });
  // Loops are ALWAYS muted by default (independent from timeline sound preference)
  // to avoid audio collision with the home-feed auto-scrolling posts.
  // User can still unmute per-session with the speaker toggle.
  const [soundEnabled, setSoundEnabled] = useState(false);

  const version = post.updated_at || post.created_at || post.id;
  const mediaSrc = appendMediaVersion(post.media_url, version);
  // Guard against truncated/invalid data-URI previews stored in older posts.
  const isInvalidDataPreview = React.useMemo(() => {
    const p = post.media_preview_url;
    if (!p || typeof p !== 'string') return false;
    if (!p.startsWith('data:')) return false;
    // A real base64 poster/video is thousands of chars; anything under 1KB is truncated garbage.
    return p.length < 1024;
  }, [post.media_preview_url]);
  const safePreviewUrl = isInvalidDataPreview ? null : post.media_preview_url;
  const backendPosterSrc = appendMediaVersion(safePreviewUrl, version);
  const generatedPosterSrc = React.useMemo(() => makeFallbackVideoPoster(), []);
  const pendingPrivatePoster = isPrivateStorageUrl(safePreviewUrl) && !resolvedPosterSrc;
  const posterSrc = resolvedPosterSrc || (!pendingPrivatePoster ? backendPosterSrc : undefined) || generatedPosterSrc || undefined;
  const shouldShowVideoPreview = canPaintVideo && isPlaying && (active || !posterSrc);
  const shouldPlayWithSound = soundEnabled && soundUnlocked;

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

  useEffect(() => {
    if (!post.media_url) {
      setHasError(true);
      setDecodeFailureReason('Missing media source URL');
      onDecodeStatus?.(post.id, 'missing-source');
      return;
    }
    setHasError(false);
    setCanPaintVideo(false);
    setDecodeFailureReason('');
    onDecodeStatus?.(post.id, 'loading');
    const v = videoRef.current;
    if (v) v.load();
  }, [post.media_url, post.id, onDecodeStatus]);

  useEffect(() => {
    let alive = true;
    setResolvedPosterSrc(undefined);
    resolvePrivateStorageUrl(supabase, safePreviewUrl)
      .then((url) => { if (alive) setResolvedPosterSrc(url); })
      .catch((e) => console.warn('[LoopVideoItem] signed poster failed', post.id, e));
    return () => { alive = false; };
  }, [safePreviewUrl, post.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).__mmoraAudioUnlocked) { setSoundUnlocked(true); return; }
    const unlock = () => {
      (window as any).__mmoraAudioUnlocked = true;
      setSoundUnlocked(true);
      window.dispatchEvent(new CustomEvent('mmora:audio-unlocked'));
    };
    const onGlobalUnlock = () => setSoundUnlocked(true);
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('mmora:audio-unlocked', onGlobalUnlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('mmora:audio-unlocked', onGlobalUnlock);
    };
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !canPaintVideo || hasError) return;
    if (!active) {
      v.pause();
      setIsPlaying(false);
      return;
    }
    v.currentTime = Number.isFinite(v.currentTime) ? v.currentTime : 0;
    v.muted = !shouldPlayWithSound;
    v.play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        v.muted = true;
        v.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      });
  }, [active, canPaintVideo, hasError, shouldPlayWithSound]);

  const handleMouseEnter = () => {
    if (videoRef.current && !hasError && canPaintVideo) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = !shouldPlayWithSound;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {
        if (!videoRef.current) return;
        videoRef.current.muted = true;
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      });
      hoverTimeoutRef.current = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
          setIsPlaying(false);
        }
      }, 2000);
    }
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSoundUnlocked(true);
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (videoRef.current) {
      videoRef.current.muted = !next;
      if (next && active) videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleLoadedData = () => {
    setHasError(false);
    setCanPaintVideo(true);
    setIsStalling(false);
    setDecodeFailureReason('');
    onDecodeStatus?.(post.id, 'ready');
  };

  const handleError = () => {
    const reason = getVideoErrorReason();
    console.error('[LoopVideoItem] preview failed', { postId: post.id, src: post.media_url, poster: post.media_preview_url, reason });
    setHasError(true);
    setCanPaintVideo(false);
    setIsStalling(false);
    setDecodeFailureReason(reason);
    onDecodeStatus?.(post.id, 'decode-failed');
    onPreviewError?.(post.id);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const d = Number.isFinite(videoRef.current.duration) ? videoRef.current.duration : 0;
      if (d > 0) onDuration?.(post.id, d);
    }
    if (videoRef.current && videoRef.current.currentTime === 0) {
      try {
        const d = Number.isFinite(videoRef.current.duration) ? videoRef.current.duration : 1;
        videoRef.current.currentTime = Math.min(0.12, Math.max(0.01, d / 20));
      } catch { /* noop */ }
    }
  };

  const startLongPress = () => {
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => setDebugOpen(true), 550);
  };
  const cancelLongPress = () => window.clearTimeout(longPressTimerRef.current);

  return (
    <button
      type="button"
      className="relative w-24 h-40 rounded-lg overflow-hidden bg-muted shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/60 group"
      onClick={() => onVideoClick(index)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onContextMenu={(e) => { e.preventDefault(); setDebugOpen(true); }}
      data-testid="loop-video-item"
      data-post-id={post.id}
    >
      {posterSrc && (
        <img
          src={posterSrc}
          alt="Loop preview"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ${shouldShowVideoPreview && !hasError ? 'opacity-0' : 'opacity-100'}`}
          loading="eager"
          decoding="async"
          data-testid="loop-poster-image"
        />
      )}
      {mediaSrc && !hasError && (
        <video
          ref={videoRef}
          src={mediaSrc}
          poster={posterSrc}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ${shouldShowVideoPreview ? 'opacity-100' : 'opacity-0'}`}
          muted={!shouldPlayWithSound}
          loop
          playsInline
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onLoadedData={handleLoadedData}
          onCanPlay={handleLoadedData}
          onSeeked={handleLoadedData}
          onWaiting={() => setIsStalling(true)}
          onStalled={() => setIsStalling(true)}
          onPlaying={() => setIsStalling(false)}
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
          onClick={(e) => { e.stopPropagation(); onRegeneratePoster(post.id); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault(); e.stopPropagation(); onRegeneratePoster(post.id);
            }
          }}
        >
          <RotateCcw className="h-3 w-3" />
        </span>
      )}

      {active && (
        <span
          role="button"
          tabIndex={0}
          aria-label={soundEnabled ? 'Mute loop audio' : 'Unmute loop audio'}
          title={soundEnabled ? 'Mute loop audio' : 'Unmute loop audio'}
          className="absolute left-1 top-1 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-background/75 text-foreground backdrop-blur-sm"
          onClick={toggleSound}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              setSoundUnlocked(true);
              setSoundEnabled(!soundEnabled);
            }
          }}
        >
          {soundEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
        </span>
      )}

      {/* Buffering skeleton — only while playback is stalling */}
      {isStalling && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px]">
          <Loader2 className="w-4 h-4 text-white/80 animate-spin" />
        </div>
      )}

      {/* Play indicator on hover */}
      {!isPlaying && !isStalling && !hasError && canPaintVideo && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent pointer-events-none" />

      {/* Hidden debug popover — long-press or right-click to reveal */}
      {debugOpen && (
        <div
          className="absolute inset-x-1 bottom-1 z-20 rounded-md bg-background/95 p-1.5 text-left text-[8px] leading-tight text-foreground shadow-lg ring-1 ring-border"
          onClick={(e) => { e.stopPropagation(); setDebugOpen(false); }}
        >
          <div className="font-semibold">Debug</div>
          <div className="truncate" title={hasError ? decodeFailureReason : 'No decode errors'}>
            {hasError ? decodeFailureReason || 'Decode failed' : 'OK'}
          </div>
          <div className="truncate opacity-80" title={backendPosterSrc || 'generated fallback'}>
            poster: {backendPosterSrc ? backendPosterSrc.slice(-28) : 'fallback'}
          </div>
          <div className="truncate opacity-80" title={mediaSrc || 'missing'}>
            media: {mediaSrc ? mediaSrc.slice(-28) : 'missing'}
          </div>
        </div>
      )}
    </button>
  );
};

export default LoopVideoItem;
