// ═══════════════════════════════════════════════════════════════════════════════
// OFFLINE SLM HOOK - React integration for the Anti-Lobotomy Solution
// Provides intelligent offline responses using browser-based SLM
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  OfflineSLMEngine,
  initializeOfflineSLM,
  generateOfflineResponse,
  getSLMState,
  subscribeSLMState,
  type SLMState,
} from '@/core/slm/OfflineSLMEngine';

// Re-export SLMState type
export type { SLMState };

export interface UseOfflineSLMReturn {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  isGenerating: boolean;
  loadProgress: number;
  deviceTier: 'flagship' | 'midrange' | 'budget';
  device: 'gemini-nano' | 'gemma-mediapipe' | 'scripted';
  error: string | null;
  
  // Metrics
  lastLatencyMs: number;
  tokensPerSecond: number;
  
  // Actions
  initialize: () => Promise<boolean>;
  generate: (
    message: string,
    context?: {
      userName?: string;
      recentMemories?: string[];
      emotionalState?: string;
      timeOfDay?: string;
    }
  ) => Promise<{
    content: string;
    latencyMs: number;
    tokensGenerated: number;
    fromSLM: true;
  }>;
  
  // Memory
  addToHistory: (role: 'user' | 'assistant', content: string) => void;
  clearHistory: () => void;
  getHistory: () => Array<{ role: 'user' | 'assistant'; content: string }>;
}

export function useOfflineSLM(): UseOfflineSLMReturn {
  const [state, setState] = useState<SLMState>(getSLMState());
  const initializingRef = useRef(false);
  
  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = subscribeSLMState((newState) => {
      setState(newState);
    });
    
    return unsubscribe;
  }, []);
  
  // Auto-initialize when online status changes to offline
  useEffect(() => {
    const handleOffline = () => {
      if (!state.isInitialized && !state.isLoading && !initializingRef.current) {
        console.log('[useOfflineSLM] Going offline, pre-loading SLM...');
        // Don't block - just start loading
        initializeOfflineSLM();
      }
    };
    
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('offline', handleOffline);
    };
  }, [state.isInitialized, state.isLoading]);
  
  const initialize = useCallback(async (): Promise<boolean> => {
    if (initializingRef.current) return false;
    initializingRef.current = true;
    
    try {
      const result = await initializeOfflineSLM();
      return result;
    } finally {
      initializingRef.current = false;
    }
  }, []);
  
  const generate = useCallback(async (
    message: string,
    context?: {
      userName?: string;
      recentMemories?: string[];
      emotionalState?: string;
      timeOfDay?: string;
    }
  ) => {
    // If not initialized, try to initialize first
    if (!state.isInitialized && !state.isLoading) {
      console.log('[useOfflineSLM] Auto-initializing for generation...');
      await initialize();
    }
    
    return generateOfflineResponse(message, context);
  }, [state.isInitialized, state.isLoading, initialize]);
  
  const addToHistory = useCallback((role: 'user' | 'assistant', content: string) => {
    OfflineSLMEngine.addToHistory(role, content);
  }, []);
  
  const clearHistory = useCallback(() => {
    OfflineSLMEngine.clearHistory();
  }, []);
  
  const getHistory = useCallback(() => {
    return OfflineSLMEngine.getHistory();
  }, []);
  
  return {
    // State
    isInitialized: state.isInitialized,
    isLoading: state.isLoading,
    isGenerating: state.isGenerating,
    loadProgress: state.loadProgress,
    deviceTier: state.deviceTier,
    device: state.device,
    error: state.error,
    
    // Metrics
    lastLatencyMs: state.lastGenerationLatencyMs,
    tokensPerSecond: state.tokensPerSecond,
    
    // Actions
    initialize,
    generate,
    addToHistory,
    clearHistory,
    getHistory,
  };
}

export default useOfflineSLM;
