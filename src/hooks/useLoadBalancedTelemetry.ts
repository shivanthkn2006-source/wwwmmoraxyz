/**
 * PHASE 4: Load Balancer Integration - Central Telemetry Manager
 * 
 * Combines debounced telemetry with ephemeral broadcast for 500-user scale.
 * This module coordinates all telemetry to prevent database overload.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * USAGE:
 * 
 * import { useLoadBalancedTelemetry } from '@/hooks/useLoadBalancedTelemetry';
 * 
 * const { logEvent, broadcastPosition } = useLoadBalancedTelemetry();
 * 
 * // This gets batched (every 10s)
 * logEvent('page_view', 'navigation', { page: '/selfie-city' });
 * 
 * // This is ephemeral (no DB write)
 * broadcastPosition(lat, lng, { display_name: 'User' });
 * 
 * // This writes immediately (critical)
 * logEvent('sale_found', 'commerce', { amount: 100 }, 'critical');
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useMemo } from 'react';
import { useDebouncedTelemetry, type TelemetryEvent } from './useDebouncedTelemetry';
import { useEphemeralBroadcast, type SelfiePinBroadcast } from './useEphemeralBroadcast';

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINED STATS
// ═══════════════════════════════════════════════════════════════════════════════

export interface LoadBalancerStats {
  telemetry: {
    eventsQueued: number;
    eventsWritten: number;
    eventsDropped: number;
    batchesWritten: number;
  };
  broadcast: {
    messagesSent: number;
    messagesReceived: number;
    activeUsers: number;
  };
  health: {
    isHealthy: boolean;
    queuePressure: 'low' | 'medium' | 'high';
    connectionStatus: 'connected' | 'disconnected';
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useLoadBalancedTelemetry = (broadcastRoom?: string) => {
  // Debounced telemetry for DB writes
  const telemetry = useDebouncedTelemetry();
  
  // Ephemeral broadcast for real-time positions
  const broadcast = useEphemeralBroadcast(broadcastRoom);

  /**
   * Log a telemetry event (batched or immediate based on priority)
   */
  const logEvent = useCallback((
    eventType: string,
    eventCategory: string,
    metadata?: Record<string, any>,
    priority?: TelemetryEvent['priority']
  ) => {
    telemetry.queueEvent({
      event_type: eventType,
      event_category: eventCategory,
      metadata,
      priority,
    });
  }, [telemetry]);

  /**
   * Log with context snippet (for AI/NLP analysis)
   */
  const logEventWithContext = useCallback((
    eventType: string,
    eventCategory: string,
    contextSnippet: string,
    metadata?: Record<string, any>,
    priority?: TelemetryEvent['priority']
  ) => {
    telemetry.queueEvent({
      event_type: eventType,
      event_category: eventCategory,
      context_snippet: contextSnippet,
      metadata,
      priority,
    });
  }, [telemetry]);

  /**
   * Broadcast position (ephemeral, no DB)
   */
  const broadcastPosition = useCallback((
    lat: number,
    lng: number,
    metadata?: Partial<SelfiePinBroadcast>
  ) => {
    return broadcast.broadcastPosition(lat, lng, metadata);
  }, [broadcast]);

  /**
   * Broadcast a new selfie pin (ephemeral)
   */
  const broadcastSelfie = useCallback((pin: SelfiePinBroadcast) => {
    return broadcast.broadcastSelfiePin(pin);
  }, [broadcast]);

  /**
   * Force flush all pending telemetry (for logout/unload)
   */
  const flushAll = useCallback(async () => {
    await telemetry.forceFlush();
  }, [telemetry]);

  /**
   * Get combined stats
   */
  const getStats = useCallback((): LoadBalancerStats => {
    const telemetryStats = telemetry.getStats();
    const broadcastStats = broadcast.getStats();
    
    // Calculate health
    const queuePressure = 
      telemetryStats.eventsQueued > 80 ? 'high' :
      telemetryStats.eventsQueued > 40 ? 'medium' : 'low';
    
    const isHealthy = 
      broadcast.isConnected && 
      queuePressure !== 'high' &&
      telemetryStats.eventsDropped < 50;

    return {
      telemetry: {
        eventsQueued: telemetryStats.eventsQueued,
        eventsWritten: telemetryStats.eventsWritten,
        eventsDropped: telemetryStats.eventsDropped,
        batchesWritten: telemetryStats.batchesWritten,
      },
      broadcast: {
        messagesSent: broadcastStats.messagesSent,
        messagesReceived: broadcastStats.messagesReceived,
        activeUsers: broadcastStats.activeUsers,
      },
      health: {
        isHealthy,
        queuePressure,
        connectionStatus: broadcast.isConnected ? 'connected' : 'disconnected',
      },
    };
  }, [telemetry, broadcast]);

  /**
   * Computed health status
   */
  const health = useMemo(() => {
    const stats = getStats();
    return stats.health;
  }, [getStats]);

  return {
    // Telemetry (batched DB writes)
    logEvent,
    logEventWithContext,
    flushAll,
    telemetryQueueLength: telemetry.queueLength,
    
    // Broadcast (ephemeral real-time)
    broadcastPosition,
    broadcastSelfie,
    liveUsers: broadcast.liveUsers,
    liveUserCount: broadcast.liveUserCount,
    isBroadcastConnected: broadcast.isConnected,
    
    // Combined stats
    getStats,
    health,
    
    // Pass-through for advanced use
    telemetry,
    broadcast,
  };
};

export default useLoadBalancedTelemetry;
