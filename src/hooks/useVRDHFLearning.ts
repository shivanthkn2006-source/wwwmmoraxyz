// ═══════════════════════════════════════════════════════════════════════════════
// VR DHF ADAPTIVE LEARNING HOOK
// Real-time tracking of all VR activities for Zoe's adaptive learning
// Uploads user behavior, preferences, and patterns to DHF
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

// VR Activity Types for DHF Learning
export interface VRActivityEvent {
  event_type: 
    | 'vr_movement' 
    | 'vr_interaction' 
    | 'vr_voice_command'
    | 'vr_environment_change'
    | 'vr_building_created'
    | 'vr_vehicle_action'
    | 'vr_avatar_change'
    | 'vr_memory_viewed'
    | 'vr_bio_sync'
    | 'vr_session_activity'
    | 'vr_weather_change'
    | 'vr_time_change'
    | 'vr_haptic_feedback'
    | 'vr_webxr_action';
  action: string;
  context: string;
  metadata?: Record<string, any>;
  position?: { x: number; y: number; z: number };
  timestamp: Date;
  duration_ms?: number;
}

export interface VRUserCharacteristics {
  preferred_movement_speed: 'slow' | 'normal' | 'fast';
  preferred_weather: string;
  preferred_time_of_day: string;
  favorite_buildings: string[];
  voice_command_frequency: number;
  interaction_style: 'explorer' | 'builder' | 'social' | 'observer';
  session_duration_avg_ms: number;
  bio_sync_usage_count: number;
}

export interface VRSessionStats {
  total_movements: number;
  total_interactions: number;
  total_voice_commands: number;
  buildings_created: number;
  vehicles_used: number;
  memories_viewed: number;
  session_start: Date;
  last_activity: Date;
}

export const useVRDHFLearning = () => {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [sessionStats, setSessionStats] = useState<VRSessionStats>({
    total_movements: 0,
    total_interactions: 0,
    total_voice_commands: 0,
    buildings_created: 0,
    vehicles_used: 0,
    memories_viewed: 0,
    session_start: new Date(),
    last_activity: new Date(),
  });

  const eventBuffer = useRef<VRActivityEvent[]>([]);
  const flushInterval = useRef<NodeJS.Timeout | null>(null);
  const sessionId = useRef<string>(crypto.randomUUID());
  const activityStartTime = useRef<Map<string, number>>(new Map());

  // Start VR session tracking
  const startVRSession = useCallback(() => {
    if (!user) return;
    
    sessionId.current = crypto.randomUUID();
    setIsTracking(true);
    setSessionStats({
      total_movements: 0,
      total_interactions: 0,
      total_voice_commands: 0,
      buildings_created: 0,
      vehicles_used: 0,
      memories_viewed: 0,
      session_start: new Date(),
      last_activity: new Date(),
    });

    // Log session start to DHF
    trackVREvent({
      event_type: 'vr_session_activity',
      action: 'session_start',
      context: 'VR OMEGA World session initiated',
      timestamp: new Date(),
      metadata: {
        session_id: sessionId.current,
        user_agent: navigator.userAgent,
        screen_size: `${window.innerWidth}x${window.innerHeight}`,
      },
    });

    console.log('[VR DHF] Session started:', sessionId.current);
  }, [user]);

  // End VR session
  const endVRSession = useCallback(() => {
    if (!isTracking) return;

    const sessionDuration = Date.now() - sessionStats.session_start.getTime();

    trackVREvent({
      event_type: 'vr_session_activity',
      action: 'session_end',
      context: 'VR OMEGA World session ended',
      timestamp: new Date(),
      duration_ms: sessionDuration,
      metadata: {
        session_id: sessionId.current,
        final_stats: sessionStats,
      },
    });

    // Flush remaining events
    flushEventsToServer();
    setIsTracking(false);
    console.log('[VR DHF] Session ended. Duration:', sessionDuration, 'ms');
  }, [isTracking, sessionStats]);

  // Track VR activity event
  const trackVREvent = useCallback((event: VRActivityEvent) => {
    if (!user) return;

    eventBuffer.current.push({
      ...event,
      timestamp: event.timestamp || new Date(),
    });

    // Update session stats
    setSessionStats(prev => {
      const updated = { ...prev, last_activity: new Date() };
      
      switch (event.event_type) {
        case 'vr_movement':
          updated.total_movements++;
          break;
        case 'vr_interaction':
          updated.total_interactions++;
          break;
        case 'vr_voice_command':
          updated.total_voice_commands++;
          break;
        case 'vr_building_created':
          updated.buildings_created++;
          break;
        case 'vr_vehicle_action':
          updated.vehicles_used++;
          break;
        case 'vr_memory_viewed':
          updated.memories_viewed++;
          break;
      }
      
      return updated;
    });

    // Flush if buffer is large
    if (eventBuffer.current.length >= 15) {
      flushEventsToServer();
    }
  }, [user]);

  // Convenience trackers
  const trackMovement = useCallback((direction: string, speed: number, position?: { x: number; y: number; z: number }) => {
    trackVREvent({
      event_type: 'vr_movement',
      action: direction,
      context: `User moved ${direction} at speed ${speed}`,
      position,
      timestamp: new Date(),
      metadata: { speed, direction },
    });
  }, [trackVREvent]);

  const trackVoiceCommand = useCallback((command: string, action: string, success: boolean) => {
    trackVREvent({
      event_type: 'vr_voice_command',
      action,
      context: `Voice command: "${command}"`,
      timestamp: new Date(),
      metadata: { command, action, success },
    });
  }, [trackVREvent]);

  const trackEnvironmentChange = useCallback((changeType: string, value: string) => {
    trackVREvent({
      event_type: 'vr_environment_change',
      action: changeType,
      context: `Environment ${changeType}: ${value}`,
      timestamp: new Date(),
      metadata: { change_type: changeType, value },
    });
  }, [trackVREvent]);

  const trackBuildingCreation = useCallback((buildingType: string, position?: { x: number; y: number; z: number }) => {
    trackVREvent({
      event_type: 'vr_building_created',
      action: 'create',
      context: `Created building: ${buildingType}`,
      position,
      timestamp: new Date(),
      metadata: { building_type: buildingType },
    });
  }, [trackVREvent]);

  const trackVehicleAction = useCallback((action: string, vehicleType?: string) => {
    trackVREvent({
      event_type: 'vr_vehicle_action',
      action,
      context: `Vehicle ${action}: ${vehicleType || 'unknown'}`,
      timestamp: new Date(),
      metadata: { action, vehicle_type: vehicleType },
    });
  }, [trackVREvent]);

  const trackMemoryViewed = useCallback((memoryId: string, emotion: string, intensity: number) => {
    trackVREvent({
      event_type: 'vr_memory_viewed',
      action: 'view',
      context: `Viewed memory with emotion: ${emotion}`,
      timestamp: new Date(),
      metadata: { memory_id: memoryId, emotion, intensity },
    });
  }, [trackVREvent]);

  const trackBioSync = useCallback((success: boolean, progress: number) => {
    trackVREvent({
      event_type: 'vr_bio_sync',
      action: success ? 'complete' : 'attempt',
      context: success ? 'Bio-Sync completed' : `Bio-Sync attempt at ${progress}%`,
      timestamp: new Date(),
      metadata: { success, progress },
    });
  }, [trackVREvent]);

  const trackWeatherChange = useCallback((weather: string, source: 'user' | 'auto' | 'real_sync') => {
    trackVREvent({
      event_type: 'vr_weather_change',
      action: weather,
      context: `Weather changed to ${weather} (${source})`,
      timestamp: new Date(),
      metadata: { weather, source },
    });
  }, [trackVREvent]);

  const trackAvatarChange = useCallback((changeType: string, value: string) => {
    trackVREvent({
      event_type: 'vr_avatar_change',
      action: changeType,
      context: `Avatar ${changeType}: ${value}`,
      timestamp: new Date(),
      metadata: { change_type: changeType, value },
    });
  }, [trackVREvent]);

  const trackHapticFeedback = useCallback((pattern: string, intensity: number) => {
    trackVREvent({
      event_type: 'vr_haptic_feedback',
      action: pattern,
      context: `Haptic feedback: ${pattern} at ${intensity}%`,
      timestamp: new Date(),
      metadata: { pattern, intensity },
    });
  }, [trackVREvent]);

  const trackWebXRAction = useCallback((action: string, deviceType?: string) => {
    trackVREvent({
      event_type: 'vr_webxr_action',
      action,
      context: `WebXR ${action} on ${deviceType || 'device'}`,
      timestamp: new Date(),
      metadata: { action, device_type: deviceType },
    });
  }, [trackVREvent]);

  // Flush events to Supabase DHF tables
  const flushEventsToServer = useCallback(async () => {
    if (!user || eventBuffer.current.length === 0) return;

    const eventsToSend = [...eventBuffer.current];
    eventBuffer.current = [];

    try {
      // Insert to behavioral_events for DHF learning
      const { error } = await supabase
        .from('behavioral_events')
        .insert(eventsToSend.map(event => ({
          user_id: user.id,
          event_type: event.event_type,
          event_category: 'vr_activity',
          context_snippet: event.context.substring(0, 100),
          metadata: {
            ...event.metadata,
            action: event.action,
            position: event.position,
            duration_ms: event.duration_ms,
            session_id: sessionId.current,
          },
          session_id: sessionId.current,
          dhf_logged: true,
        })));

      if (error) {
        console.error('[VR DHF] Failed to flush events:', error);
        // Re-add failed events
        eventBuffer.current = [...eventsToSend, ...eventBuffer.current];
      } else {
        console.log(`[VR DHF] Flushed ${eventsToSend.length} events to server`);
      }

      // Also update DHF learning history with session summary
      if (eventsToSend.some(e => e.event_type === 'vr_session_activity')) {
        await supabase
          .from('dhf_learning_history')
          .upsert([{
            user_id: user.id,
            behavioral_shifts: JSON.parse(JSON.stringify({
              vr_session: {
                session_id: sessionId.current,
                stats: {
                  total_movements: sessionStats.total_movements,
                  total_interactions: sessionStats.total_interactions,
                  total_voice_commands: sessionStats.total_voice_commands,
                  buildings_created: sessionStats.buildings_created,
                  vehicles_used: sessionStats.vehicles_used,
                  memories_viewed: sessionStats.memories_viewed,
                  session_start: sessionStats.session_start.toISOString(),
                  last_activity: sessionStats.last_activity.toISOString(),
                },
                timestamp: new Date().toISOString(),
              },
            })),
            last_refinement_at: new Date().toISOString(),
          }]);
      }
    } catch (err) {
      console.error('[VR DHF] Flush error:', err);
      eventBuffer.current = [...eventsToSend, ...eventBuffer.current];
    }
  }, [user, sessionStats]);

  // Set up periodic flush
  useEffect(() => {
    if (isTracking) {
      flushInterval.current = setInterval(flushEventsToServer, 5000);
    }

    return () => {
      if (flushInterval.current) {
        clearInterval(flushInterval.current);
      }
    };
  }, [isTracking, flushEventsToServer]);

  // Listen for VR events and track them
  useEffect(() => {
    if (!isTracking) return;

    const handleVRMove = (e: CustomEvent) => {
      trackMovement(e.detail.direction, e.detail.speed || 1);
    };

    const handleVREnvironment = (e: CustomEvent) => {
      trackEnvironmentChange(e.detail.action, e.detail.action);
    };

    const handleVRBuild = (e: CustomEvent) => {
      trackBuildingCreation(e.detail.type);
    };

    const handleVRVehicle = (e: CustomEvent) => {
      trackVehicleAction(e.detail.action);
    };

    const handleVRVoice = (e: CustomEvent) => {
      trackVoiceCommand(e.detail.command || '', e.detail.action, true);
    };

    window.addEventListener('vr-move', handleVRMove as EventListener);
    window.addEventListener('vr-environment', handleVREnvironment as EventListener);
    window.addEventListener('vr-build', handleVRBuild as EventListener);
    window.addEventListener('vr-vehicle', handleVRVehicle as EventListener);
    window.addEventListener('vr-voice-command', handleVRVoice as EventListener);

    return () => {
      window.removeEventListener('vr-move', handleVRMove as EventListener);
      window.removeEventListener('vr-environment', handleVREnvironment as EventListener);
      window.removeEventListener('vr-build', handleVRBuild as EventListener);
      window.removeEventListener('vr-vehicle', handleVRVehicle as EventListener);
      window.removeEventListener('vr-voice-command', handleVRVoice as EventListener);
    };
  }, [isTracking, trackMovement, trackEnvironmentChange, trackBuildingCreation, trackVehicleAction, trackVoiceCommand]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventBuffer.current.length > 0) {
        flushEventsToServer();
      }
    };
  }, [flushEventsToServer]);

  return {
    isTracking,
    sessionStats,
    sessionId: sessionId.current,
    startVRSession,
    endVRSession,
    trackVREvent,
    trackMovement,
    trackVoiceCommand,
    trackEnvironmentChange,
    trackBuildingCreation,
    trackVehicleAction,
    trackMemoryViewed,
    trackBioSync,
    trackWeatherChange,
    trackAvatarChange,
    trackHapticFeedback,
    trackWebXRAction,
    flushEvents: flushEventsToServer,
  };
};

export default useVRDHFLearning;
