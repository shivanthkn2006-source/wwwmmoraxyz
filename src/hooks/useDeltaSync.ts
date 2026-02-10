/**
 * DELTA SYNC HOOK - Bandwidth Saver Protocol
 * 
 * Features:
 * - Timestamp-based syncing (only download what changed)
 * - IndexedDB caching (The Vault)
 * - 24-hour stale time for static data
 * - Manual refresh capability
 * 
 * Outcome: Daily user downloads ~5KB instead of 5MB
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DeltaSyncVault,
  deltaSync,
  deltaSyncSingle,
  STALE_TIMES,
  STORES,
  type DeltaSyncResult,
} from '@/utils/deltaSyncVault';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface DeltaSyncState {
  isInitialized: boolean;
  isSyncing: boolean;
  lastFullSync: string | null;
  stats: {
    totalCached: number;
    staleCount: number;
    totalSizeKB: number;
    bandwidthSavedKB: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useDeltaSync = () => {
  const { user } = useAuth();
  const [state, setState] = useState<DeltaSyncState>({
    isInitialized: false,
    isSyncing: false,
    lastFullSync: null,
    stats: {
      totalCached: 0,
      staleCount: 0,
      totalSizeKB: 0,
      bandwidthSavedKB: 0,
    },
  });

  const bandwidthSavedRef = useRef(0);

  // ═══════════════════════════════════════════════════════════════════
  // SOUL CODEX DELTA SYNC
  // ═══════════════════════════════════════════════════════════════════
  const syncSoulCodex = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return null;

    const result = await deltaSyncSingle(
      user.id,
      'dhf_soul_codex',
      STORES.SOUL_CODEX,
      STALE_TIMES.SOUL_CODEX,
      async () => {
        const { data } = await supabase
          .from('dhf_soul_codex')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        return data;
      },
      forceRefresh
    );

    if (result.fromCache) {
      bandwidthSavedRef.current += 2; // ~2KB per soul codex fetch
    }

    return result;
  }, [user?.id]);

  // ═══════════════════════════════════════════════════════════════════
  // TIMELINE DATA DELTA SYNC  
  // ═══════════════════════════════════════════════════════════════════
  const syncTimeline = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return null;

    const result = await deltaSync(
      user.id,
      'timeline_user_progress',
      STORES.TIMELINE,
      STALE_TIMES.TIMELINE,
      async (lastSync) => {
        let query = supabase
          .from('timeline_user_progress')
          .select('*')
          .eq('user_id', user.id);

        if (lastSync) {
          query = query.gt('last_visit_at', lastSync);
        }

        const { data } = await query;
        return data || [];
      },
      forceRefresh
    );

    if (result.fromCache) {
      bandwidthSavedRef.current += 5; // ~5KB per timeline fetch
    }

    return result;
  }, [user?.id]);

  // ═══════════════════════════════════════════════════════════════════
  // CHAT HISTORY DELTA SYNC
  // ═══════════════════════════════════════════════════════════════════
  const syncChatHistory = useCallback(async (forceRefresh = false, limit = 100) => {
    if (!user?.id) return null;

    const result = await deltaSync(
      user.id,
      'ai_companion_messages',
      STORES.CHAT_HISTORY,
      STALE_TIMES.CHAT_HISTORY,
      async (lastSync) => {
        let query = supabase
          .from('ai_companion_messages')
          .select('*')
          .eq('user_id', user.id)
          // SEPARATION PROTOCOL: keep Classic cache clean; never pull Infinity into global chat-history cache.
          .or('variant.is.null,variant.eq.zoe_classic')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (lastSync) {
          query = query.gt('created_at', lastSync);
        }

        const { data } = await query;
        return data || [];
      },
      forceRefresh
    );

    if (result.fromCache) {
      bandwidthSavedRef.current += 50; // ~50KB for chat history
    }

    return result;
  }, [user?.id]);

  // ═══════════════════════════════════════════════════════════════════
  // RELATIONSHIPS DELTA SYNC
  // ═══════════════════════════════════════════════════════════════════
  const syncRelationships = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return null;

    const result = await deltaSync(
      user.id,
      'dhf_relationship_matrix',
      STORES.RELATIONSHIPS,
      STALE_TIMES.RELATIONSHIPS,
      async (lastSync) => {
        let query = supabase
          .from('dhf_relationship_matrix')
          .select('*')
          .eq('user_id', user.id);

        if (lastSync) {
          query = query.gt('updated_at', lastSync);
        }

        const { data } = await query;
        return data || [];
      },
      forceRefresh
    );

    if (result.fromCache) {
      bandwidthSavedRef.current += 10; // ~10KB for relationships
    }

    return result;
  }, [user?.id]);

  // ═══════════════════════════════════════════════════════════════════
  // USER PROFILE DELTA SYNC
  // ═══════════════════════════════════════════════════════════════════
  const syncProfile = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return null;

    const result = await deltaSyncSingle(
      user.id,
      'profiles',
      STORES.PROFILE,
      STALE_TIMES.PROFILE,
      async () => {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        return data;
      },
      forceRefresh
    );

    if (result.fromCache) {
      bandwidthSavedRef.current += 3; // ~3KB for profile
    }

    return result;
  }, [user?.id]);

  // ═══════════════════════════════════════════════════════════════════
  // ECN STATE DELTA SYNC
  // ═══════════════════════════════════════════════════════════════════
  const syncECNState = useCallback(async (forceRefresh = false, limit = 50) => {
    if (!user?.id) return null;

    const result = await deltaSync(
      user.id,
      'ecn_history',
      STORES.ECN_STATE,
      STALE_TIMES.ECN_STATE,
      async (lastSync) => {
        let query = supabase
          .from('ecn_history')
          .select('*')
          .eq('user_id', user.id)
          .order('recorded_at', { ascending: false })
          .limit(limit);

        if (lastSync) {
          query = query.gt('recorded_at', lastSync);
        }

        const { data } = await query;
        return data || [];
      },
      forceRefresh
    );

    if (result.fromCache) {
      bandwidthSavedRef.current += 15; // ~15KB for ECN history
    }

    return result;
  }, [user?.id]);

  // ═══════════════════════════════════════════════════════════════════
  // FULL DELTA SYNC
  // ═══════════════════════════════════════════════════════════════════
  const performFullDeltaSync = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return;

    setState(prev => ({ ...prev, isSyncing: true }));

    try {
      // Parallel delta sync all data types
      await Promise.all([
        syncProfile(forceRefresh),
        syncSoulCodex(forceRefresh),
        syncTimeline(forceRefresh),
        syncChatHistory(forceRefresh),
        syncRelationships(forceRefresh),
        syncECNState(forceRefresh),
      ]);

      // Update stats
      const stats = await DeltaSyncVault.getStats(user.id);

      setState(prev => ({
        ...prev,
        isInitialized: true,
        isSyncing: false,
        lastFullSync: new Date().toISOString(),
        stats: {
          totalCached: stats.totalCached,
          staleCount: stats.staleCount,
          totalSizeKB: Math.round(stats.totalSize / 1024),
          bandwidthSavedKB: bandwidthSavedRef.current,
        },
      }));

      if (!forceRefresh) {
        console.log(`[DeltaSync] Full sync complete. Bandwidth saved: ${bandwidthSavedRef.current}KB`);
      } else {
        toast.success('Data Refreshed', {
          description: 'All cached data has been updated',
        });
      }

      // Dispatch event for monitoring
      window.dispatchEvent(new CustomEvent('delta-sync-complete', {
        detail: {
          userId: user.id,
          bandwidthSaved: bandwidthSavedRef.current,
          timestamp: Date.now(),
        },
      }));

    } catch (error) {
      console.error('[DeltaSync] Full sync error:', error);
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [user?.id, syncProfile, syncSoulCodex, syncTimeline, syncChatHistory, syncRelationships, syncECNState]);

  // ═══════════════════════════════════════════════════════════════════
  // FORCE REFRESH (Manual override)
  // ═══════════════════════════════════════════════════════════════════
  const forceRefreshAll = useCallback(async () => {
    if (!user?.id) return;
    
    // Clear all caches first
    await DeltaSyncVault.clearAllUserCaches(user.id);
    bandwidthSavedRef.current = 0;
    
    // Perform fresh sync
    await performFullDeltaSync(true);
  }, [user?.id, performFullDeltaSync]);

  // ═══════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (user?.id && !state.isInitialized) {
      performFullDeltaSync();
    }
  }, [user?.id, state.isInitialized, performFullDeltaSync]);

  // ═══════════════════════════════════════════════════════════════════
  // CLEAR CACHE UTILITY
  // ═══════════════════════════════════════════════════════════════════
  const clearCache = useCallback(async () => {
    if (!user?.id) return;
    
    await DeltaSyncVault.clearAllUserCaches(user.id);
    bandwidthSavedRef.current = 0;
    
    setState(prev => ({
      ...prev,
      stats: {
        totalCached: 0,
        staleCount: 0,
        totalSizeKB: 0,
        bandwidthSavedKB: 0,
      },
    }));

    toast.info('Cache Cleared', {
      description: 'All cached data has been removed',
    });
  }, [user?.id]);

  return {
    // State
    ...state,

    // Individual sync functions (for targeted refresh)
    syncProfile,
    syncSoulCodex,
    syncTimeline,
    syncChatHistory,
    syncRelationships,
    syncECNState,

    // Bulk operations
    performFullDeltaSync,
    forceRefreshAll,
    clearCache,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// SPECIFIC DATA HOOKS (For Component-Level Use)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook for Soul Codex with Delta Sync
 */
export const useSoulCodexCached = () => {
  const { user } = useAuth();
  const [codex, setCodex] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncResult, setSyncResult] = useState<DeltaSyncResult<any> | null>(null);

  const refresh = useCallback(async (force = false) => {
    if (!user?.id) return;

    setIsLoading(true);
    const result = await deltaSyncSingle(
      user.id,
      'dhf_soul_codex',
      STORES.SOUL_CODEX,
      STALE_TIMES.SOUL_CODEX,
      async () => {
        const { data } = await supabase
          .from('dhf_soul_codex')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        return data;
      },
      force
    );

    setCodex(result.data);
    setSyncResult(result);
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { codex, isLoading, syncResult, refresh };
};

/**
 * Hook for Chat History with Delta Sync
 */
export const useChatHistoryCached = (limit = 100) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncResult, setSyncResult] = useState<DeltaSyncResult<any[]> | null>(null);

  const refresh = useCallback(async (force = false) => {
    if (!user?.id) return;

    setIsLoading(true);
    const result = await deltaSync(
      user.id,
      'ai_companion_messages',
      STORES.CHAT_HISTORY,
      STALE_TIMES.CHAT_HISTORY,
      async (lastSync) => {
        let query = supabase
          .from('ai_companion_messages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (lastSync) {
          query = query.gt('created_at', lastSync);
        }

        const { data } = await query;
        return data || [];
      },
      force
    );

    setMessages(result.data || []);
    setSyncResult(result);
    setIsLoading(false);
  }, [user?.id, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { messages, isLoading, syncResult, refresh };
};
