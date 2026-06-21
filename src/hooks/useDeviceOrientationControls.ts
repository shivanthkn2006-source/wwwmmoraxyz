// ═══════════════════════════════════════════════════════════════════════════════
// USE DEVICE ORIENTATION CONTROLS - Gyroscope-based camera control
// Enables tilt-to-look on mobile/tablet devices
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';

interface DeviceOrientationState {
  alpha: number; // Z-axis (0-360) - compass direction
  beta: number;  // X-axis (-180 to 180) - front/back tilt
  gamma: number; // Y-axis (-90 to 90) - left/right tilt
}

interface UseDeviceOrientationControlsOptions {
  enabled?: boolean;
  smoothing?: number; // 0-1, higher = smoother but more lag
  sensitivity?: number; // Multiplier for rotation
  initialOffset?: { alpha: number; beta: number; gamma: number };
}

interface UseDeviceOrientationControlsReturn {
  orientation: DeviceOrientationState;
  quaternion: THREE.Quaternion;
  euler: THREE.Euler;
  isSupported: boolean;
  isActive: boolean;
  permissionState: 'granted' | 'denied' | 'prompt' | 'unknown';
  requestPermission: () => Promise<boolean>;
  enable: () => void;
  disable: () => void;
  calibrate: () => void;
  applyToCamera: (camera: THREE.Camera) => void;
}

export const useDeviceOrientationControls = (
  options: UseDeviceOrientationControlsOptions = {}
): UseDeviceOrientationControlsReturn => {
  const {
    enabled = false,
    smoothing = 0.5,
    sensitivity = 1,
  } = options;

  const [orientation, setOrientation] = useState<DeviceOrientationState>({
    alpha: 0,
    beta: 0,
    gamma: 0,
  });
  
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [permissionState, setPermissionState] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  
  const quaternionRef = useRef(new THREE.Quaternion());
  const eulerRef = useRef(new THREE.Euler());
  const calibrationRef = useRef({ alpha: 0, beta: 0, gamma: 0 });
  const smoothedRef = useRef({ alpha: 0, beta: 0, gamma: 0 });

  // Check support on mount
  useEffect(() => {
    const supported = 'DeviceOrientationEvent' in window;
    setIsSupported(supported);
    
    if (supported) {
      // iOS 13+ specific check - requestPermission is iOS-only
      // @ts-expect-error iOS-specific API not in standard TypeScript definitions
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        setPermissionState('prompt');
      } else {
        setPermissionState('granted');
      }
    }
  }, []);

  // Request permission (iOS 13+)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    // iOS 13+ specific - requestPermission is iOS-only API
    // @ts-expect-error iOS-specific API not in standard TypeScript definitions
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        // @ts-expect-error iOS-specific API
        const permission = await DeviceOrientationEvent.requestPermission();
        const granted = permission === 'granted';
        setPermissionState(granted ? 'granted' : 'denied');
        return granted;
      } catch (e) {
        console.error('[Orientation] Permission request failed:', e);
        setPermissionState('denied');
        return false;
      }
    }
    return true;
  }, []);

  // Handle orientation event
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    const alpha = event.alpha ?? 0;
    const beta = event.beta ?? 0;
    const gamma = event.gamma ?? 0;

    // Apply calibration offset
    const calibratedAlpha = alpha - calibrationRef.current.alpha;
    const calibratedBeta = beta - calibrationRef.current.beta;
    const calibratedGamma = gamma - calibrationRef.current.gamma;

    // Apply smoothing
    smoothedRef.current.alpha += (calibratedAlpha - smoothedRef.current.alpha) * (1 - smoothing);
    smoothedRef.current.beta += (calibratedBeta - smoothedRef.current.beta) * (1 - smoothing);
    smoothedRef.current.gamma += (calibratedGamma - smoothedRef.current.gamma) * (1 - smoothing);

    setOrientation({
      alpha: smoothedRef.current.alpha,
      beta: smoothedRef.current.beta,
      gamma: smoothedRef.current.gamma,
    });

    // Convert to Three.js rotation
    // Device orientation uses different coordinate system than Three.js
    const alphaRad = THREE.MathUtils.degToRad(smoothedRef.current.alpha * sensitivity);
    const betaRad = THREE.MathUtils.degToRad(smoothedRef.current.beta * sensitivity);
    const gammaRad = THREE.MathUtils.degToRad(smoothedRef.current.gamma * sensitivity);

    // Set Euler angles (ZXY order for device orientation)
    eulerRef.current.set(betaRad, alphaRad, -gammaRad, 'YXZ');
    
    // Convert to quaternion
    quaternionRef.current.setFromEuler(eulerRef.current);
    
    // Apply screen orientation correction
    const screenOrientation = window.orientation || 0;
    const screenQuaternion = new THREE.Quaternion();
    screenQuaternion.setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      -THREE.MathUtils.degToRad(screenOrientation as number)
    );
    quaternionRef.current.multiply(screenQuaternion);

  }, [smoothing, sensitivity]);

  // Enable/disable controls
  const enable = useCallback(() => {
    if (!isSupported || permissionState === 'denied') return;
    
    if (permissionState === 'prompt') {
      requestPermission().then(granted => {
        if (granted) {
          window.addEventListener('deviceorientation', handleOrientation);
          setIsActive(true);
        }
      });
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
      setIsActive(true);
    }
  }, [isSupported, permissionState, requestPermission, handleOrientation]);

  const disable = useCallback(() => {
    window.removeEventListener('deviceorientation', handleOrientation);
    setIsActive(false);
  }, [handleOrientation]);

  // Calibrate - set current orientation as "zero"
  const calibrate = useCallback(() => {
    calibrationRef.current = {
      alpha: orientation.alpha + calibrationRef.current.alpha,
      beta: orientation.beta + calibrationRef.current.beta,
      gamma: orientation.gamma + calibrationRef.current.gamma,
    };
    smoothedRef.current = { alpha: 0, beta: 0, gamma: 0 };
    setOrientation({ alpha: 0, beta: 0, gamma: 0 });
  }, [orientation]);

  // Apply to Three.js camera
  const applyToCamera = useCallback((camera: THREE.Camera) => {
    if (!isActive) return;
    
    // For a first-person view, we want to look in the direction the phone is pointing
    camera.quaternion.copy(quaternionRef.current);
  }, [isActive]);

  // Auto-enable if option is set
  useEffect(() => {
    if (enabled && isSupported && permissionState === 'granted') {
      enable();
    }
    
    return () => {
      if (isActive) {
        disable();
      }
    };
  }, [enabled, isSupported, permissionState, enable, disable, isActive]);

  // Handle screen orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      // Recalibrate on orientation change
      calibrate();
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [calibrate]);

  return {
    orientation,
    quaternion: quaternionRef.current,
    euler: eulerRef.current,
    isSupported,
    isActive,
    permissionState,
    requestPermission,
    enable,
    disable,
    calibrate,
    applyToCamera,
  };
};

export default useDeviceOrientationControls;
