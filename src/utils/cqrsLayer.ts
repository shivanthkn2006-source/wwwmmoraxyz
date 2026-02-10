/**
 * CQRS Layer - Command Query Responsibility Segregation
 * Separates read (Query) and write (Command) operations for quadrillion-scale
 */

import { supabase } from '@/integrations/supabase/client';

// Cache configuration
const CACHE_TTL_MS = {
  stabilityScore: 12 * 60 * 60 * 1000, // 12 hours (RAA cycle)
  ecnState: 5 * 60 * 1000, // 5 minutes
  dhfState: 10 * 60 * 1000, // 10 minutes
  relationships: 30 * 60 * 1000, // 30 minutes
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// In-memory cache (would be Redis in production)
const queryCache = new Map<string, CacheEntry<any>>();

/**
 * Check if cache entry is still valid
 */
const isCacheValid = <T>(entry: CacheEntry<T> | undefined): boolean => {
  if (!entry) return false;
  return Date.now() - entry.timestamp < entry.ttl;
};

/**
 * Get from cache or fetch
 */
const getCachedOrFetch = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number
): Promise<T> => {
  const cached = queryCache.get(key);
  if (isCacheValid(cached)) {
    console.log(`[CQRS] Cache hit: ${key}`);
    return cached.data as T;
  }

  console.log(`[CQRS] Cache miss: ${key}, fetching...`);
  const data = await fetcher();
  queryCache.set(key, { data, timestamp: Date.now(), ttl });
  return data;
};

/**
 * Invalidate cache for specific key or pattern
 */
export const invalidateCache = (keyPattern?: string): void => {
  if (!keyPattern) {
    queryCache.clear();
    console.log('[CQRS] Cache cleared completely');
    return;
  }

  for (const key of queryCache.keys()) {
    if (key.includes(keyPattern)) {
      queryCache.delete(key);
      console.log(`[CQRS] Cache invalidated: ${key}`);
    }
  }
};

// ============================================
// QUERY SIDE (Read Replicas Target)
// ============================================

export interface ZoeStateQuery {
  ecn: {
    primary_emotion: string;
    stress_level?: number;
    valence?: number;
  };
  dhf: {
    autonomy_level: number;
  };
  stability_score: number;
  last_event?: string;
  cached_at?: string;
  replica_hint: 'read';
}

/**
 * Query Zoe State - Designed for READ REPLICAS
 * Returns cached/stale data acceptable for UI rendering
 */
export const queryZoeState = async (userId: string): Promise<ZoeStateQuery> => {
  const cacheKey = `zoe_state_${userId}`;

  return getCachedOrFetch(
    cacheKey,
    async () => {
      const { data, error } = await supabase.rpc('cqrs_query_zoe_state', {
        p_user_id: userId,
      });

      if (error || !data) {
        console.error('[CQRS] Query error:', error);
        return {
          ecn: { primary_emotion: 'neutral' },
          dhf: { autonomy_level: 0.5 },
          stability_score: 1.0,
          replica_hint: 'read' as const,
        };
      }

      const result = data as unknown as ZoeStateQuery;
      return result;
    },
    CACHE_TTL_MS.ecnState
  );
};

/**
 * Query Stability Score - CACHED heavily (changes every 12 hours)
 * Includes 14-hour failsafe check
 */
export const queryStabilityScore = async (userId: string): Promise<number> => {
  const cacheKey = `stability_score_${userId}`;

  return getCachedOrFetch(
    cacheKey,
    async () => {
      const { data, error } = await supabase.rpc('get_zoe_stability_score', {
        p_user_id: userId,
      });

      if (error) {
        console.error('[CQRS] Stability score error:', error);
        return 0.6; // Critical Unknown fallback
      }

      return data as number;
    },
    CACHE_TTL_MS.stabilityScore
  );
};

/**
 * Query ECN History - Read replica target
 */
export const queryECNHistory = async (
  userId: string,
  limit: number = 10
): Promise<any[]> => {
  const cacheKey = `ecn_history_${userId}_${limit}`;

  return getCachedOrFetch(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from('ecn_history')
        .select('*')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[CQRS] ECN history error:', error);
        return [];
      }

      return data || [];
    },
    CACHE_TTL_MS.ecnState
  );
};

/**
 * Query Relationships from ZSMT (SSOT)
 */
export const queryRelationships = async (userId: string): Promise<any[]> => {
  const cacheKey = `relationships_${userId}`;

  return getCachedOrFetch(
    cacheKey,
    async () => {
      const { data, error } = await (supabase.from('zoe_sovereign_memory') as any)
        .select('relationship_data_jsonb')
        .eq('user_id', userId)
        .eq('event_type', 'relationship_migration')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data?.relationship_data_jsonb) {
        // Fallback to user_relationships table
        const { data: fallbackData } = await supabase
          .from('user_relationships')
          .select('*')
          .or(`requester_id.eq.${userId},related_user_id.eq.${userId}`);
        return fallbackData || [];
      }

      return data.relationship_data_jsonb;
    },
    CACHE_TTL_MS.relationships
  );
};

// ============================================
// COMMAND SIDE (Primary Write Target)
// ============================================

export interface CommandResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Command: Log Event to ZSMT - PRIMARY WRITE ONLY
 */
export const commandLogEvent = async (
  userId: string,
  eventType: string,
  contentText: string,
  zoeStateJson: Record<string, any> = {},
  metadata: Record<string, any> = {}
): Promise<CommandResult> => {
  try {
    const { data, error } = await supabase.rpc('cqrs_command_log_event', {
      p_user_id: userId,
      p_event_type: eventType,
      p_content_text: contentText,
      p_zoe_state_json: zoeStateJson,
      p_metadata: metadata,
    });

    if (error) throw error;

    // Invalidate related caches after write
    invalidateCache(`zoe_state_${userId}`);
    invalidateCache(`ecn_history_${userId}`);

    return { success: true, id: data };
  } catch (error: any) {
    console.error('[CQRS] Command error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Command: Mind Merge - ACID-compliant skill merge
 */
export const commandMindMerge = async (
  userId: string,
  skillId: string,
  skillType: string,
  metadata: Record<string, any> = {}
): Promise<CommandResult> => {
  try {
    const { data, error } = await supabase.rpc('append_merged_mind_entity', {
      p_user_id: userId,
      p_skill_id: skillId,
      p_skill_type: skillType,
      p_skill_metadata: metadata,
    });

    if (error) throw error;

    const result = data as unknown as { success?: boolean; error?: string };
    if (!result?.success) {
      return { success: false, error: result?.error || 'SKILL_NOT_VERIFIED' };
    }

    // Invalidate mind merge cache
    invalidateCache(`mind_merge_${userId}`);

    return { success: true, id: skillId };
  } catch (error: any) {
    console.error('[CQRS] Mind merge error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Command: Migrate Relationships to ZSMT
 */
export const commandMigrateRelationships = async (
  userId: string
): Promise<CommandResult> => {
  try {
    const { data, error } = await supabase.rpc('migrate_relationship_to_zsmt', {
      p_user_id: userId,
    });

    if (error) throw error;

    const result = data as unknown as { relationships_migrated?: number };
    // Invalidate relationship cache
    invalidateCache(`relationships_${userId}`);

    return { success: true, id: result?.relationships_migrated?.toString() };
  } catch (error: any) {
    console.error('[CQRS] Relationship migration error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Command: Log RAA Diagnosis - Critical write
 */
export const commandLogRAADiagnosis = async (
  userId: string,
  diagnosis: Record<string, any>,
  stabilityScore: number,
  errorPatterns: any[] = []
): Promise<CommandResult> => {
  try {
    const { data, error } = await supabase.rpc('log_raa_diagnosis', {
      p_user_id: userId,
      p_rca_diagnosis: diagnosis,
      p_stability_score: stabilityScore,
      p_error_patterns: errorPatterns,
    });

    if (error) throw error;

    // Invalidate stability score cache after RAA audit
    invalidateCache(`stability_score_${userId}`);
    invalidateCache(`zoe_state_${userId}`);

    return { success: true, id: data };
  } catch (error: any) {
    console.error('[CQRS] RAA diagnosis error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// CQRS ROUTING HELPER
// ============================================

export type CQRSOperationType = 'query' | 'command';

/**
 * Determine if operation should use read replica or primary
 */
export const getCQRSRoute = (operation: string): CQRSOperationType => {
  const commandOperations = [
    'log_event',
    'mind_merge',
    'relationship_migrate',
    'raa_diagnosis',
    'veto_override',
    'skill_upload',
    'chat_message',
    'voice_command',
  ];

  return commandOperations.includes(operation) ? 'command' : 'query';
};

/**
 * Get cache statistics for debugging
 */
export const getCacheStats = (): { size: number; keys: string[] } => {
  return {
    size: queryCache.size,
    keys: Array.from(queryCache.keys()),
  };
};
