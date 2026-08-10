// HomePage - Main feed component
import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import PostCard from '@/components/PostCard';
import { FeedErrorBoundary } from '@/components/FeedErrorBoundary';
import NotificationMenu from '@/components/NotificationMenu';
import AnimatedHamburgerButton from '@/components/AnimatedHamburgerButton';
import HamburgerMenu from '@/components/HamburgerMenu';
import SearchBar from '@/components/SearchBar';
import { ArrowDown, Mail, Search, Video, TrendingUp, ArrowUp, Camera, ChevronUp, ChevronDown } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import FuturisticCounter from '@/components/FuturisticCounter';
import { useNavigate } from 'react-router-dom';
import { onHomeRefresh, triggerHomeRefresh } from '@/lib/homeRefresh';
import { useEventGlow, getAvatarGlowClass } from '@/hooks/useEventGlow';
import { toast } from '@/hooks/use-toast';
import AutoScrollDebugOverlay from '@/components/dev/AutoScrollDebugOverlay';

import StatusIconBadge from '@/components/StatusIconBadge';
import { useSmartNotifications } from '@/hooks/useSmartNotifications';
import { useRealtimeBadgeNotifications } from '@/hooks/useRealtimeBadgeNotifications';
import { useUserOnlineNotifications } from '@/hooks/useUserOnlineNotifications';
import { useDesktopNotifications } from '@/hooks/useDesktopNotifications';
import { useNewPostNotifications } from '@/hooks/useNewPostNotifications';
import { useZoeProactiveNotifications } from '@/hooks/useZoeProactiveNotifications';
import { TutorialOverlay } from '@/components/TutorialOverlay';
import { useTutorial } from '@/hooks/useTutorial';
import { useDailyBriefing } from '@/hooks/useDailyBriefing';
import { OnboardingTour } from '@/components/OnboardingTour';
import { SovereignQuickAccess } from '@/components/SovereignQuickAccess';
import { appendMediaVersion, captureVideoPreviewFromUrl, dataUrlToFile, getPostsStorageObjectPath, inferMediaType, makeFallbackVideoPoster, resolvePrivateStorageUrl, transcodeVideoForPreview } from '@/lib/mediaUtils';
import PostsGrid from "@/components/PostsGrid";
import PostModal from "@/components/PostModal";
import FriendRequestCard from "@/components/FriendRequestCard";
import InterestRecommendations from "@/components/InterestRecommendations";
import FullScreenVideoPlayer from "@/components/FullScreenVideoPlayer";
import { initializeAudio } from '@/utils/notificationSounds';
import PrivateTimelinesSheet from '@/components/PrivateTimelinesSheet';
import LoopVideoItem from '@/components/LoopVideoItem';
import SelfieCityFeed from '@/components/selfiecity/SelfieCityFeed';
import FeedDiagnosticsBanner, { FeedDiagnostics } from '@/components/FeedDiagnosticsBanner';
import AdminFeedDebugger from '@/components/AdminFeedDebugger';
import {
  detectZoeHomeCommand,
  extractZoeHomeEventText,
  logZoeHomeCommand,
  ZOE_HOME_STATE_EVENT,
  ZOE_HOME_DEBUG_EVENT,
  ZOE_HOME_TRANSCRIPT_EVENTS,
  type ZoeHomeDebugDetail,
  type ZoeHomeDetectedCommand,
} from '@/lib/zoeHomeCommands';

const ProfileContent = React.lazy(() => import('@/components/ProfileContent'));

// Atlas HUD Integration - Smith AI from Atlas movie (2024)
// NOTE: Atlas is a SEPARATE experience from Zoe Infinity - accessed via menu only
import { AtlasHUD } from '@/components/atlas';

import { useFriendRequests } from "@/hooks/useFriendRequests";
import PageSeo from "@/components/seo/PageSeo";
import NewContentBadge from '@/components/NewContentBadge';
import { detectNewArrivals, markPostsSeen, readUnseenPostIds, reconcileUnseenPosts, registerUnseenPosts, type FeedUpdateSource } from "@/lib/newPostGate";



interface Post {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_preview_url?: string | null;
  full_media_url?: string | null;
  media_type: string | null;
  updated_at?: string | null;
  has_deferred_media?: boolean;
  media_size?: number;
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

const DATA_URL_PREVIEW_LIMIT = 900_000;

// Loops upload whitelist
const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'];
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const prepareFeedPostMedia = (post: any): Post => {
  const mediaUrl = typeof post.media_url === 'string' ? post.media_url : null;
  const realType = inferMediaType(mediaUrl, post.media_type);
  const isHeavyDataUrl = post.has_deferred_media || (!!mediaUrl && mediaUrl.startsWith('data:') && mediaUrl.length > DATA_URL_PREVIEW_LIMIT);

  return {
    ...post,
    media_type: realType ?? post.media_type,
    full_media_url: null,
    media_url: isHeavyDataUrl ? null : mediaUrl,
    has_deferred_media: !!isHeavyDataUrl,
  };
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const validateBrowserCanPreviewFile = (file: File, mediaType: 'video' | 'image') =>
  new Promise<void>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const timer = window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`${mediaType === 'video' ? 'Video' : 'Image'} preview timed out. Please export it again and retry.`));
    }, 10000);
    const done = () => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(objectUrl);
    };

    if (mediaType === 'video') {
      const video = document.createElement('video');
      if (file.type && video.canPlayType(file.type) === '') {
        done();
        reject(new Error('This video format is not previewable here. Export as MP4/H.264, WebM, or MOV/H.264.'));
        return;
      }
      // Do not require a full local decode here: the Lovable preview browser can lack
      // proprietary MP4 codecs even when user browsers play the same H.264 file.
      // MIME + canPlayType prevents obvious bypasses; the Loop tile still hides rows
      // that fail after upload so broken media does not poison the rail.
      done();
      resolve();
      return;
    }

    const img = new Image();
    img.onload = () => {
      done();
      img.naturalWidth > 0 && img.naturalHeight > 0
        ? resolve()
        : reject(new Error('This image has no readable pixels. Export it again and retry.'));
    };
    img.onerror = () => {
      done();
      reject(new Error('This image cannot be decoded for preview. Use JPG, PNG, WebP, or GIF.'));
    };
    img.src = objectUrl;
  });

const captureVideoPreview = (file: File) =>
  new Promise<string | null>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    const cleanup = () => URL.revokeObjectURL(objectUrl);
    const finish = (value: string | null) => {
      cleanup();
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(makeFallbackVideoPoster()), 5000);

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      try {
        video.currentTime = Math.min(0.2, Math.max(0.01, (Number.isFinite(video.duration) ? video.duration : 1) / 20));
      } catch {
        window.clearTimeout(timer);
        finish(makeFallbackVideoPoster());
      }
    };
    video.onseeked = () => {
      try {
        const width = video.videoWidth || 360;
        const height = video.videoHeight || 640;
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(360, width);
        canvas.height = Math.round((canvas.width / width) * height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No canvas context');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        window.clearTimeout(timer);
        finish(canvas.toDataURL('image/jpeg', 0.72));
      } catch {
        window.clearTimeout(timer);
        finish(makeFallbackVideoPoster());
      }
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      finish(makeFallbackVideoPoster());
    };
    video.src = objectUrl;
  });

async function withRetry<T>(fn: (attempt: number) => Promise<T>, attempts = 3, baseDelay = 800): Promise<T> {
  let lastErr: any;
  for (let i = 1; i <= attempts; i++) {
    try { return await fn(i); }
    catch (e) {
      lastErr = e;
      if (i < attempts) await sleep(baseDelay * Math.pow(2, i - 1));
    }
  }
  throw lastErr;
}

/**
 * Upload a file to the `posts` storage bucket via XHR to expose real progress.
 * Falls back to Supabase JS SDK if session token isn't available.
 */
function xhrUploadToPosts(
  file: File,
  path: string,
  accessToken: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/posts/${path.split('/').map(encodeURIComponent).join('/')}`;
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) onProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText?.slice(0, 200) || 'unknown'}`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.send(file);
  });
}

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { receivedRequests, acceptFriendRequest, rejectFriendRequest } = useFriendRequests();
  const [globalPosts, setGlobalPosts] = useState<Post[]>([]);
  const [personalPosts, setPersonalPosts] = useState<Post[]>([]);
  const [loopPosts, setLoopPosts] = useState<Post[]>([]);
  const [brokenLoopPreviewIds, setBrokenLoopPreviewIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [activeTab, setActiveTab] = useState<string>('global');
  const [zoeVisible, setZoeVisible] = useState(true); // Zoe visibility state
  const [loopsPlayerOpen, setLoopsPlayerOpen] = useState(false);
  const [loopsInitialIndex, setLoopsInitialIndex] = useState(0);
  const [loopsFilter, setLoopsFilter] = useState<'recent' | 'liked' | 'friends' | 'trending'>('trending');
  const [loopsHidden, setLoopsHidden] = useState<boolean>(() => {
    try { return typeof window !== 'undefined' && window.localStorage.getItem('mmora.home.loopsHidden') === 'true'; } catch { return false; }
  });
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(() => {
    try { return !(typeof window !== 'undefined' && window.localStorage.getItem('mmora.home.autoScroll') === 'false'); } catch { return true; }
  });
  const [friendships, setFriendships] = useState<Array<{user1_id: string, user2_id: string}>>([]);
  const [privateTimelinesOpen, setPrivateTimelinesOpen] = useState(false);
  const [hamburgerMenuOpen, setHamburgerMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [newMatches, setNewMatches] = useState(0);
  const [feedDiag, setFeedDiag] = useState<FeedDiagnostics | null>(null);
  const [debugEntries, setDebugEntries] = useState<Array<import('@/components/AdminFeedDebugger').FeedDebugEntry>>([]);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [loopDecodeStatus, setLoopDecodeStatus] = useState<Record<string, string>>({});
  const [activeLoopRailIndex, setActiveLoopRailIndex] = useState(0);
  const [loopDurations, setLoopDurations] = useState<Record<string, number>>({});
  const [loopRailInView, setLoopRailInView] = useState(false);
  const [loopRailPassCompleted, setLoopRailPassCompleted] = useState(false);
  const [feedAutoIndex, setFeedAutoIndex] = useState(0);
  const [feedAutoPassCompleted, setFeedAutoPassCompleted] = useState(false);
  // Auto-scroll only runs when NEW posts have appeared on the active tab.
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const pendingSeenIdsRef = useRef<string[]>([]);
  const knownFeedIdsRef = useRef<Record<'global' | 'personal' | 'loops', string[]>>({ global: [], personal: [], loops: [] });
  type NewContentByFeed = Record<'global' | 'personal' | 'loops', Set<string>>;
  const [newContentByFeed, setNewContentByFeed] = useState<NewContentByFeed>(() => ({
    global: readUnseenPostIds('global'),
    personal: readUnseenPostIds('personal'),
    loops: readUnseenPostIds('loops'),
  }));

  const [showZoeHomeDebug, setShowZoeHomeDebug] = useState<boolean>(() => {
    try { return typeof window !== 'undefined' && window.localStorage.getItem('mmora.home.zoeDebugOverlay') !== 'false'; } catch { return true; }
  });
  const [zoeChatOpen, setZoeChatOpen] = useState<boolean>(
    typeof window !== 'undefined' && Boolean((window as any).__mmoraZoeChatOpen)
  );
  useEffect(() => {
    const onToggle = (e: Event) => {
      const open = Boolean((e as CustomEvent).detail?.open);
      setZoeChatOpen(open);
      if (import.meta.env.DEV) console.info('[HomePage] Zoe chat toggle → autoscroll pause =', open);
    };
    window.addEventListener('mmora:zoe-chat-toggle', onToggle);
    return () => window.removeEventListener('mmora:zoe-chat-toggle', onToggle);
  }, []);
  const loopRailRef = useRef<HTMLDivElement | null>(null);
  const feedAutoTimerRef = useRef<number | null>(null);

  // Reset loop-rail one-pass flag and timeline index when the signed-in user
  // changes (sign-in / sign-out / account switch) so the rail replays exactly
  // once per session and never unexpectedly loops for a returning user.
  useEffect(() => {
    if (import.meta.env.DEV) console.info('[HomePage] auth change → resetting loop-rail pass + feed index', { userId: user?.id ?? null });
    setLoopRailPassCompleted(false);
    setActiveLoopRailIndex(0);
    setFeedAutoIndex(0);
    setFeedAutoPassCompleted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Hide the top header on scroll-down; reveal on scroll-up or when the user
  // reaches the top. While a visible video is actively playing, keep the
  // header hidden so viewing area stays full (IG Reels / Shorts style).
  const [headerVisible, setHeaderVisible] = useState(true);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let lastY = window.scrollY;
    let ticking = false;
    const isVideoPlayingOnScreen = () => {
      const vids = Array.from(document.querySelectorAll('video')) as HTMLVideoElement[];
      const vh = window.innerHeight;
      return vids.some((v) => {
        if (v.paused || v.ended || v.readyState < 2) return false;
        const r = v.getBoundingClientRect();
        return r.bottom > 0 && r.top < vh && r.height > 40;
      });
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY;
        if (y < 24) setHeaderVisible(true);
        else if (dy > 4) setHeaderVisible(false);            // scrolling down → hide
        else if (dy < -4 && !isVideoPlayingOnScreen()) setHeaderVisible(true); // scroll up while nothing playing → reveal
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // DEV visibility debug: log every change so we can verify voice + chevron
  // stay in sync and header hit-testing behaves correctly during auto-scroll.
  const [zoeHomeDebug, setZoeHomeDebug] = useState<ZoeHomeDebugDetail>({
    stage: 'state',
    handler: 'home-mounted',
    loopsHidden,
    headerVisible,
    autoScrollEnabled,
    feedAutoPassCompleted,
    loopRailPassCompleted,
    at: Date.now(),
  });

  useEffect(() => {
    const onDebug = (e: Event) => {
      const detail = (e as CustomEvent<ZoeHomeDebugDetail>).detail;
      if (!detail) return;
      setZoeHomeDebug((prev) => ({ ...prev, ...detail }));
    };
    window.addEventListener(ZOE_HOME_DEBUG_EVENT, onDebug as EventListener);
    return () => window.removeEventListener(ZOE_HOME_DEBUG_EVENT, onDebug as EventListener);
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV) console.info('[HomePage] state', { loopsHidden, headerVisible, feedAutoPassCompleted, loopRailPassCompleted, autoScrollEnabled });
    const detail: ZoeHomeDebugDetail = {
      stage: 'state',
      loopsHidden,
      headerVisible,
      autoScrollEnabled,
      feedAutoPassCompleted,
      loopRailPassCompleted,
      at: Date.now(),
    };
    setZoeHomeDebug((prev) => ({ ...prev, ...detail }));
    try { window.dispatchEvent(new CustomEvent(ZOE_HOME_STATE_EVENT, { detail })); } catch {}
  }, [loopsHidden, headerVisible, feedAutoPassCompleted, loopRailPassCompleted, autoScrollEnabled]);

  const setLoopsSectionHidden = React.useCallback((hidden: boolean, source: string, transcript?: string, detectedCommand?: ZoeHomeDetectedCommand) => {
    setLoopsHidden(hidden);
    try { localStorage.setItem('mmora.home.loopsHidden', hidden ? 'true' : 'false'); } catch {}
    try { trackEvent({ name: 'loop_mute_toggle', postId: 'section-visibility', muted: hidden, persisted: true } as any); } catch {}
    logZoeHomeCommand({
      stage: 'handler',
      transcript,
      detectedCommand,
      handler: hidden ? 'hide-loops' : 'unhide-loops',
      source,
      loopsHidden: hidden,
      headerVisible,
      autoScrollEnabled,
      feedAutoPassCompleted,
      loopRailPassCompleted,
      reason: 'loops-ui-updated',
    });
  }, [autoScrollEnabled, feedAutoPassCompleted, headerVisible, loopRailPassCompleted]);

  const toggleLoopsSection = React.useCallback((source: string, transcript?: string, detectedCommand: ZoeHomeDetectedCommand = 'toggle-loops') => {
    setLoopsHidden((prev) => {
      const next = !prev;
      try { localStorage.setItem('mmora.home.loopsHidden', next ? 'true' : 'false'); } catch {}
      try { trackEvent({ name: 'loop_mute_toggle', postId: 'section-visibility', muted: next, persisted: true } as any); } catch {}
      logZoeHomeCommand({
        stage: 'handler',
        transcript,
        detectedCommand,
        handler: 'toggle-loops',
        source,
        loopsHidden: next,
        headerVisible,
        autoScrollEnabled,
        feedAutoPassCompleted,
        loopRailPassCompleted,
        reason: 'loops-ui-updated',
      });
      return next;
    });
  }, [autoScrollEnabled, feedAutoPassCompleted, headerVisible, loopRailPassCompleted]);



  // Loops upload UI state
  const [uploadState, setUploadState] = useState<'idle' | 'validating' | 'uploading' | 'saving' | 'error' | 'success'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [lastUploadFile, setLastUploadFile] = useState<File | null>(null);
  const isAdminUser = !!user && ['moksh50','justmkbhd','john','shivanth_kn'].includes(((userProfile?.username||'') as string).toLowerCase());
  const pushDebug = (e: Omit<import('@/components/AdminFeedDebugger').FeedDebugEntry,'timestamp'>) =>
    setDebugEntries(prev => [{...e, timestamp: new Date().toISOString()}, ...prev].slice(0, 50));

  const logFeedIssue = React.useCallback(async (entry: Omit<import('@/components/AdminFeedDebugger').FeedDebugEntry,'timestamp'>) => {
    pushDebug(entry);
    try {
      await (supabase as any).from('feed_diagnostics_log').insert({
        user_id: user?.id || null,
        status: 'error',
        message: entry.errorMessage || entry.step,
        error_code: entry.errorCode || null,
        route: '/home',
        context: {
          step: entry.step,
          post_id: entry.postId,
          media_url: entry.mediaUrl,
          poster_url: entry.posterUrl,
          media_type: entry.mediaType,
          decode_status: entry.decodeStatus,
          storage_path: getPostsStorageObjectPath(entry.mediaUrl),
        },
      });
    } catch { /* diagnostics must never break the feed */ }
  }, [user?.id]);

  const logFeedDiagnostic = React.useCallback(async (d: FeedDiagnostics, rlsBlocked = false) => {
    try {
      await (supabase as any).from('feed_diagnostics_log').insert({
        user_id: user?.id || null,
        status: d.status,
        message: d.message?.slice(0, 500) || null,
        error_code: d.code || null,
        duration_ms: d.durationMs ?? null,
        row_count: d.rowCount ?? null,
        rls_blocked: rlsBlocked,
        auth_ready: d.authReady ?? null,
        user_agent: navigator.userAgent.slice(0, 200),
        route: '/home',
      });
    } catch { /* swallow */ }
  }, [user?.id]);

  React.useEffect(() => {
    if (!feedDiag) return;
    const isFail = feedDiag.status !== 'ok';
    setConsecutiveFailures(prev => (isFail ? prev + 1 : 0));
    logFeedDiagnostic(feedDiag, feedDiag.status === 'rls');
  }, [feedDiag, logFeedDiagnostic]);

  React.useEffect(() => {
    if (consecutiveFailures === 3) {
      toast({
        title: '⚠ Feed alert',
        description: '3+ consecutive empty/failed loads. Check the diagnostics banner.',
        variant: 'destructive',
      });
    }
  }, [consecutiveFailures]);
  
  // Atlas HUD State - Smith AI Interface (separate from Zoe Infinity, user toggles via menu)
  // NOTE: Atlas Boot and Prime Objective are ONLY for Atlas HUD, NOT Zoe Infinity main flow
  const [atlasHUDActive, setAtlasHUDActive] = useState(false);
  const videoPosts = React.useMemo(() => loopPosts.filter((post) =>
    !!post.media_url && inferMediaType(post.media_url, post.media_type) === 'video'
  ), [loopPosts]);

  const filteredLoops = React.useMemo(() => {
    let filtered = [...videoPosts];
    const publicLoops = filtered.filter(post => post.visibility === 'global');
    
    switch (loopsFilter) {
      case 'trending':
        // Trending = most engagement (likes + comments) in recent time
        return publicLoops.sort((a, b) => {
          const scoreA = (a.likes_count || 0) + (a.comments_count || 0);
          const scoreB = (b.likes_count || 0) + (b.comments_count || 0);
          return scoreB - scoreA;
        });
      case 'liked':
        return publicLoops.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
      case 'friends':
        return filtered.filter(post => 
          friendships.some(f => f.user1_id === post.user_id || f.user2_id === post.user_id)
        );
      case 'recent':
      default:
        return publicLoops.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  }, [videoPosts, loopsFilter, friendships]);

  useEffect(() => {
    const el = loopRailRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setLoopRailInView(entry.isIntersecting && entry.intersectionRatio > 0.25),
      { threshold: [0, 0.25, 0.6, 1], rootMargin: '120px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [filteredLoops.length]);

  // Auto-scroll the loop rail ONCE (single pass) on first load / after filter change.
  // After one full cycle we stop and hand off to the main timeline auto-scroll.
  useEffect(() => {
    const el = loopRailRef.current;
    if (!el || filteredLoops.length <= 1) return;
    if (loopRailPassCompleted || zoeChatOpen) return;
    let hoverPause = false;
    const onEnter = () => { hoverPause = true; };
    const onLeave = () => { hoverPause = false; };
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    const currentPost = filteredLoops[activeLoopRailIndex % filteredLoops.length];
    const realDurationSec = currentPost ? loopDurations[currentPost.id] : undefined;
    const durationMs = realDurationSec && realDurationSec > 0
      ? Math.max(3000, Math.min(60000, realDurationSec * 1000))
      : 5000;
    const timer = window.setTimeout(() => {
      if (hoverPause || !el.isConnected) return;
      const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
      const atEnd = maxLeft === 0 || el.scrollLeft >= maxLeft - 2;
      const nextIndex = activeLoopRailIndex + 1;
      const wrapped = nextIndex >= filteredLoops.length;
      if (maxLeft > 0 && !atEnd) {
        const firstTile = el.querySelector<HTMLElement>('[data-loop-index]');
        const step = (firstTile?.offsetWidth || 96) + 8;
        const nextLeft = Math.min(el.scrollLeft + step, maxLeft);
        el.scrollTo({ left: nextLeft, behavior: 'smooth' });
      }
      if (wrapped || atEnd) {
        // Finished one full pass — stop auto-scrolling the rail so the main
        // timeline can take over. User can still interact / swipe manually.
        if (import.meta.env.DEV) console.info('[HomePage] loop-rail pass completed → handing off to timeline autoscroll', { activeLoopRailIndex, total: filteredLoops.length });
        try { window.dispatchEvent(new CustomEvent('mmora:analytics', { detail: { name: 'loop_rail_pass_completed', total: filteredLoops.length } })); } catch {}
        setLoopRailPassCompleted(true);
      } else {
        setActiveLoopRailIndex(nextIndex);
      }
    }, durationMs);
    return () => {
      window.clearTimeout(timer);
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [filteredLoops, activeLoopRailIndex, loopDurations, loopRailPassCompleted, zoeChatOpen]);

  useEffect(() => {
    const el = loopRailRef.current;
    if (!el || filteredLoops.length <= 1 || el.scrollWidth > el.clientWidth) return;
    const tile = el.querySelector<HTMLElement>(`[data-loop-index="${activeLoopRailIndex % filteredLoops.length}"]`);
    if (tile) {
      const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
      el.scrollTo({ left: Math.min(tile.offsetLeft, maxLeft), behavior: 'smooth' });
    }
  }, [activeLoopRailIndex, filteredLoops.length]);

  useEffect(() => {
    setActiveLoopRailIndex(0);
    setLoopRailPassCompleted(false);
  }, [loopsFilter]);

  useEffect(() => {
    setFeedAutoIndex(0);
  }, [activeTab]);

  const preloadPostMedia = React.useCallback(async (post: Post | undefined) => {
    if (!post) return;
    const version = post.updated_at || post.created_at || post.id;
    const media = appendMediaVersion(post.media_url || post.full_media_url, version);
    const poster = await resolvePrivateStorageUrl(supabase, post.media_preview_url).catch(() => post.media_preview_url || undefined);

    if (poster) {
      const img = new Image();
      img.decoding = 'async';
      img.loading = 'eager';
      img.src = appendMediaVersion(poster, version) || poster;
    }

    if (media && inferMediaType(media, post.media_type) === 'video') {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.src = media;
      video.load();
    }
  }, []);

  // Progressive preload adjacent feed and loop media as their tiles approach the viewport.
  useEffect(() => {
    const feedPosts = activeTab === 'personal' ? personalPosts : globalPosts;
    const observed: Element[] = [];
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const node = entry.target as HTMLElement;
        const loopIndex = node.dataset.loopIndex ? Number(node.dataset.loopIndex) : null;
        const postId = node.dataset.postId;

        if (Number.isFinite(loopIndex)) {
          const index = loopIndex as number;
          preloadPostMedia(filteredLoops[index - 1]);
          preloadPostMedia(filteredLoops[index]);
          preloadPostMedia(filteredLoops[index + 1]);
        } else if (postId) {
          const index = feedPosts.findIndex((post) => post.id === postId);
          preloadPostMedia(feedPosts[index - 1]);
          preloadPostMedia(feedPosts[index]);
          preloadPostMedia(feedPosts[index + 1]);
        }
      });
    }, { rootMargin: '900px 0px', threshold: 0.01 });

    document.querySelectorAll<HTMLElement>(`[data-feed-tab="${activeTab}"] [data-post-card], [data-testid="loops-rail"] [data-loop-index]`).forEach((el) => {
      io.observe(el);
      observed.push(el);
    });
    return () => {
      observed.forEach((el) => io.unobserve(el));
      io.disconnect();
    };
  }, [activeTab, globalPosts, personalPosts, filteredLoops, preloadPostMedia]);

  const activeFeed = activeTab === 'personal' ? 'personal' : 'global';
  const activeNewIds = newContentByFeed[activeFeed];
  const visibleNewIds = (activeFeed === 'personal' ? personalPosts : globalPosts)
    .map((post) => post.id)
    .filter((id) => activeNewIds.has(id));

  useEffect(() => {
    pendingSeenIdsRef.current = visibleNewIds;
    setHasNewPosts(visibleNewIds.length > 0);
  }, [activeTab, activeNewIds, globalPosts, personalPosts]);

  const dismissNewContent = React.useCallback((feed: keyof NewContentByFeed, id: string) => {
    markPostsSeen(feed, [id]);
    setNewContentByFeed((current) => {
      if (!current[feed].has(id)) return current;
      const nextFeed = new Set(current[feed]);
      nextFeed.delete(id);
      return { ...current, [feed]: nextFeed };
    });
  }, []);

  const scrollToNewPosts = React.useCallback(() => {
    const first = document.querySelector<HTMLElement>(`[data-feed-tab="${activeTab}"] [data-post-card][data-new="true"]`);
    first?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeTab]);

  // Auto-advance the active feed after the current clip's real duration finishes.
  // Event-driven per video (handles buffering/stalls); non-video posts fall back to 5s.
  useEffect(() => {
    const blocked = loading || zoeChatOpen || (loopRailInView && !loopRailPassCompleted) || !autoScrollEnabled || feedAutoPassCompleted || !hasNewPosts || (activeTab !== 'global' && activeTab !== 'personal');
    if (import.meta.env.DEV) console.info('[HomePage] timeline-autoscroll guards', { blocked, loading, zoeChatOpen, loopRailInView, loopRailPassCompleted, feedAutoPassCompleted, hasNewPosts, autoScrollEnabled, activeTab });
    if (blocked) return;

    const posts = Array.from(document.querySelectorAll<HTMLElement>(`[data-feed-tab="${activeTab}"] [data-post-card][data-new="true"]`));
    if (posts.length === 0) return;

    const targetIndex = feedAutoIndex % posts.length;
    const target = posts[targetIndex];
    if (!target) return;
    const video = target.querySelector('video') as HTMLVideoElement | null;

    const advance = () => {
      const nextIdx = targetIndex + 1;
      if (nextIdx >= posts.length) {
        // One full pass done → mark everything as seen, scroll back, and stop
        // until genuinely new posts arrive.
        markPostsSeen(activeTab, pendingSeenIdsRef.current);
        setNewContentByFeed((current) => {
          const nextFeed = new Set(current[activeFeed]);
          pendingSeenIdsRef.current.forEach((id) => nextFeed.delete(id));
          return { ...current, [activeFeed]: nextFeed };
        });
        setFeedAutoIndex(0);
        setFeedAutoPassCompleted(true);
        setHasNewPosts(false);
        if (import.meta.env.DEV) console.info('[HomePage] timeline one-pass complete → posts marked seen, auto-scroll stopped');
        try { window.dispatchEvent(new CustomEvent('mmora:analytics', { detail: { name: 'feed_autoscroll_pass_completed' } })); } catch {}
        return;
      }

      posts[nextIdx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setFeedAutoIndex(nextIdx);
    };

    const safetyMs = (() => {
      const d = video && Number.isFinite(video.duration) && video.duration > 0 ? video.duration * 1000 : 5000;
      return Math.max(5000, Math.min(180000, d + 4000));
    })();
    if (feedAutoTimerRef.current) window.clearTimeout(feedAutoTimerRef.current);
    feedAutoTimerRef.current = window.setTimeout(advance, safetyMs);

    if (!video) {
      return () => {
        if (feedAutoTimerRef.current) window.clearTimeout(feedAutoTimerRef.current);
        feedAutoTimerRef.current = null;
      };
    }

    const onEnded = () => advance();
    const onTimeUpdate = () => {
      if (!video.duration || !Number.isFinite(video.duration)) return;
      if (video.duration - video.currentTime < 0.25 && !video.loop) advance();
    };
    const onLoadedMetadata = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      if (feedAutoTimerRef.current) window.clearTimeout(feedAutoTimerRef.current);
      feedAutoTimerRef.current = window.setTimeout(advance, Math.max(5000, Math.min(180000, video.duration * 1000 + 4000)));
    };
    video.addEventListener('ended', onEnded);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      if (feedAutoTimerRef.current) window.clearTimeout(feedAutoTimerRef.current);
      feedAutoTimerRef.current = null;
    };
  }, [activeTab, activeFeed, loading, loopRailInView, loopRailPassCompleted, feedAutoPassCompleted, hasNewPosts, globalPosts.length, personalPosts.length, feedAutoIndex, autoScrollEnabled, zoeChatOpen]);


  // Voice / programmatic command bus for the Home surface.
  // Fire `window.dispatchEvent(new CustomEvent('mmora:home-command', { detail: { command: '...' } }))`
  // or call `window.mmoraHomeCommand('hide loops')` from Zoe's voice pipeline.
  useEffect(() => {
    const applyCommand = (raw: string, source = 'home-command-bus', eventName = 'direct') => {
      const detection = detectZoeHomeCommand(raw);
      logZoeHomeCommand({
        stage: 'parse',
        transcript: detection.raw,
        normalized: detection.normalized,
        detectedCommand: detection.command,
        source,
        eventName,
        reason: detection.reason,
        loopsHidden,
        headerVisible,
        autoScrollEnabled,
        feedAutoPassCompleted,
        loopRailPassCompleted,
      });
      if (!detection.normalized) return false;
      if (detection.command === 'unknown') {
        logZoeHomeCommand({
          stage: 'route',
          transcript: detection.raw,
          normalized: detection.normalized,
          detectedCommand: 'unknown',
          source,
          eventName,
          reason: detection.homeSurface ? 'home-command-not-mapped' : 'ignored-not-home-command',
          loopsHidden,
          headerVisible,
          autoScrollEnabled,
          feedAutoPassCompleted,
          loopRailPassCompleted,
        });
        return false;
      }

      logZoeHomeCommand({
        stage: 'route',
        transcript: detection.raw,
        normalized: detection.normalized,
        detectedCommand: detection.command,
        handler: detection.command,
        source,
        eventName,
        reason: 'routing-to-home-handler',
        loopsHidden,
        headerVisible,
        autoScrollEnabled,
        feedAutoPassCompleted,
        loopRailPassCompleted,
      });

      if (detection.command === 'unhide-loops') {
        setLoopsSectionHidden(false, source, detection.raw, detection.command);
        return true;
      }
      if (detection.command === 'hide-loops') {
        setLoopsSectionHidden(true, source, detection.raw, detection.command);
        return true;
      }
      if (detection.command === 'toggle-loops') {
        toggleLoopsSection(source, detection.raw, detection.command);
        return true;
      }
      if (detection.command === 'stop-scrolling') {
        setAutoScrollEnabled(false);
        try { localStorage.setItem('mmora.home.autoScroll', 'false'); } catch {}
        try { trackEvent({ name: 'home_autoscroll_scope', scope: 'fallback', count: 0 } as any); } catch {}
        logZoeHomeCommand({
          stage: 'handler',
          transcript: detection.raw,
          normalized: detection.normalized,
          detectedCommand: detection.command,
          handler: 'stop-scrolling',
          source,
          eventName,
          reason: 'timeline-paused',
          loopsHidden,
          headerVisible,
          autoScrollEnabled: false,
          feedAutoPassCompleted,
          loopRailPassCompleted,
        });
        return true;
      }
      if (detection.command === 'start-scrolling') {
        setAutoScrollEnabled(true);
        setFeedAutoPassCompleted(false);
        try { localStorage.setItem('mmora.home.autoScroll', 'true'); } catch {}
        logZoeHomeCommand({
          stage: 'handler',
          transcript: detection.raw,
          normalized: detection.normalized,
          detectedCommand: detection.command,
          handler: 'start-scrolling',
          source,
          eventName,
          reason: 'timeline-resumed',
          loopsHidden,
          headerVisible,
          autoScrollEnabled: true,
          feedAutoPassCompleted: false,
          loopRailPassCompleted,
        });
        return true;
      }
      return false;
    };

    const onCommand = (e: Event) => {
      const detail = (e as CustomEvent).detail as any;
      const text = extractZoeHomeEventText(detail);
      applyCommand(text, String(detail?.source || 'mmora:home-command'), 'mmora:home-command');
    };
    const onTranscript = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const text = extractZoeHomeEventText(detail);
      if (!text) return;
      const eventName = e.type;
      const source = typeof detail === 'object' && detail ? String((detail as any).source || eventName) : eventName;
      const detection = detectZoeHomeCommand(text);
      if (!detection.transcript.includes('zoe') && !detection.homeSurface) return;
      applyCommand(text, source, eventName);
    };

    window.addEventListener('mmora:home-command', onCommand as EventListener);
    ZOE_HOME_TRANSCRIPT_EVENTS.forEach((n) => window.addEventListener(n, onTranscript as EventListener));
    (window as any).mmoraHomeCommand = (command: string) => applyCommand(command, 'window.mmoraHomeCommand', 'global-function');

    return () => {
      window.removeEventListener('mmora:home-command', onCommand as EventListener);
      ZOE_HOME_TRANSCRIPT_EVENTS.forEach((n) => window.removeEventListener(n, onTranscript as EventListener));
      if ((window as any).mmoraHomeCommand) delete (window as any).mmoraHomeCommand;
    };
  }, [autoScrollEnabled, feedAutoPassCompleted, headerVisible, loopRailPassCompleted, loopsHidden, setLoopsSectionHidden, toggleLoopsSection]);


  
  const hasEvent = useEventGlow(userProfile?.event_date, userProfile?.event_recurring);
  const glowClass = getAvatarGlowClass(hasEvent, userProfile?.status);
  
  // Initialize smart notifications
  const { contextAwareNotifications } = useSmartNotifications();
  
  // Enable real-time badge notifications
  useRealtimeBadgeNotifications();
  
  // Enable user online notifications
  useUserOnlineNotifications();
  
  // Enable desktop push notifications for high-priority alerts
  useDesktopNotifications(user?.id);

  // On-screen toast when other users publish new posts / loops.
  useNewPostNotifications(user?.id);
  useZoeProactiveNotifications();
  
  // Initialize tutorial
  const { showTutorial, completeTutorial, skipTutorial } = useTutorial();
  
  // Initialize daily briefing
  useDailyBriefing();

  // Listen for feed-switch events from HUD
  useEffect(() => {
    const handleFeedSwitch = (e: CustomEvent<string>) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('feed-switch', handleFeedSwitch as EventListener);
    return () => window.removeEventListener('feed-switch', handleFeedSwitch as EventListener);
  }, []);
  
  // Initialize audio on user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      initializeAudio();
      // Remove listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
    
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);


  // Handle URL tab parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'personal') {
      setActiveTab(tab);
    }
  }, []);

  // Load assistant visibility settings
  useEffect(() => {
    const loadAssistantSettings = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('voice_assistant_settings')
        .select('zoe_visible')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setZoeVisible(data.zoe_visible);
      } else {
        // Initialize default settings if none exist
        await supabase
          .from('voice_assistant_settings')
          .upsert({
            user_id: user.id,
            zoe_visible: true,
            
          }, { onConflict: 'user_id' });
      }
    };
    
    loadAssistantSettings();
  }, [user]);

  // Fetch friendships for filtering
  useEffect(() => {
    const fetchFriendships = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('friendships')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      
      if (data) {
        setFriendships(data);
      }
    };
    
    fetchFriendships();
  }, [user]);

  const fetchGlobalPosts = async (updateSource: FeedUpdateSource = 'manual') => {
    const t0 = performance.now();
    if (!user) {
      setGlobalPosts([]);
      setFeedDiag({ status: 'auth', message: 'No authenticated user', authReady: false, timestamp: new Date().toISOString() });
      pushDebug({ step: 'fetchGlobalPosts:auth-missing' });
      return;
    }
    
    try {
      // SIMPLIFIED: Fetch posts first without complex joins to avoid JSON parse errors
      const postsResult = await (supabase as any)
        .from('feed_posts_safe')
        .select('id, user_id, content, media_url, media_type, likes_count, comments_count, created_at, updated_at, visibility, has_deferred_media, media_size, media_preview_url')
        .in('visibility', ['global', 'personal'])
        .is('private_timeline_id', null)
        .order('created_at', { ascending: false })
        .limit(50);

      const dur = Math.round(performance.now() - t0);

      if (postsResult.error) {
        const code = postsResult.error.code;
        const isRls = code === '42501' || /row-level security/i.test(postsResult.error.message || '');
        console.error('Error fetching global posts:', postsResult.error);
        setGlobalPosts([]);
        setFeedDiag({
          status: isRls ? 'rls' : 'error',
          message: postsResult.error.message,
          code,
          durationMs: dur,
          authReady: true,
          timestamp: new Date().toISOString(),
        });
        pushDebug({
          step: 'feed_posts_safe:select',
          query: "from('feed_posts_safe').select(...).eq('visibility','global').limit(50)",
          durationMs: dur,
          errorCode: code,
          errorMessage: postsResult.error.message,
          rlsBlocked: isRls,
        });
        return;
      }

      const feedRows = ((postsResult.data || []) as any[]);
      pushDebug({
        step: 'feed_posts_safe:select',
        query: "from('feed_posts_safe').select(...).eq('visibility','global').limit(50)",
        durationMs: dur,
        rowCount: feedRows.length,
      });

      if (feedRows.length === 0) {
        setGlobalPosts([]);
        setFeedDiag({ status: 'empty', message: 'No global posts available', durationMs: dur, rowCount: 0, authReady: true, timestamp: new Date().toISOString() });
        return;
      }

      // Fetch profiles and preferences separately to avoid JSON parse issues
      const userIds = [...new Set(feedRows.map(p => p.user_id))];
      
      const [profilesResult, notInterestedResult, userLikesResult] = await Promise.all([
        supabase
          .from('safe_public_profiles')
          .select('user_id, display_name, username, profile_photo_url, status, hobbies')
          .in('user_id', userIds),
        supabase
          .from('post_preferences')
          .select('post_id')
          .eq('user_id', user.id)
          .eq('preference', 'not_interested'),
        supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
      ]);

      // Create profile lookup map
      const profileMap = new Map<string, any>();
      if (profilesResult.data) {
        profilesResult.data.forEach((p: any) => profileMap.set(p.user_id, p));
      }

      // Create lookup sets for O(1) access
      const notInterestedIds = new Set(notInterestedResult.data?.map(p => p.post_id) || []);
      const likedPostIds = new Set(userLikesResult.data?.map(p => p.post_id) || []);

      // Map posts with profiles and likes
      const postsWithLikes = feedRows
        .filter((post: any) => !notInterestedIds.has(post.id))
        .map((post: any) => prepareFeedPostMedia({
          ...post,
          profile: profileMap.get(post.user_id) || null,
          user_liked: likedPostIds.has(post.id)
        }));

      const ids = postsWithLikes.map((post: Post) => post.id);
      const arrivals = detectNewArrivals(knownFeedIdsRef.current.global, ids, updateSource);
      knownFeedIdsRef.current.global = arrivals.knownIds;
      const globalUnseen = updateSource === 'realtime'
        ? registerUnseenPosts('global', arrivals.newIds)
        : reconcileUnseenPosts('global', ids);
      setNewContentByFeed((current) => ({ ...current, global: globalUnseen }));
      if (arrivals.shouldAutoScroll) {
        setFeedAutoPassCompleted(false);
        setFeedAutoIndex(0);
      }
      setGlobalPosts(postsWithLikes as any);
      setFeedDiag({
        status: postsWithLikes.length ? 'ok' : 'empty',
        durationMs: Math.round(performance.now() - t0),
        rowCount: postsWithLikes.length,
        authReady: true,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error in fetchGlobalPosts:', err);
      setGlobalPosts([]);
      setFeedDiag({ status: 'error', message: err?.message || String(err), authReady: true, timestamp: new Date().toISOString() });
      pushDebug({ step: 'fetchGlobalPosts:exception', errorMessage: err?.message || String(err) });
    }
  };

  const fetchLoopPosts = async (updateSource: FeedUpdateSource = 'manual') => {
    if (!user) {
      setLoopPosts([]);
      return;
    }

    try {
      // Loops must use the real posts table, not feed_posts_safe: that view strips
      // large data URLs, which makes valid uploaded videos disappear from Loops.
      const postsResult = await (supabase as any)
        .from('posts')
        .select('id, user_id, content, media_url, media_type, likes_count, comments_count, created_at, updated_at, visibility, private_timeline_id, media_preview_url')
        .in('visibility', ['global', 'personal'])
        .is('private_timeline_id', null)
        .not('media_url', 'is', null)
        .or('media_type.eq.video,media_url.like.data:video/%,media_url.ilike.%.mp4%,media_url.ilike.%.webm%,media_url.ilike.%.mov%,media_url.ilike.%.ogg%,media_url.ilike.%.m4v%')
        .order('created_at', { ascending: false })
        .limit(30);

      if (postsResult.error) {
        console.error('[Loops] Error fetching video posts:', postsResult.error);
        setLoopPosts([]);
        pushDebug({ step: 'loops:posts-select', errorCode: postsResult.error.code, errorMessage: postsResult.error.message });
        return;
      }

      const loopRows = ((postsResult.data || []) as any[])
        .filter((post) => {
          const mediaUrl = typeof post.media_url === 'string' ? post.media_url : null;
          if (!mediaUrl) return false;
          return inferMediaType(mediaUrl, post.media_type) === 'video';
        });

      if (loopRows.length === 0) {
        setLoopPosts([]);
        pushDebug({ step: 'loops:posts-select', rowCount: 0 });
        return;
      }

      const userIds = [...new Set(loopRows.map(p => p.user_id))];
      const [profilesResult, userLikesResult] = await Promise.all([
        supabase
          .from('safe_public_profiles')
          .select('user_id, display_name, username, profile_photo_url, status, hobbies')
          .in('user_id', userIds),
        supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
      ]);

      const profileMap = new Map<string, any>();
      if (profilesResult.data) {
        profilesResult.data.forEach((p: any) => profileMap.set(p.user_id, p));
      }
      const likedPostIds = new Set(userLikesResult.data?.map(p => p.post_id) || []);

      const preparedLoops = loopRows.map((post: any) => ({
        ...post,
        media_type: 'video',
        profile: profileMap.get(post.user_id) || null,
        user_liked: likedPostIds.has(post.id),
        has_deferred_media: false,
      })) as Post[];
      const loopIds = preparedLoops.map((post) => post.id);
      const loopArrivals = detectNewArrivals(knownFeedIdsRef.current.loops, loopIds, updateSource);
      knownFeedIdsRef.current.loops = loopArrivals.knownIds;
      const loopUnseen = updateSource === 'realtime'
        ? registerUnseenPosts('loops', loopArrivals.newIds)
        : reconcileUnseenPosts('loops', loopIds);
      setNewContentByFeed((current) => ({ ...current, loops: loopUnseen }));
      setLoopPosts(preparedLoops);
      setBrokenLoopPreviewIds(prev => {
        const next = new Set(prev);
        loopRows.forEach((post: any) => next.delete(post.id));
        return next;
      });
      pushDebug({ step: 'loops:posts-select', rowCount: loopRows.length });
    } catch (err: any) {
      console.error('[Loops] Error in fetchLoopPosts:', err);
      setLoopPosts([]);
      pushDebug({ step: 'loops:exception', errorMessage: err?.message || String(err) });
    }
  };

  const fetchPersonalPosts = async (updateSource: FeedUpdateSource = 'manual') => {
    if (!user) return;

    try {
      // Use existing friendships state instead of re-fetching
      const friendIds = friendships.map(f =>
        f.user1_id === user.id ? f.user2_id : f.user1_id
      );

      // If no friendships loaded yet, return empty (will re-fetch when friendships load)
      if (friendIds.length === 0 && friendships.length === 0) {
        setPersonalPosts([]);
        return;
      }

      // SIMPLIFIED: Fetch posts first without complex joins to avoid JSON parse errors
      const postsResult = await (supabase as any)
        .from('feed_posts_safe')
        .select('id, user_id, content, media_url, media_type, likes_count, comments_count, created_at, updated_at, visibility, has_deferred_media, media_size, media_preview_url')
        .eq('visibility', 'personal')
        .is('private_timeline_id', null)
        .in('user_id', [...friendIds, user.id])
        .order('created_at', { ascending: false })
        .limit(50);

      if (postsResult.error) {
        console.error('Error fetching personal posts:', postsResult.error);
        setPersonalPosts([]);
        return;
      }

      const feedRows = ((postsResult.data || []) as any[]);

      if (feedRows.length === 0) {
        setPersonalPosts([]);
        return;
      }

      // Fetch profiles and preferences separately
      const userIds = [...new Set(feedRows.map(p => p.user_id))];
      
      const [profilesResult, notInterestedResult, userLikesResult] = await Promise.all([
        supabase
          .from('safe_public_profiles')
          .select('user_id, display_name, username, profile_photo_url, status, hobbies')
          .in('user_id', userIds),
        supabase
          .from('post_preferences')
          .select('post_id')
          .eq('user_id', user.id)
          .eq('preference', 'not_interested'),
        supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
      ]);

      // Create profile lookup map
      const profileMap = new Map<string, any>();
      if (profilesResult.data) {
        profilesResult.data.forEach((p: any) => profileMap.set(p.user_id, p));
      }

      // Create lookup sets for O(1) access
      const notInterestedIds = new Set(notInterestedResult.data?.map(p => p.post_id) || []);
      const likedPostIds = new Set(userLikesResult.data?.map(p => p.post_id) || []);

      // Map posts with profiles and likes
      const postsWithLikes = feedRows
        .filter((post: any) => !notInterestedIds.has(post.id))
        .map((post: any) => prepareFeedPostMedia({
          ...post,
          profile: profileMap.get(post.user_id) || null,
          user_liked: likedPostIds.has(post.id)
        }));

      const ids = postsWithLikes.map((post: Post) => post.id);
      const arrivals = detectNewArrivals(knownFeedIdsRef.current.personal, ids, updateSource);
      knownFeedIdsRef.current.personal = arrivals.knownIds;
      const personalUnseen = updateSource === 'realtime'
        ? registerUnseenPosts('personal', arrivals.newIds)
        : reconcileUnseenPosts('personal', ids);
      setNewContentByFeed((current) => ({ ...current, personal: personalUnseen }));
      if (arrivals.shouldAutoScroll) {
        setFeedAutoPassCompleted(false);
        setFeedAutoIndex(0);
      }
      setPersonalPosts(postsWithLikes as any);
    } catch (err) {
      console.error('Error in fetchPersonalPosts:', err);
      setPersonalPosts([]);
    }
  };



  const fetchUserProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
        .select('display_name, username, profile_photo_url, event_date, event_recurring, status, bio, hobbies')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setUserProfile(data);
      // Auto-open profile sheet for new users without bio or hobbies
      if (!data.bio && (!data.hobbies || data.hobbies.length === 0)) {
        setIsProfileSheetOpen(true);
      }
    }
  };

  const fetchUnreadCount = async () => {
    if (!user) return;
    
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      
      if (error) {
        console.error('Error fetching unread count:', error);
        return;
      }
      
      setUnreadNotifications(count || 0);
    } catch (error) {
      console.error('Error in fetchUnreadCount:', error);
    }
  };

  const fetchUnreadMessages = async () => {
    if (!user) return;
    
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('read', false);
      
      if (!error) {
        setUnreadMessages(count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread messages:', error);
    }
  };

  const fetchNewMatches = async () => {
    if (!user) return;
    
    try {
      const { count, error } = await supabase
        .from('friend_requests')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'pending');
      
      if (!error) {
        setNewMatches(count || 0);
      }
    } catch (error) {
      console.error('Error fetching new matches:', error);
    }
  };

  const isEventToday = (eventDate: string | null, isRecurring: boolean = true): boolean => {
    if (!eventDate) return false;
    
    const today = new Date();
    const event = new Date(eventDate);
    
    if (isRecurring) {
      // For recurring events, check if month and day match (ignore year)
      return today.getMonth() === event.getMonth() && today.getDate() === event.getDate();
    } else {
      // For one-time events, check exact date match
      const todayStr = today.toISOString().split('T')[0];
      return eventDate === todayStr;
    }
  };

  useEffect(() => {
    const settleWithin = (p: Promise<unknown>, ms: number) =>
      Promise.race([
        p.catch((e) => {
          console.warn('[Home] load task failed:', e);
        }),
        new Promise<void>((resolve) => window.setTimeout(resolve, ms)),
      ]);

    const loadPosts = async () => {
      setLoading(true);
      try {
        // Critical path: wait for the actual fetch (with a generous safety cap)
        // so the empty state never flashes before posts arrive on slow networks.
        await settleWithin(Promise.all([fetchGlobalPosts('initial'), fetchLoopPosts('initial')]), 12000);
      } finally {
        setLoading(false);
      }
      
      // Defer ALL non-critical fetches significantly for low-end devices
      // Use requestIdleCallback if available, else setTimeout
      const deferredLoad = () => {
        fetchUnreadCount();
        fetchUserProfile();
      };
      
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(deferredLoad, { timeout: 1500 });
      } else {
        setTimeout(deferredLoad, 500);
      }
      
      // Further defer personal posts and badge counts
      setTimeout(() => {
        fetchPersonalPosts('initial');
        fetchUnreadMessages();
        fetchNewMatches();
      }, 2000);
    };

    loadPosts();

    // Listen for manual refresh events
    const unsubscribe = onHomeRefresh(() => {
      setLoading(true);
      Promise.all([fetchGlobalPosts('manual'), fetchLoopPosts('manual'), fetchPersonalPosts('manual')])
        .finally(() => setLoading(false));
    });

    // Set up real-time subscription for notification updates (deferred)
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (user) {
      const setupRealtime = () => {
        channel = supabase
          .channel(`home-realtime:${user.id}:${Math.random().toString(36).slice(2, 8)}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`
            },
            () => {
              fetchUnreadCount();
            }
          )
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
            fetchGlobalPosts('realtime');
            fetchPersonalPosts('realtime');
            fetchLoopPosts('realtime');
          })
          .subscribe();
      };
      
      // Defer realtime setup
      const timer = setTimeout(setupRealtime, 3000);
      
      return () => {
        unsubscribe();
        clearTimeout(timer);
        if (channel) supabase.removeChannel(channel);
      };
    }

    return unsubscribe;
  }, [user, friendships]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  const handleUpdate = () => {
    fetchGlobalPosts('manual');
    fetchPersonalPosts('manual');
    fetchLoopPosts('manual');
  };

  const openLoopsPlayer = (index: number) => {
    setLoopsInitialIndex(index);
    setLoopsPlayerOpen(true);
  };

  const handleLoopsUpload = React.useCallback(async (file: File) => {
    if (!user) return;

    // 1. MIME whitelist
    setUploadState('validating');
    setUploadError('');
    setUploadFileName(file.name);
    setUploadProgress(0);
    setLastUploadFile(file);

    const isVideo = ALLOWED_VIDEO_MIME.includes(file.type);
    const isImage = ALLOWED_IMAGE_MIME.includes(file.type);
    if (!isVideo && !isImage) {
      const msg = `Unsupported file type "${file.type || 'unknown'}". Allowed: MP4, WebM, MOV, OGG, JPG, PNG, WebP, GIF.`;
      setUploadState('error');
      setUploadError(msg);
      toast({ title: 'Unsupported file', description: msg, variant: 'destructive' });
      return;
    }
    const MAX_FILE_BYTES = 50 * 1024 * 1024;
    if (file.size > MAX_FILE_BYTES) {
      const msg = 'File too large. Please pick a file under 50MB.';
      setUploadState('error');
      setUploadError(msg);
      toast({ title: 'File too large', description: msg, variant: 'destructive' });
      return;
    }

    const mediaType: 'video' | 'image' = isVideo ? 'video' : 'image';
    const INLINE_LIMIT = 2 * 1024 * 1024;

    try {
      await validateBrowserCanPreviewFile(file, mediaType);
      // Auto-transcode large videos into small preview variants for smoother Reel/Shorts playback.
      let uploadFile: File = file;
      if (mediaType === 'video') {
        try {
          setUploadState('validating');
          const smaller = await transcodeVideoForPreview(file);
          if (smaller && smaller !== file && smaller.size < file.size) {
            uploadFile = smaller;
            toast({ title: 'Optimized for fast playback', description: `Reduced from ${(file.size/1e6).toFixed(1)}MB to ${(smaller.size/1e6).toFixed(1)}MB` });
          }
        } catch (transErr) {
          console.warn('[Loops upload] transcode skipped', transErr);
        }
      }
      let mediaPreviewUrl = mediaType === 'video' ? await captureVideoPreview(uploadFile) : null;
      setUploadState('uploading');
      let mediaUrl: string;

      if (mediaType === 'image' && file.size < INLINE_LIMIT) {
        mediaUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onprogress = (ev) => {
            if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
          };
          reader.onloadend = () => { setUploadProgress(100); resolve(reader.result as string); };
          reader.onerror = () => reject(new Error('Could not read file'));
          reader.readAsDataURL(file);
        });
      } else {
        // Auth token for XHR upload with real progress
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const ext = (uploadFile.name.split('.').pop() || (mediaType === 'video' ? 'webm' : 'jpg')).toLowerCase();
        const path = `${user.id}/loops/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        // 2. Retry with exponential backoff (3 attempts)
        await withRetry(async (attempt) => {
          setUploadProgress(0);
          if (attempt > 1) {
            toast({ title: `Retrying upload (attempt ${attempt}/3)…` });
          }
          if (token) {
            await xhrUploadToPosts(uploadFile, path, token, setUploadProgress);
          } else {
            const { error } = await supabase.storage.from('posts').upload(path, uploadFile, {
              contentType: uploadFile.type, upsert: false,
            });
            if (error) throw error;
            setUploadProgress(100);
          }
        }, 3, 900);

        const { data: pub } = supabase.storage.from('posts').getPublicUrl(path);
        mediaUrl = pub.publicUrl;

        if (mediaType === 'video' && mediaPreviewUrl) {
          try {
            const posterPath = `${user.id}/loops/posters/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
            const posterFile = dataUrlToFile(mediaPreviewUrl, 'loop-poster.jpg');
            const { error: posterError } = await supabase.storage.from('posts').upload(posterPath, posterFile, {
              contentType: 'image/jpeg',
              upsert: false,
            });
            if (!posterError) {
              const { data: posterPub } = supabase.storage.from('posts').getPublicUrl(posterPath);
              mediaPreviewUrl = posterPub.publicUrl;
            }
          } catch (posterErr) {
            console.warn('[Loops upload] poster storage upload failed; using inline poster', posterErr);
          }
        }
      }

      setUploadState('saving');
      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: '',
        media_url: mediaUrl,
        media_preview_url: mediaPreviewUrl || (mediaType === 'image' ? mediaUrl : null),
        media_type: mediaType,
        visibility: 'global',
      });
      if (error) throw error;

      setUploadState('success');
      toast({ title: 'Posted!', description: 'Your loop is now live' });
      triggerHomeRefresh();
      // Auto-clear success state after a moment
      setTimeout(() => {
        setUploadState('idle');
        setUploadProgress(0);
        setUploadFileName('');
        setLastUploadFile(null);
      }, 1500);
    } catch (err: any) {
      console.error('[Loops upload]', err);
      const msg = err?.message || 'Upload failed. Please try again.';
      setUploadState('error');
      setUploadError(msg);
      toast({ title: 'Upload failed', description: msg, variant: 'destructive' });
    }
  }, [user]);

  const retryLastUpload = React.useCallback(() => {
    if (lastUploadFile) handleLoopsUpload(lastUploadFile);
  }, [lastUploadFile, handleLoopsUpload]);

  const handleLoopDecodeStatus = React.useCallback((postId: string, status: string) => {
    setLoopDecodeStatus(prev => (prev[postId] === status ? prev : { ...prev, [postId]: status }));
    if (status === 'decode-failed' || status === 'timeout' || status === 'missing-source') {
      const post = loopPosts.find(p => p.id === postId);
      logFeedIssue({
        step: 'loops:decode-status',
        postId,
        mediaUrl: post?.media_url || null,
        posterUrl: post?.media_preview_url || null,
        mediaType: post?.media_type || null,
        decodeStatus: status,
        errorMessage: `Loop video ${status}`,
      });
    }
  }, [loopPosts, logFeedIssue]);

  const regenerateLoopPoster = React.useCallback(async (postId: string) => {
    if (!user) return;
    const post = loopPosts.find(p => p.id === postId);
    if (!post?.media_url) {
      toast({ title: 'Poster unavailable', description: 'This loop has no video URL to read.', variant: 'destructive' });
      return;
    }

    try {
      toast({ title: 'Regenerating poster…' });
      const versionedMediaUrl = appendMediaVersion(post.media_url, post.updated_at || post.created_at || Date.now());
      const posterDataUrl = await captureVideoPreviewFromUrl(versionedMediaUrl || post.media_url) || makeFallbackVideoPoster();
      if (!posterDataUrl) throw new Error('Could not create a poster image.');

      let posterUrl = posterDataUrl;
      const posterFile = dataUrlToFile(posterDataUrl, `${postId}.jpg`);
      const posterPath = `${user.id}/loops/posters/${postId}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('posts').upload(posterPath, posterFile, {
        contentType: 'image/jpeg',
        upsert: false,
      });
      if (!uploadError) {
        const { data: pub } = supabase.storage.from('posts').getPublicUrl(posterPath);
        posterUrl = pub.publicUrl;
      } else {
        console.warn('[Loops] poster storage upload failed; using inline fallback', uploadError);
      }

      const { error: updateError } = await supabase
        .from('posts')
        .update({ media_preview_url: posterUrl, media_type: 'video' })
        .eq('id', postId)
        .eq('user_id', user.id);
      if (updateError) throw updateError;

      setLoopPosts(prev => prev.map(p => p.id === postId ? { ...p, media_preview_url: posterUrl, media_type: 'video', updated_at: new Date().toISOString() } : p));
      setBrokenLoopPreviewIds(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
      setLoopDecodeStatus(prev => ({ ...prev, [postId]: 'poster-regenerated' }));
      toast({ title: 'Poster regenerated', description: 'The loop preview has been refreshed.' });
    } catch (err: any) {
      const msg = err?.message || 'Could not regenerate this poster.';
      logFeedIssue({
        step: 'loops:poster-regenerate',
        postId,
        mediaUrl: post.media_url,
        posterUrl: post.media_preview_url || null,
        mediaType: post.media_type,
        errorMessage: msg,
      });
      toast({ title: 'Poster failed', description: msg, variant: 'destructive' });
    }
  }, [loopPosts, logFeedIssue, user]);

  const retrySinglePost = React.useCallback(async (postId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('feed_posts_safe')
        .select('id, user_id, content, media_url, media_type, likes_count, comments_count, created_at, updated_at, visibility, has_deferred_media, media_size, media_preview_url')
        .eq('id', postId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return;

      const [profileResult, likedResult] = await Promise.all([
        supabase.from('safe_public_profiles').select('user_id, display_name, username, profile_photo_url, status, hobbies').eq('user_id', data.user_id).maybeSingle(),
        user ? supabase.from('post_likes').select('post_id').eq('user_id', user.id).eq('post_id', postId).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      const refreshed = prepareFeedPostMedia({
        ...data,
        profile: profileResult.data || null,
        user_liked: !!likedResult.data,
      });
      setGlobalPosts(prev => prev.map(p => p.id === postId ? refreshed : p));
      setPersonalPosts(prev => prev.map(p => p.id === postId ? refreshed : p));
    } catch (err: any) {
      logFeedIssue({ step: 'posts:single-retry', postId, errorMessage: err?.message || String(err) });
    }
  }, [logFeedIssue, user]);

  const retrySingleLoop = React.useCallback(async (postId: string) => {
    if (!user) return;
    try {
      const { data, error } = await (supabase as any)
        .from('posts')
        .select('id, user_id, content, media_url, media_type, likes_count, comments_count, created_at, updated_at, visibility, private_timeline_id, media_preview_url')
        .eq('id', postId)
        .maybeSingle();
      if (error) throw error;
      if (!data || inferMediaType(data.media_url, data.media_type) !== 'video') return;

      const [profileResult, likedResult] = await Promise.all([
        supabase.from('safe_public_profiles').select('user_id, display_name, username, profile_photo_url, status, hobbies').eq('user_id', data.user_id).maybeSingle(),
        supabase.from('post_likes').select('post_id').eq('user_id', user.id).eq('post_id', postId).maybeSingle(),
      ]);
      const refreshed = {
        ...data,
        media_type: 'video',
        profile: profileResult.data || null,
        user_liked: !!likedResult.data,
        has_deferred_media: false,
      } as Post;
      setLoopPosts(prev => prev.some(p => p.id === postId) ? prev.map(p => p.id === postId ? refreshed : p) : [refreshed, ...prev]);
      setBrokenLoopPreviewIds(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
      setLoopDecodeStatus(prev => ({ ...prev, [postId]: 'retried' }));
    } catch (err: any) {
      logFeedIssue({ step: 'loops:single-retry', postId, errorMessage: err?.message || String(err) });
    }
  }, [logFeedIssue, user]);



  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <PageSeo
        title="MMora — Immersive AI Social Platform"
        description="Share loops, selfies and timelines with friends on MMora, the immersive AI social platform powered by Zoe."
      />

      {/* Atlas HUD Overlay - Smith AI Interface (SEPARATE from Zoe Infinity) */}
      {/* Atlas Boot and Prime Objective are handled INSIDE AtlasHUD, not in main Zoe flow */}
      {atlasHUDActive && (
        <AtlasHUD 
          isActive={atlasHUDActive} 
          onClose={() => setAtlasHUDActive(false)}
          showIntro={true}
        />
      )}
      
       {/* Atlas HUD Toggle Button moved into HamburgerMenu */}
      
      <div className="min-h-screen bg-background">
        {/* Tutorial Overlay - Temporarily hidden */}
        {/* {showTutorial && (
          <TutorialOverlay
            onComplete={completeTutorial}
            onSkip={skipTutorial}
          />
        )} */}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="max-w-2xl mx-auto">
          {/* Fixed header - Clean minimal version (profile now in HUD) */}
          <div
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out will-change-transform ${headerVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}
            aria-hidden={!headerVisible}
          >
            <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                {/* Hamburger Menu Button */}
                <AnimatedHamburgerButton 
                  isOpen={hamburgerMenuOpen} 
                  onClick={() => setHamburgerMenuOpen(!hamburgerMenuOpen)} 
                />
                <h1 
                  className="text-2xl font-bold text-foreground cursor-pointer hover:opacity-80 transition-opacity" 
                  onClick={triggerHomeRefresh}
                >
                  MMora
                  <span className="sr-only"> — Immersive AI Social Platform</span>
                </h1>
              </div>

              {/* Profile (top-right) */}
              <button
                type="button"
                onClick={() => setIsProfileSheetOpen(true)}
                className="flex items-center justify-center rounded-full outline-none focus:ring-2 focus:ring-primary/40"
                aria-label="Open profile"
                title="Profile"
              >
                <Avatar className={glowClass}>
                  <AvatarImage src={userProfile?.profile_photo_url || userProfile?.avatar_url || ''} alt="User profile photo" />
                  <AvatarFallback>
                    {(userProfile?.display_name || user?.email || 'U').slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </div>
          </div>

        </div>

        {/* Spacer for fixed header — minimized to maximize usable screen area */}
        <div className="h-14"></div>

        <TabsContent value="global" className="mt-0 pb-24 xxs:pb-24 xs:pb-20">
              <div className="space-y-2 p-3" data-feed-tab="global">
                {hasNewPosts && (
                  <div className="sticky top-16 z-30 flex items-center justify-between rounded-md border border-primary/30 bg-background/95 px-3 py-2 shadow-sm backdrop-blur" data-testid="new-posts-indicator">
                    <span className="text-sm font-medium">New posts available</span>
                    <Button size="sm" variant="outline" onClick={scrollToNewPosts}>
                      <ArrowDown className="mr-1 h-4 w-4" />
                      Scroll to new posts
                    </Button>
                  </div>
                )}
                <FeedDiagnosticsBanner
                  diag={feedDiag}
                  consecutiveFailures={consecutiveFailures}
                  onRetry={async () => {
                    setLoading(true);
                    try { await fetchGlobalPosts('manual'); } finally { setLoading(false); }
                  }}
                />
                <AdminFeedDebugger entries={debugEntries} isAdmin={isAdminUser} />
                {receivedRequests.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-3">Friend Requests</h2>
                    <div className="space-y-2">
                      {receivedRequests.map((request) => (
                        <FriendRequestCard
                          key={request.id}
                          request={request}
                          onAccept={() => acceptFriendRequest(request.id)}
                          onReject={() => rejectFriendRequest(request.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Smart Feature Recommendations with Sovereign Quick Access */}
                <SovereignQuickAccess />

                {/* Loops short videos row */}
                <section className="space-y-2" aria-label="Loops short videos">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h2 
                        className="text-sm font-semibold cursor-pointer hover:text-primary transition-colors"
                        onClick={() => {
                          if (filteredLoops.length > 0) {
                            setLoopsInitialIndex(0);
                            setLoopsPlayerOpen(true);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && filteredLoops.length > 0) {
                            setLoopsInitialIndex(0);
                            setLoopsPlayerOpen(true);
                          }
                        }}
                      >
                        Loops
                      </h2>
                      {/* Direct Video Upload Button - Hidden Input */}
                      <input
                        type="file"
                        accept={[...ALLOWED_VIDEO_MIME, ...ALLOWED_IMAGE_MIME].join(',')}
                        id="loops-video-upload"
                        className="hidden"
                        disabled={uploadState === 'uploading' || uploadState === 'saving' || uploadState === 'validating'}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) await handleLoopsUpload(file);
                          e.target.value = '';
                        }}
                      />
                      <label
                        htmlFor="loops-video-upload"
                        aria-disabled={uploadState === 'uploading' || uploadState === 'saving' || uploadState === 'validating'}
                        className={`group relative flex items-center justify-center w-6 h-6 rounded-md bg-foreground/5 backdrop-blur-md border border-foreground/20 hover:border-foreground/40 hover:bg-foreground/10 transition-all duration-300 focus:outline-none focus-visible:ring-0 focus-visible:border-foreground/40 shadow-none ${uploadState === 'uploading' || uploadState === 'saving' || uploadState === 'validating' ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
                        title="Upload Video/Photo"
                      >
                        {uploadState === 'uploading' || uploadState === 'saving' || uploadState === 'validating' ? (
                          <svg className="w-3 h-3 text-foreground animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <Video className="w-3 h-3 text-foreground" />
                        )}
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                      </label>
                      {/* Selfie City Navigation Button — matches Loops upload button exactly */}
                      <button
                        type="button"
                        onClick={() => navigate('/selfie-city')}
                        className="group relative flex items-center justify-center w-6 h-6 rounded-md bg-foreground/5 backdrop-blur-md border border-foreground/20 hover:border-foreground/40 hover:bg-foreground/10 transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-0 focus-visible:border-foreground/40 shadow-none"
                        title="Selfie City"
                        aria-label="Selfie City"
                      >
                        <Camera className="w-3 h-3 text-foreground" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Flat segmented control — IG/Shorts style: text-only tabs with a thin animated underline */}
                      <div
                        role="tablist"
                        aria-label="Loops filter"
                        className="relative flex items-center gap-4"
                      >
                        {([
                          { key: 'trending', label: 'Hot' },
                          { key: 'recent', label: 'Recent' },
                          { key: 'liked', label: 'Liked' },
                          { key: 'friends', label: 'Friends' },
                        ] as const).map(({ key, label }) => {
                          const active = loopsFilter === key;
                          return (
                            <button
                              key={key}
                              role="tab"
                              aria-selected={active}
                              onClick={() => setLoopsFilter(key)}
                              className={`relative py-1 text-[11px] tracking-wide transition-colors duration-200 ${
                                active
                                  ? 'text-foreground font-medium'
                                  : 'text-muted-foreground/70 hover:text-foreground/90'
                              }`}
                            >
                              {label}
                              <span
                                aria-hidden
                                className={`absolute left-1/2 -bottom-0.5 h-[1.5px] rounded-full bg-foreground transition-all duration-300 ease-out ${
                                  active ? 'w-4 -translate-x-1/2 opacity-100' : 'w-0 -translate-x-1/2 opacity-0'
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                      <span className="text-[10px] tabular-nums text-muted-foreground/60">
                        {filteredLoops.length}
                      </span>
                      {/* Hide / Unhide Loops section — one-tap toggle, also voice-controllable */}
                      <button
                        type="button"
                        onClick={() => toggleLoopsSection('manual-chevron', undefined, 'toggle-loops')}
                        onKeyDown={(e) => {
                          // Native <button> already handles Enter/Space, but
                          // guard against synthetic wrappers that swallow them.
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            (e.currentTarget as HTMLButtonElement).click();
                          }
                        }}
                        className="flex items-center gap-1 px-2 min-h-6 h-6 rounded-md border border-foreground/30 bg-background/60 text-foreground text-[10px] font-medium hover:bg-foreground/10 hover:border-foreground/50 transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                        aria-label={loopsHidden ? 'Show loops section' : 'Hide loops section'}
                        aria-pressed={loopsHidden}
                        aria-controls="loops-section-body"
                        aria-expanded={!loopsHidden}
                        title={loopsHidden ? 'Show loops (Zoe: "unhide loops")' : 'Hide loops (Zoe: "hide loops")'}
                      >
                        {loopsHidden ? <ChevronDown className="w-3 h-3" aria-hidden="true" /> : <ChevronUp className="w-3 h-3" aria-hidden="true" />}
                        <span className="leading-none">{loopsHidden ? 'Show' : 'Hide'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/25 px-2 py-2" role="group" aria-label="Manual loops visibility controls">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Loops are {loopsHidden ? 'hidden' : 'visible'}
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setLoopsSectionHidden(true, 'manual-hide-button', undefined, 'hide-loops')}
                        disabled={loopsHidden}
                        className="min-h-7 rounded-md border border-border bg-background px-2.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                        aria-pressed={loopsHidden}
                        aria-controls="loops-section-body"
                      >
                        Hide loops
                      </button>
                      <button
                        type="button"
                        onClick={() => setLoopsSectionHidden(false, 'manual-show-button', undefined, 'unhide-loops')}
                        disabled={!loopsHidden}
                        className="min-h-7 rounded-md border border-border bg-background px-2.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                        aria-pressed={!loopsHidden}
                        aria-controls="loops-section-body"
                      >
                        Show loops
                      </button>
                    </div>
                  </div>


                  <div id="loops-section-body" aria-live="polite" hidden={loopsHidden} />
                  {!loopsHidden && (<>
                  {/* Loops upload progress / status */}
                  {uploadState !== 'idle' && (
                    <div
                      className="rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="flex items-center justify-between mb-1.5 gap-2">
                        <span className="truncate">
                          {uploadState === 'validating' && `Checking ${uploadFileName}…`}
                          {uploadState === 'uploading' && `Uploading ${uploadFileName}… ${uploadProgress}%`}
                          {uploadState === 'saving' && `Saving post…`}
                          {uploadState === 'success' && `Posted!`}
                          {uploadState === 'error' && (uploadError || 'Upload failed')}
                        </span>
                        {uploadState === 'error' && lastUploadFile && (
                          <button
                            onClick={retryLastUpload}
                            className="shrink-0 text-primary hover:text-primary/80 underline underline-offset-2"
                          >
                            Try again
                          </button>
                        )}
                      </div>
                      {(uploadState === 'uploading' || uploadState === 'saving' || uploadState === 'validating') && (
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary transition-[width] duration-200"
                            style={{
                              width: uploadState === 'saving'
                                ? '100%'
                                : uploadState === 'validating'
                                  ? '5%'
                                  : `${uploadProgress}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {isAdminUser && filteredLoops.length > 0 && (
                    <details className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-[11px]" data-testid="loops-diagnostics-panel">
                      <summary className="cursor-pointer font-medium text-foreground">Loops preview diagnostics</summary>
                      <div className="mt-2 space-y-2">
                        {filteredLoops.map((post) => {
                          const version = post.updated_at || post.created_at || post.id;
                          const mediaUrl = appendMediaVersion(post.media_url, version) || null;
                          const posterUrl = appendMediaVersion(post.media_preview_url, version) || null;
                          return (
                            <div key={post.id} className="rounded border border-border/40 bg-background/50 p-2 font-mono">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold">{post.id.slice(0, 8)}</span>
                                <span>{post.media_type || 'unknown'}</span>
                                <span>{brokenLoopPreviewIds.has(post.id) ? 'fallback' : (loopDecodeStatus[post.id] || 'pending')}</span>
                                <button
                                  type="button"
                                  onClick={() => regenerateLoopPoster(post.id)}
                                  className="rounded border border-border/60 px-2 py-0.5 text-primary hover:bg-muted"
                                >
                                  Re-generate poster
                                </button>
                              </div>
                              <div className="mt-1 break-all text-muted-foreground">media: {mediaUrl || 'missing'}</div>
                              <div className="break-all text-muted-foreground">poster: {posterUrl || 'missing'}</div>
                              {mediaUrl && <a href={mediaUrl} target="_blank" rel="noreferrer" className="mr-3 text-primary">Open media</a>}
                              {posterUrl && <a href={posterUrl} target="_blank" rel="noreferrer" className="text-primary">Open poster</a>}
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}


                  {filteredLoops.length > 0 ? (
                    <FeedErrorBoundary section="loops" onRetry={handleUpdate}>
                      <div ref={loopRailRef} className="flex gap-2 overflow-x-auto pb-1 scroll-smooth snap-x" data-testid="loops-rail">
                        {filteredLoops.map((post, index) => (
                          <FeedErrorBoundary key={post.id} section="loops" postId={post.id} onRetry={() => retrySingleLoop(post.id)}>
                            <div data-loop-index={index} className="relative snap-start shrink-0" data-new={newContentByFeed.loops.has(post.id) ? 'true' : 'false'}>
                              {newContentByFeed.loops.has(post.id) && (
                                <NewContentBadge className="left-1 top-1" onViewed={() => dismissNewContent('loops', post.id)} />
                              )}
                              <LoopVideoItem
                                post={post}
                                index={index}
                                active={index === activeLoopRailIndex % filteredLoops.length}
                                onDuration={(postId, duration) => setLoopDurations(prev => prev[postId] === duration ? prev : { ...prev, [postId]: duration })}
                                onVideoClick={openLoopsPlayer}
                                onDecodeStatus={handleLoopDecodeStatus}
                                onRegeneratePoster={regenerateLoopPoster}
                                canRegeneratePoster={isAdminUser || user?.id === post.user_id}
                                onPreviewError={(postId) => {
                                  const failed = loopPosts.find(p => p.id === postId);
                                  setBrokenLoopPreviewIds(prev => new Set(prev).add(postId));
                                  logFeedIssue({
                                    step: 'loops:preview-error',
                                    postId,
                                    mediaUrl: failed?.media_url || null,
                                    posterUrl: failed?.media_preview_url || null,
                                    mediaType: failed?.media_type || null,
                                    decodeStatus: 'decode-failed',
                                    errorMessage: `Preview decode failed for ${postId}`,
                                  });
                                }}
                              />
                            </div>
                          </FeedErrorBoundary>
                        ))}
                      </div>
                    </FeedErrorBoundary>
                  ) : (
                    <div className="flex items-center justify-between rounded-lg border border-dashed border-border/50 px-3 py-2 text-xs text-muted-foreground">
                      <span>No loop videos yet. Post a short video to see Loops here.</span>
                      <button
                        className="h-6 px-2 text-[10px] text-primary hover:text-primary/80 transition-colors"
                        onClick={() => navigate('/camera')}
                      >
                        Open camera
                      </button>
                    </div>
                  )}
                  </>)}
                </section>
                
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">Loading posts...</p>
                ) : globalPosts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No posts yet</p>
                ) : (
                  globalPosts.map(post => {
                    const isToday = post.created_at && new Date(post.created_at).toDateString() === new Date().toDateString();
                    return (
                      <div key={post.id} className="relative" data-post-card data-post-id={post.id} data-today={isToday ? 'true' : 'false'} data-new={newContentByFeed.global.has(post.id) ? 'true' : 'false'}>
                        {newContentByFeed.global.has(post.id) && (
                          <NewContentBadge className="right-3 top-3" onViewed={() => dismissNewContent('global', post.id)} />
                        )}
                        <FeedErrorBoundary section="post-card" postId={post.id} onRetry={() => retrySinglePost(post.id)}>
                          <PostCard post={post} onUpdate={handleUpdate} />
                        </FeedErrorBoundary>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="personal" className="mt-0 pb-24 xxs:pb-24 xs:pb-20">
              <div className="space-y-2 p-3" data-feed-tab="personal">
                {hasNewPosts && (
                  <div className="sticky top-16 z-30 flex items-center justify-between rounded-md border border-primary/30 bg-background/95 px-3 py-2 shadow-sm backdrop-blur" data-testid="new-posts-indicator">
                    <span className="text-sm font-medium">New posts available</span>
                    <Button size="sm" variant="outline" onClick={scrollToNewPosts}>
                      <ArrowDown className="mr-1 h-4 w-4" />
                      Scroll to new posts
                    </Button>
                  </div>
                )}
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">Loading posts...</p>
                ) : personalPosts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No posts from friends yet</p>
                ) : (
                  personalPosts.map(post => {
                    const isToday = post.created_at && new Date(post.created_at).toDateString() === new Date().toDateString();
                    return (
                      <div key={post.id} className="relative" data-post-card data-post-id={post.id} data-today={isToday ? 'true' : 'false'} data-new={newContentByFeed.personal.has(post.id) ? 'true' : 'false'}>
                        {newContentByFeed.personal.has(post.id) && (
                          <NewContentBadge className="right-3 top-3" onViewed={() => dismissNewContent('personal', post.id)} />
                        )}
                        <FeedErrorBoundary section="post-card" postId={post.id} onRetry={() => retrySinglePost(post.id)}>
                          <PostCard post={post} onUpdate={handleUpdate} />
                        </FeedErrorBoundary>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="selfiecity" className="mt-0 pb-24 xxs:pb-24 xs:pb-20">
              <div className="space-y-2 p-3">
                {/* Selfie City Feed Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-pink-400" />
                    <h2 className="text-lg font-semibold">Selfie City Feed</h2>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/selfie-city')}
                    className="text-xs"
                  >
                    Open Map
                  </Button>
                </div>
                
                {/* Selfie City Posts Grid */}
                <SelfieCityFeed />
              </div>
            </TabsContent>

          </div>
        </Tabs>
      <SearchBar />
      <NotificationMenu open={notificationMenuOpen} onOpenChange={setNotificationMenuOpen} />
      <HamburgerMenu
        isOpen={hamburgerMenuOpen}
        onClose={() => setHamburgerMenuOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadMessages={unreadMessages}
        unreadNotifications={unreadNotifications}
        newMatches={newMatches}
        onNotificationClick={() => setNotificationMenuOpen(true)}
        onPrivateTimelineClick={() => setPrivateTimelinesOpen(true)}
        onOpenAtlas={() => setAtlasHUDActive(true)}
      />
      <OnboardingTour />
      <PrivateTimelinesSheet open={privateTimelinesOpen} onOpenChange={setPrivateTimelinesOpen} />

      {/* Profile Sheet */}
      <Sheet open={isProfileSheetOpen} onOpenChange={setIsProfileSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto bg-background/80 backdrop-blur-xl border-l border-border/50">
          <SheetHeader>
            <SheetTitle>Profile</SheetTitle>
          </SheetHeader>
          <div className="pt-4">
            {isProfileSheetOpen && (
              <React.Suspense fallback={<div className="py-8 text-center text-sm text-muted-foreground">Loading profile…</div>}>
                <ProfileContent />
              </React.Suspense>
            )}
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Full Screen Loops Video Player */}
      {loopsPlayerOpen && filteredLoops.length > 0 && (
        <FullScreenVideoPlayer
          videos={filteredLoops}
          initialIndex={loopsInitialIndex}
          onClose={() => setLoopsPlayerOpen(false)}
          onUpdate={handleUpdate}
        />
      )}
      
      {/* Simple Scroll to Top Arrow - Fixed at bottom right corner */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-4 z-50 p-2 hover:opacity-80 transition-opacity"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5 text-omega-cyan" />
        </button>
      )}
      </div>
      {showZoeHomeDebug && (
        <div className="pointer-events-none fixed left-2 top-16 z-[60] w-[calc(100vw-1rem)] max-w-sm md:left-4 md:top-20" data-testid="zoe-home-debug-overlay">
          <div className="pointer-events-auto rounded-lg border border-border bg-background/95 p-3 text-foreground shadow-lg backdrop-blur">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">Zoe home debug</div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setShowZoeHomeDebug(false);
                  try { localStorage.setItem('mmora.home.zoeDebugOverlay', 'false'); } catch {}
                }}
                aria-label="Hide Zoe home debug overlay"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-[86px_1fr] gap-x-2 gap-y-1 text-[11px] leading-4">
              <span className="text-muted-foreground">transcript</span>
              <span className="truncate font-mono" data-testid="zoe-debug-transcript">{zoeHomeDebug.transcript || '—'}</span>
              <span className="text-muted-foreground">command</span>
              <span className="font-mono" data-testid="zoe-debug-command">{zoeHomeDebug.detectedCommand || '—'}</span>
              <span className="text-muted-foreground">handler</span>
              <span className="font-mono" data-testid="zoe-debug-handler">{zoeHomeDebug.handler || '—'}</span>
              <span className="text-muted-foreground">source</span>
              <span className="truncate font-mono">{zoeHomeDebug.source || zoeHomeDebug.eventName || '—'}</span>
              <span className="text-muted-foreground">loops</span>
              <span className="font-mono" data-testid="zoe-debug-loops-hidden">{loopsHidden ? 'hidden' : 'visible'}</span>
              <span className="text-muted-foreground">header</span>
              <span className="font-mono" data-testid="zoe-debug-header-visible">{headerVisible ? 'visible' : 'hidden'}</span>
              <span className="text-muted-foreground">scroll</span>
              <span className="font-mono" data-testid="zoe-debug-autoscroll">{autoScrollEnabled ? 'on' : 'off'}</span>
            </div>
          </div>
        </div>
      )}
      <AutoScrollDebugOverlay />
    </>
  );
};

export default HomePage;
