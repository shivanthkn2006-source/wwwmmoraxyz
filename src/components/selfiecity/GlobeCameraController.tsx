/**
 * GLOBE CAMERA CONTROLLER
 * 
 * Listens for voice/navigation events and animates the camera to fly to locations.
 * This bridges the voice layer with the Three.js OrbitControls.
 * 
 * Supports:
 * - Voice navigation (fly to location)
 * - Keyboard (arrows, WASD)
 * - Mouse drag
 * - Touch gestures
 * - Trackpad
 */

import { useRef, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GlobeFlyToEvent } from '@/services/globeNavigationService';

const GLOBE_RADIUS = 1;

// Convert lat/lng to 3D position on sphere
const latLngToVector3 = (lat: number, lng: number, radius: number = GLOBE_RADIUS): THREE.Vector3 => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  
  return new THREE.Vector3(x, y, z);
};

interface CameraAnimation {
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  startTime: number;
  duration: number;
  locationName: string;
}

interface RotationInput {
  deltaX: number;
  deltaY: number;
  deltaZoom?: number;
}

const GlobeCameraController: React.FC = () => {
  const { camera, controls } = useThree();
  const animationRef = useRef<CameraAnimation | null>(null);
  const isAnimatingRef = useRef(false);
  const userRotationRef = useRef<RotationInput>({ deltaX: 0, deltaY: 0 });
  const isUserControllingRef = useRef(false);
  const autoRotatePausedRef = useRef(false);

  // Calculate camera position looking at a point on the globe
  const calculateCameraPosition = useCallback((targetPoint: THREE.Vector3, distance: number = 2.5): THREE.Vector3 => {
    const direction = targetPoint.clone().normalize();
    return direction.multiplyScalar(distance);
  }, []);

  // Handle fly-to event
  const handleFlyTo = useCallback((event: CustomEvent<GlobeFlyToEvent>) => {
    const { lat, lng, name, duration = 2000 } = event.detail;
    
    console.log('[GlobeCameraController] Flying to:', name, lat, lng);
    
    // Calculate target position on globe surface
    const targetPoint = latLngToVector3(lat, lng, GLOBE_RADIUS);
    
    // Calculate camera end position (looking at that point from a distance)
    const endPosition = calculateCameraPosition(targetPoint, 2.2);
    
    // Start animation
    animationRef.current = {
      startPosition: camera.position.clone(),
      endPosition,
      startTime: performance.now(),
      duration,
      locationName: name,
    };
    isAnimatingRef.current = true;
    isUserControllingRef.current = false;
    
    // Disable auto-rotate during animation
    if (controls && 'autoRotate' in controls) {
      (controls as any).autoRotate = false;
      autoRotatePausedRef.current = true;
    }
  }, [camera, controls, calculateCameraPosition]);

  // Handle camera control events (zoom, rotate, reset)
  const handleCameraControl = useCallback((event: CustomEvent<{ type: string; zoomLevel?: number }>) => {
    const { type, zoomLevel } = event.detail;
    
    console.log('[GlobeCameraController] Camera control:', type);
    
    switch (type) {
      case 'zoom_in':
        camera.position.multiplyScalar(0.85);
        break;
      case 'zoom_out':
        camera.position.multiplyScalar(1.2);
        // Clamp zoom
        const distOut = camera.position.length();
        if (distOut > 10) camera.position.normalize().multiplyScalar(10);
        break;
      case 'reset':
        animationRef.current = {
          startPosition: camera.position.clone(),
          endPosition: new THREE.Vector3(0, 0, 2.5),
          startTime: performance.now(),
          duration: 1000,
          locationName: 'Reset View',
        };
        isAnimatingRef.current = true;
        break;
      case 'rotate':
        // Toggle auto-rotate
        if (controls && 'autoRotate' in controls) {
          (controls as any).autoRotate = !(controls as any).autoRotate;
        }
        break;
    }
    
    // Clamp min distance
    const dist = camera.position.length();
    if (dist < 1.5) camera.position.normalize().multiplyScalar(1.5);
    
    // Update controls if available
    if (controls && 'update' in controls) {
      (controls as any).update();
    }
  }, [camera, controls]);

  // Handle manual rotation from input controls (keyboard/mouse/touch/trackpad)
  const handleGlobeRotate = useCallback((event: CustomEvent<RotationInput>) => {
    const { deltaX, deltaY, deltaZoom } = event.detail;
    
    userRotationRef.current = { deltaX, deltaY, deltaZoom };
    isUserControllingRef.current = true;
    
    // Pause auto-rotate when user is controlling
    if (controls && 'autoRotate' in controls && (controls as any).autoRotate) {
      (controls as any).autoRotate = false;
      autoRotatePausedRef.current = true;
    }
  }, [controls]);

  // Animation frame
  useFrame(() => {
    // Handle fly-to animation
    if (isAnimatingRef.current && animationRef.current) {
      const { startPosition, endPosition, startTime, duration } = animationRef.current;
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      
      // Interpolate camera position
      camera.position.lerpVectors(startPosition, endPosition, eased);
      camera.lookAt(0, 0, 0);
      
      if (controls && 'update' in controls) {
        (controls as any).update();
      }
      
      // Animation complete
      if (progress >= 1) {
        const completedLocation = animationRef.current?.locationName;
        isAnimatingRef.current = false;
        animationRef.current = null;
        
        // Re-enable auto-rotate after animation (if it wasn't user-initiated)
        if (autoRotatePausedRef.current && controls && 'autoRotate' in controls) {
          (controls as any).autoRotate = true;
          (controls as any).autoRotateSpeed = 0.3;
          autoRotatePausedRef.current = false;
        }
        
        console.log('[GlobeCameraController] Animation complete - dispatching flight-complete');
        
        // PHASE 2: Dispatch flight completion event for Navigation Bus
        window.dispatchEvent(new CustomEvent('globe-flight-animation-complete', {
          detail: { locationName: completedLocation }
        }));
      }
      return;
    }

    // Handle user rotation input (keyboard/touch/mouse)
    const { deltaX, deltaY, deltaZoom } = userRotationRef.current;
    
    if (isUserControllingRef.current && (deltaX !== 0 || deltaY !== 0 || deltaZoom)) {
      // Rotate camera around globe center
      const spherical = new THREE.Spherical();
      spherical.setFromVector3(camera.position);
      
      // Apply rotation
      spherical.theta -= deltaX;
      spherical.phi = Math.max(0.3, Math.min(Math.PI - 0.3, spherical.phi + deltaY));
      
      // Apply zoom if present
      if (deltaZoom) {
        spherical.radius = Math.max(1.5, Math.min(10, spherical.radius + deltaZoom * 0.5));
      }
      
      camera.position.setFromSpherical(spherical);
      camera.lookAt(0, 0, 0);
      
      if (controls && 'update' in controls) {
        (controls as any).update();
      }
      
      // Reset after applying
      userRotationRef.current = { deltaX: 0, deltaY: 0 };
      
      // Resume auto-rotate after user stops controlling (with delay)
      setTimeout(() => {
        if (!isUserControllingRef.current && controls && 'autoRotate' in controls) {
          (controls as any).autoRotate = true;
          (controls as any).autoRotateSpeed = 0.3;
        }
      }, 3000);
      
      isUserControllingRef.current = false;
    }
  });

  // Listen for navigation events
  useEffect(() => {
    const flyToHandler = (e: Event) => handleFlyTo(e as CustomEvent<GlobeFlyToEvent>);
    const controlHandler = (e: Event) => handleCameraControl(e as CustomEvent<any>);
    const rotateHandler = (e: Event) => handleGlobeRotate(e as CustomEvent<RotationInput>);
    
    window.addEventListener('selfie-city-globe-fly-to', flyToHandler);
    window.addEventListener('selfie-city-camera-control', controlHandler);
    window.addEventListener('selfie-city-globe-rotate', rotateHandler);
    
    console.log('[GlobeCameraController] Event listeners registered (fly-to, control, rotate)');
    
    return () => {
      window.removeEventListener('selfie-city-globe-fly-to', flyToHandler);
      window.removeEventListener('selfie-city-camera-control', controlHandler);
      window.removeEventListener('selfie-city-globe-rotate', rotateHandler);
    };
  }, [handleFlyTo, handleCameraControl, handleGlobeRotate]);

  return null; // This is a logic-only component
};

export default GlobeCameraController;
