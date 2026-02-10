/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY — MOBILE PLATFORM DETECTION
 * Utilities for detecting and adapting to iOS/Android native environments
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface MobilePlatformInfo {
  isNativeApp: boolean;
  isCapacitor: boolean;
  platform: 'ios' | 'android' | 'web';
  osVersion: string | null;
  isTablet: boolean;
  supportsWebGPU: boolean;
  supportsBackgroundFetch: boolean;
  supportsPushNotifications: boolean;
  maxStorageMB: number;
  voiceCapabilities: {
    nativeTTS: boolean;
    webSpeechAPI: boolean;
    speechRecognition: boolean;
  };
}

/**
 * Detect if running inside Capacitor native app
 */
export const isCapacitorApp = (): boolean => {
  return typeof (window as any).Capacitor !== 'undefined';
};

/**
 * Get current platform
 */
export const getPlatform = (): 'ios' | 'android' | 'web' => {
  if (isCapacitorApp()) {
    const capacitor = (window as any).Capacitor;
    if (capacitor.getPlatform) {
      const platform = capacitor.getPlatform();
      if (platform === 'ios') return 'ios';
      if (platform === 'android') return 'android';
    }
  }
  
  // Fallback to user agent detection
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'web';
};

/**
 * Get iOS/Android OS version
 */
export const getOSVersion = (): string | null => {
  const ua = navigator.userAgent;
  
  // iOS
  const iosMatch = ua.match(/OS (\d+[._]\d+[._]?\d*)/);
  if (iosMatch) return iosMatch[1].replace(/_/g, '.');
  
  // Android
  const androidMatch = ua.match(/Android (\d+\.?\d*\.?\d*)/);
  if (androidMatch) return androidMatch[1];
  
  return null;
};

/**
 * Check if device is a tablet
 */
export const isTablet = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  return /ipad/.test(ua) || (/android/.test(ua) && !/mobile/.test(ua));
};

/**
 * Check WebGPU support (needed for local LLM)
 */
export const checkWebGPUSupport = async (): Promise<boolean> => {
  if (typeof navigator === 'undefined') return false;
  if (!('gpu' in navigator)) return false;
  
  try {
    const adapter = await (navigator as any).gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
};

/**
 * Get maximum recommended storage for platform
 */
export const getMaxStorageMB = (): number => {
  const platform = getPlatform();
  
  // Conservative estimates for mobile platforms
  if (platform === 'ios') return 100; // iOS has strict quotas
  if (platform === 'android') return 200; // Android more permissive
  return 500; // Web can use more
};

/**
 * Check voice capabilities for platform
 */
export const getVoiceCapabilities = (): MobilePlatformInfo['voiceCapabilities'] => {
  const platform = getPlatform();
  
  return {
    nativeTTS: platform !== 'web', // iOS/Android have native TTS
    webSpeechAPI: 'speechSynthesis' in window,
    speechRecognition: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
  };
};

/**
 * Get comprehensive platform info
 */
export const getMobilePlatformInfo = async (): Promise<MobilePlatformInfo> => {
  const platform = getPlatform();
  const supportsWebGPU = await checkWebGPUSupport();
  
  return {
    isNativeApp: isCapacitorApp(),
    isCapacitor: isCapacitorApp(),
    platform,
    osVersion: getOSVersion(),
    isTablet: isTablet(),
    supportsWebGPU,
    supportsBackgroundFetch: platform === 'android', // iOS limits background fetch
    supportsPushNotifications: isCapacitorApp(),
    maxStorageMB: getMaxStorageMB(),
    voiceCapabilities: getVoiceCapabilities(),
  };
};

/**
 * Platform-specific storage key prefix
 */
export const getStoragePrefix = (): string => {
  const platform = getPlatform();
  return `zoe_${platform}_`;
};

/**
 * Request wake lock (prevent screen from sleeping during voice)
 */
export const requestWakeLock = async (): Promise<(() => void) | null> => {
  if (!('wakeLock' in navigator)) return null;
  
  try {
    const wakeLock = await (navigator as any).wakeLock.request('screen');
    return () => wakeLock.release();
  } catch {
    return null;
  }
};

/**
 * Vibrate device (for haptic feedback on notifications)
 */
export const vibrate = (pattern: number | number[]): boolean => {
  if ('vibrate' in navigator) {
    return navigator.vibrate(pattern);
  }
  return false;
};

/**
 * Check if app is in foreground
 */
export const isAppInForeground = (): boolean => {
  return document.visibilityState === 'visible';
};

/**
 * Listen for app visibility changes
 */
export const onVisibilityChange = (callback: (isVisible: boolean) => void): (() => void) => {
  const handler = () => callback(document.visibilityState === 'visible');
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
};

/**
 * Cached AudioContext state to avoid creating multiple instances
 */
let cachedAudioPermission: boolean | null = null;

/**
 * iOS-specific: Check if user has granted audio playback permission
 */
export const hasAudioPermission = (): boolean => {
  if (cachedAudioPermission !== null) return cachedAudioPermission;
  
  // On iOS, audio requires user gesture. Check if AudioContext is allowed.
  if (typeof AudioContext === 'undefined') {
    cachedAudioPermission = false;
    return false;
  }
  
  try {
    const ctx = new AudioContext();
    cachedAudioPermission = ctx.state !== 'suspended';
    ctx.close();
    return cachedAudioPermission;
  } catch {
    cachedAudioPermission = false;
    return false;
  }
};

/**
 * Reset cached audio permission (call after user gesture)
 */
export const resetAudioPermissionCache = (): void => {
  cachedAudioPermission = null;
};

/**
 * Request audio playback permission (iOS requires user gesture)
 */
export const requestAudioPermission = async (): Promise<boolean> => {
  try {
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    ctx.close();
    return true;
  } catch {
    return false;
  }
};

export default {
  isCapacitorApp,
  getPlatform,
  getOSVersion,
  isTablet,
  checkWebGPUSupport,
  getMaxStorageMB,
  getVoiceCapabilities,
  getMobilePlatformInfo,
  getStoragePrefix,
  requestWakeLock,
  vibrate,
  isAppInForeground,
  onVisibilityChange,
  hasAudioPermission,
  requestAudioPermission,
  resetAudioPermissionCache,
};
