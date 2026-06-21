// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM OPTIMIZER - Ultra-Fast Loading & Performance Utilities
// Global optimizations for real-world speed across the entire platform
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// LAZY LOADING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lazy load a component only when it enters viewport
 */
export function createLazyObserver(
  callback: () => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  return new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback();
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '100px',
    ...options
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEBOUNCE & THROTTLE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEMOIZATION CACHE
// ═══════════════════════════════════════════════════════════════════════════════

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

class MemoCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 100, defaultTTL: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  set(key: string, value: T, ttl?: number): void {
    // LRU eviction
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global caches for different data types
export const profileCache = new MemoCache(200, 5 * 60 * 1000);     // 5 min TTL
export const matchCache = new MemoCache(500, 10 * 60 * 1000);      // 10 min TTL  
export const apiResponseCache = new MemoCache(100, 2 * 60 * 1000); // 2 min TTL

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH PROCESSING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Process items in batches with concurrency control
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10,
  delayBetweenBatches: number = 50
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    
    // Small delay to prevent UI blocking
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  return results;
}

/**
 * Batch database queries for efficiency
 */
export function createBatcher<T, R>(
  fetcher: (keys: T[]) => Promise<Map<T, R>>,
  delay: number = 10,
  maxBatchSize: number = 50
): (key: T) => Promise<R | undefined> {
  let batch: T[] = [];
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let resolvers: Array<{ key: T; resolve: (value: R | undefined) => void }> = [];

  const executeBatch = async () => {
    const currentBatch = batch;
    const currentResolvers = resolvers;
    batch = [];
    resolvers = [];
    timeout = null;

    try {
      const results = await fetcher(currentBatch);
      currentResolvers.forEach(({ key, resolve }) => {
        resolve(results.get(key));
      });
    } catch (err) {
      currentResolvers.forEach(({ resolve }) => resolve(undefined));
    }
  };

  return (key: T): Promise<R | undefined> => {
    return new Promise((resolve) => {
      batch.push(key);
      resolvers.push({ key, resolve });

      if (batch.length >= maxBatchSize) {
        if (timeout) clearTimeout(timeout);
        executeBatch();
      } else if (!timeout) {
        timeout = setTimeout(executeBatch, delay);
      }
    });
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST ANIMATION FRAME SCHEDULER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schedule non-critical work during idle time
 */
export function scheduleIdleWork(callback: () => void, timeout: number = 2000): void {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 100);
  }
}

/**
 * Schedule work for next animation frame
 */
export function scheduleRenderWork(callback: () => void): number {
  return requestAnimationFrame(callback);
}

// ═══════════════════════════════════════════════════════════════════════════════
// NETWORK OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Prefetch data that will likely be needed
 */
export async function prefetchData(
  fetcher: () => Promise<any>,
  cacheKey: string,
  cache: MemoCache = apiResponseCache
): Promise<void> {
  if (cache.has(cacheKey)) return;
  
  scheduleIdleWork(async () => {
    try {
      const data = await fetcher();
      cache.set(cacheKey, data);
    } catch (err) {
      console.warn('[Prefetch] Failed:', cacheKey, err);
    }
  });
}

/**
 * Deduplicate concurrent requests for same resource
 */
const pendingRequests = new Map<string, Promise<any>>();

export function dedupeRequest<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  const promise = fetcher().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERFORMANCE MONITORING
// ═══════════════════════════════════════════════════════════════════════════════

interface PerformanceMark {
  name: string;
  startTime: number;
  duration?: number;
}

class PerformanceMonitor {
  private marks: Map<string, PerformanceMark> = new Map();
  private enabled: boolean = true;

  start(name: string): void {
    if (!this.enabled) return;
    this.marks.set(name, { name, startTime: performance.now() });
  }

  end(name: string): number | undefined {
    if (!this.enabled) return;
    const mark = this.marks.get(name);
    if (!mark) return;
    
    mark.duration = performance.now() - mark.startTime;
    
    // Log slow operations
    if (mark.duration > 100) {
      console.warn(`[Performance] Slow operation: ${name} took ${mark.duration.toFixed(2)}ms`);
    }
    
    return mark.duration;
  }

  measure(name: string, fn: () => void): number {
    this.start(name);
    fn();
    return this.end(name) || 0;
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.start(name);
    try {
      return await fn();
    } finally {
      this.end(name);
    }
  }

  disable(): void {
    this.enabled = false;
  }

  enable(): void {
    this.enabled = true;
  }
}

export const performanceMonitor = new PerformanceMonitor();

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Preload critical images
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Batch preload images
 */
export async function preloadImages(srcs: string[]): Promise<void> {
  await processBatch(srcs, preloadImage, 5, 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL PERFORMANCE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initialize platform-wide optimizations
 */
export function initializePlatformOptimizations(): void {
  // Add passive event listeners hint
  const passiveSupported = (() => {
    let passive = false;
    try {
      const options = Object.defineProperty({}, 'passive', {
        get: () => { passive = true; return true; }
      });
      window.addEventListener('test', null as any, options);
      window.removeEventListener('test', null as any, options);
    } catch (e) {}
    return passive;
  })();

  if (passiveSupported) {
    // Make scroll events passive for better performance
    document.addEventListener('touchstart', () => {}, { passive: true });
    document.addEventListener('touchmove', () => {}, { passive: true });
  }

  // Disable React DevTools performance warnings in production
  if (process.env.NODE_ENV === 'production') {
    performanceMonitor.disable();
  }

  console.log('[PlatformOptimizer] Initialized with cache sizes:', {
    profile: profileCache.size(),
    match: matchCache.size(),
    api: apiResponseCache.size()
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  createLazyObserver,
  debounce,
  throttle,
  profileCache,
  matchCache,
  apiResponseCache,
  processBatch,
  createBatcher,
  scheduleIdleWork,
  scheduleRenderWork,
  prefetchData,
  dedupeRequest,
  performanceMonitor,
  preloadImage,
  preloadImages,
  initializePlatformOptimizations
};
