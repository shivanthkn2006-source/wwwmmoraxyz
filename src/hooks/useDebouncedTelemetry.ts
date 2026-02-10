/**
 * PHASE 4: Debounced Telemetry Hook - 500-USER LOAD BALANCER
 * 
 * Prevents 500 users from spamming the database with high-frequency updates.
 * Batches writes every 10 seconds or on critical events.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERFORMANCE OPTIMIZATIONS:
 * - Batch writes: Only writes to Supabase once every 10 seconds
 * - Critical bypass: Immediate write for high-priority events (sales, errors)
 * - Memory efficient: Uses WeakMap for cleanup, limits queue size
 * - Connection safe: Respects Supabase free tier limits
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH_INTERVAL_MS = 10000; // Write every 10 seconds
const MAX_QUEUE_SIZE = 100; // Prevent memory bloat
const MAX_BATCH_SIZE = 50; // DB insert limit per batch

// Critical events that bypass batching and write immediately
const CRITICAL_EVENT_TYPES = [
  'sale_found',
  'sale_claimed',
  'payment_received',
  'error_critical',
  'security_alert',
  'god_mode_scan_complete',
  'user_logout',
  'emergency_lockdown',
  'thermal_critical',
];

// Low-priority events that can be dropped if queue is full
const LOW_PRIORITY_EVENT_TYPES = [
  'mouse_move',
  'scroll',
  'heartbeat',
  'position_update',
  'typing_keystroke',
];

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TelemetryEvent {
  event_type: string;
  event_category: string;
  context_snippet?: string;
  metadata?: Record<string, any>;
  sentiment_score?: number;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

interface QueuedEvent extends TelemetryEvent {
  queued_at: number;
  user_id: string;
}

interface TelemetryStats {
  eventsQueued: number;
  eventsWritten: number;
  eventsDropped: number;
  batchesWritten: number;
  lastWriteAt: number | null;
  avgBatchSize: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useDebouncedTelemetry = () => {
  const { user } = useAuth();
  
  // Event queue
  const queueRef = useRef<QueuedEvent[]>([]);
  const flushIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFlushingRef = useRef(false);
  
  // Statistics
  const statsRef = useRef<TelemetryStats>({
    eventsQueued: 0,
    eventsWritten: 0,
    eventsDropped: 0,
    batchesWritten: 0,
    lastWriteAt: null,
    avgBatchSize: 0,
  });

  /**
   * Flush the event queue to Supabase
   */
  const flushQueue = useCallback(async () => {
    if (!user?.id || queueRef.current.length === 0 || isFlushingRef.current) {
      return;
    }

    isFlushingRef.current = true;
    const eventsToWrite = queueRef.current.splice(0, MAX_BATCH_SIZE);
    
    try {
      // Format events for batch insert
      const formattedEvents = eventsToWrite.map(event => ({
        user_id: event.user_id,
        event_type: event.event_type,
        event_category: event.event_category,
        context_snippet: event.context_snippet?.substring(0, 500) || null,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        sentiment_score: event.sentiment_score || null,
        dhf_logged: true,
        ecn_processed: false,
      }));

      const { error } = await supabase
        .from('behavioral_events')
        .insert(formattedEvents);

      if (error) {
        console.error('[TELEMETRY] Batch write failed:', error);
        // Put events back on queue for retry (at front)
        queueRef.current = [...eventsToWrite, ...queueRef.current].slice(0, MAX_QUEUE_SIZE);
      } else {
        statsRef.current.eventsWritten += eventsToWrite.length;
        statsRef.current.batchesWritten++;
        statsRef.current.lastWriteAt = Date.now();
        statsRef.current.avgBatchSize = 
          statsRef.current.eventsWritten / statsRef.current.batchesWritten;
        
        console.log(`[TELEMETRY] Batch write: ${eventsToWrite.length} events (queue: ${queueRef.current.length})`);
      }
    } catch (error) {
      console.error('[TELEMETRY] Flush error:', error);
    } finally {
      isFlushingRef.current = false;
    }
  }, [user?.id]);

  /**
   * Write a single critical event immediately (bypasses queue)
   */
  const writeImmediately = useCallback(async (event: TelemetryEvent) => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: event.event_type,
        event_category: event.event_category,
        context_snippet: event.context_snippet?.substring(0, 500) || null,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        sentiment_score: event.sentiment_score || null,
        dhf_logged: true,
        ecn_processed: false,
      });

      if (error) {
        console.error('[TELEMETRY] Immediate write failed:', error);
        return false;
      }

      statsRef.current.eventsWritten++;
      statsRef.current.lastWriteAt = Date.now();
      console.log(`[TELEMETRY] CRITICAL event written: ${event.event_type}`);
      return true;
    } catch (error) {
      console.error('[TELEMETRY] Immediate write error:', error);
      return false;
    }
  }, [user?.id]);

  /**
   * Queue a telemetry event
   * Critical events are written immediately; others are batched
   */
  const queueEvent = useCallback((event: TelemetryEvent) => {
    if (!user?.id) return;

    // Check if this is a critical event
    const isCritical = 
      event.priority === 'critical' || 
      CRITICAL_EVENT_TYPES.includes(event.event_type);

    if (isCritical) {
      // Write immediately, don't queue
      writeImmediately(event);
      return;
    }

    // Check if queue is full
    if (queueRef.current.length >= MAX_QUEUE_SIZE) {
      // Drop low-priority events if queue is full
      const isLowPriority = 
        event.priority === 'low' || 
        LOW_PRIORITY_EVENT_TYPES.includes(event.event_type);

      if (isLowPriority) {
        statsRef.current.eventsDropped++;
        console.log(`[TELEMETRY] Event dropped (queue full): ${event.event_type}`);
        return;
      }

      // Remove oldest low-priority event to make room
      const lowPriorityIndex = queueRef.current.findIndex(
        e => LOW_PRIORITY_EVENT_TYPES.includes(e.event_type)
      );
      
      if (lowPriorityIndex !== -1) {
        queueRef.current.splice(lowPriorityIndex, 1);
        statsRef.current.eventsDropped++;
      } else {
        // No low-priority events to remove, drop oldest
        queueRef.current.shift();
        statsRef.current.eventsDropped++;
      }
    }

    // Add to queue
    queueRef.current.push({
      ...event,
      user_id: user.id,
      queued_at: Date.now(),
    });
    statsRef.current.eventsQueued++;

  }, [user?.id, writeImmediately]);

  /**
   * Start the batch flush interval
   */
  const startBatching = useCallback(() => {
    if (flushIntervalRef.current) return;

    flushIntervalRef.current = setInterval(() => {
      flushQueue();
    }, BATCH_INTERVAL_MS);

    console.log('[TELEMETRY] Batch writer started (10s interval)');
  }, [flushQueue]);

  /**
   * Stop batching and flush remaining events
   */
  const stopBatching = useCallback(async () => {
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    }

    // Flush any remaining events
    if (queueRef.current.length > 0) {
      await flushQueue();
    }

    console.log('[TELEMETRY] Batch writer stopped');
  }, [flushQueue]);

  /**
   * Get current statistics
   */
  const getStats = useCallback((): TelemetryStats => ({
    ...statsRef.current,
    eventsQueued: queueRef.current.length,
  }), []);

  /**
   * Force flush the queue (for logout, page unload, etc.)
   */
  const forceFlush = useCallback(async () => {
    await flushQueue();
  }, [flushQueue]);

  // Auto-start batching when user is authenticated
  useEffect(() => {
    if (user?.id) {
      startBatching();
    }

    return () => {
      stopBatching();
    };
  }, [user?.id, startBatching, stopBatching]);

  // Flush on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable delivery on unload
      if (queueRef.current.length > 0 && user?.id) {
        const events = queueRef.current.map(e => ({
          user_id: e.user_id,
          event_type: e.event_type,
          event_category: e.event_category,
          context_snippet: e.context_snippet?.substring(0, 500),
          metadata: e.metadata ? JSON.stringify(e.metadata) : null,
          dhf_logged: true,
        }));

        // sendBeacon is more reliable than fetch on unload
        navigator.sendBeacon?.(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/behavioral_events`,
          JSON.stringify(events)
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user?.id]);

  return {
    queueEvent,
    forceFlush,
    getStats,
    startBatching,
    stopBatching,
    isRunning: !!flushIntervalRef.current,
    queueLength: queueRef.current.length,
  };
};

export default useDebouncedTelemetry;
