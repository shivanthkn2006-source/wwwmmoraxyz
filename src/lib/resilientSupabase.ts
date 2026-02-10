// ═══════════════════════════════════════════════════════════════════════════════
// RESILIENT SUPABASE WRAPPER v2.0
// Handles JWT expiry, auto-refresh, error recovery, and null-safe operations
// Connected to Quantum ASI Bridge for platform-wide stability
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';
import { cleanForDatabase, safeAsync, retryWithBackoff } from './safeOperations';

export interface ResilientQueryResult<T> {
  data: T | null;
  error: PostgrestError | Error | null;
  retried: boolean;
  attempts: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if error is JWT expiry
 */
export function isJWTExpiredError(error: any): boolean {
  if (!error) return false;
  
  const message = String(error.message || '').toLowerCase();
  const code = String(error.code || '');
  
  return (
    code === 'PGRST303' ||
    message.includes('jwt expired') ||
    message.includes('token expired') ||
    message.includes('invalid jwt') ||
    message.includes('jwt malformed')
  );
}

/**
 * Check if error is a connection error (retryable)
 */
export function isConnectionError(error: any): boolean {
  if (!error) return false;
  
  const message = String(error.message || '').toLowerCase();
  
  return (
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('econnrefused')
  );
}

/**
 * Check if error is rate limiting
 */
export function isRateLimitError(error: any): boolean {
  if (!error) return false;
  
  const status = error.status || error.statusCode;
  return status === 429;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Attempt to refresh the session
 */
export async function refreshSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.warn('[ResilientDB] Session refresh failed:', error.message);
      return false;
    }
    console.log('[ResilientDB] Session refreshed successfully');
    return !!data.session;
  } catch (err) {
    console.error('[ResilientDB] Session refresh error:', err);
    return false;
  }
}

/**
 * Get current user ID safely
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESILIENT QUERY EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execute a Supabase query with automatic JWT refresh and retry on connection errors
 */
export async function resilientQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  maxRetries: number = 3
): Promise<ResilientQueryResult<T>> {
  let attempts = 0;
  
  const executeWithRetry = async (): Promise<ResilientQueryResult<T>> => {
    attempts++;
    
    try {
      const result = await queryFn();
      
      // Check for JWT expiry
      if (result.error && isJWTExpiredError(result.error)) {
        console.log('[ResilientDB] JWT expired, attempting refresh...');
        const refreshed = await refreshSession();
        
        if (refreshed && attempts < maxRetries) {
          return executeWithRetry();
        } else {
          return {
            data: null,
            error: new Error('Session expired. Please sign in again.'),
            retried: true,
            attempts
          };
        }
      }
      
      // Check for connection errors (retryable)
      if (result.error && isConnectionError(result.error) && attempts < maxRetries) {
        console.log(`[ResilientDB] Connection error, retrying (attempt ${attempts})...`);
        await new Promise(r => setTimeout(r, 1000 * attempts)); // Exponential backoff
        return executeWithRetry();
      }
      
      return {
        data: result.data,
        error: result.error,
        retried: attempts > 1,
        attempts
      };
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      
      // Retry on connection errors
      if (isConnectionError(error) && attempts < maxRetries) {
        console.log(`[ResilientDB] Caught connection error, retrying (attempt ${attempts})...`);
        await new Promise(r => setTimeout(r, 1000 * attempts));
        return executeWithRetry();
      }
      
      return {
        data: null,
        error,
        retried: attempts > 1,
        attempts
      };
    }
  };
  
  return executeWithRetry();
}

/**
 * Execute an edge function with automatic JWT refresh
 */
export async function resilientInvoke<T>(
  functionName: string,
  options?: { body?: any }
): Promise<ResilientQueryResult<T>> {
  const invoke = async () => {
    const { data, error } = await supabase.functions.invoke(functionName, options);
    return { data: data as T, error: error as PostgrestError | null };
  };

  return resilientQuery(invoke);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAFE DATABASE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wrapper for common select queries with JWT handling
 */
export async function safeSelect<T>(
  table: string,
  query: string = '*',
  filters?: { column: string; value: any }[]
): Promise<ResilientQueryResult<T[]>> {
  return resilientQuery(async () => {
    let q = supabase.from(table as any).select(query);
    
    if (filters) {
      for (const filter of filters) {
        if (filter.value !== undefined && filter.value !== null) {
          q = q.eq(filter.column, filter.value);
        }
      }
    }
    
    const { data, error } = await q;
    return { data: data as T[] | null, error };
  });
}

/**
 * Wrapper for insert with JWT handling and JSON validation
 */
export async function safeInsert<T>(
  table: string,
  insertData: Record<string, any> | Record<string, any>[]
): Promise<ResilientQueryResult<T[]>> {
  // Clean data for JSON fields and remove undefined values
  const cleanData = Array.isArray(insertData) 
    ? insertData.map(cleanForDatabase)
    : [cleanForDatabase(insertData)];

  return resilientQuery(async () => {
    const { data: result, error } = await supabase
      .from(table as any)
      .insert(cleanData as any)
      .select();
    return { data: result as T[] | null, error };
  });
}

/**
 * Wrapper for update with JWT handling and JSON validation
 */
export async function safeUpdate<T>(
  table: string,
  updateData: Record<string, any>,
  filters: { column: string; value: any }[]
): Promise<ResilientQueryResult<T[]>> {
  const cleanData = cleanForDatabase(updateData);

  return resilientQuery(async () => {
    let q = supabase.from(table as any).update(cleanData as any);
    
    for (const filter of filters) {
      if (filter.value !== undefined && filter.value !== null) {
        q = q.eq(filter.column, filter.value);
      }
    }
    
    const { data: result, error } = await q.select();
    return { data: result as T[] | null, error };
  });
}

/**
 * Wrapper for upsert with JWT handling and JSON validation
 */
export async function safeUpsert<T>(
  table: string,
  upsertData: Record<string, any> | Record<string, any>[],
  options?: { onConflict?: string }
): Promise<ResilientQueryResult<T[]>> {
  const cleanData = Array.isArray(upsertData)
    ? upsertData.map(cleanForDatabase)
    : [cleanForDatabase(upsertData)];

  return resilientQuery(async () => {
    const { data: result, error } = await supabase
      .from(table as any)
      .upsert(cleanData as any)
      .select();
    return { data: result as T[] | null, error };
  });
}

/**
 * Wrapper for delete with JWT handling
 */
export async function safeDelete<T>(
  table: string,
  filters: { column: string; value: any }[]
): Promise<ResilientQueryResult<T[]>> {
  return resilientQuery(async () => {
    let q: any = supabase.from(table as any).delete();
    
    for (const filter of filters) {
      if (filter.value !== undefined && filter.value !== null) {
        q = q.eq(filter.column, filter.value);
      }
    }
    
    const { data: result, error } = await q.select();
    return { data: result as T[] | null, error };
  });
}

/**
 * Safe RPC call with retry
 */
export async function safeRpc<T>(
  fnName: string,
  params?: Record<string, any>
): Promise<ResilientQueryResult<T>> {
  return resilientQuery(async () => {
    const { data, error } = await supabase.rpc(fnName as any, params);
    return { data: data as T | null, error };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execute multiple queries in parallel with error handling
 */
export async function batchQueries<T>(
  queries: (() => Promise<ResilientQueryResult<T>>)[]
): Promise<ResilientQueryResult<T>[]> {
  return Promise.all(queries.map(q => 
    safeAsync(q, { data: null, error: new Error('Batch query failed'), retried: false, attempts: 0 })
  ));
}

export default {
  resilientQuery,
  resilientInvoke,
  safeSelect,
  safeInsert,
  safeUpdate,
  safeUpsert,
  safeDelete,
  safeRpc,
  batchQueries,
  refreshSession,
  getCurrentUserId,
  isJWTExpiredError,
  isConnectionError,
  isRateLimitError
};
