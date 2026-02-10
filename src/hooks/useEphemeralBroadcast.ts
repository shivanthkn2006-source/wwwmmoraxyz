/**
 * PHASE 4: Ephemeral Broadcast Hook - UDP-LIKE REALTIME
 * 
 * Uses Supabase Realtime Broadcast for Live Selfie Map positions.
 * No database writes - pure ephemeral messaging (faster & costs nothing).
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * EPHEMERAL STATE BENEFITS:
 * - Zero database writes: All position data is broadcast-only
 * - Real-time low-latency: ~50ms delivery via WebSocket
 * - Automatic cleanup: State disappears when users disconnect
 * - Scalable: 500 users can broadcast without hitting connection limits
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SelfiePinBroadcast {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  lat: number;
  lng: number;
  selfie_id?: string;
  has_premium: boolean;
  detected_brands?: string[];
  timestamp: number;
}

export interface EphemeralUserState {
  user_id: string;
  display_name: string;
  position: { lat: number; lng: number };
  last_seen: number;
  selfie_preview?: string;
  is_online: boolean;
}

interface BroadcastStats {
  messagesReceived: number;
  messagesSent: number;
  activeUsers: number;
  lastBroadcastAt: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const BROADCAST_CHANNEL = 'selfie-city-live';
const POSITION_THROTTLE_MS = 200; // Don't broadcast more than 5x per second
const STALE_USER_TIMEOUT_MS = 30000; // Remove users after 30s of no updates

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useEphemeralBroadcast = (roomId: string = BROADCAST_CHANNEL) => {
  const { user } = useAuth();
  
  // Channel reference
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastBroadcastRef = useRef<number>(0);
  
  // Ephemeral user states (never persisted to DB)
  const [liveUsers, setLiveUsers] = useState<Map<string, EphemeralUserState>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Stats
  const statsRef = useRef<BroadcastStats>({
    messagesReceived: 0,
    messagesSent: 0,
    activeUsers: 0,
    lastBroadcastAt: null,
  });

  /**
   * Cleanup stale users (haven't been seen in 30s)
   */
  const cleanupStaleUsers = useCallback(() => {
    const now = Date.now();
    setLiveUsers(prev => {
      const cleaned = new Map(prev);
      let removed = 0;
      
      cleaned.forEach((userState, id) => {
        if (now - userState.last_seen > STALE_USER_TIMEOUT_MS) {
          cleaned.delete(id);
          removed++;
        }
      });
      
      if (removed > 0) {
        console.log(`[EPHEMERAL] Cleaned ${removed} stale users`);
      }
      
      return cleaned;
    });
  }, []);

  /**
   * Broadcast my position (throttled)
   */
  const broadcastPosition = useCallback(async (
    lat: number,
    lng: number,
    metadata?: Partial<SelfiePinBroadcast>
  ) => {
    if (!user?.id || !channelRef.current || !isConnected) return false;

    // Throttle broadcasts
    const now = Date.now();
    if (now - lastBroadcastRef.current < POSITION_THROTTLE_MS) {
      return false;
    }
    lastBroadcastRef.current = now;

    const payload: SelfiePinBroadcast = {
      user_id: user.id,
      display_name: metadata?.display_name || 'Explorer',
      avatar_url: metadata?.avatar_url,
      lat,
      lng,
      selfie_id: metadata?.selfie_id,
      has_premium: metadata?.has_premium || false,
      detected_brands: metadata?.detected_brands,
      timestamp: now,
    };

    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'position_update',
        payload,
      });

      statsRef.current.messagesSent++;
      statsRef.current.lastBroadcastAt = now;
      
      return true;
    } catch (error) {
      console.error('[EPHEMERAL] Broadcast failed:', error);
      return false;
    }
  }, [user?.id, isConnected]);

  /**
   * Broadcast a selfie pin (when user takes a photo)
   */
  const broadcastSelfiePin = useCallback(async (
    pin: SelfiePinBroadcast
  ) => {
    if (!channelRef.current || !isConnected) return false;

    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'new_selfie',
        payload: pin,
      });

      statsRef.current.messagesSent++;
      console.log('[EPHEMERAL] Selfie pin broadcasted');
      return true;
    } catch (error) {
      console.error('[EPHEMERAL] Selfie broadcast failed:', error);
      return false;
    }
  }, [isConnected]);

  /**
   * Get current stats
   */
  const getStats = useCallback((): BroadcastStats => ({
    ...statsRef.current,
    activeUsers: liveUsers.size,
  }), [liveUsers.size]);

  /**
   * Get all live users as array
   */
  const getLiveUsersArray = useCallback((): EphemeralUserState[] => {
    return Array.from(liveUsers.values());
  }, [liveUsers]);

  // Initialize broadcast channel
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(roomId, {
      config: {
        broadcast: {
          // Don't acknowledge broadcasts (faster, UDP-like)
          ack: false,
        },
      },
    });

    channel
      .on('broadcast', { event: 'position_update' }, ({ payload }) => {
        const data = payload as SelfiePinBroadcast;
        
        // Don't track ourselves
        if (data.user_id === user.id) return;
        
        statsRef.current.messagesReceived++;

        setLiveUsers(prev => {
          const updated = new Map(prev);
          updated.set(data.user_id, {
            user_id: data.user_id,
            display_name: data.display_name,
            position: { lat: data.lat, lng: data.lng },
            last_seen: data.timestamp,
            selfie_preview: undefined,
            is_online: true,
          });
          return updated;
        });
      })
      .on('broadcast', { event: 'new_selfie' }, ({ payload }) => {
        const pin = payload as SelfiePinBroadcast;
        
        statsRef.current.messagesReceived++;
        
        // Dispatch custom event for map to handle
        window.dispatchEvent(new CustomEvent('ephemeral-selfie', { 
          detail: pin 
        }));
        
        console.log('[EPHEMERAL] Received new selfie from:', pin.display_name);
      })
      .on('broadcast', { event: 'user_left' }, ({ payload }) => {
        const { user_id } = payload as { user_id: string };
        
        setLiveUsers(prev => {
          const updated = new Map(prev);
          updated.delete(user_id);
          return updated;
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setConnectionError(null);
          console.log('[EPHEMERAL] Connected to broadcast channel:', roomId);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setConnectionError('Broadcast channel error');
          console.error('[EPHEMERAL] Channel error');
        } else if (status === 'CLOSED') {
          setIsConnected(false);
          console.log('[EPHEMERAL] Channel closed');
        }
      });

    channelRef.current = channel;

    // Cleanup stale users every 10 seconds
    const cleanupInterval = setInterval(cleanupStaleUsers, 10000);

    return () => {
      clearInterval(cleanupInterval);
      
      // Broadcast that we're leaving
      if (channelRef.current && isConnected) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'user_left',
          payload: { user_id: user.id },
        }).finally(() => {
          channelRef.current?.unsubscribe();
          channelRef.current = null;
        });
      } else if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      
      setIsConnected(false);
    };
  }, [user?.id, roomId, cleanupStaleUsers]);

  return {
    // State
    liveUsers: getLiveUsersArray(),
    liveUserCount: liveUsers.size,
    isConnected,
    connectionError,
    
    // Actions
    broadcastPosition,
    broadcastSelfiePin,
    
    // Stats
    getStats,
    stats: statsRef.current,
  };
};

export default useEphemeralBroadcast;
