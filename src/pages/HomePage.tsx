// HomePage - Main feed component
import React, { useState, useEffect } from 'react';
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
import { ArrowDown, Mail, Search, Video, TrendingUp, ArrowUp, MapPin } from 'lucide-react';
import FuturisticCounter from '@/components/FuturisticCounter';
import { useNavigate } from 'react-router-dom';
import { onHomeRefresh, triggerHomeRefresh } from '@/lib/homeRefresh';
import { useEventGlow, getAvatarGlowClass } from '@/hooks/useEventGlow';
import { toast } from '@/hooks/use-toast';

import StatusIconBadge from '@/components/StatusIconBadge';
import { useSmartNotifications } from '@/hooks/useSmartNotifications';
import { useRealtimeBadgeNotifications } from '@/hooks/useRealtimeBadgeNotifications';
import { useUserOnlineNotifications } from '@/hooks/useUserOnlineNotifications';
import { useDesktopNotifications } from '@/hooks/useDesktopNotifications';
import { useZoeProactiveNotifications } from '@/hooks/useZoeProactiveNotifications';
import { TutorialOverlay } from '@/components/TutorialOverlay';
import { useTutorial } from '@/hooks/useTutorial';
import { useDailyBriefing } from '@/hooks/useDailyBriefing';
import { OnboardingTour } from '@/components/OnboardingTour';
import { SovereignQuickAccess } from '@/components/SovereignQuickAccess';
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

const ProfileContent = React.lazy(() => import('@/components/ProfileContent'));

// Atlas HUD Integration - Smith AI from Atlas movie (2024)
// NOTE: Atlas is a SEPARATE experience from Zoe Infinity - accessed via menu only
import { AtlasHUD } from '@/components/atlas';

import { useFriendRequests } from "@/hooks/useFriendRequests";


interface Post {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  full_media_url?: string | null;
  media_type: string | null;
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

// Infer real media type from the URL when the DB media_type column is wrong
// (legacy rows saved videos with media_type='image' — see loops upload bug).
const inferMediaType = (url: string | null, declared: string | null): 'video' | 'image' | null => {
  if (!url) return declared === 'video' ? 'video' : declared === 'image' ? 'image' : null;
  if (url.startsWith('data:video/')) return 'video';
  if (url.startsWith('data:image/')) return 'image';
  const clean = url.split('?')[0].toLowerCase();
  if (/\.(mp4|webm|mov|ogg|m4v)$/.test(clean)) return 'video';
  if (/\.(jpe?g|png|webp|gif|avif|heic)$/.test(clean)) return 'image';
  return declared === 'video' ? 'video' : declared === 'image' ? 'image' : null;
};

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
  const [friendships, setFriendships] = useState<Array<{user1_id: string, user2_id: string}>>([]);
  const [privateTimelinesOpen, setPrivateTimelinesOpen] = useState(false);
  const [hamburgerMenuOpen, setHamburgerMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [newMatches, setNewMatches] = useState(0);
  const [feedDiag, setFeedDiag] = useState<FeedDiagnostics | null>(null);
  const [debugEntries, setDebugEntries] = useState<Array<import('@/components/AdminFeedDebugger').FeedDebugEntry>>([]);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  // Loops upload UI state
  const [uploadState, setUploadState] = useState<'idle' | 'validating' | 'uploading' | 'saving' | 'error' | 'success'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [lastUploadFile, setLastUploadFile] = useState<File | null>(null);
  const isAdminUser = !!user && ['moksh50','justmkbhd','john','shivanth_kn'].includes(((userProfile?.username||'') as string).toLowerCase());
  const pushDebug = (e: Omit<import('@/components/AdminFeedDebugger').FeedDebugEntry,'timestamp'>) =>
    setDebugEntries(prev => [{...e, timestamp: new Date().toISOString()}, ...prev].slice(0, 50));

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
  const videoPosts = globalPosts.filter((post) =>
    !!post.media_url && inferMediaType(post.media_url, post.media_type) === 'video'
  );

  const filteredLoops = React.useMemo(() => {
    let filtered = [...videoPosts];
    
    switch (loopsFilter) {
      case 'trending':
        // Trending = most engagement (likes + comments) in recent time
        return filtered.sort((a, b) => {
          const scoreA = (a.likes_count || 0) + (a.comments_count || 0);
          const scoreB = (b.likes_count || 0) + (b.comments_count || 0);
          return scoreB - scoreA;
        });
      case 'liked':
        return filtered.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
      case 'friends':
        return filtered.filter(post => 
          friendships.some(f => f.user1_id === post.user_id || f.user2_id === post.user_id)
        );
      case 'recent':
      default:
        return filtered.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  }, [videoPosts, loopsFilter, friendships]);
  
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

  const fetchGlobalPosts = async () => {
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
        .select('id, user_id, content, media_url, media_type, likes_count, comments_count, created_at, visibility, has_deferred_media, media_size')
        .eq('visibility', 'global')
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

  const fetchPersonalPosts = async () => {
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
        .select('id, user_id, content, media_url, media_type, likes_count, comments_count, created_at, visibility, has_deferred_media, media_size')
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
      .select('display_name, profile_photo_url, event_date, event_recurring, status, bio, hobbies')
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
        await settleWithin(fetchGlobalPosts(), 12000);
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
        fetchPersonalPosts();
        fetchUnreadMessages();
        fetchNewMatches();
      }, 2000);
    };

    loadPosts();

    // Listen for manual refresh events
    const unsubscribe = onHomeRefresh(() => {
      loadPosts();
    });

    // Set up real-time subscription for notification updates (deferred)
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (user) {
      const setupRealtime = () => {
        channel = supabase
          .channel(`notification-count-changes:${user.id}:${Math.random().toString(36).slice(2, 8)}`)
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
    fetchGlobalPosts();
    fetchPersonalPosts();
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
        const ext = (file.name.split('.').pop() || (mediaType === 'video' ? 'mp4' : 'jpg')).toLowerCase();
        const path = `${user.id}/loops/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        // 2. Retry with exponential backoff (3 attempts)
        await withRetry(async (attempt) => {
          setUploadProgress(0);
          if (attempt > 1) {
            toast({ title: `Retrying upload (attempt ${attempt}/3)…` });
          }
          if (token) {
            await xhrUploadToPosts(file, path, token, setUploadProgress);
          } else {
            // Fallback to SDK if no token (won't report granular progress)
            const { error } = await supabase.storage.from('posts').upload(path, file, {
              contentType: file.type, upsert: false,
            });
            if (error) throw error;
            setUploadProgress(100);
          }
        }, 3, 900);

        const { data: pub } = supabase.storage.from('posts').getPublicUrl(path);
        mediaUrl = pub.publicUrl;
      }

      setUploadState('saving');
      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: '',
        media_url: mediaUrl,
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



  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
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
          <div className="fixed top-0 left-0 right-0 z-50">
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
                  <AvatarImage src={userProfile?.profile_photo_url || userProfile?.avatar_url || ''} alt="Profile" />
                  <AvatarFallback>
                    {(userProfile?.display_name || user?.email || 'U').slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </div>
          </div>

        </div>

        {/* Spacer for fixed header */}
        <div className="h-[140px]"></div>

        <TabsContent value="global" className="mt-0 pb-24 xxs:pb-24 xs:pb-20">
              <div className="space-y-4 p-4">
                <FeedDiagnosticsBanner
                  diag={feedDiag}
                  consecutiveFailures={consecutiveFailures}
                  onRetry={async () => {
                    setLoading(true);
                    try { await fetchGlobalPosts(); } finally { setLoading(false); }
                  }}
                />
                <AdminFeedDebugger entries={debugEntries} isAdmin={isAdminUser} />
                {receivedRequests.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Friend Requests</h3>
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
                        className={`group relative flex items-center justify-center w-6 h-6 rounded-md bg-foreground/5 backdrop-blur-md border border-foreground/10 hover:border-purple-400/50 hover:bg-foreground/10 transition-all duration-300 shadow-[0_0_8px_rgba(139,92,246,0.2)] hover:shadow-[0_0_12px_rgba(139,92,246,0.4)] ${uploadState === 'uploading' || uploadState === 'saving' || uploadState === 'validating' ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
                        title="Upload Video/Photo"
                      >
                        {uploadState === 'uploading' || uploadState === 'saving' || uploadState === 'validating' ? (
                          <svg className="w-3 h-3 text-purple-300 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <Video className="w-3 h-3 text-purple-300 group-hover:text-purple-200 transition-colors" />
                        )}
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                      </label>
                      {/* Selfie City Navigation Button */}
                      <button
                        onClick={() => navigate('/selfie-city')}
                        className="group relative flex items-center justify-center w-6 h-6 rounded-md bg-foreground/5 backdrop-blur-md border border-foreground/10 hover:border-pink-400/50 hover:bg-foreground/10 transition-all duration-300 shadow-[0_0_8px_rgba(236,72,153,0.2)] hover:shadow-[0_0_12px_rgba(236,72,153,0.4)] cursor-pointer"
                        title="Selfie City"
                      >
                        <MapPin className="w-3 h-3 text-pink-300 group-hover:text-pink-200 transition-colors" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5 bg-muted/50 rounded-full p-0.5">
                        <Button
                          variant={loopsFilter === 'trending' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setLoopsFilter('trending')}
                          className="h-5 min-w-[40px] px-2 text-[9px] rounded-full flex items-center justify-center gap-0.5"
                        >
                          <TrendingUp className="w-2.5 h-2.5" />
                          Hot
                        </Button>
                        <Button
                          variant={loopsFilter === 'recent' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setLoopsFilter('recent')}
                          className="h-5 min-w-[40px] px-2 text-[9px] rounded-full flex items-center justify-center"
                        >
                          Recent
                        </Button>
                        <Button
                          variant={loopsFilter === 'liked' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setLoopsFilter('liked')}
                          className="h-5 min-w-[40px] px-2 text-[9px] rounded-full flex items-center justify-center"
                        >
                          Liked
                        </Button>
                        <Button
                          variant={loopsFilter === 'friends' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setLoopsFilter('friends')}
                          className="h-5 min-w-[40px] px-2 text-[9px] rounded-full flex items-center justify-center"
                        >
                          Friends
                        </Button>
                      </div>
                      <span className="text-[9px] text-muted-foreground">
                        {filteredLoops.length}
                      </span>
                    </div>
                  </div>

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


                  {filteredLoops.length > 0 ? (
                    <FeedErrorBoundary section="loops" onRetry={handleUpdate}>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {filteredLoops.map((post, index) => (
                          <FeedErrorBoundary key={post.id} section="loops" postId={post.id}>
                            <LoopVideoItem
                              post={post}
                              index={index}
                              onVideoClick={openLoopsPlayer}
                            />
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
                </section>
                
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">Loading posts...</p>
                ) : globalPosts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No posts yet</p>
                ) : (
                  globalPosts.map(post => (
                    <div key={post.id} data-post-card data-post-id={post.id}>
                      <PostCard post={post} onUpdate={handleUpdate} />
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="personal" className="mt-0 pb-24 xxs:pb-24 xs:pb-20">
              <div className="space-y-4 p-4">
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">Loading posts...</p>
                ) : personalPosts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No posts from friends yet</p>
                ) : (
                  personalPosts.map(post => (
                    <div key={post.id} data-post-card data-post-id={post.id}>
                      <PostCard post={post} onUpdate={handleUpdate} />
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="selfiecity" className="mt-0 pb-24 xxs:pb-24 xs:pb-20">
              <div className="space-y-4 p-4">
                {/* Selfie City Feed Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-pink-400" />
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
    </>
  );
};

export default HomePage;
