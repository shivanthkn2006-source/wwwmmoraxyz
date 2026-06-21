// ═══════════════════════════════════════════════════════════════════════════════
// CAMERA DEVICES - Hardware Recognition & Selection
// Detects front/back cameras across all devices:
// MacBook Pro/Air (M1/Intel), Samsung M05, Samsung Tab A7, iPhone 11, etc.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';

export interface CameraDevice {
  deviceId: string;
  label: string;
  facing: 'front' | 'back' | 'unknown';
  isDefault: boolean;
}

export interface CameraDevicesState {
  devices: CameraDevice[];
  selectedDeviceId: string | null;
  selectedFacing: 'front' | 'back' | 'unknown';
  isEnumerating: boolean;
  hasMultipleCameras: boolean;
  error: string | null;
}

// Device label patterns for camera facing detection
const FRONT_CAMERA_PATTERNS = [
  /front/i,
  /user/i,
  /facetime/i,
  /selfie/i,
  /face\s*cam/i,
  /isight/i, // MacBook iSight is front-facing
  /\(front\)/i,
  /내장.*카메라/i, // Korean: built-in camera
  /前置/i, // Chinese: front
];

const BACK_CAMERA_PATTERNS = [
  /back/i,
  /rear/i,
  /environment/i,
  /main/i,
  /primary/i,
  /wide/i,
  /ultra/i,
  /telephoto/i,
  /macro/i,
  /\(back\)/i,
  /후면/i, // Korean: rear
  /後置/i, // Chinese: rear
];

// Device-specific detection based on known hardware
const detectCameraFacing = (device: MediaDeviceInfo, allDevices: MediaDeviceInfo[]): 'front' | 'back' | 'unknown' => {
  const label = device.label.toLowerCase();
  
  // Check front patterns first
  for (const pattern of FRONT_CAMERA_PATTERNS) {
    if (pattern.test(device.label)) {
      return 'front';
    }
  }
  
  // Check back patterns
  for (const pattern of BACK_CAMERA_PATTERNS) {
    if (pattern.test(device.label)) {
      return 'back';
    }
  }
  
  // MacBook detection: single camera = front (FaceTime/iSight)
  const isMac = /mac/i.test(navigator.userAgent) || /Macintosh/i.test(navigator.userAgent);
  if (isMac && allDevices.filter(d => d.kind === 'videoinput').length === 1) {
    console.log('[CameraDevices] MacBook detected with single camera - marking as front');
    return 'front';
  }
  
  // Mobile device with 2 cameras: first is usually back, second is front
  const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
  if (videoDevices.length === 2) {
    const deviceIndex = videoDevices.findIndex(d => d.deviceId === device.deviceId);
    // On most mobile devices: index 0 = back camera, index 1 = front camera
    // But labels are more reliable when available
    if (label.includes('camera 0') || label.includes('camera2 0')) {
      return 'back';
    }
    if (label.includes('camera 1') || label.includes('camera2 1')) {
      return 'front';
    }
    // Samsung-specific patterns
    if (/samsung/i.test(navigator.userAgent)) {
      // Samsung devices typically list back camera first
      return deviceIndex === 0 ? 'back' : 'front';
    }
  }
  
  // iPhone-specific: if label contains camera numbers
  if (/iphone/i.test(navigator.userAgent) || /ipad/i.test(navigator.userAgent)) {
    if (videoDevices.length >= 2) {
      const deviceIndex = videoDevices.findIndex(d => d.deviceId === device.deviceId);
      // iPhone: back cameras are listed first
      return deviceIndex === 0 ? 'back' : 'front';
    }
  }
  
  return 'unknown';
};

export const useCameraDevices = () => {
  const [state, setState] = useState<CameraDevicesState>({
    devices: [],
    selectedDeviceId: null,
    selectedFacing: 'unknown',
    isEnumerating: false,
    hasMultipleCameras: false,
    error: null,
  });
  
  const preferenceRef = useRef<'front' | 'back'>('front');

  // Enumerate all camera devices - now with graceful degradation
  const enumerateDevices = useCallback(async (requestPermission = false): Promise<CameraDevice[]> => {
    setState(prev => ({ ...prev, isEnumerating: true, error: null }));
    
    try {
      // First try to enumerate without requesting permission (shows generic labels)
      let allDevices = await navigator.mediaDevices.enumerateDevices();
      let videoDevices = allDevices.filter(d => d.kind === 'videoinput');
      
      // Check if we have proper labels (indicates permission was already granted)
      const hasLabels = videoDevices.some(d => d.label && d.label.length > 0);
      
      // Only request permission if explicitly asked AND we don't have labels
      if (requestPermission && !hasLabels) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
          tempStream.getTracks().forEach(track => track.stop());
          
          // Re-enumerate with proper labels now
          allDevices = await navigator.mediaDevices.enumerateDevices();
          videoDevices = allDevices.filter(d => d.kind === 'videoinput');
        } catch (permErr) {
          // Permission denied - continue with generic labels
          console.log('[CameraDevices] Permission not granted, using generic labels');
        }
      }
      
      console.log('[CameraDevices] Found', videoDevices.length, 'video input devices');
      videoDevices.forEach((d, i) => {
        console.log(`[CameraDevices] Device ${i}: "${d.label || 'Unknown'}" (${d.deviceId.slice(0, 8)}...)`);
      });
      
      const cameras: CameraDevice[] = videoDevices.map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${index + 1}`,
        facing: detectCameraFacing(device, allDevices),
        isDefault: index === 0,
      }));
      
      // Log detected facings
      cameras.forEach(cam => {
        console.log(`[CameraDevices] ${cam.label} → ${cam.facing}`);
      });
      
      setState(prev => ({
        ...prev,
        devices: cameras,
        isEnumerating: false,
        hasMultipleCameras: cameras.length > 1,
      }));
      
      return cameras;
    } catch (err) {
      // Only log as warning, not error - this is expected behavior when permission not granted
      console.warn('[CameraDevices] Could not enumerate devices:', err instanceof Error ? err.message : 'Unknown error');
      setState(prev => ({
        ...prev,
        isEnumerating: false,
        // Don't set error for permission issues - it's expected
        error: null,
      }));
      return [];
    }
  }, []);

  // Select a specific camera by deviceId
  const selectCamera = useCallback((deviceId: string) => {
    const camera = state.devices.find(d => d.deviceId === deviceId);
    if (camera) {
      console.log(`[CameraDevices] Selected camera: ${camera.label} (${camera.facing})`);
      setState(prev => ({
        ...prev,
        selectedDeviceId: deviceId,
        selectedFacing: camera.facing,
      }));
      preferenceRef.current = camera.facing === 'unknown' ? preferenceRef.current : camera.facing;
    }
  }, [state.devices]);

  // Select camera by facing preference (front/back)
  const selectByFacing = useCallback((facing: 'front' | 'back'): CameraDevice | null => {
    const camera = state.devices.find(d => d.facing === facing);
    if (camera) {
      console.log(`[CameraDevices] Selected ${facing} camera: ${camera.label}`);
      setState(prev => ({
        ...prev,
        selectedDeviceId: camera.deviceId,
        selectedFacing: facing,
      }));
      preferenceRef.current = facing;
      return camera;
    }
    
    // Fallback to first available camera if preferred facing not found
    if (state.devices.length > 0) {
      const fallback = state.devices[0];
      console.log(`[CameraDevices] ${facing} camera not found, using fallback: ${fallback.label}`);
      setState(prev => ({
        ...prev,
        selectedDeviceId: fallback.deviceId,
        selectedFacing: fallback.facing,
      }));
      return fallback;
    }
    
    return null;
  }, [state.devices]);

  // Flip between front and back cameras
  const flipCamera = useCallback((): CameraDevice | null => {
    const currentFacing = state.selectedFacing === 'unknown' ? preferenceRef.current : state.selectedFacing;
    const targetFacing = currentFacing === 'front' ? 'back' : 'front';
    
    console.log(`[CameraDevices] Flipping camera: ${currentFacing} → ${targetFacing}`);
    
    return selectByFacing(targetFacing);
  }, [state.selectedFacing, selectByFacing]);

  // Get constraints for getUserMedia with specific camera
  const getConstraintsForDevice = useCallback((deviceId: string, options?: {
    width?: number;
    height?: number;
    frameRate?: number;
  }): MediaStreamConstraints => {
    return {
      video: {
        deviceId: { exact: deviceId },
        width: { ideal: options?.width ?? 1280 },
        height: { ideal: options?.height ?? 720 },
        frameRate: { ideal: options?.frameRate ?? 30 },
      },
      audio: false,
    };
  }, []);

  // Get constraints for facing mode (works on mobile)
  const getConstraintsForFacing = useCallback((facing: 'front' | 'back', options?: {
    width?: number;
    height?: number;
    frameRate?: number;
  }): MediaStreamConstraints => {
    return {
      video: {
        facingMode: facing === 'back' ? 'environment' : 'user',
        width: { ideal: options?.width ?? 1280 },
        height: { ideal: options?.height ?? 720 },
        frameRate: { ideal: options?.frameRate ?? 30 },
      },
      audio: false,
    };
  }, []);

  // Get stream with best available method
  const getStream = useCallback(async (facing: 'front' | 'back', options?: {
    width?: number;
    height?: number;
    frameRate?: number;
  }): Promise<MediaStream | null> => {
    try {
      // Method 1: Try specific deviceId if we have devices enumerated
      const camera = state.devices.find(d => d.facing === facing);
      if (camera) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(
            getConstraintsForDevice(camera.deviceId, options)
          );
          console.log(`[CameraDevices] Got stream from ${camera.label}`);
          selectCamera(camera.deviceId);
          return stream;
        } catch (err) {
          console.warn(`[CameraDevices] deviceId method failed, trying facingMode:`, err);
        }
      }
      
      // Method 2: Try facingMode constraint
      try {
        const stream = await navigator.mediaDevices.getUserMedia(
          getConstraintsForFacing(facing, options)
        );
        console.log(`[CameraDevices] Got stream using facingMode: ${facing === 'back' ? 'environment' : 'user'}`);
        setState(prev => ({ ...prev, selectedFacing: facing }));
        preferenceRef.current = facing;
        return stream;
      } catch (err) {
        console.warn(`[CameraDevices] facingMode ${facing} failed:`, err);
      }
      
      // Method 3: Fallback to any camera
      const fallbackStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: options?.width ?? 1280 },
          height: { ideal: options?.height ?? 720 },
        },
      });
      console.log('[CameraDevices] Using fallback camera');
      return fallbackStream;
      
    } catch (err) {
      console.error('[CameraDevices] Failed to get camera stream:', err);
      return null;
    }
  }, [state.devices, getConstraintsForDevice, getConstraintsForFacing, selectCamera]);

  // Enumerate on mount
  useEffect(() => {
    enumerateDevices();
    
    // Re-enumerate when devices change (e.g., external webcam plugged in)
    const handleDeviceChange = () => {
      console.log('[CameraDevices] Device change detected, re-enumerating');
      enumerateDevices();
    };
    
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [enumerateDevices]);

  return {
    // State
    ...state,
    
    // Actions
    enumerateDevices,
    selectCamera,
    selectByFacing,
    flipCamera,
    getStream,
    
    // Helpers
    getConstraintsForDevice,
    getConstraintsForFacing,
    
    // Quick access
    frontCamera: state.devices.find(d => d.facing === 'front') ?? null,
    backCamera: state.devices.find(d => d.facing === 'back') ?? null,
    currentCamera: state.devices.find(d => d.deviceId === state.selectedDeviceId) ?? null,
  };
};

export default useCameraDevices;
