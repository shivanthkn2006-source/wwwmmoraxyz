/**
 * Unified Permission Manager
 * Single-click activation for all platform permissions:
 * - Microphone
 * - Camera
 * - Location (GPS)
 * - Device Sensors (motion, orientation)
 * - Notifications
 */

export type PermissionType = 'microphone' | 'camera' | 'location' | 'notifications' | 'motion' | 'orientation';

export interface PermissionStatus {
  type: PermissionType;
  state: 'granted' | 'denied' | 'prompt' | 'unsupported' | 'error';
  timestamp: number;
  error?: string;
}

export interface AllPermissionsStatus {
  microphone: PermissionStatus;
  camera: PermissionStatus;
  location: PermissionStatus;
  notifications: PermissionStatus;
  motion: PermissionStatus;
  orientation: PermissionStatus;
  allGranted: boolean;
  grantedCount: number;
  totalCount: number;
  timestamp: number;
}

// Session storage key
const PERMISSIONS_CACHE_KEY = 'mmora_permissions_cache';
const PERMISSIONS_ACTIVATED_KEY = 'mmora_permissions_activated';

/**
 * Check microphone permission
 */
export const checkMicrophonePermission = async (): Promise<PermissionStatus> => {
  const type: PermissionType = 'microphone';
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      return { type, state: 'unsupported', timestamp: Date.now() };
    }

    // Try Permissions API first
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        return { type, state: result.state as 'granted' | 'denied' | 'prompt', timestamp: Date.now() };
      } catch {
        // Permissions API not supported for this permission
      }
    }

    return { type, state: 'prompt', timestamp: Date.now() };
  } catch (error) {
    return { type, state: 'error', timestamp: Date.now(), error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Check camera permission
 */
export const checkCameraPermission = async (): Promise<PermissionStatus> => {
  const type: PermissionType = 'camera';
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      return { type, state: 'unsupported', timestamp: Date.now() };
    }

    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        return { type, state: result.state as 'granted' | 'denied' | 'prompt', timestamp: Date.now() };
      } catch {
        // Permissions API not supported for this permission
      }
    }

    return { type, state: 'prompt', timestamp: Date.now() };
  } catch (error) {
    return { type, state: 'error', timestamp: Date.now(), error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Check location permission
 */
export const checkLocationPermission = async (): Promise<PermissionStatus> => {
  const type: PermissionType = 'location';
  try {
    if (!('geolocation' in navigator)) {
      return { type, state: 'unsupported', timestamp: Date.now() };
    }

    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return { type, state: result.state as 'granted' | 'denied' | 'prompt', timestamp: Date.now() };
      } catch {
        // Fallback
      }
    }

    return { type, state: 'prompt', timestamp: Date.now() };
  } catch (error) {
    return { type, state: 'error', timestamp: Date.now(), error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Check notification permission
 */
export const checkNotificationPermission = async (): Promise<PermissionStatus> => {
  const type: PermissionType = 'notifications';
  try {
    if (!('Notification' in window)) {
      return { type, state: 'unsupported', timestamp: Date.now() };
    }

    const permission = Notification.permission;
    return { 
      type, 
      state: permission === 'default' ? 'prompt' : permission as 'granted' | 'denied', 
      timestamp: Date.now() 
    };
  } catch (error) {
    return { type, state: 'error', timestamp: Date.now(), error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Check motion sensor permission (iOS 13+)
 */
export const checkMotionPermission = async (): Promise<PermissionStatus> => {
  const type: PermissionType = 'motion';
  try {
    // Check if DeviceMotionEvent is available
    if (typeof DeviceMotionEvent === 'undefined') {
      return { type, state: 'unsupported', timestamp: Date.now() };
    }

    // iOS 13+ requires explicit permission
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      // Can't check without requesting, so assume prompt
      return { type, state: 'prompt', timestamp: Date.now() };
    }

    // Non-iOS devices - motion is available by default
    return { type, state: 'granted', timestamp: Date.now() };
  } catch (error) {
    return { type, state: 'error', timestamp: Date.now(), error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Check orientation sensor permission (iOS 13+)
 */
export const checkOrientationPermission = async (): Promise<PermissionStatus> => {
  const type: PermissionType = 'orientation';
  try {
    if (typeof DeviceOrientationEvent === 'undefined') {
      return { type, state: 'unsupported', timestamp: Date.now() };
    }

    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      return { type, state: 'prompt', timestamp: Date.now() };
    }

    return { type, state: 'granted', timestamp: Date.now() };
  } catch (error) {
    return { type, state: 'error', timestamp: Date.now(), error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Request microphone access
 */
export const requestMicrophoneAccess = async (): Promise<PermissionStatus> => {
  const type: PermissionType = 'microphone';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: { 
        echoCancellation: true, 
        noiseSuppression: true,
        autoGainControl: true 
      } 
    });
    stream.getTracks().forEach(track => track.stop());
    console.log('[PermissionManager] ✓ Microphone access granted');
    return { type, state: 'granted', timestamp: Date.now() };
  } catch (error: any) {
    console.warn('[PermissionManager] ✗ Microphone denied:', error?.name);
    return { 
      type, 
      state: error?.name === 'NotAllowedError' ? 'denied' : 'error', 
      timestamp: Date.now(),
      error: error?.message 
    };
  }
};

/**
 * Request camera access
 */
export const requestCameraAccess = async (): Promise<PermissionStatus> => {
  const type: PermissionType = 'camera';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 }
      } 
    });
    stream.getTracks().forEach(track => track.stop());
    console.log('[PermissionManager] ✓ Camera access granted');
    return { type, state: 'granted', timestamp: Date.now() };
  } catch (error: any) {
    console.warn('[PermissionManager] ✗ Camera denied:', error?.name);
    return { 
      type, 
      state: error?.name === 'NotAllowedError' ? 'denied' : 'error', 
      timestamp: Date.now(),
      error: error?.message 
    };
  }
};

/**
 * Request location access
 */
export const requestLocationAccess = async (): Promise<PermissionStatus> => {
  const type: PermissionType = 'location';
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({ type, state: 'unsupported', timestamp: Date.now() });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        console.log('[PermissionManager] ✓ Location access granted');
        resolve({ type, state: 'granted', timestamp: Date.now() });
      },
      (error) => {
        console.warn('[PermissionManager] ✗ Location denied:', error.code);
        resolve({ 
          type, 
          state: error.code === 1 ? 'denied' : 'error', 
          timestamp: Date.now(),
          error: error.message 
        });
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  });
};

/**
 * Request notification permission
 */
export const requestNotificationAccess = async (): Promise<PermissionStatus> => {
  const type: PermissionType = 'notifications';
  try {
    if (!('Notification' in window)) {
      return { type, state: 'unsupported', timestamp: Date.now() };
    }

    const result = await Notification.requestPermission();
    console.log('[PermissionManager] Notification permission:', result);
    return { 
      type, 
      state: result === 'default' ? 'prompt' : result as 'granted' | 'denied', 
      timestamp: Date.now() 
    };
  } catch (error: any) {
    return { type, state: 'error', timestamp: Date.now(), error: error?.message };
  }
};

/**
 * Request motion sensor permission (iOS)
 */
export const requestMotionAccess = async (): Promise<PermissionStatus> => {
  const type: PermissionType = 'motion';
  try {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      const result = await (DeviceMotionEvent as any).requestPermission();
      console.log('[PermissionManager] Motion permission:', result);
      return { type, state: result as 'granted' | 'denied', timestamp: Date.now() };
    }
    return { type, state: 'granted', timestamp: Date.now() };
  } catch (error: any) {
    return { type, state: 'error', timestamp: Date.now(), error: error?.message };
  }
};

/**
 * Request orientation sensor permission (iOS)
 */
export const requestOrientationAccess = async (): Promise<PermissionStatus> => {
  const type: PermissionType = 'orientation';
  try {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      const result = await (DeviceOrientationEvent as any).requestPermission();
      console.log('[PermissionManager] Orientation permission:', result);
      return { type, state: result as 'granted' | 'denied', timestamp: Date.now() };
    }
    return { type, state: 'granted', timestamp: Date.now() };
  } catch (error: any) {
    return { type, state: 'error', timestamp: Date.now(), error: error?.message };
  }
};

/**
 * Check all permissions status
 */
export const checkAllPermissions = async (): Promise<AllPermissionsStatus> => {
  const [microphone, camera, location, notifications, motion, orientation] = await Promise.all([
    checkMicrophonePermission(),
    checkCameraPermission(),
    checkLocationPermission(),
    checkNotificationPermission(),
    checkMotionPermission(),
    checkOrientationPermission(),
  ]);

  const allStatuses = [microphone, camera, location, notifications, motion, orientation];
  const grantedCount = allStatuses.filter(s => s.state === 'granted').length;
  const supportedCount = allStatuses.filter(s => s.state !== 'unsupported').length;

  return {
    microphone,
    camera,
    location,
    notifications,
    motion,
    orientation,
    allGranted: grantedCount === supportedCount && supportedCount > 0,
    grantedCount,
    totalCount: supportedCount,
    timestamp: Date.now(),
  };
};

/**
 * Request all permissions at once (one-click activation)
 */
export const requestAllPermissions = async (
  onProgress?: (type: PermissionType, status: PermissionStatus) => void
): Promise<AllPermissionsStatus> => {
  console.log('[PermissionManager] ═══════════════════════════════════════');
  console.log('[PermissionManager] 🚀 ONE-CLICK PERMISSION ACTIVATION');
  console.log('[PermissionManager] ═══════════════════════════════════════');

  const results: Partial<Record<PermissionType, PermissionStatus>> = {};

  // Request in sequence to avoid overwhelming the user with prompts
  // Order: mic -> camera -> location -> notifications -> motion -> orientation

  // 1. Microphone (most important for Zoe)
  results.microphone = await requestMicrophoneAccess();
  onProgress?.('microphone', results.microphone);

  // 2. Camera (for Zoe vision)
  results.camera = await requestCameraAccess();
  onProgress?.('camera', results.camera);

  // 3. Location (for Selfie City, weather, etc.)
  results.location = await requestLocationAccess();
  onProgress?.('location', results.location);

  // 4. Notifications
  results.notifications = await requestNotificationAccess();
  onProgress?.('notifications', results.notifications);

  // 5. Motion sensors (iOS)
  results.motion = await requestMotionAccess();
  onProgress?.('motion', results.motion);

  // 6. Orientation sensors (iOS)
  results.orientation = await requestOrientationAccess();
  onProgress?.('orientation', results.orientation);

  const allStatuses = Object.values(results) as PermissionStatus[];
  const grantedCount = allStatuses.filter(s => s.state === 'granted').length;
  const supportedCount = allStatuses.filter(s => s.state !== 'unsupported').length;

  const finalStatus: AllPermissionsStatus = {
    microphone: results.microphone!,
    camera: results.camera!,
    location: results.location!,
    notifications: results.notifications!,
    motion: results.motion!,
    orientation: results.orientation!,
    allGranted: grantedCount === supportedCount && supportedCount > 0,
    grantedCount,
    totalCount: supportedCount,
    timestamp: Date.now(),
  };

  // Cache results
  try {
    sessionStorage.setItem(PERMISSIONS_CACHE_KEY, JSON.stringify(finalStatus));
    sessionStorage.setItem(PERMISSIONS_ACTIVATED_KEY, 'true');
  } catch {
    // Ignore storage errors
  }

  console.log('[PermissionManager] ═══════════════════════════════════════');
  console.log(`[PermissionManager] ✓ Granted: ${grantedCount}/${supportedCount} permissions`);
  console.log('[PermissionManager] ═══════════════════════════════════════');

  // Dispatch global event
  window.dispatchEvent(new CustomEvent('mmora-permissions-activated', { 
    detail: finalStatus 
  }));

  return finalStatus;
};

/**
 * Check if permissions have been activated this session
 */
export const hasActivatedPermissions = (): boolean => {
  try {
    return sessionStorage.getItem(PERMISSIONS_ACTIVATED_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Get cached permissions status
 */
export const getCachedPermissions = (): AllPermissionsStatus | null => {
  try {
    const cached = sessionStorage.getItem(PERMISSIONS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore
  }
  return null;
};

/**
 * Clear permissions cache
 */
export const clearPermissionsCache = (): void => {
  try {
    sessionStorage.removeItem(PERMISSIONS_CACHE_KEY);
    sessionStorage.removeItem(PERMISSIONS_ACTIVATED_KEY);
  } catch {
    // Ignore
  }
};

/**
 * Get permission icon and color for UI
 */
export const getPermissionUIInfo = (status: PermissionStatus): { icon: string; color: string; label: string } => {
  switch (status.state) {
    case 'granted':
      return { icon: '✓', color: 'text-green-500', label: 'Granted' };
    case 'denied':
      return { icon: '✗', color: 'text-red-500', label: 'Denied' };
    case 'prompt':
      return { icon: '?', color: 'text-yellow-500', label: 'Pending' };
    case 'unsupported':
      return { icon: '—', color: 'text-muted-foreground', label: 'N/A' };
    case 'error':
      return { icon: '!', color: 'text-orange-500', label: 'Error' };
    default:
      return { icon: '?', color: 'text-muted-foreground', label: 'Unknown' };
  }
};
