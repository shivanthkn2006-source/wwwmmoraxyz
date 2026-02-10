// ═══════════════════════════════════════════════════════════════════════════════
// MULTIPLAYER PRESENCE HOOK - Enterprise "Holo-Presence" System
// Real-time multi-user tracking via Supabase Realtime Presence
// Broadcasts camera position every 100ms with smooth interpolation
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PlayerPresence {
  user_id: string;
  display_name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  is_speaking: boolean;
  online_at: string;
  role?: 'user' | 'admin' | 'moderator';
}

interface InterpolatedPlayer extends PlayerPresence {
  targetPosition: { x: number; y: number; z: number };
  targetRotation: { x: number; y: number; z: number };
  lastUpdate: number;
}

interface UseMultiplayerPresenceOptions {
  roomId?: string;
  broadcastInterval?: number;
  enabled?: boolean;
}

export const useMultiplayerPresence = ({
  roomId = 'vr-omega-world',
  broadcastInterval = 100,
  enabled = true,
}: UseMultiplayerPresenceOptions = {}) => {
  const { user } = useAuth();
  const [players, setPlayers] = useState<Map<string, InterpolatedPlayer>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const myPositionRef = useRef({ x: 0, y: 1.6, z: 0 });
  const myRotationRef = useRef({ x: 0, y: 0, z: 0 });
  const isSpeakingRef = useRef(false);
  const displayNameRef = useRef('Player');
  const roleRef = useRef<'user' | 'admin' | 'moderator'>('user');

  // Interpolation function for smooth movement
  const interpolatePlayers = useCallback(() => {
    setPlayers(prev => {
      const now = Date.now();
      const updated = new Map(prev);
      
      updated.forEach((player, id) => {
        if (id === user?.id) return;
        
        // Lerp factor based on time delta
        const dt = Math.min((now - player.lastUpdate) / broadcastInterval, 1);
        const lerpFactor = Math.min(dt * 0.15, 1);
        
        // Smooth interpolation
        player.position = {
          x: player.position.x + (player.targetPosition.x - player.position.x) * lerpFactor,
          y: player.position.y + (player.targetPosition.y - player.position.y) * lerpFactor,
          z: player.position.z + (player.targetPosition.z - player.position.z) * lerpFactor,
        };
        
        player.rotation = {
          x: player.rotation.x + (player.targetRotation.x - player.rotation.x) * lerpFactor,
          y: player.rotation.y + (player.targetRotation.y - player.rotation.y) * lerpFactor,
          z: player.rotation.z + (player.targetRotation.z - player.rotation.z) * lerpFactor,
        };
      });
      
      return updated;
    });
  }, [user?.id, broadcastInterval]);

  // Run interpolation on animation frame
  useEffect(() => {
    if (!enabled) return;
    
    let animationId: number;
    const animate = () => {
      interpolatePlayers();
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(animationId);
  }, [enabled, interpolatePlayers]);

  // Initialize presence channel
  useEffect(() => {
    if (!user || !enabled) return;

    const channel = supabase.channel(`presence:${roomId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PlayerPresence>();
        const newPlayers = new Map<string, InterpolatedPlayer>();
        
        Object.values(state).forEach((presences) => {
          presences.forEach((presence: PlayerPresence) => {
            if (presence.user_id !== user.id) {
              const existing = players.get(presence.user_id);
              newPlayers.set(presence.user_id, {
                ...presence,
                targetPosition: presence.position,
                targetRotation: presence.rotation,
                position: existing?.position || presence.position,
                rotation: existing?.rotation || presence.rotation,
                lastUpdate: Date.now(),
              });
            }
          });
        });
        
        setPlayers(newPlayers);
        console.log('[Multiplayer] Sync - Players:', newPlayers.size);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('[Multiplayer] Player joined:', key, newPresences);
        newPresences.forEach((p: Record<string, any>) => {
          const presence = p as unknown as PlayerPresence;
          if (presence.user_id !== user.id) {
            setPlayers(prev => {
              const updated = new Map(prev);
              updated.set(presence.user_id, {
                ...presence,
                targetPosition: presence.position,
                targetRotation: presence.rotation,
                lastUpdate: Date.now(),
              });
              return updated;
            });
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('[Multiplayer] Player left:', key);
        leftPresences.forEach((p: Record<string, any>) => {
          const presence = p as unknown as PlayerPresence;
          setPlayers(prev => {
            const updated = new Map(prev);
            updated.delete(presence.user_id);
            return updated;
          });
        });
      })
      .on('broadcast', { event: 'world_event' }, (payload) => {
        // Handle global world events from admins
        console.log('[Multiplayer] World event:', payload);
        window.dispatchEvent(new CustomEvent('multiplayer-world-event', { detail: payload.payload }));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setConnectionError(null);
          
          // Track initial presence
          await channel.track({
            user_id: user.id,
            display_name: displayNameRef.current,
            position: myPositionRef.current,
            rotation: myRotationRef.current,
            is_speaking: isSpeakingRef.current,
            online_at: new Date().toISOString(),
            role: roleRef.current,
          });
          
          console.log('[Multiplayer] Connected to room:', roomId);
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionError('Failed to connect to multiplayer');
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    // Broadcast position at regular intervals
    const broadcastInterval$ = setInterval(async () => {
      if (channelRef.current && isConnected) {
        await channelRef.current.track({
          user_id: user.id,
          display_name: displayNameRef.current,
          position: myPositionRef.current,
          rotation: myRotationRef.current,
          is_speaking: isSpeakingRef.current,
          online_at: new Date().toISOString(),
          role: roleRef.current,
        });
      }
    }, broadcastInterval);

    return () => {
      clearInterval(broadcastInterval$);
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [user, roomId, enabled, broadcastInterval]);

  // Update local player position
  const updateMyPosition = useCallback((position: { x: number; y: number; z: number }) => {
    myPositionRef.current = position;
  }, []);

  // Update local player rotation
  const updateMyRotation = useCallback((rotation: { x: number; y: number; z: number }) => {
    myRotationRef.current = rotation;
  }, []);

  // Update speaking state
  const setIsSpeaking = useCallback((speaking: boolean) => {
    isSpeakingRef.current = speaking;
  }, []);

  // Set display name
  const setDisplayName = useCallback((name: string) => {
    displayNameRef.current = name;
  }, []);

  // Set role
  const setRole = useCallback((role: 'user' | 'admin' | 'moderator') => {
    roleRef.current = role;
  }, []);

  // Broadcast world event (admin only)
  const broadcastWorldEvent = useCallback(async (event: string, data?: any) => {
    if (!channelRef.current) return;
    
    await channelRef.current.send({
      type: 'broadcast',
      event: 'world_event',
      payload: { event, data, from: user?.id },
    });
    
    console.log('[Multiplayer] Broadcast world event:', event);
  }, [user?.id]);

  // Get other players as array
  const otherPlayers = Array.from(players.values());

  return {
    players: otherPlayers,
    playerCount: players.size,
    isConnected,
    connectionError,
    updateMyPosition,
    updateMyRotation,
    setIsSpeaking,
    setDisplayName,
    setRole,
    broadcastWorldEvent,
    myUserId: user?.id,
  };
};

export default useMultiplayerPresence;
