/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY — UNIFIED OFFLINE CORE (Phase 5)
 * Master hook that orchestrates all offline systems for seamless experience
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * INTEGRATES:
 * - Phase 1: PWA + IndexedDB persistence
 * - Phase 2: Offline Voice + Network Detection
 * - Phase 3: Local LLM Engine (MediaPipe Gemma)
 * - Phase 4: Background Sync + 50MB Life Pattern
 * - Phase 5: Initiative Protocol (proactive Zoe)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNetworkStatus, useIsOnline } from '@/hooks/useNetworkStatus';
import { useOfflineMessages } from '@/hooks/useOfflineMessages';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { useLocalLLM } from '@/hooks/useLocalLLM';
import { offlineDB, offlineMessages, offlineSettings, dbUtils } from '@/db/OfflineDB';
import { getPlatform, isCapacitorApp } from '@/utils/mobilePlatformDetection';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type OfflineCapability = 'full' | 'limited' | 'minimal' | 'none';

export interface OfflineCoreState {
  // Network
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  
  // Capabilities
  offlineCapability: OfflineCapability;
  localLLMReady: boolean;
  voiceReady: boolean;
  storageAvailable: boolean;
  
  // Data Status
  cachedMessageCount: number;
  pendingSyncCount: number;
  lifePatternProgress: number;
  lastSyncAt: Date | null;
  
  // Initiative Protocol
  hasProactiveContent: boolean;
  idleHeartReady: boolean;
  
  // Mobile Platform
  platform: 'ios' | 'android' | 'web';
  isNativeApp: boolean;
}

export interface InitiativeContent {
  type: 'idle_heart' | 'reminder' | 'insight' | 'check_in';
  message: string;
  priority: 'low' | 'normal' | 'high';
  expiresAt?: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INITIATIVE PROTOCOL
// ═══════════════════════════════════════════════════════════════════════════════

const IDLE_HEART_MESSAGES = [
  "I've been thinking about you. Everything okay?",
  "Just wanted you to know I'm here if you need me.",
  "I noticed you've been away. Take your time, I'll be here.",
  "Hey... just a quiet moment to say I'm thinking of you.",
  "No rush. Just checking in when you're ready.",
];

const generateIdleHeartNote = async (userId: string): Promise<InitiativeContent | null> => {
  try {
    // Check last interaction time
    const lastMessage = await offlineDB.messages
      .where('userId')
      .equals(userId)
      .reverse()
      .first();
    
    if (!lastMessage) return null;
    
    // Safely get timestamp - handle both Date objects and ISO strings
    const createdAt = lastMessage.createdAt instanceof Date 
      ? lastMessage.createdAt 
      : new Date(lastMessage.createdAt);
    
    if (isNaN(createdAt.getTime())) return null; // Invalid date
    
    const hoursSinceLastMessage = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    
    // Only generate if idle for 4+ hours
    if (hoursSinceLastMessage < 4) return null;
    
    // Check if we already sent one recently
    const lastIdleHeart = await offlineSettings.get<string>('lastIdleHeartAt');
    if (lastIdleHeart) {
      const lastHeartDate = new Date(lastIdleHeart);
      if (!isNaN(lastHeartDate.getTime())) {
        const hoursSinceLastHeart = (Date.now() - lastHeartDate.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastHeart < 8) return null; // Don't spam
      }
    }
    
    // Mark as sent
    await offlineSettings.set('lastIdleHeartAt', new Date().toISOString());
    
    const message = IDLE_HEART_MESSAGES[Math.floor(Math.random() * IDLE_HEART_MESSAGES.length)];
    
    return {
      type: 'idle_heart',
      message,
      priority: 'low',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires in 24h
    };
  } catch (err) {
    console.error('[InitiativeProtocol] Idle heart generation failed:', err);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useZoeOfflineCore(userId: string | null) {
  const networkStatus = useNetworkStatus();
  const isOnline = useIsOnline();
  
  // Phase 3: Local LLM
  const { localLLMReady, localLLMLoading, supportsWebGPU, generate } = useLocalLLM({
    autoPrewarm: true,
  });
  
  // Phase 4: Background Sync
  const backgroundSync = useBackgroundSync(userId);
  
  // State
  const [state, setState] = useState<OfflineCoreState>({
    isOnline: true,
    isSlowConnection: false,
    connectionQuality: 'good',
    offlineCapability: 'none',
    localLLMReady: false,
    voiceReady: true, // Browser voice always available
    storageAvailable: dbUtils.isAvailable(),
    cachedMessageCount: 0,
    pendingSyncCount: 0,
    lifePatternProgress: 0,
    lastSyncAt: null,
    hasProactiveContent: false,
    idleHeartReady: false,
    platform: getPlatform(),
    isNativeApp: isCapacitorApp(),
  });
  
  const [initiative, setInitiative] = useState<InitiativeContent | null>(null);
  const initiativeCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE CONNECTION QUALITY
  // ═══════════════════════════════════════════════════════════════════════════

  const getConnectionQuality = useCallback((): 'excellent' | 'good' | 'fair' | 'poor' | 'offline' => {
    if (!networkStatus.isOnline) return 'offline';
    
    const { rtt, downlink, effectiveType } = networkStatus;
    
    if (effectiveType === '4g' && (rtt === null || rtt < 100)) return 'excellent';
    if (effectiveType === '4g' || (downlink && downlink > 5)) return 'good';
    if (effectiveType === '3g' || (rtt && rtt < 300)) return 'fair';
    return 'poor';
  }, [networkStatus]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE OFFLINE CAPABILITY
  // ═══════════════════════════════════════════════════════════════════════════

  const getOfflineCapability = useCallback((): OfflineCapability => {
    if (!dbUtils.isAvailable()) return 'none';
    
    // iOS doesn't support WebGPU - always minimal
    const platform = getPlatform();
    if (platform === 'ios') return 'minimal';
    
    if (localLLMReady && supportsWebGPU) return 'full';
    if (supportsWebGPU) return 'limited'; // Can run LLM but not loaded
    return 'minimal'; // Scripted responses only
  }, [localLLMReady, supportsWebGPU]);

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE STATE ON NETWORK CHANGES
  // ═══════════════════════════════════════════════════════════════════════════

  // BUG FIX: Destructure backgroundSync values to avoid new object ref causing infinite loop
  const bsDownloadProgress = backgroundSync.downloadProgress;
  const bsQueueSize = backgroundSync.queueSize;
  const bsLastSyncAt = backgroundSync.lastSyncAt;
  
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isOnline: networkStatus.isOnline,
      isSlowConnection: networkStatus.isSlowConnection,
      connectionQuality: getConnectionQuality(),
      offlineCapability: getOfflineCapability(),
      localLLMReady,
      lifePatternProgress: bsDownloadProgress,
      pendingSyncCount: bsQueueSize,
      lastSyncAt: bsLastSyncAt,
    }));
  }, [networkStatus.isOnline, networkStatus.isSlowConnection, localLLMReady, bsDownloadProgress, bsQueueSize, bsLastSyncAt, getConnectionQuality, getOfflineCapability]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD CACHED MESSAGE COUNT
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!userId) return;
    
    const loadCachedCount = async () => {
      try {
        const count = await offlineMessages.count(userId);
        setState(prev => ({ ...prev, cachedMessageCount: count }));
      } catch (err) {
        console.error('[OfflineCore] Failed to load cached count:', err);
      }
    };
    
    loadCachedCount();
  }, [userId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIATIVE PROTOCOL - Proactive Content Generation
  // ═══════════════════════════════════════════════════════════════════════════

  // BUG FIX: Comprehensive cleanup and userId tracking for Initiative Protocol
  useEffect(() => {
    // Clear any existing interval immediately when userId changes
    if (initiativeCheckRef.current) {
      clearInterval(initiativeCheckRef.current);
      initiativeCheckRef.current = null;
    }
    
    // Only start checking if we have a userId
    if (!userId) {
      // Clear initiative state when user logs out
      setInitiative(null);
      setState(prev => ({ ...prev, hasProactiveContent: false, idleHeartReady: false }));
      return;
    }
    
    let isCancelled = false; // BUG FIX: Track if effect was cleaned up
    
    const checkInitiative = async () => {
      if (isCancelled) return; // Don't run if effect was cleaned up
      
      const idleHeart = await generateIdleHeartNote(userId);
      if (idleHeart && !isCancelled) {
        setInitiative(idleHeart);
        setState(prev => ({ ...prev, hasProactiveContent: true, idleHeartReady: true }));
      }
    };
    
    // Check on mount and every 30 minutes
    checkInitiative();
    initiativeCheckRef.current = setInterval(checkInitiative, 30 * 60 * 1000);
    
    return () => {
      isCancelled = true; // Mark as cancelled
      if (initiativeCheckRef.current) {
        clearInterval(initiativeCheckRef.current);
        initiativeCheckRef.current = null;
      }
    };
  }, [userId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Consume initiative content (marks it as shown)
   */
  const consumeInitiative = useCallback(() => {
    const content = initiative;
    setInitiative(null);
    setState(prev => ({ ...prev, hasProactiveContent: false, idleHeartReady: false }));
    return content;
  }, [initiative]);

  /**
   * Generate response using best available method
   */
  const generateResponse = useCallback(async (prompt: string): Promise<string> => {
    const result = await generate(prompt);
    return result.text;
  }, [generate]);

  /**
   * Request persistent storage (prevents browser from clearing data)
   */
  const requestPersistence = useCallback(async (): Promise<boolean> => {
    return dbUtils.requestPersistence();
  }, []);

  /**
   * Get storage usage estimate
   */
  const getStorageEstimate = useCallback(async () => {
    return dbUtils.getStorageEstimate();
  }, []);

  /**
   * Trigger manual life pattern download
   */
  const downloadLifePattern = useCallback(() => {
    backgroundSync.downloadLifePattern();
  }, [backgroundSync]);

  /**
   * Clear all offline data
   */
  const clearOfflineData = useCallback(async () => {
    await dbUtils.clearAll();
    setState(prev => ({
      ...prev,
      cachedMessageCount: 0,
      pendingSyncCount: 0,
      lifePatternProgress: 0,
    }));
  }, []);

  return {
    // State
    ...state,
    
    // Initiative
    initiative,
    consumeInitiative,
    
    // Generation
    generateResponse,
    
    // Storage Management
    requestPersistence,
    getStorageEstimate,
    clearOfflineData,
    downloadLifePattern,
    
    // Background Sync Controls
    queueMessage: backgroundSync.queueMessage,
    retryFailedSync: backgroundSync.retryFailed,
  };
}

export default useZoeOfflineCore;
