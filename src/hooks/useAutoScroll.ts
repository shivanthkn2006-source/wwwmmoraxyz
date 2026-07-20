import { useState, useEffect, useRef, useCallback } from 'react';
import { trackEvent } from '@/lib/analytics';

interface UseAutoScrollOptions {
  scrollInterval?: number; // Time between auto-scrolls in ms (default: 5000)
  scrollBehavior?: ScrollBehavior; // 'smooth' or 'auto'
}

export const useAutoScroll = (options: UseAutoScrollOptions = {}) => {
  const { scrollInterval = 5000, scrollBehavior = 'smooth' } = options;

  const [isScrolling, setIsScrolling] = useState(true); // Start auto-scrolling by default
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const postElementsRef = useRef<HTMLElement[]>([]);
  const lastScopeRef = useRef<{ scope: 'today' | 'fallback'; count: number } | null>(null);

  // Update post elements reference
  // Auto-scroll ONLY through today's posts. If none tagged today, fall back to
  // all posts so behavior degrades gracefully. Loops / non-post-card items are
  // never auto-scrolled here.
  const updatePostElements = useCallback(() => {
    const todaysPosts = Array.from(
      document.querySelectorAll('[data-post-card][data-today="true"]')
    ) as HTMLElement[];
    const allPosts = Array.from(document.querySelectorAll('[data-post-card]')) as HTMLElement[];
    const useToday = todaysPosts.length > 0;
    postElementsRef.current = useToday ? todaysPosts : allPosts;

    const scope: 'today' | 'fallback' = useToday ? 'today' : 'fallback';
    const count = postElementsRef.current.length;
    const prev = lastScopeRef.current;
    if (!prev || prev.scope !== scope || prev.count !== count) {
      lastScopeRef.current = { scope, count };
      trackEvent({ name: 'home_autoscroll_scope', scope, count });
    }
  }, []);

  // Scroll to specific post index
  const scrollToPost = useCallback((index: number) => {
    updatePostElements();
    const posts = postElementsRef.current;
    
    if (posts.length === 0) return;
    
    // Clamp index to valid range
    const targetIndex = Math.max(0, Math.min(index, posts.length - 1));
    setCurrentPostIndex(targetIndex);
    
    const targetPost = posts[targetIndex];
    if (targetPost) {
      targetPost.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
    }
  }, [scrollBehavior, updatePostElements]);

  // Navigate to next post
  const scrollToNext = useCallback(() => {
    updatePostElements();
    const posts = postElementsRef.current;
    const nextIndex = Math.min(currentPostIndex + 1, posts.length - 1);
    scrollToPost(nextIndex);
  }, [currentPostIndex, scrollToPost, updatePostElements]);

  // Navigate to previous post
  const scrollToPrevious = useCallback(() => {
    const prevIndex = Math.max(currentPostIndex - 1, 0);
    scrollToPost(prevIndex);
  }, [currentPostIndex, scrollToPost]);

  // Start auto-scrolling
  const startScrolling = useCallback(() => {
    setIsScrolling(true);
  }, []);

  // Stop auto-scrolling
  const stopScrolling = useCallback(() => {
    setIsScrolling(false);
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }
  }, []);

  // Toggle auto-scrolling
  const toggleScrolling = useCallback(() => {
    if (isScrolling) {
      stopScrolling();
    } else {
      startScrolling();
    }
  }, [isScrolling, startScrolling, stopScrolling]);

  // Pause auto-scroll while the Zoe orb chat window is open anywhere in the app
  const [zoeChatOpen, setZoeChatOpen] = useState<boolean>(
    typeof window !== 'undefined' && Boolean((window as any).__mmoraZoeChatOpen)
  );
  useEffect(() => {
    const onToggle = (e: Event) => {
      const open = Boolean((e as CustomEvent).detail?.open);
      setZoeChatOpen(open);
    };
    window.addEventListener('mmora:zoe-chat-toggle', onToggle);
    return () => window.removeEventListener('mmora:zoe-chat-toggle', onToggle);
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    if (!isScrolling || zoeChatOpen) return;

    scrollTimerRef.current = setTimeout(() => {
      scrollToNext();
    }, scrollInterval);

    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, [isScrolling, currentPostIndex, scrollInterval, scrollToNext, zoeChatOpen]);

  // Update post elements when component mounts
  useEffect(() => {
    updatePostElements();
  }, [updatePostElements]);

  // Get current post ID for voice interactions
  const getCurrentPostId = useCallback(() => {
    updatePostElements();
    const posts = postElementsRef.current;
    if (posts.length === 0) return null;
    const currentPost = posts[currentPostIndex];
    return currentPost?.getAttribute('data-post-id') || null;
  }, [currentPostIndex, updatePostElements]);

  return {
    isScrolling,
    currentPostIndex,
    scrollToNext,
    scrollToPrevious,
    startScrolling,
    stopScrolling,
    toggleScrolling,
    scrollToPost,
    getCurrentPostId,
  };
};
