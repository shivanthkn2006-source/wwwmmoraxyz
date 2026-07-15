import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Play,
  Users,
  Scissors,
  Globe,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import VideoCreationModal from './VideoCreationModal';
import { appendMediaVersion, isPrivateStorageUrl, makeFallbackVideoPoster, resolvePrivateStorageUrl } from '@/lib/mediaUtils';
import { usePersistentMediaSound } from '@/hooks/usePersistentMediaSound';

interface Post {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_preview_url?: string | null;
  media_type: string | null;
  updated_at?: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  visibility: string;
  profile?: {
    display_name: string;
    username: string;
    profile_photo_url?: string;
  };
  user_liked?: boolean;
}

interface FullScreenVideoPlayerProps {
  videos: Post[];
  initialIndex: number;
  onClose: () => void;
  onUpdate: () => void;
  loopsMode?: 'global' | 'friends';
  onLoopsModeChange?: (mode: 'global' | 'friends') => void;
}

const AUTO_HIDE_MS = 2500;

const FullScreenVideoPlayer: React.FC<FullScreenVideoPlayerProps> = ({
  videos,
  initialIndex,
  onClose,
  onUpdate,
  loopsMode = 'global',
  onLoopsModeChange,
}) => {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const { soundEnabled, setSoundEnabled } = usePersistentMediaSound(true);
  const [autoplayMutedFallback, setAutoplayMutedFallback] = useState(false);
  const [paused, setPaused] = useState(false);
  const [duetStitchMode, setDuetStitchMode] = useState<{
    type: 'duet' | 'stitch';
    videoUrl: string;
    postId: string;
  } | null>(null);
  const [localLoopsMode, setLocalLoopsMode] = useState<'global' | 'friends'>(loopsMode);

  const [leftHudOpen, setLeftHudOpen] = useState(false);
  const [rightHudOpen, setRightHudOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);

  const currentVideo = videos[currentIndex];
  const [decodeFailed, setDecodeFailed] = useState(false);
  const mediaVersion = currentVideo?.updated_at || currentVideo?.created_at || currentVideo?.id;
  const currentMediaUrl = appendMediaVersion(currentVideo?.media_url, mediaVersion) || '';
  const currentPosterUrl = appendMediaVersion(currentVideo?.media_preview_url, mediaVersion);
  const [signedPosterUrls, setSignedPosterUrls] = useState<Record<string, string>>({});
  const fallbackPosterUrl = React.useMemo(() => makeFallbackVideoPoster(), []);
  const pendingPrivatePoster = isPrivateStorageUrl(currentVideo?.media_preview_url) && !signedPosterUrls[currentVideo?.id || ''];
  const displayedPosterUrl = signedPosterUrls[currentVideo?.id || ''] || (!pendingPrivatePoster ? currentPosterUrl : undefined) || fallbackPosterUrl || undefined;
  const muted = !soundEnabled || autoplayMutedFallback;

  // Preload neighbour videos + posters to avoid stutter on swipe.
  const preloadUrls = React.useMemo(() => {
    const around = [currentIndex - 1, currentIndex + 1]
      .filter((i) => i >= 0 && i < videos.length)
      .map((i) => {
        const v = videos[i];
        const ver = v?.updated_at || v?.created_at || v?.id;
        return {
          id: v.id,
          media: appendMediaVersion(v?.media_url, ver) || '',
          poster: appendMediaVersion(v?.media_preview_url, ver) || '',
        };
      });
    return around;
  }, [currentIndex, videos]);

  useEffect(() => {
    setDecodeFailed(false);
    setAutoplayMutedFallback(false);
    const v = videoRef.current;
    if (!v) return;
    v.muted = !soundEnabled;
    v.play().catch(() => {
      // Autoplay-with-sound blocked; fall back to muted autoplay.
      setAutoplayMutedFallback(true);
      v.muted = true;
      v.play().catch(console.error);
    });
  }, [currentIndex, soundEnabled]);

  useEffect(() => {
    let alive = true;
    const current = videos[currentIndex];
    const neighbours = [currentIndex - 1, currentIndex, currentIndex + 1]
      .filter((i) => i >= 0 && i < videos.length)
      .map((i) => videos[i]);
    Promise.all(neighbours.map(async (item) => {
      if (!item?.media_preview_url) return null;
      const signed = await resolvePrivateStorageUrl(supabase, item.media_preview_url).catch(() => undefined);
      return signed ? [item.id, signed] as const : null;
    })).then((pairs) => {
      if (!alive) return;
      setSignedPosterUrls((prev) => {
        const next = { ...prev };
        pairs.forEach((pair) => { if (pair) next[pair[0]] = pair[1]; });
        return next;
      });
    });
    return () => { alive = false; };
  }, [currentIndex, videos]);

  useEffect(() => {
    if (!leftHudOpen) return;
    const t = window.setTimeout(() => setLeftHudOpen(false), AUTO_HIDE_MS);
    return () => window.clearTimeout(t);
  }, [leftHudOpen]);

  useEffect(() => {
    if (!rightHudOpen) return;
    const t = window.setTimeout(() => setRightHudOpen(false), AUTO_HIDE_MS);
    return () => window.clearTimeout(t);
  }, [rightHudOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;

    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < videos.length - 1) {
        // Swipe up - next video
        setCurrentIndex(currentIndex + 1);
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe down - previous video
        setCurrentIndex(currentIndex - 1);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY > 0 && currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (e.deltaY < 0 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const toggleLike = async () => {
    if (!user) return;

    try {
      if (currentVideo.user_liked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', currentVideo.id)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('post_likes')
          .insert({ post_id: currentVideo.id, user_id: user.id });
      }
      onUpdate();
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (paused) {
        videoRef.current.muted = !soundEnabled;
        videoRef.current.play().catch(() => {
          if (!videoRef.current) return;
          videoRef.current.muted = true;
          setAutoplayMutedFallback(true);
          videoRef.current.play().catch(() => {});
        });
      } else {
        videoRef.current.pause();
      }
      setPaused(!paused);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      <div className="relative h-full w-full flex">
        {/* Left Column (no overlay on video) */}
        <aside
          className={`relative z-50 h-full shrink-0 border-r border-white/5 transition-[width] duration-300 ease-out ${
            leftHudOpen ? 'w-64' : 'w-10'
          }`}
          onMouseEnter={() => setLeftHudOpen(true)}
          onMouseLeave={() => setLeftHudOpen(false)}
        >
          <div className="h-full w-full flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full flex items-center">
                {/* Handle (always visible) */}
                <button
                  type="button"
                  aria-label={leftHudOpen ? 'Hide loops menu' : 'Show loops menu'}
                  onClick={() => setLeftHudOpen((v) => !v)}
                  className="ml-1 backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl shadow-lg h-14 w-8 flex items-center justify-center text-white/90 hover:bg-white/10"
                >
                  <ChevronRight className={`h-4 w-4 transition-transform ${leftHudOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Panel */}
                <div className={`overflow-hidden transition-[opacity] duration-200 ${leftHudOpen ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="pl-2 pr-3">
                    <div className="backdrop-blur-xl bg-black/35 border border-white/10 rounded-2xl p-3 shadow-[0_10px_30px_-18px_rgba(34,211,238,0.55)]">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => {
                            setLocalLoopsMode('global');
                            onLoopsModeChange?.('global');
                            setLeftHudOpen(false);
                          }}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 ${
                            localLoopsMode === 'global'
                              ? 'bg-gradient-to-r from-cyan-500/35 via-sky-500/25 to-indigo-500/30 border border-cyan-300/40 shadow-[0_0_20px_rgba(34,211,238,0.35)]'
                              : 'bg-white/5 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <Globe className={`w-4 h-4 ${localLoopsMode === 'global' ? 'text-cyan-200' : 'text-white/70'}`} />
                          <span className={`text-sm font-medium ${localLoopsMode === 'global' ? 'text-white' : 'text-white/70'}`}>
                            Global
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            setLocalLoopsMode('friends');
                            onLoopsModeChange?.('friends');
                            setLeftHudOpen(false);
                          }}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 ${
                            localLoopsMode === 'friends'
                              ? 'bg-gradient-to-r from-cyan-500/35 via-sky-500/25 to-indigo-500/30 border border-cyan-300/40 shadow-[0_0_20px_rgba(34,211,238,0.35)]'
                              : 'bg-white/5 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <UserCheck className={`w-4 h-4 ${localLoopsMode === 'friends' ? 'text-cyan-200' : 'text-white/70'}`} />
                          <span className={`text-sm font-medium ${localLoopsMode === 'friends' ? 'text-white' : 'text-white/70'}`}>
                            Friends
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Close button (kept off the video) */}
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-white/90 hover:bg-white/10 backdrop-blur-sm bg-black/20 rounded-full h-9 border border-white/10"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </aside>

        {/* Center Video (always unobstructed) */}
        <main className="relative flex-1 min-w-0 h-full flex items-center justify-center">
          <video
            ref={videoRef}
            src={currentMediaUrl}
            poster={displayedPosterUrl}
            className={`w-full h-full object-contain ${decodeFailed ? 'hidden' : ''}`}
            loop={false}
            muted={muted}
            playsInline
            onClick={togglePlayPause}
            onCanPlay={() => setDecodeFailed(false)}
            onError={() => setDecodeFailed(true)}
            onEnded={() => {
              if (currentIndex < videos.length - 1) setCurrentIndex((i) => i + 1);
              else videoRef.current?.play().catch(() => {});
            }}
          />

          {decodeFailed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black text-center text-white">
              {displayedPosterUrl && <img src={displayedPosterUrl} alt="Loop poster" className="max-h-full max-w-full object-contain" />}
              <div className="absolute inset-x-4 bottom-24 rounded-lg bg-black/70 px-4 py-3 backdrop-blur-sm">
                <p className="text-sm font-medium">Playback not supported for this format</p>
              </div>
            </div>
          )}

          {/* Hidden neighbour preloads to avoid stutter on swipe */}
          <div aria-hidden className="hidden">
            {preloadUrls.map((p, i) => (
              <React.Fragment key={i}>
                {p.media && <video src={p.media} preload="auto" muted playsInline />}
                {(signedPosterUrls[p.id] || p.poster) && <img src={signedPosterUrls[p.id] || p.poster} alt="" />}
              </React.Fragment>
            ))}
          </div>


          {/* Play/Pause Overlay */}
          {paused && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/50 rounded-full p-6">
                <Play className="w-16 h-16 text-white" />
              </div>
            </div>
          )}

          {/* Bottom Info */}
          <div className="absolute left-4 right-4 bottom-20">
            <div className="space-y-1">
              <p className="text-white font-semibold text-base">@{currentVideo.profile?.username}</p>
              {currentVideo.content && <p className="text-white/80 text-sm line-clamp-2">{currentVideo.content}</p>}
            </div>
          </div>

          {/* Navigation Indicators */}
          <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 flex justify-between pointer-events-none">
            {currentIndex > 0 && <div className="text-white/50 text-xs">Swipe down for previous</div>}
            {currentIndex < videos.length - 1 && <div className="text-white/50 text-xs ml-auto">Swipe up for next</div>}
          </div>
        </main>

        {/* Right Column (no overlay on video) */}
        <aside
          className={`relative z-50 h-full shrink-0 border-l border-white/5 flex items-center justify-end transition-[width] duration-300 ease-out ${
            rightHudOpen ? 'w-[360px]' : 'w-10'
          }`}
          onMouseEnter={() => setRightHudOpen(true)}
          onMouseLeave={() => setRightHudOpen(false)}
        >
          <div className="w-full flex items-center justify-end">
            {/* Panel (horizontal, extends left from right) */}
            <div className={`overflow-hidden transition-[opacity] duration-200 ${rightHudOpen ? 'opacity-100' : 'opacity-0'}`}>
              <div className="pr-2 pl-3">
                <div className="backdrop-blur-xl bg-black/35 border border-white/10 rounded-2xl p-2 shadow-[0_10px_30px_-18px_rgba(34,211,238,0.35)]">
                  <div className="flex items-center gap-2 overflow-x-auto max-w-[320px]">
                    {/* Profile */}
                    <button
                      type="button"
                      className="shrink-0 rounded-full"
                      onClick={() => setRightHudOpen(false)}
                      aria-label="View profile"
                    >
                      <Avatar className="w-10 h-10 border border-white/20">
                        <AvatarImage src={currentVideo.profile?.profile_photo_url} />
                        <AvatarFallback className="bg-primary/50 text-primary-foreground text-xs">
                          {currentVideo.profile?.display_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </button>

                    {/* Like */}
                    <button
                      onClick={toggleLike}
                      className="relative shrink-0 h-10 w-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center"
                      aria-label="Like"
                    >
                      <Heart
                        className={`w-5 h-5 ${currentVideo.user_liked ? 'fill-red-500 text-red-500' : 'text-white/90'}`}
                      />
                      <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-black/60 border border-white/10 text-white text-[10px] flex items-center justify-center">
                        {currentVideo.likes_count || 0}
                      </span>
                    </button>

                    {/* Comment */}
                    <button
                      className="relative shrink-0 h-10 w-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center"
                      aria-label="Comments"
                    >
                      <MessageCircle className="w-5 h-5 text-white/90" />
                      <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-black/60 border border-white/10 text-white text-[10px] flex items-center justify-center">
                        {currentVideo.comments_count || 0}
                      </span>
                    </button>

                    {/* Duet */}
                    <button
                      onClick={() =>
                        setDuetStitchMode({ type: 'duet', videoUrl: currentVideo.media_url!, postId: currentVideo.id })
                      }
                      className="shrink-0 h-10 w-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center"
                      aria-label="Duet"
                    >
                      <Users className="w-5 h-5 text-white/90" />
                    </button>

                    {/* Stitch */}
                    <button
                      onClick={() =>
                        setDuetStitchMode({ type: 'stitch', videoUrl: currentVideo.media_url!, postId: currentVideo.id })
                      }
                      className="shrink-0 h-10 w-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center"
                      aria-label="Stitch"
                    >
                      <Scissors className="w-5 h-5 text-white/90" />
                    </button>

                    {/* Share */}
                    <button
                      className="shrink-0 h-10 w-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center"
                      aria-label="Share"
                    >
                      <Share2 className="w-5 h-5 text-white/90" />
                    </button>

                    {/* Mute Toggle */}
                    <button
                      onClick={() => {
                        const next = muted ? true : false;
                        setSoundEnabled(next);
                        setAutoplayMutedFallback(false);
                        if (videoRef.current) {
                          videoRef.current.muted = !next;
                          if (next) videoRef.current.play().catch(() => setAutoplayMutedFallback(true));
                        }
                      }}
                      className="shrink-0 h-10 w-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center"
                      aria-label={muted ? 'Unmute' : 'Mute'}
                    >
                      {muted ? <VolumeX className="w-5 h-5 text-white/90" /> : <Volume2 className="w-5 h-5 text-white/90" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Handle (always visible) */}
            <button
              type="button"
              aria-label={rightHudOpen ? 'Hide actions menu' : 'Show actions menu'}
              onClick={() => setRightHudOpen((v) => !v)}
              className="mr-1 backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl shadow-lg h-16 w-8 flex items-center justify-center text-white/90 hover:bg-white/10"
            >
              <ChevronLeft className={`h-4 w-4 transition-transform ${rightHudOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </aside>
      </div>

      {/* Duet/Stitch Modal */}
      {duetStitchMode && (
        <VideoCreationModal
          open={!!duetStitchMode}
          onOpenChange={(open) => !open && setDuetStitchMode(null)}
          onComplete={() => {
            setDuetStitchMode(null);
            onUpdate();
          }}
          duetStitchMode={duetStitchMode}
        />
      )}
    </div>
  );
};

export default FullScreenVideoPlayer;
