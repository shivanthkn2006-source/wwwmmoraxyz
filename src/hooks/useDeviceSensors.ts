/**
 * Device Sensors & Vibration Hook
 * Zoe DHF VR - Haptic Feedback & Motion Sensors
 * 
 * Supports:
 * - Vibration API (mobile/gamepad)
 * - DeviceMotion (accelerometer, gyroscope)
 * - DeviceOrientation (compass, tilt)
 * - Ambient Light Sensor
 * - Proximity Sensor
 * - Battery Status
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface DeviceOrientation {
  alpha: number | null;  // Z-axis rotation (0-360°) - compass
  beta: number | null;   // X-axis rotation (-180°-180°) - front-back tilt
  gamma: number | null;  // Y-axis rotation (-90°-90°) - left-right tilt
  absolute: boolean;
}

export interface DeviceMotion {
  acceleration: Vector3D | null;
  accelerationIncludingGravity: Vector3D | null;
  rotationRate: Vector3D | null;
  interval: number;
}

export interface BatteryStatus {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
}

export interface SensorCapabilities {
  vibration: boolean;
  deviceMotion: boolean;
  deviceOrientation: boolean;
  ambientLight: boolean;
  proximity: boolean;
  battery: boolean;
  geolocation: boolean;
  gyroscope: boolean;
  accelerometer: boolean;
}

export interface VibrationPattern {
  name: string;
  pattern: number | number[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIBRATION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

export const VIBRATION_PATTERNS: Record<string, VibrationPattern> = {
  // Single pulses
  tap: { name: 'Tap', pattern: 10 },
  click: { name: 'Click', pattern: 15 },
  soft: { name: 'Soft', pattern: 25 },
  medium: { name: 'Medium', pattern: 50 },
  strong: { name: 'Strong', pattern: 100 },
  heavy: { name: 'Heavy', pattern: 200 },
  
  // Double patterns
  doubleTap: { name: 'Double Tap', pattern: [10, 50, 10] },
  heartbeat: { name: 'Heartbeat', pattern: [100, 100, 200, 100, 100] },
  
  // Notification patterns
  notification: { name: 'Notification', pattern: [50, 100, 50] },
  alert: { name: 'Alert', pattern: [100, 50, 100, 50, 100] },
  success: { name: 'Success', pattern: [30, 50, 100] },
  error: { name: 'Error', pattern: [200, 100, 200, 100, 200] },
  warning: { name: 'Warning', pattern: [100, 50, 100] },
  
  // VR patterns
  vrSelect: { name: 'VR Select', pattern: [15, 30, 15] },
  vrImpact: { name: 'VR Impact', pattern: [150] },
  vrEngine: { name: 'VR Engine', pattern: [20, 20, 20, 20, 20, 20, 20, 20] },
  vrHeartbeat: { name: 'VR Heartbeat', pattern: [80, 80, 200] },
  vrEnergy: { name: 'VR Energy', pattern: [10, 10, 10, 10, 50, 10, 10, 10, 10] },
  
  // Zoe feedback
  zoeAcknowledge: { name: 'Zoe Acknowledge', pattern: [20, 40, 60] },
  zoeThinking: { name: 'Zoe Thinking', pattern: [10, 50, 10, 50, 10, 50] },
  zoeResponse: { name: 'Zoe Response', pattern: [30, 30, 80] },
  zoeSentinel: { name: 'Zoe Sentinel', pattern: [100, 50, 100, 50, 200] },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useDeviceSensors = (options?: {
  enableMotion?: boolean;
  enableOrientation?: boolean;
  motionThreshold?: number;
  updateInterval?: number;
}) => {
  const {
    enableMotion = true,
    enableOrientation = true,
    motionThreshold = 0.5,
    updateInterval = 100,
  } = options ?? {};

  // State
  const [capabilities, setCapabilities] = useState<SensorCapabilities>({
    vibration: false,
    deviceMotion: false,
    deviceOrientation: false,
    ambientLight: false,
    proximity: false,
    battery: false,
    geolocation: false,
    gyroscope: false,
    accelerometer: false,
  });

  const [orientation, setOrientation] = useState<DeviceOrientation>({
    alpha: null,
    beta: null,
    gamma: null,
    absolute: false,
  });

  const [motion, setMotion] = useState<DeviceMotion>({
    acceleration: null,
    accelerationIncludingGravity: null,
    rotationRate: null,
    interval: 0,
  });

  const [battery, setBattery] = useState<BatteryStatus | null>(null);
  const [ambientLight, setAmbientLight] = useState<number | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const lastMotionRef = useRef<Vector3D | null>(null);
  const shakeTimeoutRef = useRef<NodeJS.Timeout>();

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPABILITY DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const caps: SensorCapabilities = {
      vibration: 'vibrate' in navigator,
      deviceMotion: 'DeviceMotionEvent' in window,
      deviceOrientation: 'DeviceOrientationEvent' in window,
      ambientLight: 'AmbientLightSensor' in window,
      proximity: 'ProximitySensor' in window,
      battery: 'getBattery' in navigator,
      geolocation: 'geolocation' in navigator,
      gyroscope: 'Gyroscope' in window,
      accelerometer: 'Accelerometer' in window,
    };

    setCapabilities(caps);
    console.log('[DeviceSensors] Capabilities detected:', caps);

    // Check if permissions already granted (iOS 13+)
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      // iOS requires permission request on user gesture
      setPermissionGranted(false);
    } else {
      setPermissionGranted(true);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // PERMISSION REQUEST (iOS 13+)
  // ═══════════════════════════════════════════════════════════════════════════

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      // iOS DeviceMotion permission
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const motionPermission = await (DeviceMotionEvent as any).requestPermission();
        if (motionPermission !== 'granted') {
          console.warn('[DeviceSensors] Motion permission denied');
          return false;
        }
      }

      // iOS DeviceOrientation permission
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        const orientationPermission = await (DeviceOrientationEvent as any).requestPermission();
        if (orientationPermission !== 'granted') {
          console.warn('[DeviceSensors] Orientation permission denied');
          return false;
        }
      }

      setPermissionGranted(true);
      console.log('[DeviceSensors] All permissions granted');
      return true;
    } catch (error) {
      console.error('[DeviceSensors] Permission request failed:', error);
      return false;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // VIBRATION API
  // ═══════════════════════════════════════════════════════════════════════════

  const vibrate = useCallback((pattern: number | number[] | keyof typeof VIBRATION_PATTERNS) => {
    if (!capabilities.vibration) {
      console.log('[DeviceSensors] Vibration not supported');
      return false;
    }

    try {
      if (typeof pattern === 'string') {
        const preset = VIBRATION_PATTERNS[pattern];
        if (preset) {
          navigator.vibrate(preset.pattern);
          return true;
        }
      }
      navigator.vibrate(pattern as number | number[]);
      return true;
    } catch (error) {
      console.error('[DeviceSensors] Vibration failed:', error);
      return false;
    }
  }, [capabilities.vibration]);

  const stopVibration = useCallback(() => {
    if (capabilities.vibration) {
      navigator.vibrate(0);
    }
  }, [capabilities.vibration]);

  // Haptic feedback presets
  const haptics = {
    tap: () => vibrate('tap'),
    click: () => vibrate('click'),
    soft: () => vibrate('soft'),
    medium: () => vibrate('medium'),
    strong: () => vibrate('strong'),
    heavy: () => vibrate('heavy'),
    
    notification: () => vibrate('notification'),
    success: () => vibrate('success'),
    error: () => vibrate('error'),
    warning: () => vibrate('warning'),
    alert: () => vibrate('alert'),
    
    vrSelect: () => vibrate('vrSelect'),
    vrImpact: () => vibrate('vrImpact'),
    vrEngine: () => vibrate('vrEngine'),
    vrHeartbeat: () => vibrate('vrHeartbeat'),
    vrEnergy: () => vibrate('vrEnergy'),
    
    zoeAcknowledge: () => vibrate('zoeAcknowledge'),
    zoeThinking: () => vibrate('zoeThinking'),
    zoeResponse: () => vibrate('zoeResponse'),
    zoeSentinel: () => vibrate('zoeSentinel'),
    
    custom: (pattern: number | number[]) => vibrate(pattern),
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DEVICE MOTION (Accelerometer + Gyroscope)
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!enableMotion || !capabilities.deviceMotion || !permissionGranted) return;

    let lastUpdate = 0;

    const handleMotion = (event: DeviceMotionEvent) => {
      const now = Date.now();
      if (now - lastUpdate < updateInterval) return;
      lastUpdate = now;

      const newMotion: DeviceMotion = {
        acceleration: event.acceleration ? {
          x: event.acceleration.x ?? 0,
          y: event.acceleration.y ?? 0,
          z: event.acceleration.z ?? 0,
        } : null,
        accelerationIncludingGravity: event.accelerationIncludingGravity ? {
          x: event.accelerationIncludingGravity.x ?? 0,
          y: event.accelerationIncludingGravity.y ?? 0,
          z: event.accelerationIncludingGravity.z ?? 0,
        } : null,
        rotationRate: event.rotationRate ? {
          x: event.rotationRate.alpha ?? 0,
          y: event.rotationRate.beta ?? 0,
          z: event.rotationRate.gamma ?? 0,
        } : null,
        interval: event.interval,
      };

      setMotion(newMotion);

      // Shake detection
      if (newMotion.acceleration) {
        const current = newMotion.acceleration;
        const last = lastMotionRef.current;
        
        if (last) {
          const deltaX = Math.abs(current.x - last.x);
          const deltaY = Math.abs(current.y - last.y);
          const deltaZ = Math.abs(current.z - last.z);
          const totalDelta = deltaX + deltaY + deltaZ;

          if (totalDelta > 15) { // Shake threshold
            setIsShaking(true);
            if (shakeTimeoutRef.current) {
              clearTimeout(shakeTimeoutRef.current);
            }
            shakeTimeoutRef.current = setTimeout(() => setIsShaking(false), 500);
          }
        }
        
        lastMotionRef.current = current;
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    console.log('[DeviceSensors] Motion listener attached');

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      if (shakeTimeoutRef.current) {
        clearTimeout(shakeTimeoutRef.current);
      }
    };
  }, [enableMotion, capabilities.deviceMotion, permissionGranted, updateInterval, motionThreshold]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DEVICE ORIENTATION (Compass + Tilt)
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!enableOrientation || !capabilities.deviceOrientation || !permissionGranted) return;

    let lastUpdate = 0;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const now = Date.now();
      if (now - lastUpdate < updateInterval) return;
      lastUpdate = now;

      setOrientation({
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
        absolute: event.absolute,
      });
    };

    window.addEventListener('deviceorientation', handleOrientation);
    console.log('[DeviceSensors] Orientation listener attached');

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [enableOrientation, capabilities.deviceOrientation, permissionGranted, updateInterval]);

  // ═══════════════════════════════════════════════════════════════════════════
  // BATTERY STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!capabilities.battery) return;

    const initBattery = async () => {
      try {
        const batteryManager = await (navigator as any).getBattery();
        
        const updateBattery = () => {
          setBattery({
            level: batteryManager.level,
            charging: batteryManager.charging,
            chargingTime: batteryManager.chargingTime,
            dischargingTime: batteryManager.dischargingTime,
          });
        };

        updateBattery();
        
        batteryManager.addEventListener('levelchange', updateBattery);
        batteryManager.addEventListener('chargingchange', updateBattery);
        batteryManager.addEventListener('chargingtimechange', updateBattery);
        batteryManager.addEventListener('dischargingtimechange', updateBattery);
      } catch (error) {
        console.error('[DeviceSensors] Battery API error:', error);
      }
    };

    initBattery();
  }, [capabilities.battery]);

  // ═══════════════════════════════════════════════════════════════════════════
  // AMBIENT LIGHT SENSOR
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!capabilities.ambientLight) return;

    try {
      const sensor = new (window as any).AmbientLightSensor();
      
      sensor.addEventListener('reading', () => {
        setAmbientLight(sensor.illuminance);
      });

      sensor.start();
      console.log('[DeviceSensors] Ambient light sensor started');

      return () => sensor.stop();
    } catch (error) {
      console.error('[DeviceSensors] Ambient light sensor error:', error);
    }
  }, [capabilities.ambientLight]);

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // Get tilt angle for VR camera control
  const getTiltAngle = useCallback((): { pitch: number; roll: number } => {
    return {
      pitch: orientation.beta ? orientation.beta / 90 : 0, // Normalized -1 to 1
      roll: orientation.gamma ? orientation.gamma / 90 : 0,
    };
  }, [orientation]);

  // Get compass heading
  const getCompassHeading = useCallback((): number => {
    return orientation.alpha ?? 0;
  }, [orientation]);

  // Check if device is flat
  const isDeviceFlat = useCallback((): boolean => {
    if (orientation.beta === null || orientation.gamma === null) return false;
    return Math.abs(orientation.beta) < 15 && Math.abs(orientation.gamma) < 15;
  }, [orientation]);

  // Check if device is portrait
  const isPortrait = useCallback((): boolean => {
    if (orientation.beta === null) return true;
    return Math.abs(orientation.beta) > Math.abs(orientation.gamma ?? 0);
  }, [orientation]);

  return {
    // State
    capabilities,
    orientation,
    motion,
    battery,
    ambientLight,
    isShaking,
    permissionGranted,
    
    // Actions
    requestPermissions,
    vibrate,
    stopVibration,
    haptics,
    
    // Utilities
    getTiltAngle,
    getCompassHeading,
    isDeviceFlat,
    isPortrait,
  };
};

export default useDeviceSensors;
