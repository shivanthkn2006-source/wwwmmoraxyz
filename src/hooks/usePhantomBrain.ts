// ═══════════════════════════════════════════════════════════════════════════════
// USE PHANTOM BRAIN HOOK
// React integration for State Space Model (SSM) Local AI Processing
// ═══════════════════════════════════════════════════════════════════════════════
// 
// This hook provides:
// - Zero-cost local AI processing for simple queries
// - Automatic cloud handoff for complex reasoning
// - Battery-aware processing mode
// - Soul state compression for DHF integration
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StateSpaceEngine,
  PhantomBrainState,
  SSMConfig,
  SSMObservation,
  initializePhantomBrain,
  processLocalQuery,
  getSoulStateVector,
} from '@/core/ssm/StateSpaceEngine';
import { useDeviceTierContext } from '@/contexts/DeviceTierContext';
import { supabase } from '@/integrations/supabase/client';

export interface UsePhantomBrainReturn {
  // State
  isInitialized: boolean;
  isProcessing: boolean;
  deviceTier: 'local' | 'hybrid' | 'cloud';
  lastLatencyMs: number;
  batteryImpact: number;
  
  // Core functions
  processQuery: (text: string) => Promise<PhantomBrainResponse>;
  compressContext: (observations: SSMObservation[]) => Promise<void>;
  getSoulSummary: () => SoulSummary;
  
  // Cloud handoff
  handoffToCloud: (query: string) => Promise<CloudResponse>;
  
  // Lifecycle
  initialize: () => Promise<boolean>;
  dispose: () => void;
}

export interface PhantomBrainResponse {
  intent: string;
  confidence: number;
  sentiment: number;
  response?: string;
  handedOffToCloud: boolean;
  latencyMs: number;
  cost: number; // Always $0.00 for local
}

export interface SoulSummary {
  vectorHash: string;
  dimensions: number;
  confidence: number;
  categories: string[];
  totalObservations: number;
  observationCount: number;
}

export interface CloudResponse {
  text: string;
  confidence: number;
  latencyMs: number;
  model: string;
}

// ═══ LOCAL RESPONSE GENERATION ═══

const LOCAL_RESPONSES: Record<string, (context?: any) => string> = {
  wake_word: () => "I'm here! How can I help you?",
  greeting: () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning! ✨";
    if (hour < 17) return "Good afternoon! 🌞";
    return "Good evening! 🌙";
  },
  time_query: () => {
    const now = new Date();
    return `It's ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  },
  smart_home: () => "Processing your command locally... 🏠",
};

// ═══ MAIN HOOK ═══

export const usePhantomBrain = (): UsePhantomBrainReturn => {
  const deviceContext = useDeviceTierContext();
  
  const [state, setState] = useState<PhantomBrainState | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const initRef = useRef(false);
  
  // Subscribe to SSM state changes
  useEffect(() => {
    const unsubscribe = StateSpaceEngine.subscribe(setState);
    return unsubscribe;
  }, []);
  
  // ═══ INITIALIZATION ═══
  
  const initialize = useCallback(async (): Promise<boolean> => {
    if (initRef.current || state?.isInitialized) {
      return true;
    }
    
    initRef.current = true;
    setIsInitializing(true);
    
    try {
      // Determine optimal config based on device tier
      const config: Partial<SSMConfig> = {};
      
      if (deviceContext?.capabilities?.liteMode) {
        config.useWebGPU = false;
        config.batteryOptimized = true;
        config.selectivityThreshold = 0.4;
      } else if (deviceContext?.capabilities?.tier === 'S') {
        config.useWebGPU = true;
        config.stateDimensions = 768; // Larger state for flagship
        config.selectivityThreshold = 0.2;
      }
      
      const success = await initializePhantomBrain(config);
      
      if (success) {
        console.log('[PhantomBrain] ✅ Initialized successfully');
      }
      
      return success;
    } finally {
      setIsInitializing(false);
    }
  }, [deviceContext?.capabilities, state?.isInitialized]);
  
  // Auto-initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);
  
  // ═══ PROCESS QUERY ═══
  
  const processQuery = useCallback(async (text: string): Promise<PhantomBrainResponse> => {
    const startTime = performance.now();
    
    // Ensure initialized
    if (!state?.isInitialized) {
      await initialize();
    }
    
    // Process locally first
    const localResult = await processLocalQuery(text);
    
    // If no cloud handoff needed, respond locally
    if (!localResult.handoffToCloud) {
      const responseGenerator = LOCAL_RESPONSES[localResult.intent];
      const response = responseGenerator ? responseGenerator() : undefined;
      
      return {
        intent: localResult.intent,
        confidence: localResult.confidence,
        sentiment: localResult.sentiment,
        response,
        handedOffToCloud: false,
        latencyMs: performance.now() - startTime,
        cost: 0, // $0.00 - Local processing
      };
    }
    
    // Hand off to cloud
    const cloudResponse = await handoffToCloud(text);
    
    return {
      intent: localResult.intent,
      confidence: cloudResponse.confidence,
      sentiment: localResult.sentiment,
      response: cloudResponse.text,
      handedOffToCloud: true,
      latencyMs: performance.now() - startTime,
      cost: 0.001, // Small cloud cost
    };
  }, [state?.isInitialized, initialize]);
  
  // ═══ CLOUD HANDOFF ═══
  
  const handoffToCloud = useCallback(async (query: string): Promise<CloudResponse> => {
    const startTime = performance.now();
    
    try {
      // Get compressed state to send with query (SSM efficiency)
      const handoff = StateSpaceEngine.prepareCloudHandoff();
      
      // Call edge function with compressed context
      const { data, error } = await supabase.functions.invoke('zoe-core-intelligence', {
        body: {
          command: query,
          mode: 'phantom_handoff',
          context: {
            ssmState: handoff.compressedContext,
            priority: handoff.priority,
            // Don't send full vector to save bandwidth
          },
        },
      });
      
      if (error) throw error;
      
      return {
        text: data?.response || data?.result || 'I processed your request.',
        confidence: data?.confidence || 0.8,
        latencyMs: performance.now() - startTime,
        model: data?.model || 'gemini-3-flash',
      };
    } catch (error) {
      console.error('[PhantomBrain] Cloud handoff failed:', error);
      
      return {
        text: "I'm having trouble connecting. Let me try again.",
        confidence: 0.5,
        latencyMs: performance.now() - startTime,
        model: 'fallback',
      };
    }
  }, []);
  
  // ═══ CONTEXT COMPRESSION ═══
  
  const compressContext = useCallback(async (observations: SSMObservation[]): Promise<void> => {
    // Categorize observations
    const textObs = observations.filter(o => o.type === 'text');
    const otherObs = observations.filter(o => o.type !== 'text');
    
    // Compress text observations into context state
    if (textObs.length > 0) {
      await StateSpaceEngine.compressToStateVector(textObs, 'context');
    }
    
    // Compress other observations
    if (otherObs.length > 0) {
      await StateSpaceEngine.compressToStateVector(otherObs, 'soul');
    }
  }, []);
  
  // ═══ GET SOUL SUMMARY ═══
  
  const getSoulSummary = useCallback((): SoulSummary => {
    const stateVector = getSoulStateVector();
    return {
      ...stateVector,
      totalObservations: stateVector.observationCount,
    };
  }, []);
  
  // ═══ CLEANUP ═══
  
  const dispose = useCallback(() => {
    StateSpaceEngine.dispose();
    initRef.current = false;
  }, []);
  
  return {
    // State
    isInitialized: state?.isInitialized || false,
    isProcessing: state?.isProcessing || isInitializing,
    deviceTier: state?.deviceTier || 'cloud',
    lastLatencyMs: state?.inferenceLatencyMs || 0,
    batteryImpact: state?.batteryImpact || 0,
    
    // Functions
    processQuery,
    compressContext,
    getSoulSummary,
    handoffToCloud,
    initialize,
    dispose,
  };
};

export default usePhantomBrain;
