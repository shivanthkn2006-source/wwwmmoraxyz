/**
 * VR PROGRESSIVE LOADER - Prevents crash by staging content loading
 *
 * Progressive and altitude-aware loading model:
 * 1) Skybox/light comes first
 * 2) Terrain unlocks next
 * 3) City structures unlock after terrain
 * 4) Interactives unlock after city
 * 5) Heavy FX unlock last
 *
 * Phase advancement is intentionally step-by-step to avoid "all-at-once"
 * memory spikes when users descend from satellite into the city.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export type VRLoadPhase = 0 | 1 | 2 | 3 | 4 | 5;

export type CameraAltitudeLevel = 'satellite' | 'aerial' | 'city' | 'ground';

export interface VRProgressiveState {
  /** Current load phase (0=nothing, 5=everything) */
  phase: VRLoadPhase;

  /** Camera altitude level based on zoom */
  altitudeLevel: CameraAltitudeLevel;

  /** Phase 1: Sky, ground plane, basic lighting */
  showSkybox: boolean;

  /** Phase 2: Terrain (mountains, floating islands) */
  showTerrain: boolean;

  /** Phase 3: City structures (CyberCity, ProceduralBuildings) */
  showCity: boolean;

  /** Phase 4: Interactive (vehicles, NPCs, animals, avatars) */
  showInteractives: boolean;

  /** Phase 5: Heavy effects (post-processing, particles, engrams, weather) */
  showEffects: boolean;

  /** Whether ground-level details should render (based on altitude) */
  showGroundDetails: boolean;

  /** Loading progress 0-100 */
  loadProgress: number;

  /** Update altitude from camera Y position */
  updateAltitude: (cameraY: number) => void;

  /** Is fully loaded */
  isFullyLoaded: boolean;
}

// Altitude thresholds for visibility
const ALTITUDE = {
  SATELLITE: 200, // Above 200: only skybox + terrain shell
  AERIAL: 80, // 80-200: city structures can unlock
  CITY: 30, // 30-80: interactives can unlock
  GROUND: 30, // Below 30: all effects can unlock
};

export function useVRProgressiveLoader(isActive: boolean): VRProgressiveState {
  const [phase, setPhase] = useState<VRLoadPhase>(0);
  const [altitudeLevel, setAltitudeLevel] = useState<CameraAltitudeLevel>('satellite');
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<VRLoadPhase>(0);
  const lastAdvanceAtRef = useRef<number | null>(null);

  const clearPhaseTimer = useCallback(() => {
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
  }, []);

  const altitudePhaseCap = useCallback((level: CameraAltitudeLevel): VRLoadPhase => {
    switch (level) {
      case 'satellite':
        return 2;
      case 'aerial':
        return 3;
      case 'city':
        return 4;
      case 'ground':
        return 5;
      default:
        return 2;
    }
  }, []);

  const phaseAdvanceDelayMs = useCallback((currentPhase: VRLoadPhase): number => {
    switch (currentPhase) {
      case 0:
        return 150;   // Sky loads almost instantly
      case 1:
        return 400;   // Terrain unlocks fast
      case 2:
        return 2200;  // City waits for terrain to settle
      case 3:
        return 3000;  // Interactives wait for city to settle
      case 4:
        return 3500;  // Effects wait for everything
      default:
        return 3500;
    }
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (!isActive) {
      clearPhaseTimer();
      phaseRef.current = 0;
      lastAdvanceAtRef.current = null;
      setPhase(0);
      setAltitudeLevel('satellite');
      return;
    }

    const tick = () => {
      const cap = altitudePhaseCap(altitudeLevel);
      const current = phaseRef.current;

      if (current < cap) {
        const now = Date.now();
        const lastAdvanceAt = lastAdvanceAtRef.current;
        const phaseDelay = phaseAdvanceDelayMs(current);
        const readyToAdvance =
          lastAdvanceAt === null || now - lastAdvanceAt >= phaseDelay;

        // Stall guard: if main thread stutters and phase gets stuck, force next step.
        const hardStallDetected =
          lastAdvanceAt !== null && now - lastAdvanceAt >= phaseDelay + 2800;

        if (readyToAdvance || hardStallDetected) {
          const next = Math.min(current + 1, cap) as VRLoadPhase;
          phaseRef.current = next;
          lastAdvanceAtRef.current = now;
          setPhase(next);
        }
      }

      clearPhaseTimer();
      if (phaseRef.current < 5) {
        phaseTimerRef.current = setTimeout(
          tick,
          altitudeLevel === 'satellite' ? 320 : 180,
        );
      }
    };

    tick();

    return () => {
      clearPhaseTimer();
    };
  }, [isActive, altitudeLevel, altitudePhaseCap, phaseAdvanceDelayMs, clearPhaseTimer]);

  // Update altitude level from camera position
  const updateAltitude = useCallback((cameraY: number) => {
    const absY = Math.abs(cameraY);
    const nextLevel: CameraAltitudeLevel =
      absY > ALTITUDE.SATELLITE
        ? 'satellite'
        : absY > ALTITUDE.AERIAL
          ? 'aerial'
          : absY > ALTITUDE.CITY
            ? 'city'
            : 'ground';

    setAltitudeLevel((current) => (current === nextLevel ? current : nextLevel));
  }, []);

  const visibilityCap = altitudePhaseCap(altitudeLevel);

  // Render gates require BOTH load phase and current altitude tier
  const showSkybox = phase >= 1;
  const showTerrain = phase >= 2 && visibilityCap >= 2;
  const showCity = phase >= 3 && visibilityCap >= 3;
  const showInteractives = phase >= 4 && visibilityCap >= 4;
  const showEffects = phase >= 5 && visibilityCap >= 5;
  const showGroundDetails = altitudeLevel === 'ground' || altitudeLevel === 'city';

  return {
    phase,
    altitudeLevel,
    showSkybox,
    showTerrain,
    showCity,
    showInteractives,
    showEffects,
    showGroundDetails,
    loadProgress: (phase / 5) * 100,
    updateAltitude,
    isFullyLoaded: phase === 5,
  };
}

export default useVRProgressiveLoader;
