/**
 * GLOBE CAMERA CONTROLLER
 * 
 * Exposes OrbitControls functionality to voice commands and external triggers.
 * Provides ref-based access for programmatic camera control.
 */

import { useCallback, useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GlobeCameraAction } from './useSelfieCityVoiceLayer';

// ════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════

const GLOBE_RADIUS = 1;
const DEFAULT_DISTANCE = 2.5;
const MIN_DISTANCE = 1.5;
const MAX_DISTANCE = 10;
const ZOOM_STEP = 0.3;
const ROTATION_SPEED = 0.02;

// ════════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════════

export function latLonToVector3(lat: number, lon: number, radius: number = GLOBE_RADIUS): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
}

export function vector3ToLatLon(position: THREE.Vector3): { lat: number; lng: number } {
  const normalized = position.clone().normalize();
  const lat = 90 - Math.acos(normalized.y) * (180 / Math.PI);
  const lng = Math.atan2(normalized.z, -normalized.x) * (180 / Math.PI) - 180;
  return { lat, lng: lng > 180 ? lng - 360 : lng };
}

// ════════════════════════════════════════════════════════════════
// CAMERA CONTROLLER HOOK
// ════════════════════════════════════════════════════════════════

interface CameraAnimation {
  startPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  startTime: number;
  duration: number;
  onComplete?: () => void;
}

export const useGlobeCameraController = () => {
  const { camera, gl } = useThree();
  const animationRef = useRef<CameraAnimation | null>(null);
  const autoRotateRef = useRef(true);
  const rotationSpeedRef = useRef(0.3);

  // ────────────────────────────────────────────────────────────────
  // FLY TO COORDINATES
  // ────────────────────────────────────────────────────────────────

  const flyTo = useCallback((lat: number, lng: number, duration: number = 2000, onComplete?: () => void) => {
    const targetPosition = latLonToVector3(lat, lng, GLOBE_RADIUS + 0.8);
    const startPosition = camera.position.clone();

    animationRef.current = {
      startPosition,
      targetPosition,
      startTime: Date.now(),
      duration,
      onComplete,
    };

    // Pause auto-rotate during animation
    autoRotateRef.current = false;

    console.log('[CameraController] Flying to:', lat, lng);
  }, [camera]);

  // ────────────────────────────────────────────────────────────────
  // ZOOM CONTROL
  // ────────────────────────────────────────────────────────────────

  const zoom = useCallback((delta: number) => {
    const direction = camera.position.clone().normalize();
    const currentDistance = camera.position.length();
    const newDistance = THREE.MathUtils.clamp(
      currentDistance + delta,
      MIN_DISTANCE,
      MAX_DISTANCE
    );

    camera.position.copy(direction.multiplyScalar(newDistance));
    console.log('[CameraController] Zoom:', delta > 0 ? 'out' : 'in', 'distance:', newDistance);
  }, [camera]);

  const zoomIn = useCallback(() => zoom(-ZOOM_STEP), [zoom]);
  const zoomOut = useCallback(() => zoom(ZOOM_STEP), [zoom]);

  // ────────────────────────────────────────────────────────────────
  // RESET VIEW
  // ────────────────────────────────────────────────────────────────

  const resetView = useCallback(() => {
    const targetPosition = new THREE.Vector3(0, 0, DEFAULT_DISTANCE);
    const startPosition = camera.position.clone();

    animationRef.current = {
      startPosition,
      targetPosition,
      startTime: Date.now(),
      duration: 1000,
      onComplete: () => {
        autoRotateRef.current = true;
      },
    };

    console.log('[CameraController] Resetting view');
  }, [camera]);

  // ────────────────────────────────────────────────────────────────
  // ROTATION CONTROL
  // ────────────────────────────────────────────────────────────────

  const setAutoRotate = useCallback((enabled: boolean, speed?: number) => {
    autoRotateRef.current = enabled;
    if (speed !== undefined) {
      rotationSpeedRef.current = speed;
    }
  }, []);

  const rotate = useCallback((deltaYaw: number, deltaPitch: number = 0) => {
    // Rotate camera around the globe
    const spherical = new THREE.Spherical().setFromVector3(camera.position);
    spherical.theta += deltaYaw;
    spherical.phi = THREE.MathUtils.clamp(
      spherical.phi + deltaPitch,
      Math.PI * 0.15,
      Math.PI * 0.85
    );
    camera.position.setFromSpherical(spherical);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  // ────────────────────────────────────────────────────────────────
  // ANIMATION LOOP
  // ────────────────────────────────────────────────────────────────

  useFrame((state, delta) => {
    // Handle fly-to animation
    if (animationRef.current) {
      const { startPosition, targetPosition, startTime, duration, onComplete } = animationRef.current;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      camera.position.lerpVectors(startPosition, targetPosition, eased);
      camera.lookAt(0, 0, 0);

      if (progress >= 1) {
        animationRef.current = null;
        onComplete?.();
        // Resume auto-rotate after a short delay
        setTimeout(() => { autoRotateRef.current = true; }, 2000);
      }
    }

    // Handle auto-rotation
    if (autoRotateRef.current && !animationRef.current) {
      const spherical = new THREE.Spherical().setFromVector3(camera.position);
      spherical.theta += rotationSpeedRef.current * delta;
      camera.position.setFromSpherical(spherical);
      camera.lookAt(0, 0, 0);
    }
  });

  // ────────────────────────────────────────────────────────────────
  // HANDLE CAMERA ACTION EVENTS
  // ────────────────────────────────────────────────────────────────

  const handleCameraAction = useCallback((action: GlobeCameraAction) => {
    switch (action.type) {
      case 'fly_to':
        if (action.coordinates) {
          flyTo(action.coordinates.lat, action.coordinates.lng, action.duration || 2000);
        }
        break;
      case 'zoom_in':
        zoomIn();
        break;
      case 'zoom_out':
        zoomOut();
        break;
      case 'rotate':
        setAutoRotate(true, 1);
        setTimeout(() => setAutoRotate(true, 0.3), 3000);
        break;
      case 'reset':
        resetView();
        break;
    }
  }, [flyTo, zoomIn, zoomOut, resetView, setAutoRotate]);

  // Listen for camera control events
  useEffect(() => {
    const handleEvent = (e: CustomEvent<GlobeCameraAction>) => {
      handleCameraAction(e.detail);
    };

    window.addEventListener('selfie-city-camera-control', handleEvent as EventListener);
    return () => window.removeEventListener('selfie-city-camera-control', handleEvent as EventListener);
  }, [handleCameraAction]);

  // ────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ────────────────────────────────────────────────────────────────

  return {
    flyTo,
    zoomIn,
    zoomOut,
    zoom,
    resetView,
    rotate,
    setAutoRotate,
    handleCameraAction,

    // State
    isAnimating: animationRef.current !== null,
    isAutoRotating: autoRotateRef.current,
    currentPosition: camera.position.clone(),
    currentLatLng: vector3ToLatLon(camera.position),
  };
};

export default useGlobeCameraController;
