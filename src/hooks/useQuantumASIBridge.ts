// ═══════════════════════════════════════════════════════════════════════════════
// QUANTUM ASI BRIDGE HOOK - React Integration
// Provides React components with access to the unified Quantum ASI Bridge
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { QuantumASIBridge, BridgeState, UnifiedASIResponse } from '@/core/QuantumASIBridge';
import { ASIMode } from '@/core/asi/ASIProcessor';
import { useAuth } from '@/lib/auth';

export interface UseQuantumASIBridgeReturn {
  // State
  isInitialized: boolean;
  isProcessing: boolean;
  bridgeState: BridgeState;
  lastResponse: UnifiedASIResponse | null;
  
  // Main processing
  process: (
    query: string,
    options?: {
      mode?: ASIMode;
      includeAkashic?: boolean;
      context?: Record<string, any>;
    }
  ) => Promise<UnifiedASIResponse>;
  
  // Quick operations
  quickProcess: (query: string) => { response: string; confidence: number };
  validateStatement: (statement: string) => boolean;
  detectIntent: (query: string) => string;
  
  // Autonomous operations
  generateThought: (context: string, type?: 'observation' | 'synthesis' | 'prediction' | 'initiative' | 'dream') => Promise<any>;
  synthesizeDreams: (memories: string[]) => Promise<any>;
  
  // Module control
  enableModule: (module: 'pentarchy' | 'truthEngine' | 'quantumLoop' | 'akashic') => void;
  disableModule: (module: 'pentarchy' | 'truthEngine' | 'quantumLoop' | 'akashic') => void;
  
  // Stats
  getTotalQueries: () => number;
  getAverageConfidence: () => number;
}

export function useQuantumASIBridge(): UseQuantumASIBridgeReturn {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState<UnifiedASIResponse | null>(null);
  const [bridgeState, setBridgeState] = useState<BridgeState>(QuantumASIBridge.getState());
  
  const initRef = useRef(false);
  
  // Initialize bridge when user is available
  useEffect(() => {
    if (user?.id && !initRef.current) {
      QuantumASIBridge.initialize(user.id);
      setBridgeState(QuantumASIBridge.getState());
      initRef.current = true;
    }
  }, [user?.id]);
  
  // Update state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setBridgeState(QuantumASIBridge.getState());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const process = useCallback(async (
    query: string,
    options: {
      mode?: ASIMode;
      includeAkashic?: boolean;
      context?: Record<string, any>;
    } = {}
  ): Promise<UnifiedASIResponse> => {
    setIsProcessing(true);
    
    try {
      const response = await QuantumASIBridge.process(query, options.context || {}, {
        mode: options.mode,
        includeAkashic: options.includeAkashic
      });
      
      setLastResponse(response);
      setBridgeState(QuantumASIBridge.getState());
      
      return response;
    } finally {
      setIsProcessing(false);
    }
  }, []);
  
  const quickProcess = useCallback((query: string) => {
    return QuantumASIBridge.quickProcess(query);
  }, []);
  
  const validateStatement = useCallback((statement: string) => {
    return QuantumASIBridge.validateStatement(statement);
  }, []);
  
  const detectIntent = useCallback((query: string) => {
    return QuantumASIBridge.detectQueryIntent(query);
  }, []);
  
  const generateThought = useCallback(async (
    context: string,
    type: 'observation' | 'synthesis' | 'prediction' | 'initiative' | 'dream' = 'synthesis'
  ) => {
    return QuantumASIBridge.generateThought(context, type);
  }, []);
  
  const synthesizeDreams = useCallback(async (memories: string[]) => {
    return QuantumASIBridge.synthesizeDreams(memories);
  }, []);
  
  const enableModule = useCallback((module: 'pentarchy' | 'truthEngine' | 'quantumLoop' | 'akashic') => {
    QuantumASIBridge.enableModule(module);
    setBridgeState(QuantumASIBridge.getState());
  }, []);
  
  const disableModule = useCallback((module: 'pentarchy' | 'truthEngine' | 'quantumLoop' | 'akashic') => {
    QuantumASIBridge.disableModule(module);
    setBridgeState(QuantumASIBridge.getState());
  }, []);
  
  const getTotalQueries = useCallback(() => {
    return QuantumASIBridge.getState().totalQueries;
  }, []);
  
  const getAverageConfidence = useCallback(() => {
    return QuantumASIBridge.getState().averageConfidence;
  }, []);
  
  return {
    isInitialized: bridgeState.initialized,
    isProcessing,
    bridgeState,
    lastResponse,
    process,
    quickProcess,
    validateStatement,
    detectIntent,
    generateThought,
    synthesizeDreams,
    enableModule,
    disableModule,
    getTotalQueries,
    getAverageConfidence
  };
}

export default useQuantumASIBridge;
