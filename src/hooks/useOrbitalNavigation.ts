/**
 * ORBITAL NAVIGATION SYSTEM - "God View" Camera Controls
 * 
 * Provides seamless transitions between:
 * - Exosphere (Satellite Map View)
 * - Stratosphere (Aerial Drone View)
 * - Ground (Third Person Avatar)
 * - Immersive (First Person VR)
 * 
 * Part of Project Exodus: 2120 Edition - "Planetary Control"
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// Camera altitude levels (in virtual units)
export type ViewLevel = 'exosphere' | 'stratosphere' | 'ground' | 'immersive';

export interface CameraPosition {
  x: number;
  y: number;
  z: number;
  pitch: number; // rotation around x-axis
  yaw: number;   // rotation around y-axis
  fov: number;   // field of view
}

export interface WorldStructure {
  id: string;
  type: 'castle' | 'tower' | 'zone' | 'portal' | 'beacon' | 'custom';
  name: string;
  position: { x: number; y: number; z: number };
  scale: number;
  createdBy: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface OrbitalState {
  viewLevel: ViewLevel;
  altitude: number;
  camera: CameraPosition;
  isTransitioning: boolean;
  transitionProgress: number;
  worldStructures: WorldStructure[];
  activeWaypoint: { x: number; y: number; z: number } | null;
  storyModeActive: boolean;
}

// Altitude thresholds for each view level
const ALTITUDE_THRESHOLDS = {
  exosphere: { min: 10000, max: 50000 },
  stratosphere: { min: 500, max: 10000 },
  ground: { min: 1, max: 500 },
  immersive: { min: 0, max: 1 }
};

// Camera presets for each view level
const CAMERA_PRESETS: Record<ViewLevel, Partial<CameraPosition>> = {
  exosphere: { y: 25000, pitch: -90, fov: 60 },
  stratosphere: { y: 2000, pitch: -60, fov: 75 },
  ground: { y: 50, pitch: -15, fov: 90 },
  immersive: { y: 1.7, pitch: 0, fov: 110 }
};

export const useOrbitalNavigation = () => {
  const { user } = useAuth();
  
  const [state, setState] = useState<OrbitalState>({
    viewLevel: 'exosphere',
    altitude: 25000,
    camera: {
      x: 0, y: 25000, z: 0,
      pitch: -90, yaw: 0, fov: 60
    },
    isTransitioning: false,
    transitionProgress: 0,
    worldStructures: [],
    activeWaypoint: null,
    storyModeActive: false
  });

  const animationRef = useRef<number | null>(null);
  const structureChannelRef = useRef<any>(null);

  // Determine view level from altitude
  const getViewLevelFromAltitude = useCallback((altitude: number): ViewLevel => {
    if (altitude >= ALTITUDE_THRESHOLDS.exosphere.min) return 'exosphere';
    if (altitude >= ALTITUDE_THRESHOLDS.stratosphere.min) return 'stratosphere';
    if (altitude >= ALTITUDE_THRESHOLDS.ground.min) return 'ground';
    return 'immersive';
  }, []);

  // Smooth transition to target altitude
  const transitionToAltitude = useCallback((targetAltitude: number, duration: number = 2000) => {
    if (state.isTransitioning) return;

    const startAltitude = state.altitude;
    const startTime = performance.now();
    const targetLevel = getViewLevelFromAltitude(targetAltitude);
    const targetPreset = CAMERA_PRESETS[targetLevel];

    setState(prev => ({ ...prev, isTransitioning: true, transitionProgress: 0 }));

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-in-out cubic
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const currentAltitude = startAltitude + (targetAltitude - startAltitude) * eased;
      const currentLevel = getViewLevelFromAltitude(currentAltitude);
      
      // Interpolate camera settings
      const currentPitch = state.camera.pitch + 
        ((targetPreset.pitch || 0) - state.camera.pitch) * eased;
      const currentFov = state.camera.fov + 
        ((targetPreset.fov || 90) - state.camera.fov) * eased;

      setState(prev => ({
        ...prev,
        altitude: currentAltitude,
        viewLevel: currentLevel,
        transitionProgress: progress,
        camera: {
          ...prev.camera,
          y: currentAltitude,
          pitch: currentPitch,
          fov: currentFov
        }
      }));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setState(prev => ({ ...prev, isTransitioning: false, transitionProgress: 1 }));
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [state.altitude, state.camera, state.isTransitioning, getViewLevelFromAltitude]);

  // Zoom to specific view level
  const zoomToLevel = useCallback((level: ViewLevel) => {
    const altitudes: Record<ViewLevel, number> = {
      exosphere: 25000,
      stratosphere: 2000,
      ground: 50,
      immersive: 1.7
    };
    transitionToAltitude(altitudes[level]);
  }, [transitionToAltitude]);

  // Handle scroll-based zoom
  const handleScroll = useCallback((deltaY: number) => {
    if (state.isTransitioning) return;

    const zoomFactor = deltaY > 0 ? 0.9 : 1.1;
    let newAltitude = state.altitude * zoomFactor;
    
    // Clamp altitude
    newAltitude = Math.max(ALTITUDE_THRESHOLDS.immersive.min, 
      Math.min(ALTITUDE_THRESHOLDS.exosphere.max, newAltitude));

    const newLevel = getViewLevelFromAltitude(newAltitude);
    const preset = CAMERA_PRESETS[newLevel];

    setState(prev => ({
      ...prev,
      altitude: newAltitude,
      viewLevel: newLevel,
      camera: {
        ...prev.camera,
        y: newAltitude,
        pitch: preset.pitch || prev.camera.pitch,
        fov: preset.fov || prev.camera.fov
      }
    }));
  }, [state.altitude, state.isTransitioning, getViewLevelFromAltitude]);

  // Move camera horizontally
  const panCamera = useCallback((deltaX: number, deltaY: number) => {
    const panSpeed = state.altitude * 0.001;
    setState(prev => ({
      ...prev,
      camera: {
        ...prev.camera,
        x: prev.camera.x + deltaX * panSpeed,
        z: prev.camera.z + deltaY * panSpeed
      }
    }));
  }, [state.altitude]);

  // Rotate camera
  const rotateCamera = useCallback((deltaYaw: number, deltaPitch: number) => {
    setState(prev => ({
      ...prev,
      camera: {
        ...prev.camera,
        yaw: (prev.camera.yaw + deltaYaw) % 360,
        pitch: Math.max(-90, Math.min(90, prev.camera.pitch + deltaPitch))
      }
    }));
  }, []);

  // Add world structure (when Zoe builds something)
  const addWorldStructure = useCallback(async (structure: Omit<WorldStructure, 'id' | 'createdAt'>) => {
    if (!user) return null;

    const newStructure: WorldStructure = {
      ...structure,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };


    // Save to database for persistence using zoe_state_json column
    await supabase.from('zoe_sovereign_memory').insert([{
      user_id: user.id,
      // NOTE: must match DB constraint allowed values
      event_type: 'vr_interaction',
      zoe_state_json: JSON.parse(JSON.stringify(newStructure)),
      command_context: 'vr_world'
    }]);

    setState(prev => ({
      ...prev,
      worldStructures: [...prev.worldStructures, newStructure]
    }));

    // Dispatch event for satellite map update
    window.dispatchEvent(new CustomEvent('orbital-structure-added', {
      detail: newStructure
    }));

    return newStructure;
  }, [user]);

  // Set active waypoint for story mode
  const setWaypoint = useCallback((position: { x: number; y: number; z: number } | null) => {
    setState(prev => ({ ...prev, activeWaypoint: position }));
  }, []);

  // Toggle story mode
  const toggleStoryMode = useCallback((active?: boolean) => {
    setState(prev => ({
      ...prev,
      storyModeActive: active !== undefined ? active : !prev.storyModeActive
    }));
  }, []);

  // Focus on specific structure
  const focusOnStructure = useCallback((structureId: string) => {
    const structure = state.worldStructures.find(s => s.id === structureId);
    if (!structure) return;

    // Transition to aerial view above structure
    transitionToAltitude(500);
    
    // Pan to structure position
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        camera: {
          ...prev.camera,
          x: structure.position.x,
          z: structure.position.z
        }
      }));
    }, 1000);
  }, [state.worldStructures, transitionToAltitude]);

  // Subscribe to real-time structure updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('orbital-structures')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'zoe_sovereign_memory',
          // Keep subscription narrow (and RLS-safe): only your rows
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const row = payload.new as any;
          if (!row || row.command_context !== 'vr_world' || row.event_type !== 'vr_interaction') return;

          const eventData = row.zoe_state_json as WorldStructure;
          if (eventData && !state.worldStructures.find(s => s.id === eventData.id)) {
            setState(prev => ({
              ...prev,
              worldStructures: [...prev.worldStructures, eventData]
            }));
          }
        }
      )
      .subscribe();

    structureChannelRef.current = channel;

    return () => {
      if (structureChannelRef.current) {
        supabase.removeChannel(structureChannelRef.current);
      }
    };
  }, [user]);

  // Load existing structures on mount
  useEffect(() => {
    if (!user) return;

    const loadStructures = async () => {
      const { data } = await supabase
        .from('zoe_sovereign_memory')
        .select('zoe_state_json')
        .eq('user_id', user.id)
        .eq('event_type', 'vr_interaction')
        .eq('command_context', 'vr_world')
        .order('created_at', { ascending: false })
        .limit(100);

      if (data) {
        const structures = data
          .map(d => (d.zoe_state_json as any) as WorldStructure)
          .filter(Boolean);
        setState(prev => ({ ...prev, worldStructures: structures }));
      }
    };

    loadStructures();
  }, [user]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    // State
    ...state,
    
    // Zoom controls
    zoomToLevel,
    transitionToAltitude,
    handleScroll,
    
    // Camera controls
    panCamera,
    rotateCamera,
    
    // World management
    addWorldStructure,
    focusOnStructure,
    
    // Story mode
    setWaypoint,
    toggleStoryMode,
    
    // Helpers
    getViewLevelFromAltitude,
    ALTITUDE_THRESHOLDS
  };
};

export default useOrbitalNavigation;
