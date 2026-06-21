/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY — BACKGROUND SYNC QUEUE (Phase 4)
 * Intelligent background sync with priority queuing and retry logic
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { offlineDB, syncQueue, networkStatus } from '@/db/OfflineDB';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type SyncPriority = 'critical' | 'high' | 'normal' | 'low';

export interface SyncTask {
  id: string;
  type: 'message' | 'profile' | 'mail' | 'life_pattern';
  priority: SyncPriority;
  payload: any;
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  estimatedSize?: number; // bytes
}

export interface BackgroundSyncState {
  isActive: boolean;
  queueSize: number;
  currentTask: SyncTask | null;
  downloadProgress: number; // 0-100 for life pattern download
  lastSyncAt: Date | null;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const SYNC_PRIORITIES: Record<SyncPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const RETRY_DELAYS: Record<number, number> = {
  1: 1000,     // 1 second
  2: 5000,     // 5 seconds
  3: 30000,    // 30 seconds
  4: 120000,   // 2 minutes
  5: 300000,   // 5 minutes
};

const MAX_QUEUE_SIZE = 500;
const LIFE_PATTERN_MAX_SIZE = 50 * 1024 * 1024; // 50MB

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC QUEUE MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class SyncQueueManager {
  private queue: SyncTask[] = [];
  private isProcessing = false;
  private listeners: Set<(state: BackgroundSyncState) => void> = new Set();
  private processNextTimer: ReturnType<typeof setTimeout> | null = null; // BUG FIX: Track timer to prevent duplicates
  private state: BackgroundSyncState = {
    isActive: false,
    queueSize: 0,
    currentTask: null,
    downloadProgress: 0,
    lastSyncAt: null,
    errors: [],
  };

  /**
   * Add task to queue with priority sorting
   */
  addTask(task: Omit<SyncTask, 'id' | 'createdAt' | 'attempts'>): string {
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      // Remove lowest priority items
      this.queue = this.queue
        .sort((a, b) => SYNC_PRIORITIES[a.priority] - SYNC_PRIORITIES[b.priority])
        .slice(0, MAX_QUEUE_SIZE - 1);
    }

    const newTask: SyncTask = {
      ...task,
      id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date(),
      attempts: 0,
    };

    this.queue.push(newTask);
    this.sortQueue();
    this.updateState({ queueSize: this.queue.length });
    this.processNext();

    return newTask.id;
  }

  /**
   * Check if a task is already queued (prevent duplicates)
   */
  hasTask(type: string, payloadKey?: string, payloadValue?: string): boolean {
    return this.queue.some(task => {
      if (task.type !== type) return false;
      if (!payloadKey) return true;
      return task.payload?.[payloadKey] === payloadValue;
    });
  }

  /**
   * Sort queue by priority and age
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      const priorityDiff = SYNC_PRIORITIES[a.priority] - SYNC_PRIORITIES[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Process next task in queue
   */
  async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0 || !networkStatus.isOnline()) {
      return;
    }

    this.isProcessing = true;
    this.updateState({ isActive: true });

    const task = this.queue[0];
    this.updateState({ currentTask: task });

    try {
      await this.executeTask(task);
      
      // Success - remove from queue
      this.queue.shift();
      this.updateState({ 
        queueSize: this.queue.length,
        lastSyncAt: new Date(),
        currentTask: null,
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      task.attempts++;
      task.lastError = errorMsg;

      if (task.attempts >= task.maxAttempts) {
        // Max retries reached - remove and log error
        this.queue.shift();
        this.updateState({
          queueSize: this.queue.length,
          errors: [...this.state.errors.slice(-9), errorMsg],
          currentTask: null,
        });
      } else {
        // Schedule retry with exponential backoff
        const delay = RETRY_DELAYS[task.attempts] || 300000;
        setTimeout(() => this.processNext(), delay);
      }
    }

    this.isProcessing = false;
    this.updateState({ isActive: this.queue.length > 0 });

    // BUG FIX: Clear existing timer before scheduling new one to prevent duplicate timers
    if (this.processNextTimer) {
      clearTimeout(this.processNextTimer);
      this.processNextTimer = null;
    }

    // Continue processing if more tasks
    if (this.queue.length > 0 && networkStatus.isOnline()) {
      this.processNextTimer = setTimeout(() => {
        this.processNextTimer = null;
        this.processNext();
      }, 100);
    }
  }

  /**
   * Execute a sync task
   */
  private async executeTask(task: SyncTask): Promise<void> {
    switch (task.type) {
      case 'message':
        await this.syncMessage(task.payload);
        break;
      case 'profile':
        await this.syncProfile(task.payload);
        break;
      case 'mail':
        await this.syncMail(task.payload);
        break;
      case 'life_pattern':
        await this.downloadLifePattern(task.payload);
        break;
      default:
        console.warn(`[SyncQueue] Unknown task type: ${task.type}`);
    }
  }

  /**
   * Sync a message to cloud
   */
  private async syncMessage(payload: any): Promise<void> {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { error } = await supabase.from('zoe_infinity_messages').upsert({
      id: payload.id,
      user_id: payload.userId,
      role: payload.role,
      content: payload.content,
      media_url: payload.mediaUrl,
      media_type: payload.mediaType,
      metadata: payload.metadata,
      created_at: payload.createdAt,
    }, { onConflict: 'id' });

    if (error) throw error;
  }

  /**
   * Sync profile to cloud
   */
  private async syncProfile(payload: any): Promise<void> {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { error } = await (supabase as any).from('profiles')
      .update({
        display_name: payload.displayName,
        nickname: payload.nickname,
      })
      .eq('user_id', payload.userId);

    if (error) throw error;
  }

  /**
   * Sync mail to cloud
   */
  private async syncMail(payload: any): Promise<void> {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { error } = await supabase.from('zoe_infinity_mail').upsert(
      {
        id: payload.id,
        recipient_id: payload.userId,
        sender_id: payload.fromUserId,
        subject: payload.subject || 'No Subject',
        body: payload.content || '',
        is_read: payload.isRead,
        created_at: payload.createdAt,
      },
      { onConflict: 'id' }
    );

    if (error) throw error;
  }

  /**
   * Download life pattern data (up to 50MB)
   */
  private async downloadLifePattern(payload: { userId: string }): Promise<void> {
    const { supabase } = await import('@/integrations/supabase/client');
    
    this.updateState({ downloadProgress: 0 });

    // Fetch messages in batches
    const batchSize = 500;
    let offset = 0;
    let totalDownloaded = 0;
    let hasMore = true;

    while (hasMore && totalDownloaded < LIFE_PATTERN_MAX_SIZE) {
      const { data, error } = await supabase
        .from('zoe_infinity_messages')
        .select('*')
        .eq('user_id', payload.userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + batchSize - 1);

      if (error) throw error;

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      // Store in IndexedDB
      const { offlineMessages } = await import('@/db/OfflineDB');
      await offlineMessages.bulkUpsert(
        data.map(row => ({
          id: row.id,
          userId: row.user_id,
          role: row.role as 'user' | 'assistant',
          content: row.content,
          mediaUrl: row.media_url,
          mediaType: row.media_type,
          metadata: row.metadata as Record<string, any>,
          createdAt: new Date(row.created_at),
          syncStatus: 'synced' as const,
        }))
      );

      // Estimate size and update progress
      totalDownloaded += JSON.stringify(data).length;
      const progress = Math.min(100, (totalDownloaded / LIFE_PATTERN_MAX_SIZE) * 100);
      this.updateState({ downloadProgress: progress });

      offset += batchSize;
      hasMore = data.length === batchSize;

      // Small delay to not overwhelm the connection
      await new Promise(r => setTimeout(r, 100));
    }

    this.updateState({ downloadProgress: 100 });
    console.log(`[SyncQueue] Life pattern downloaded: ${(totalDownloaded / 1024 / 1024).toFixed(2)}MB`);
  }

  /**
   * Update state and notify listeners
   */
  private updateState(partial: Partial<BackgroundSyncState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: BackgroundSyncState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current state
   */
  getState(): BackgroundSyncState {
    return this.state;
  }

  /**
   * Clear all tasks
   */
  clear(): void {
    this.queue = [];
    this.updateState({ queueSize: 0, currentTask: null });
  }

  /**
   * Retry failed tasks
   */
  retryFailed(): void {
    this.queue.forEach(task => {
      if (task.attempts > 0) {
        task.attempts = 0;
        task.lastError = undefined;
      }
    });
    this.processNext();
  }
}

// Singleton instance
export const syncQueueManager = new SyncQueueManager();

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useBackgroundSync(userId: string | null) {
  const [state, setState] = useState<BackgroundSyncState>(syncQueueManager.getState());
  const hasInitialized = useRef<string | null>(null); // Track which userId was initialized

  // Subscribe to queue state
  useEffect(() => {
    return syncQueueManager.subscribe(setState);
  }, []);

  // Trigger life pattern download on first mount (when online)
  useEffect(() => {
    // Reset if userId changed
    if (hasInitialized.current !== userId) {
      hasInitialized.current = null;
    }
    if (!userId || hasInitialized.current === userId) return;

    const triggerInitialDownload = () => {
      if (networkStatus.isOnline() && !syncQueueManager.hasTask('life_pattern', 'userId', userId)) {
        hasInitialized.current = userId;
        syncQueueManager.addTask({
          type: 'life_pattern',
          priority: 'low',
          payload: { userId },
          maxAttempts: 3,
          estimatedSize: LIFE_PATTERN_MAX_SIZE,
        });
      }
    };

    // Delay to let app initialize first
    const timeout = setTimeout(triggerInitialDownload, 5000);

    // Also trigger when coming online
    const unsubscribe = networkStatus.subscribe((online) => {
      if (online && hasInitialized.current !== userId) {
        triggerInitialDownload();
      }
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [userId]);

  /**
   * Queue a message for sync
   */
  const queueMessage = useCallback((message: any) => {
    return syncQueueManager.addTask({
      type: 'message',
      priority: 'high',
      payload: message,
      maxAttempts: 5,
    });
  }, []);

  /**
   * Queue a profile update
   */
  const queueProfileUpdate = useCallback((profile: any) => {
    return syncQueueManager.addTask({
      type: 'profile',
      priority: 'normal',
      payload: profile,
      maxAttempts: 3,
    });
  }, []);

  /**
   * Trigger full life pattern download
   */
  const downloadLifePattern = useCallback(() => {
    if (!userId) return;
    
    // Prevent duplicate downloads
    if (syncQueueManager.hasTask('life_pattern', 'userId', userId)) {
      console.log('[BackgroundSync] Life pattern download already queued');
      return;
    }
    
    return syncQueueManager.addTask({
      type: 'life_pattern',
      priority: 'low',
      payload: { userId },
      maxAttempts: 3,
      estimatedSize: LIFE_PATTERN_MAX_SIZE,
    });
  }, [userId]);

  /**
   * Clear the sync queue
   */
  const clearQueue = useCallback(() => {
    syncQueueManager.clear();
  }, []);

  /**
   * Retry failed tasks
   */
  const retryFailed = useCallback(() => {
    syncQueueManager.retryFailed();
  }, []);

  return {
    ...state,
    queueMessage,
    queueProfileUpdate,
    downloadLifePattern,
    clearQueue,
    retryFailed,
  };
}

export default useBackgroundSync;
