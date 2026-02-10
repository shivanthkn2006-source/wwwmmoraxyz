/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY — MOBILE OFFLINE OPTIMIZATIONS
 * Platform-specific adaptations for iOS/Android native apps
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getMobilePlatformInfo,
  isCapacitorApp,
  getPlatform,
  requestWakeLock,
  vibrate,
  onVisibilityChange,
  requestAudioPermission,
  type MobilePlatformInfo,
} from '@/utils/mobilePlatformDetection';
import { offlineSettings } from '@/db/OfflineDB';

interface MobileOfflineState {
  platformInfo: MobilePlatformInfo | null;
  isInitialized: boolean;
  audioUnlocked: boolean;
  wakeLockActive: boolean;
  storagePersisted: boolean;
  lastBackgroundedAt: Date | null;
}

export function useMobileOfflineOptimizations() {
  const [state, setState] = useState<MobileOfflineState>({
    platformInfo: null,
    isInitialized: false,
    audioUnlocked: false,
    wakeLockActive: false,
    storagePersisted: false,
    lastBackgroundedAt: null,
  });

  const wakeLockReleaseRef = useRef<(() => void) | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZE PLATFORM INFO
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const init = async () => {
      const info = await getMobilePlatformInfo();
      
      // Request persistent storage on native apps
      let persisted = false;
      if (info.isNativeApp && 'storage' in navigator && 'persist' in navigator.storage) {
        persisted = await navigator.storage.persist();
      }

      setState(prev => ({
        ...prev,
        platformInfo: info,
        isInitialized: true,
        storagePersisted: persisted,
      }));

      console.log('[MobileOptimizations] Platform detected:', {
        platform: info.platform,
        isNative: info.isNativeApp,
        webGPU: info.supportsWebGPU,
        maxStorage: info.maxStorageMB,
      });

      // Log platform-specific limitations
      if (info.platform === 'ios' && !info.supportsWebGPU) {
        console.log('[MobileOptimizations] ⚠️ iOS: WebGPU not supported, using scripted fallback for local AI');
      }
      if (info.platform === 'android' && info.osVersion) {
        const majorVersion = parseInt(info.osVersion.split('.')[0], 10);
        if (majorVersion < 12) {
          console.log('[MobileOptimizations] ⚠️ Android < 12: WebGPU may not work');
        }
      }
    };

    init();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // VISIBILITY TRACKING (for background sync)
  // ═══════════════════════════════════════════════════════════════════════════

  // Use ref to avoid stale closure in visibility handler
  const lastBackgroundedRef = useRef<Date | null>(null);

  useEffect(() => {
    const unsubscribe = onVisibilityChange((isVisible) => {
      if (!isVisible) {
        // App went to background
        const now = new Date();
        lastBackgroundedRef.current = now;
        setState(prev => ({ ...prev, lastBackgroundedAt: now }));
        
        // Release wake lock when backgrounded
        if (wakeLockReleaseRef.current) {
          wakeLockReleaseRef.current();
          wakeLockReleaseRef.current = null;
          setState(prev => ({ ...prev, wakeLockActive: false }));
        }
        
        // Save state for recovery (fire-and-forget but log errors)
        offlineSettings.set('lastBackgroundedAt', now.toISOString())
          .catch(err => console.warn('[MobileOptimizations] Failed to save background timestamp:', err));
        
      } else {
        // App came to foreground - check if we need to resync using ref (not stale state)
        const lastBackgroundedAt = lastBackgroundedRef.current;
        if (lastBackgroundedAt) {
          const minutesInBackground = (Date.now() - lastBackgroundedAt.getTime()) / (1000 * 60);
          if (minutesInBackground > 5) {
            console.log('[MobileOptimizations] App was backgrounded for', minutesInBackground.toFixed(0), 'minutes, triggering resync');
            window.dispatchEvent(new CustomEvent('zoe-request-resync'));
          }
        }
      }
    });

    return unsubscribe;
  }, []); // Empty deps - handler uses ref

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIO UNLOCK (iOS requires user gesture)
  // ═══════════════════════════════════════════════════════════════════════════

  const unlockAudio = useCallback(async (): Promise<boolean> => {
    const success = await requestAudioPermission();
    setState(prev => ({ ...prev, audioUnlocked: success }));
    return success;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // WAKE LOCK (keep screen on during voice)
  // ═══════════════════════════════════════════════════════════════════════════

  const enableWakeLock = useCallback(async (): Promise<boolean> => {
    if (wakeLockReleaseRef.current) return true; // Already active
    
    const release = await requestWakeLock();
    if (release) {
      wakeLockReleaseRef.current = release;
      setState(prev => ({ ...prev, wakeLockActive: true }));
      return true;
    }
    return false;
  }, []);

  const disableWakeLock = useCallback(() => {
    if (wakeLockReleaseRef.current) {
      wakeLockReleaseRef.current();
      wakeLockReleaseRef.current = null;
      setState(prev => ({ ...prev, wakeLockActive: false }));
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // HAPTIC FEEDBACK
  // ═══════════════════════════════════════════════════════════════════════════

  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' | 'notification') => {
    const patterns: Record<typeof type, number | number[]> = {
      light: 10,
      medium: 25,
      heavy: 50,
      notification: [0, 50, 50, 50],
    };
    vibrate(patterns[type]);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // PLATFORM-SPECIFIC VOICE CONFIG
  // ═══════════════════════════════════════════════════════════════════════════

  const getVoiceConfig = useCallback(() => {
    const platform = getPlatform();
    
    // iOS needs specific voice handling
    if (platform === 'ios') {
      return {
        preferNativeTTS: true,
        maxChunkLength: 150, // iOS Safari has shorter buffer limits
        pauseBetweenChunks: 150,
        rate: 0.9, // Slightly slower for better iOS synthesis
      };
    }
    
    // Android works well with longer chunks
    if (platform === 'android') {
      return {
        preferNativeTTS: false, // Prefer Deepgram when online
        maxChunkLength: 200,
        pauseBetweenChunks: 100,
        rate: 0.92,
      };
    }
    
    // Web defaults
    return {
      preferNativeTTS: false,
      maxChunkLength: 180,
      pauseBetweenChunks: 100,
      rate: 0.88,
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // STORAGE OPTIMIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  const getStorageConfig = useCallback(() => {
    const info = state.platformInfo;
    if (!info) {
      return {
        maxLifePatternMB: 50,
        maxCachedMessages: 1000,
        cleanupThreshold: 0.8, // Trigger cleanup at 80% capacity
      };
    }

    // Reduce storage on mobile
    if (info.isNativeApp) {
      return {
        maxLifePatternMB: Math.min(info.maxStorageMB * 0.5, 50), // Use half of max
        maxCachedMessages: 500,
        cleanupThreshold: 0.7, // More aggressive cleanup on mobile
      };
    }

    return {
      maxLifePatternMB: 50,
      maxCachedMessages: 1000,
      cleanupThreshold: 0.8,
    };
  }, [state.platformInfo]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    return () => {
      if (wakeLockReleaseRef.current) {
        wakeLockReleaseRef.current();
      }
    };
  }, []);

  return {
    // State
    ...state,
    isNativeApp: isCapacitorApp(),
    platform: getPlatform(),

    // Actions
    unlockAudio,
    enableWakeLock,
    disableWakeLock,
    hapticFeedback,

    // Config getters
    getVoiceConfig,
    getStorageConfig,
  };
}

export default useMobileOfflineOptimizations;
