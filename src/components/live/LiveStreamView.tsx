import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { X, Eye, Heart, Send, Smile, Share2, MoreVertical, CameraOff, Play } from 'lucide-react';
import { useAdaptiveCamera } from '@/hooks/useAdaptiveCamera';
import { mmoraLogoProps } from '@/components/brand/MmoraBrandHomeBridge';

interface LiveComment {
  id: string;
  user: string;
  text: string;
}

interface FloatingHeart {
  id: number;
  xOffset: number;
}

export interface LiveStreamViewProps {
  onClose: () => void;
  channelName?: string;
}

const AMBIENT_COMMENTS: Array<Omit<LiveComment, 'id'>> = [
  { user: '@rima_devi', text: 'Hello everyone ✨' },
  { user: '@judith3373', text: 'This looks so good' },
  { user: '@alex_dev', text: 'Welcome to M\u2019Mora Live' },
  { user: '@terrific_helen', text: 'clap clap' },
  { user: '@agung_l', text: 'Stream quality is clean 🔥' },
  { user: '@paulus', text: 'crazy' },
];

/** Memoized so a new incoming comment never re-renders the whole rail. */
const CommentRow = memo(({ comment }: { comment: LiveComment }) => (
  <div className="flex items-start gap-2 will-change-transform animate-fade-in">
    <div className="mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-semibold text-white">
      {comment.user.replace('@', '').charAt(0).toUpperCase()}
    </div>
    <p className="text-[13px] leading-snug text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
      <span className="mr-1.5 font-semibold text-white/80">{comment.user}</span>
      {comment.text}
    </p>
  </div>
));
CommentRow.displayName = 'CommentRow';

const MAX_VISIBLE_COMMENTS = 24;

export const LiveStreamView: React.FC<LiveStreamViewProps> = ({
  onClose,
  channelName = "M'Mora Live",
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const heartSeed = useRef(0);

  const [comments, setComments] = useState<LiveComment[]>(
    AMBIENT_COMMENTS.slice(0, 3).map((c, i) => ({ ...c, id: `seed-${i}` })),
  );
  const [inputComment, setInputComment] = useState('');
  const [viewerCount, setViewerCount] = useState(4720);
  const [likeCount, setLikeCount] = useState(1280);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);

  const { stream, error, isStarting, networkType, startStream, stopStream } = useAdaptiveCamera({ autoStart: true });
  const [needsTapToPlay, setNeedsTapToPlay] = useState(false);

  // iOS/Safari: playback must be muted + inline, and play() can still reject
  // until a user gesture. Surface a tap-to-start affordance instead of failing.
  const attachAndPlay = useCallback(async () => {
    const el = videoRef.current;
    if (!el || !stream) return;
    el.muted = true;
    el.setAttribute('muted', '');
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', 'true');
    if (el.srcObject !== stream) el.srcObject = stream;
    try {
      await el.play();
      setNeedsTapToPlay(false);
    } catch {
      setNeedsTapToPlay(true);
    }
  }, [stream]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!stream) {
      el.srcObject = null;
      return;
    }
    void attachAndPlay();
    // Safari sometimes drops the first frame when returning to the tab.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void attachAndPlay();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (el) el.srcObject = null;
    };
  }, [stream, attachAndPlay]);

  // Comment queue: incoming comments buffer in a ref and flush on a single
  // rAF-batched tick, so bursts cause one render instead of one render each.
  const pendingComments = useRef<LiveComment[]>([]);
  const flushHandle = useRef<number | null>(null);

  const pushComment = useCallback((comment: LiveComment) => {
    pendingComments.current.push(comment);
    if (flushHandle.current !== null) return;
    flushHandle.current = window.requestAnimationFrame(() => {
      flushHandle.current = null;
      const batch = pendingComments.current;
      pendingComments.current = [];
      if (!batch.length) return;
      setComments((prev) => [...prev, ...batch].slice(-MAX_VISIBLE_COMMENTS));
    });
  }, []);

  useEffect(() => () => {
    if (flushHandle.current !== null) window.cancelAnimationFrame(flushHandle.current);
  }, []);

  // Auto-scroll without smooth-scroll animation cost on low-end devices.
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const id = window.requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => window.cancelAnimationFrame(id);
  }, [comments]);

  // Ambient comment stream + viewer drift (keeps the rail alive like YT Live)
  useEffect(() => {
    const commentTimer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      const pick = AMBIENT_COMMENTS[Math.floor(Math.random() * AMBIENT_COMMENTS.length)];
      pushComment({ ...pick, id: `a-${Date.now()}-${Math.random()}` });
    }, 3200);
    const viewerTimer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      setViewerCount((v) => Math.max(1, v + Math.floor(Math.random() * 21) - 8));
    }, 4000);
    return () => {
      window.clearInterval(commentTimer);
      window.clearInterval(viewerTimer);
    };
  }, [pushComment]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const triggerLike = useCallback(() => {
    setLikeCount((prev) => prev + 1);
    heartSeed.current += 1;
    const newHeart: FloatingHeart = {
      id: heartSeed.current,
      xOffset: Math.floor(Math.random() * 40) - 20,
    };
    setFloatingHearts((prev) => [...prev.slice(-14), newHeart]);
    window.setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 1900);
  }, []);

  const handleSendComment = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputComment.trim();
    if (!text) return;
    pushComment({ id: `me-${Date.now()}`, user: '@you', text });
    setInputComment('');
  };

  const handleClose = () => {
    stopStream();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black animate-fade-in"
      style={{ height: '100dvh' }}
      role="dialog"
      aria-modal="true"
      aria-label="Live stream"
    >
      {/* Video viewport */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
        style={{ transform: 'translate3d(0,0,0) scaleX(-1)' }}
      />

      {error && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-8 text-center"
          role="alert"
        >
          <CameraOff className="h-8 w-8 text-white/80" />
          <p className="text-base font-semibold text-white">{error.title}</p>
          <p className="max-w-xs text-sm leading-relaxed text-white/70">{error.message}</p>
          <div className="mt-1 flex items-center gap-2">
            {error.recoverable && (
              <button
                type="button"
                onClick={() => void startStream()}
                disabled={isStarting}
                className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-md disabled:opacity-50"
              >
                {isStarting ? 'Starting…' : 'Try again'}
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white/80"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {!error && needsTapToPlay && (
        <button
          type="button"
          onClick={() => void attachAndPlay()}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-white"
          aria-label="Tap to start the live preview"
        >
          <span className="rounded-full border border-white/30 bg-white/10 p-4 backdrop-blur-md">
            <Play className="h-7 w-7" />
          </span>
          <span className="text-sm text-white/80">Tap to start live preview</span>
        </button>
      )}

      {/* Gradients */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/80 to-transparent" />

      {/* Header */}
      <div
        className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 px-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <div className="flex min-w-0 items-center gap-2 rounded-full bg-black/35 px-2 py-1.5 backdrop-blur-md">
          <div
            {...mmoraLogoProps}
            onClick={handleClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white"
          >
            M
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-[13px] font-semibold text-white">{channelName}</span>
              <span className="rounded-full bg-red-600 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wide text-white">
                Live
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/75">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" /> {(viewerCount / 1000).toFixed(1)}k
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" /> {likeCount}
              </span>
              <span className="hidden xs:inline">{networkType === 'high' ? 'HD 1080p' : 'Adaptive 720p'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="More options"
            className="rounded-full bg-black/35 p-2 text-white backdrop-blur-md"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close live stream"
            className="rounded-full bg-black/35 p-2 text-white backdrop-blur-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Floating white hearts */}
      <div className="pointer-events-none absolute bottom-28 right-5 h-64 w-24 overflow-visible">
        {floatingHearts.map((heart) => (
          <div
            key={heart.id}
            className="animate-float-heart absolute bottom-0 right-2 will-change-transform"
            style={{ transform: `translate3d(${heart.xOffset}px,0,0)` }}
          >
            <Heart className="h-6 w-6 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]" fill="white" />
          </div>
        ))}
      </div>

      {/* Right actions */}
      <div className="absolute bottom-32 right-3 flex flex-col items-center gap-5">
        <button type="button" onClick={triggerLike} className="flex flex-col items-center gap-1" aria-label="Send a like">
          <span className="rounded-full bg-black/30 p-2.5 backdrop-blur-md transition-transform active:scale-90">
            <Heart className="h-6 w-6 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]" />
          </span>
          <span className="text-[11px] font-medium text-white drop-shadow">{likeCount}</span>
        </button>
        <button type="button" className="flex flex-col items-center gap-1" aria-label="Share stream">
          <span className="rounded-full bg-black/30 p-2.5 backdrop-blur-md">
            <Share2 className="h-6 w-6 text-white" />
          </span>
          <span className="text-[11px] font-medium text-white drop-shadow">Share</span>
        </button>
      </div>

      {/* Bottom content */}
      <div
        className="absolute inset-x-0 bottom-0 px-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div
          ref={chatScrollRef}
          className="no-scrollbar mb-2 max-h-44 w-[78%] overflow-y-auto pr-1"
          style={{
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 28%, black 100%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 28%, black 100%)',
          }}
        >
          <div className="flex flex-col gap-2">
            {comments.map((c) => (
              <CommentRow key={c.id} comment={c} />
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSendComment}
          className="flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3 py-2 backdrop-blur-xl"
        >
          <input
            value={inputComment}
            onChange={(e) => setInputComment(e.target.value)}
            placeholder="Add a live comment..."
            aria-label="Add a live comment"
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
          />
          <button type="button" aria-label="Emoji" className="text-white/70">
            <Smile className="h-5 w-5" />
          </button>
          <button type="submit" aria-label="Send comment" className="text-white disabled:opacity-40" disabled={!inputComment.trim()}>
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default LiveStreamView;
