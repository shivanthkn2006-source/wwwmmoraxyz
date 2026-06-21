/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DATABASE POOL MANAGER - 500 SPARTANS PROTOCOL
 * 
 * Manages connection pooling and request batching for high-concurrency scenarios.
 * Supabase Free Tier allows ~60 direct connections - this ensures we stay under.
 * 
 * CRASH POINT A MITIGATION: Connection Pool Management
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/integrations/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // Maximum concurrent requests (stay well under Supabase's 60 connection limit)
  MAX_CONCURRENT_REQUESTS: 20,
  
  // Request batching window (ms) - batch requests within this window
  BATCH_WINDOW_MS: 50,
  
  // Request timeout (ms)
  REQUEST_TIMEOUT_MS: 10000,
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  
  // Queue size limit
  MAX_QUEUE_SIZE: 500,
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface QueuedRequest<T> {
  id: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  priority: number;
  timestamp: number;
  retries: number;
}

export interface PoolStats {
  activeRequests: number;
  queuedRequests: number;
  completedRequests: number;
  failedRequests: number;
  avgResponseTime: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POOL MANAGER SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

class DatabasePoolManager {
  private static instance: DatabasePoolManager;
  private queue: QueuedRequest<any>[] = [];
  private activeRequests = 0;
  private stats = {
    completed: 0,
    failed: 0,
    totalResponseTime: 0,
  };
  private isProcessing = false;
  private batchTimer: NodeJS.Timeout | null = null;

  private constructor() {
    console.log('[PoolManager] Initialized with max concurrent:', CONFIG.MAX_CONCURRENT_REQUESTS);
  }

  static getInstance(): DatabasePoolManager {
    if (!DatabasePoolManager.instance) {
      DatabasePoolManager.instance = new DatabasePoolManager();
    }
    return DatabasePoolManager.instance;
  }

  /**
   * Queue a database request with automatic batching and concurrency control
   */
  async queueRequest<T>(
    execute: () => Promise<T>,
    priority: number = 5
  ): Promise<T> {
    // Check queue size limit
    if (this.queue.length >= CONFIG.MAX_QUEUE_SIZE) {
      throw new Error('[PoolManager] Queue full - too many pending requests');
    }

    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        execute,
        resolve,
        reject,
        priority,
        timestamp: Date.now(),
        retries: 0,
      };

      // Insert by priority (higher priority = lower number = front of queue)
      const insertIndex = this.queue.findIndex(r => r.priority > priority);
      if (insertIndex === -1) {
        this.queue.push(request);
      } else {
        this.queue.splice(insertIndex, 0, request);
      }

      // Start batch processing if not already running
      this.scheduleBatchProcess();
    });
  }

  /**
   * Schedule batch processing with debouncing
   */
  private scheduleBatchProcess(): void {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      this.processQueue();
    }, CONFIG.BATCH_WINDOW_MS);
  }

  /**
   * Process queued requests with concurrency control
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0 && this.activeRequests < CONFIG.MAX_CONCURRENT_REQUESTS) {
      const request = this.queue.shift();
      if (!request) continue;

      this.activeRequests++;
      this.executeRequest(request);
    }

    this.isProcessing = false;

    // Continue processing if queue still has items
    if (this.queue.length > 0) {
      this.scheduleBatchProcess();
    }
  }

  /**
   * Execute a single request with timeout and retry logic
   */
  private async executeRequest<T>(request: QueuedRequest<T>): Promise<void> {
    const startTime = Date.now();

    try {
      // Add timeout wrapper
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), CONFIG.REQUEST_TIMEOUT_MS);
      });

      const result = await Promise.race([request.execute(), timeoutPromise]);
      
      // Success
      this.stats.completed++;
      this.stats.totalResponseTime += Date.now() - startTime;
      request.resolve(result);

    } catch (error) {
      // Handle retry
      if (request.retries < CONFIG.MAX_RETRIES) {
        request.retries++;
        console.warn(`[PoolManager] Request ${request.id} failed, retry ${request.retries}/${CONFIG.MAX_RETRIES}`);
        
        await new Promise(r => setTimeout(r, CONFIG.RETRY_DELAY_MS * request.retries));
        this.queue.unshift(request); // Add back to front of queue
        
      } else {
        // Max retries exceeded
        this.stats.failed++;
        request.reject(error instanceof Error ? error : new Error(String(error)));
      }

    } finally {
      this.activeRequests--;
      
      // Continue processing queue
      if (this.queue.length > 0) {
        this.scheduleBatchProcess();
      }
    }
  }

  /**
   * Get current pool statistics
   */
  getStats(): PoolStats {
    return {
      activeRequests: this.activeRequests,
      queuedRequests: this.queue.length,
      completedRequests: this.stats.completed,
      failedRequests: this.stats.failed,
      avgResponseTime: this.stats.completed > 0 
        ? this.stats.totalResponseTime / this.stats.completed 
        : 0,
    };
  }

  /**
   * Clear the queue (for cleanup/shutdown)
   */
  clearQueue(): void {
    const pending = this.queue.length;
    this.queue.forEach(r => r.reject(new Error('Queue cleared')));
    this.queue = [];
    console.log(`[PoolManager] Cleared ${pending} pending requests`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH QUERY UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Batch fetch multiple records by IDs with chunking
 * Uses type assertion to handle dynamic table names
 */
export async function batchFetchByIds<T>(
  table: string,
  ids: string[],
  idColumn: string = 'id',
  selectColumns: string = '*',
  chunkSize: number = 50
): Promise<T[]> {
  const pool = DatabasePoolManager.getInstance();
  const chunks: string[][] = [];
  
  for (let i = 0; i < ids.length; i += chunkSize) {
    chunks.push(ids.slice(i, i + chunkSize));
  }

  const results = await Promise.all(
    chunks.map(chunk =>
      pool.queueRequest(async () => {
        const { data, error } = await (supabase
          .from(table as any)
          .select(selectColumns)
          .in(idColumn, chunk) as any);
        
        if (error) throw error;
        return (data || []) as T[];
      }, 3) // Priority 3 = high
    )
  );

  return results.flat();
}

/**
 * Batch insert with chunking
 * Uses type assertion to handle dynamic table names
 */
export async function batchInsert<T extends Record<string, unknown>>(
  table: string,
  records: T[],
  chunkSize: number = 100
): Promise<{ success: number; failed: number }> {
  const pool = DatabasePoolManager.getInstance();
  const chunks: T[][] = [];
  
  for (let i = 0; i < records.length; i += chunkSize) {
    chunks.push(records.slice(i, i + chunkSize));
  }

  let success = 0;
  let failed = 0;

  await Promise.all(
    chunks.map(chunk =>
      pool.queueRequest(async () => {
        const { error } = await (supabase as any).from(table).insert(chunk);
        if (error) {
          failed += chunk.length;
          throw error;
        }
        success += chunk.length;
      }, 5) // Priority 5 = normal
    )
  );

  return { success, failed };
}

/**
 * Pooled query wrapper
 */
export async function pooledQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  priority: number = 5
): Promise<T> {
  const pool = DatabasePoolManager.getInstance();
  
  return pool.queueRequest(async () => {
    const { data, error } = await queryFn();
    if (error) throw error;
    if (data === null) throw new Error('No data returned');
    return data;
  }, priority);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const poolManager = DatabasePoolManager.getInstance();

// Register globally for pooler monitor access
(globalThis as any).__poolManager = poolManager;

export const getPoolStats = () => poolManager.getStats();

export default poolManager;
