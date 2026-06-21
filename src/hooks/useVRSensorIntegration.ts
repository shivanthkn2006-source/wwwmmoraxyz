/**
 * VR Sensor Integration Hook
 * Bridges device sensors (accelerometer, gyroscope, vibration) into VR world components
 * 
 * Features:
 * - Head tracking via device orientation
 * - Shake detection for interactions
 * - Haptic feedback for VR events
 * - Motion-based camera control
 * - Battery-aware performance scaling
 * - Ambient light adaptive rendering
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDeviceSensors, Vector3D, DeviceOrientation } from './useDeviceSensors';
import * as THREE from 'three';

export interface VRSensorState {
  // Camera orientation from device
  cameraQuaternion: THREE.Quaternion;
  cameraEuler: THREE.Euler;
  
  // Motion data
  velocity: Vector3D;
  isMoving: boolean;
  isShaking: boolean;
  
  // Environment
  ambientBrightness: number; // 0-1 scale
  batteryLevel: number;
  isLowPower: boolean;
  
  // Capabilities
  hasMotionControl: boolean;
  hasHaptics: boolean;
  sensorsReady: boolean;
}

export interface VRHapticEvents {
  onSelect: () => void;
  onImpact: () => void;
  onEnterZone: () => void;
  onExitZone: () => void;
  onCollision: () => void;
  onTeleport: () => void;
  onMemoryAccess: () => void;
  onZoeResponse: () => void;
  onAlert: () => void;
  onSuccess: () => void;
  custom: (pattern: number | number[]) => void;
}

export const useVRSensorIntegration = (options?: {
  enableMotionCamera?: boolean;
  motionSensitivity?: number;
  hapticIntensity?: 'light' | 'medium' | 'strong';
  lowPowerThreshold?: number;
}) => {
  const {
    enableMotionCamera = true,
    motionSensitivity = 1.0,
    hapticIntensity = 'medium',
    lowPowerThreshold = 0.2,
  } = options ?? {};

  // Device sensors
  const sensors = useDeviceSensors({
    enableMotion: true,
    enableOrientation: true,
    updateInterval: 16, // ~60fps
  });

  // State
  const [sensorState, setSensorState] = useState<VRSensorState>({
    cameraQuaternion: new THREE.Quaternion(),
    cameraEuler: new THREE.Euler(),
    velocity: { x: 0, y: 0, z: 0 },
    isMoving: false,
    isShaking: false,
    ambientBrightness: 1,
    batteryLevel: 1,
    isLowPower: false,
    hasMotionControl: false,
    hasHaptics: false,
    sensorsReady: false,
  });

  const lastOrientationRef = useRef<DeviceOrientation | null>(null);
  const velocityRef = useRef<Vector3D>({ x: 0, y: 0, z: 0 });

  // ═══════════════════════════════════════════════════════════════════════════
  // ORIENTATION TO CAMERA TRANSFORM
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!enableMotionCamera || !sensors.permissionGranted) return;

    const { alpha, beta, gamma } = sensors.orientation;
    
    if (alpha === null || beta === null || gamma === null) return;

    // Convert device orientation to Three.js euler angles
    // Device orientation: alpha (compass), beta (front-back), gamma (left-right)
    // Three.js: x (pitch), y (yaw), z (roll)
    
    const euler = new THREE.Euler();
    const quaternion = new THREE.Quaternion();

    // Convert degrees to radians with sensitivity
    const alphaRad = THREE.MathUtils.degToRad(alpha) * motionSensitivity;
    const betaRad = THREE.MathUtils.degToRad(beta) * motionSensitivity;
    const gammaRad = THREE.MathUtils.degToRad(gamma) * motionSensitivity;

    // Device orientation order is ZXY
    euler.set(betaRad, alphaRad, -gammaRad, 'YXZ');
    quaternion.setFromEuler(euler);

    // Apply screen orientation correction
    const screenOrientation = window.screen?.orientation?.angle || 0;
    const screenQuaternion = new THREE.Quaternion();
    screenQuaternion.setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      -THREE.MathUtils.degToRad(screenOrientation)
    );
    quaternion.multiply(screenQuaternion);

    setSensorState(prev => ({
      ...prev,
      cameraQuaternion: quaternion,
      cameraEuler: euler,
      hasMotionControl: true,
      sensorsReady: true,
    }));

    lastOrientationRef.current = sensors.orientation;
  }, [sensors.orientation, enableMotionCamera, motionSensitivity, sensors.permissionGranted]);

  // ═══════════════════════════════════════════════════════════════════════════
  // MOTION VELOCITY TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const accel = sensors.motion.acceleration;
    if (!accel) return;

    // Integrate acceleration to get velocity (simplified)
    const dt = sensors.motion.interval / 1000 || 0.016;
    const dampening = 0.95; // Velocity decay

    velocityRef.current = {
      x: (velocityRef.current.x + accel.x * dt) * dampening,
      y: (velocityRef.current.y + accel.y * dt) * dampening,
      z: (velocityRef.current.z + accel.z * dt) * dampening,
    };

    const speed = Math.sqrt(
      velocityRef.current.x ** 2 +
      velocityRef.current.y ** 2 +
      velocityRef.current.z ** 2
    );

    setSensorState(prev => ({
      ...prev,
      velocity: velocityRef.current,
      isMoving: speed > 0.5,
      isShaking: sensors.isShaking,
    }));
  }, [sensors.motion, sensors.isShaking]);

  // ═══════════════════════════════════════════════════════════════════════════
  // AMBIENT LIGHT & BATTERY
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    // Ambient light (normalize to 0-1)
    const brightness = sensors.ambientLight !== null 
      ? Math.min(1, sensors.ambientLight / 500) // 500 lux = bright indoor
      : 1;

    // Battery
    const batteryLevel = sensors.battery?.level ?? 1;
    const isLowPower = batteryLevel < lowPowerThreshold || 
      (sensors.battery?.charging === false && batteryLevel < 0.3);

    setSensorState(prev => ({
      ...prev,
      ambientBrightness: brightness,
      batteryLevel,
      isLowPower,
      hasHaptics: sensors.capabilities.vibration,
    }));
  }, [sensors.ambientLight, sensors.battery, lowPowerThreshold, sensors.capabilities.vibration]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HAPTIC FEEDBACK EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  const getIntensityMultiplier = useCallback(() => {
    switch (hapticIntensity) {
      case 'light': return 0.5;
      case 'strong': return 1.5;
      default: return 1.0;
    }
  }, [hapticIntensity]);

  const haptics: VRHapticEvents = {
    onSelect: () => sensors.haptics.vrSelect(),
    onImpact: () => sensors.haptics.vrImpact(),
    onEnterZone: () => sensors.haptics.soft(),
    onExitZone: () => sensors.haptics.tap(),
    onCollision: () => sensors.haptics.heavy(),
    onTeleport: () => sensors.haptics.vrEnergy(),
    onMemoryAccess: () => sensors.haptics.vrHeartbeat(),
    onZoeResponse: () => sensors.haptics.zoeResponse(),
    onAlert: () => sensors.haptics.alert(),
    onSuccess: () => sensors.haptics.success(),
    custom: (pattern) => {
      if (Array.isArray(pattern)) {
        const mult = getIntensityMultiplier();
        sensors.haptics.custom(pattern.map(p => Math.round(p * mult)));
      } else {
        sensors.haptics.custom(Math.round(pattern * getIntensityMultiplier()));
      }
    },
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VR CAMERA CONTROLLER
  // ═══════════════════════════════════════════════════════════════════════════

  const applyCameraOrientation = useCallback((camera: THREE.Camera) => {
    if (!sensorState.hasMotionControl) return;
    
    // Blend device orientation with existing camera orientation
    camera.quaternion.slerp(sensorState.cameraQuaternion, 0.1);
  }, [sensorState.cameraQuaternion, sensorState.hasMotionControl]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SHAKE GESTURE HANDLER
  // ═══════════════════════════════════════════════════════════════════════════

  const onShakeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (sensorState.isShaking && onShakeRef.current) {
      haptics.onImpact();
      onShakeRef.current();
    }
  }, [sensorState.isShaking]);

  const registerShakeHandler = useCallback((handler: () => void) => {
    onShakeRef.current = handler;
    return () => { onShakeRef.current = null; };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // PERFORMANCE SCALING
  // ═══════════════════════════════════════════════════════════════════════════

  const getPerformanceScale = useCallback(() => {
    if (sensorState.isLowPower) return 0.5;
    if (sensorState.batteryLevel < 0.3) return 0.7;
    return 1.0;
  }, [sensorState.isLowPower, sensorState.batteryLevel]);

  const getAdaptiveBrightness = useCallback(() => {
    // Increase screen brightness in dark environments
    return 1 + (1 - sensorState.ambientBrightness) * 0.3;
  }, [sensorState.ambientBrightness]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PERMISSION REQUEST
  // ═══════════════════════════════════════════════════════════════════════════

  const requestSensorPermissions = useCallback(async () => {
    const granted = await sensors.requestPermissions();
    if (granted) {
      setSensorState(prev => ({ ...prev, sensorsReady: true }));
    }
    return granted;
  }, [sensors]);

  return {
    // State
    sensorState,
    isReady: sensorState.sensorsReady,
    hasMotion: sensorState.hasMotionControl,
    hasHaptics: sensorState.hasHaptics,
    
    // Haptic events
    haptics,
    
    // Camera control
    applyCameraOrientation,
    cameraQuaternion: sensorState.cameraQuaternion,
    cameraEuler: sensorState.cameraEuler,
    
    // Gestures
    isShaking: sensorState.isShaking,
    registerShakeHandler,
    
    // Performance
    getPerformanceScale,
    getAdaptiveBrightness,
    isLowPower: sensorState.isLowPower,
    batteryLevel: sensorState.batteryLevel,
    
    // Raw sensor access
    orientation: sensors.orientation,
    motion: sensors.motion,
    
    // Permissions
    requestSensorPermissions,
    permissionGranted: sensors.permissionGranted,
    
    // Capabilities
    capabilities: sensors.capabilities,
  };
};

export default useVRSensorIntegration;
