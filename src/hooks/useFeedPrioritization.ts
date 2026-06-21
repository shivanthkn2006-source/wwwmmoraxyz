/**
 * FEED PRIORITIZATION HOOK
 * Protocol: Data Traffic Control
 * Prioritizes feed content, defers heavy asset preloading using requestIdleCallback
 */

import { useCallback, useRef, useEffect } from 'react';

interface PrioritizationOptions {
  onFeedReady?: () => void;
  deferredTimeout?: number;
}

interface PreloadTask {
  id: string;
  execute: () => Promise<void>;
  priority: 'high' | 'medium' | 'low';
}

export const useFeedPrioritization = (options: PrioritizationOptions = {}) => {
  const { onFeedReady, deferredTimeout = 3000 } = options;
  const feedReadyRef = useRef(false);
  const deferredTasksRef = useRef<PreloadTask[]>([]);
  const idleCallbackIdRef = useRef<number | null>(null);

  // Mark feed as interactive - triggers deferred loading
  const markFeedInteractive = useCallback(() => {
    if (feedReadyRef.current) return;
    feedReadyRef.current = true;
    
    // Performance mark for debugging
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark('feed-interactive');
    }
    
    onFeedReady?.();
    
    // Begin processing deferred tasks
    processDeferredTasks();
  }, [onFeedReady]);

  // Queue a task for deferred execution
  const queueDeferredTask = useCallback((task: PreloadTask) => {
    deferredTasksRef.current.push(task);
    
    // Sort by priority
    deferredTasksRef.current.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, []);

  // Process deferred tasks using requestIdleCallback
  const processDeferredTasks = useCallback(() => {
    const processNext = (deadline?: IdleDeadline) => {
      // Check if we have time remaining or if there are no more tasks
      while (deferredTasksRef.current.length > 0) {
        // If using requestIdleCallback, check deadline
        if (deadline && deadline.timeRemaining() < 5) {
          // Schedule next batch
          scheduleIdleProcessing();
          return;
        }
        
        const task = deferredTasksRef.current.shift();
        if (task) {
          task.execute().catch(err => {
            console.warn(`[FeedPrioritization] Deferred task ${task.id} failed:`, err);
          });
        }
      }
    };

    scheduleIdleProcessing(processNext);
  }, []);

  // Schedule processing during idle time
  const scheduleIdleProcessing = useCallback((callback?: (deadline?: IdleDeadline) => void) => {
    const processCallback = callback || (() => processDeferredTasks());
    
    if ('requestIdleCallback' in window) {
      idleCallbackIdRef.current = (window as any).requestIdleCallback(processCallback, {
        timeout: deferredTimeout,
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => processCallback(), 100);
    }
  }, [deferredTimeout, processDeferredTasks]);

  // Preload VR assets in background (after feed is ready)
  const preloadVRAssets = useCallback((assetUrls: string[]) => {
    assetUrls.forEach((url, index) => {
      queueDeferredTask({
        id: `vr-asset-${index}`,
        priority: 'low',
        execute: async () => {
          // Preload images/textures
          if (url.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
            const img = new Image();
            img.src = url;
            await new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve; // Don't block on error
            });
          }
          // For 3D models, just warm the cache
          else if (url.match(/\.(glb|gltf)$/i)) {
            await fetch(url, { method: 'HEAD' }).catch(() => {});
          }
        },
      });
    });
  }, [queueDeferredTask]);

  // Preload high-res avatars
  const preloadAvatars = useCallback((avatarUrls: string[]) => {
    avatarUrls.forEach((url, index) => {
      queueDeferredTask({
        id: `avatar-${index}`,
        priority: 'medium',
        execute: async () => {
          const img = new Image();
          img.src = url;
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        },
      });
    });
  }, [queueDeferredTask]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (idleCallbackIdRef.current && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleCallbackIdRef.current);
      }
    };
  }, []);

  return {
    markFeedInteractive,
    queueDeferredTask,
    preloadVRAssets,
    preloadAvatars,
    isFeedReady: () => feedReadyRef.current,
  };
};

export default useFeedPrioritization;
