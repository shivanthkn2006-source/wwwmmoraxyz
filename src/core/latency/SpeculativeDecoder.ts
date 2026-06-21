/**
 * SPECULATIVE DECODER - ZERO-POINT LATENCY PROTOCOL
 * 
 * Target: 90ms response time through:
 * 1. Edge Caching - Cache logic structures for repeated query types
 * 2. Speculative Execution - Pre-load resources based on partial input
 * 3. Predictive Pre-warming - Database connections opened before needed
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CachedLogicStructure {
  queryType: string;
  logicTemplate: string;
  precomputedSteps: string[];
  lastUsed: number;
  hitCount: number;
  avgExecutionMs: number;
}

export interface SpeculativePreload {
  trigger: string;
  resourceType: 'database' | 'api' | 'computation';
  resourceKey: string;
  preloadedAt: number;
  data: any;
  expiresAt: number;
}

export interface LatencyMetrics {
  lastQueryMs: number;
  avgQueryMs: number;
  cacheHitRate: number;
  speculativeHitRate: number;
  totalQueries: number;
  sub90msCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CACHE - Logic Structure Cache
// ═══════════════════════════════════════════════════════════════════════════════

const logicCache = new Map<string, CachedLogicStructure>();
const speculativePreloads = new Map<string, SpeculativePreload>();

// Common query type patterns for instant matching
const QUERY_TYPE_PATTERNS: Array<{ pattern: RegExp; type: string; priority: number }> = [
  { pattern: /^(status|scan|check|report)/i, type: 'STATUS_REPORT', priority: 1 },
  { pattern: /^(analyze|analysis|assess)/i, type: 'ANALYSIS', priority: 2 },
  { pattern: /^(search|find|look)/i, type: 'SEARCH', priority: 3 },
  { pattern: /^(create|make|generate)/i, type: 'CREATION', priority: 4 },
  { pattern: /^(fix|repair|debug)/i, type: 'REPAIR', priority: 5 },
  { pattern: /^(help|how|what|why)/i, type: 'QUERY', priority: 6 },
  { pattern: /^(send|message|notify)/i, type: 'COMMUNICATION', priority: 7 },
  { pattern: /^(schedule|remind|calendar)/i, type: 'TEMPORAL', priority: 8 },
];

// Speculative triggers - what to pre-load when user types these
const SPECULATIVE_TRIGGERS: Array<{ prefix: string; preloads: string[] }> = [
  { prefix: 'check', preloads: ['database:status', 'api:health', 'computation:metrics'] },
  { prefix: 'status', preloads: ['database:ecn', 'database:behavioral', 'computation:scores'] },
  { prefix: 'scan', preloads: ['database:full', 'api:all', 'computation:diagnostics'] },
  { prefix: 'analyze', preloads: ['database:history', 'computation:ml'] },
  { prefix: 'find', preloads: ['database:search', 'api:external'] },
  { prefix: 'fix', preloads: ['database:errors', 'computation:repair'] },
];

// ═══════════════════════════════════════════════════════════════════════════════
// METRICS TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

const metrics: LatencyMetrics = {
  lastQueryMs: 0,
  avgQueryMs: 0,
  cacheHitRate: 0,
  speculativeHitRate: 0,
  totalQueries: 0,
  sub90msCount: 0,
};

let totalLatencySum = 0;
let cacheHits = 0;
let speculativeHits = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect query type from input text (<1ms)
 */
export const detectQueryType = (input: string): string | null => {
  const trimmed = input.trim().toLowerCase();
  
  for (const { pattern, type } of QUERY_TYPE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return type;
    }
  }
  
  return null;
};

/**
 * Get cached logic structure for a query type
 * Returns pre-computed steps if available
 */
export const getCachedLogic = (queryType: string): CachedLogicStructure | null => {
  const cached = logicCache.get(queryType);
  
  if (cached) {
    // Update usage stats
    cached.lastUsed = Date.now();
    cached.hitCount++;
    cacheHits++;
    
    console.log(`[SPECULATIVE] Cache HIT: ${queryType} (${cached.hitCount} hits, avg ${cached.avgExecutionMs.toFixed(1)}ms)`);
    return cached;
  }
  
  return null;
};

/**
 * Cache a logic structure after successful execution
 */
export const cacheLogicStructure = (
  queryType: string,
  logicTemplate: string,
  precomputedSteps: string[],
  executionMs: number
): void => {
  const existing = logicCache.get(queryType);
  
  if (existing) {
    // Update average execution time
    const totalExec = existing.avgExecutionMs * existing.hitCount + executionMs;
    existing.hitCount++;
    existing.avgExecutionMs = totalExec / existing.hitCount;
    existing.lastUsed = Date.now();
    existing.precomputedSteps = precomputedSteps;
  } else {
    logicCache.set(queryType, {
      queryType,
      logicTemplate,
      precomputedSteps,
      lastUsed: Date.now(),
      hitCount: 1,
      avgExecutionMs: executionMs,
    });
  }
  
  console.log(`[SPECULATIVE] Cached logic: ${queryType}`);
};

/**
 * SPECULATIVE EXECUTION - Pre-load resources based on partial input
 * Called on every keystroke for sub-90ms response
 */
export const speculativePreload = async (
  partialInput: string,
  preloadFn: (resourceKey: string) => Promise<any>
): Promise<void> => {
  const trimmed = partialInput.trim().toLowerCase();
  if (trimmed.length < 2) return;
  
  // Find matching triggers
  for (const { prefix, preloads } of SPECULATIVE_TRIGGERS) {
    if (prefix.startsWith(trimmed) || trimmed.startsWith(prefix)) {
      // Pre-load all associated resources
      for (const resourceKey of preloads) {
        if (!speculativePreloads.has(resourceKey)) {
          try {
            const startTime = performance.now();
            const data = await preloadFn(resourceKey);
            const loadTime = performance.now() - startTime;
            
            speculativePreloads.set(resourceKey, {
              trigger: prefix,
              resourceType: resourceKey.split(':')[0] as any,
              resourceKey,
              preloadedAt: Date.now(),
              data,
              expiresAt: Date.now() + 30000, // 30 second TTL
            });
            
            console.log(`[SPECULATIVE] Pre-loaded: ${resourceKey} in ${loadTime.toFixed(1)}ms`);
          } catch (error) {
            console.warn(`[SPECULATIVE] Failed to pre-load: ${resourceKey}`, error);
          }
        }
      }
      break; // Only match first trigger
    }
  }
};

/**
 * Get speculative preload if available
 */
export const getSpeculativePreload = (resourceKey: string): any | null => {
  const preload = speculativePreloads.get(resourceKey);
  
  if (preload && Date.now() < preload.expiresAt) {
    speculativeHits++;
    console.log(`[SPECULATIVE] Preload HIT: ${resourceKey}`);
    return preload.data;
  }
  
  // Expired, remove it
  if (preload) {
    speculativePreloads.delete(resourceKey);
  }
  
  return null;
};

/**
 * Record query completion for metrics
 */
export const recordQueryCompletion = (latencyMs: number, wasCacheHit: boolean): void => {
  metrics.totalQueries++;
  metrics.lastQueryMs = latencyMs;
  totalLatencySum += latencyMs;
  metrics.avgQueryMs = totalLatencySum / metrics.totalQueries;
  
  if (latencyMs < 90) {
    metrics.sub90msCount++;
  }
  
  metrics.cacheHitRate = (cacheHits / metrics.totalQueries) * 100;
  metrics.speculativeHitRate = (speculativeHits / metrics.totalQueries) * 100;
  
  console.log(`[SPECULATIVE] Query completed: ${latencyMs.toFixed(1)}ms | Avg: ${metrics.avgQueryMs.toFixed(1)}ms | Sub-90ms: ${((metrics.sub90msCount / metrics.totalQueries) * 100).toFixed(1)}%`);
};

/**
 * Get current latency metrics
 */
export const getLatencyMetrics = (): LatencyMetrics => ({ ...metrics });

/**
 * Clear expired preloads (call periodically)
 */
export const clearExpiredPreloads = (): number => {
  const now = Date.now();
  let cleared = 0;
  
  for (const [key, preload] of speculativePreloads.entries()) {
    if (now >= preload.expiresAt) {
      speculativePreloads.delete(key);
      cleared++;
    }
  }
  
  // Also clear old cache entries (>1 hour unused)
  const oneHourAgo = now - 3600000;
  for (const [key, cached] of logicCache.entries()) {
    if (cached.lastUsed < oneHourAgo) {
      logicCache.delete(key);
      cleared++;
    }
  }
  
  if (cleared > 0) {
    console.log(`[SPECULATIVE] Cleared ${cleared} expired entries`);
  }
  
  return cleared;
};

/**
 * Get cache statistics for diagnostics
 */
export const getCacheStats = (): {
  logicCacheSize: number;
  preloadCacheSize: number;
  topQueryTypes: Array<{ type: string; hits: number; avgMs: number }>;
} => {
  const topQueryTypes = Array.from(logicCache.values())
    .sort((a, b) => b.hitCount - a.hitCount)
    .slice(0, 5)
    .map(c => ({ type: c.queryType, hits: c.hitCount, avgMs: c.avgExecutionMs }));
  
  return {
    logicCacheSize: logicCache.size,
    preloadCacheSize: speculativePreloads.size,
    topQueryTypes,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS REPORT OPTIMIZER - Special handling for frequent query
// ═══════════════════════════════════════════════════════════════════════════════

const STATUS_REPORT_CACHE_KEY = 'STATUS_REPORT';
let cachedStatusReport: {
  data: any;
  generatedAt: number;
  validUntil: number;
} | null = null;

/**
 * Get cached status report (for instant response)
 */
export const getCachedStatusReport = (): any | null => {
  if (cachedStatusReport && Date.now() < cachedStatusReport.validUntil) {
    console.log(`[SPECULATIVE] Status Report cache HIT (${Date.now() - cachedStatusReport.generatedAt}ms old)`);
    return cachedStatusReport.data;
  }
  return null;
};

/**
 * Cache a status report (5 second TTL for freshness)
 */
export const cacheStatusReport = (data: any): void => {
  cachedStatusReport = {
    data,
    generatedAt: Date.now(),
    validUntil: Date.now() + 5000, // 5 second cache
  };
  console.log('[SPECULATIVE] Status Report cached');
};

/**
 * Pre-warm status report cache (call on app init)
 */
export const preWarmStatusReportCache = async (
  fetchFn: () => Promise<any>
): Promise<void> => {
  try {
    const startTime = performance.now();
    const data = await fetchFn();
    cacheStatusReport(data);
    console.log(`[SPECULATIVE] Status Report pre-warmed in ${(performance.now() - startTime).toFixed(1)}ms`);
  } catch (error) {
    console.warn('[SPECULATIVE] Failed to pre-warm status report:', error);
  }
};

// Auto-cleanup every 60 seconds
if (typeof window !== 'undefined') {
  setInterval(clearExpiredPreloads, 60000);
}

export default {
  detectQueryType,
  getCachedLogic,
  cacheLogicStructure,
  speculativePreload,
  getSpeculativePreload,
  recordQueryCompletion,
  getLatencyMetrics,
  clearExpiredPreloads,
  getCacheStats,
  getCachedStatusReport,
  cacheStatusReport,
  preWarmStatusReportCache,
};
