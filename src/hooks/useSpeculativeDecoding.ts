/**
 * SPECULATIVE DECODING HOOK
 * React integration for Zero-Point Latency Protocol
 * Target: 90ms response time
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  detectQueryType,
  getCachedLogic,
  cacheLogicStructure,
  speculativePreload,
  getSpeculativePreload,
  recordQueryCompletion,
  getLatencyMetrics,
  getCachedStatusReport,
  cacheStatusReport,
  preWarmStatusReportCache,
  clearExpiredPreloads,
  getCacheStats,
  type LatencyMetrics,
} from '@/core/latency/SpeculativeDecoder';

export interface UseSpeculativeDecodingReturn {
  // Core functions
  onKeystroke: (text: string) => Promise<void>;
  executeWithSpeculation: <T>(queryType: string, executor: () => Promise<T>) => Promise<T>;
  
  // Status
  metrics: LatencyMetrics;
  isPreloading: boolean;
  lastQueryType: string | null;
  
  // Cache management
  warmCache: () => Promise<void>;
  clearCache: () => void;
  getCacheInfo: () => { logicCacheSize: number; preloadCacheSize: number };
}

export const useSpeculativeDecoding = (): UseSpeculativeDecodingReturn => {
  const { user } = useAuth();
  const [isPreloading, setIsPreloading] = useState(false);
  const [lastQueryType, setLastQueryType] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<LatencyMetrics>(getLatencyMetrics());
  
  const isWarmingRef = useRef(false);
  
  /**
   * Resource preloader for speculative execution
   */
  const resourceLoader = useCallback(async (resourceKey: string): Promise<any> => {
    if (!user?.id) return null;
    
    const [type, resource] = resourceKey.split(':');
    
    switch (resource) {
      case 'status':
      case 'ecn':
        return supabase.from('ecn_history')
          .select('*')
          .eq('user_id', user.id)
          .order('recorded_at', { ascending: false })
          .limit(5)
          .then(r => r.data);
      
      case 'behavioral':
        return supabase.from('behavioral_events')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)
          .then(r => r.data);
      
      case 'scores':
      case 'metrics':
        return supabase.from('daily_pulse_scores')
          .select('*')
          .eq('user_id', user.id)
          .order('pulse_date', { ascending: false })
          .limit(3)
          .then(r => r.data);
      
      default:
        return null;
    }
  }, [user?.id]);
  
  /**
   * Called on every keystroke for speculative preloading
   */
  const onKeystroke = useCallback(async (text: string): Promise<void> => {
    if (text.length < 2) return;
    
    const queryType = detectQueryType(text);
    if (queryType) {
      setLastQueryType(queryType);
    }
    
    setIsPreloading(true);
    await speculativePreload(text, resourceLoader);
    setIsPreloading(false);
  }, [resourceLoader]);
  
  /**
   * Execute a query with speculative optimization
   * Uses cache and preloaded data for sub-90ms response
   */
  const executeWithSpeculation = useCallback(async <T>(
    queryType: string,
    executor: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    
    // Check for cached logic structure
    const cachedLogic = getCachedLogic(queryType);
    let result: T;
    
    // Check for status report special case
    if (queryType === 'STATUS_REPORT') {
      const cachedReport = getCachedStatusReport();
      if (cachedReport) {
        const latency = performance.now() - startTime;
        recordQueryCompletion(latency, true);
        setMetrics(getLatencyMetrics());
        console.log(`[SPECULATIVE] Status report served from cache in ${latency.toFixed(1)}ms`);
        return cachedReport as T;
      }
    }
    
    // Execute the query
    result = await executor();
    
    const latency = performance.now() - startTime;
    
    // Cache the result for future queries
    if (queryType === 'STATUS_REPORT') {
      cacheStatusReport(result);
    }
    
    // Cache the logic structure
    cacheLogicStructure(queryType, 'default', [], latency);
    recordQueryCompletion(latency, !!cachedLogic);
    setMetrics(getLatencyMetrics());
    
    console.log(`[SPECULATIVE] Query executed: ${queryType} in ${latency.toFixed(1)}ms`);
    
    return result;
  }, []);
  
  /**
   * Pre-warm the cache on app initialization
   */
  const warmCache = useCallback(async (): Promise<void> => {
    if (!user?.id || isWarmingRef.current) return;
    
    isWarmingRef.current = true;
    console.log('[SPECULATIVE] Warming cache...');
    
    try {
      // Pre-warm status report
      await preWarmStatusReportCache(async () => {
        const [ecn, pulse] = await Promise.all([
          supabase.from('ecn_history')
            .select('*')
            .eq('user_id', user.id)
            .order('recorded_at', { ascending: false })
            .limit(5)
            .then(r => r.data),
          supabase.from('daily_pulse_scores')
            .select('*')
            .eq('user_id', user.id)
            .order('pulse_date', { ascending: false })
            .limit(1)
            .then(r => r.data),
        ]);
        
        return {
          ecn,
          pulse,
          timestamp: Date.now(),
          preWarmed: true,
        };
      });
      
      // Pre-load common resources
      await Promise.all([
        resourceLoader('database:status'),
        resourceLoader('database:ecn'),
      ]);
      
      console.log('[SPECULATIVE] Cache warmed successfully');
    } catch (error) {
      console.warn('[SPECULATIVE] Cache warming failed:', error);
    } finally {
      isWarmingRef.current = false;
    }
  }, [user?.id, resourceLoader]);
  
  /**
   * Clear all caches
   */
  const clearCache = useCallback((): void => {
    clearExpiredPreloads();
    console.log('[SPECULATIVE] Cache cleared');
  }, []);
  
  /**
   * Get cache statistics
   */
  const getCacheInfo = useCallback(() => {
    const stats = getCacheStats();
    return {
      logicCacheSize: stats.logicCacheSize,
      preloadCacheSize: stats.preloadCacheSize,
    };
  }, []);
  
  // Auto-warm cache on mount
  useEffect(() => {
    if (user?.id) {
      warmCache();
    }
  }, [user?.id, warmCache]);
  
  // Update metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(getLatencyMetrics());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    onKeystroke,
    executeWithSpeculation,
    metrics,
    isPreloading,
    lastQueryType,
    warmCache,
    clearCache,
    getCacheInfo,
  };
};

export default useSpeculativeDecoding;
