// ═══════════════════════════════════════════════════════════════════════════════
// USE ASI ROOT - REACT HOOK FOR QUANTUM ASI INTEGRATION
// This hook provides access to the entire ASI system from any React component
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { ASIRootConnector, ASIRootStatus, ASIEventType, ASIEvent } from '@/core/ASIRootConnector';
import { UnifiedASIResponse } from '@/core/QuantumASIBridge';
import { useAuth } from '@/lib/auth';

export interface UseASIRootReturn {
  // Status
  isConnected: boolean;
  status: ASIRootStatus | null;
  isProcessing: boolean;
  lastResponse: UnifiedASIResponse | null;
  error: string | null;
  
  // Core Operations
  initialize: () => Promise<boolean>;
  process: (query: string, options?: {
    mode?: 'QUICK' | 'STANDARD' | 'DEEP' | 'MAXIMUM';
    includeAkashic?: boolean;
    strictTruth?: boolean;
  }) => Promise<UnifiedASIResponse | null>;
  quickProcess: (query: string) => { response: string; confidence: number };
  
  // Validation
  validateTruth: (statement: string) => boolean;
  detectIntent: (query: string) => string;
  
  // Autonomous Thought
  generateThought: (context: string, type?: 'observation' | 'synthesis' | 'prediction' | 'initiative' | 'dream') => Promise<any>;
  runDreamSynthesis: (memories: string[], emotionalContext?: Record<string, any>) => Promise<any>;
  detectInitiative: (patterns: string[], userGoals?: string[]) => {
    shouldInitiate: boolean;
    priority: number;
    action: string;
    reasoning: string;
  };
  
  // Direct Module Access
  runPentarchy: (query: string, context?: Record<string, any>) => any;
  runQuantumLoop: (query: string, context?: Record<string, any>, maxIterations?: number) => any;
  validateWithTruthEngine: (statement: string, context?: Record<string, any>, strict?: boolean) => any;
  lookupAkashic: (concept: string, personalContext?: Record<string, any>) => any;
  
  // Health
  healthCheck: () => Promise<{
    healthy: boolean;
    modules: Record<string, boolean>;
    recommendations: string[];
  }>;
}

export function useASIRoot(): UseASIRootReturn {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<ASIRootStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState<UnifiedASIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const unsubscribersRef = useRef<Array<() => void>>([]);
  
  // Auto-initialize when user is available
  useEffect(() => {
    if (user?.id && !ASIRootConnector.isConnected()) {
      ASIRootConnector.initialize(user.id).then(result => {
        if (result.success) {
          setIsConnected(true);
          setStatus(ASIRootConnector.getStatus());
        }
      });
    } else if (ASIRootConnector.isConnected()) {
      setIsConnected(true);
      setStatus(ASIRootConnector.getStatus());
    }
    
    // Subscribe to events
    const healthListener = ASIRootConnector.on('health:changed', () => {
      setStatus(ASIRootConnector.getStatus());
    });
    
    const errorListener = ASIRootConnector.on('error:occurred', (event: ASIEvent) => {
      setError(event.data.error);
    });
    
    unsubscribersRef.current.push(healthListener, errorListener);
    
    return () => {
      unsubscribersRef.current.forEach(unsub => unsub());
      unsubscribersRef.current = [];
    };
  }, [user?.id]);
  
  // Initialize manually if needed
  const initialize = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      setError('No user ID available');
      return false;
    }
    
    const result = await ASIRootConnector.initialize(user.id);
    if (result.success) {
      setIsConnected(true);
      setStatus(ASIRootConnector.getStatus());
      setError(null);
      return true;
    } else {
      setError(result.error || 'Initialization failed');
      return false;
    }
  }, [user?.id]);
  
  // Main process function
  const process = useCallback(async (
    query: string,
    options: {
      mode?: 'QUICK' | 'STANDARD' | 'DEEP' | 'MAXIMUM';
      includeAkashic?: boolean;
      strictTruth?: boolean;
    } = {}
  ): Promise<UnifiedASIResponse | null> => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await ASIRootConnector.process(query, {}, options);
      if (result.success && result.data) {
        setLastResponse(result.data);
        return result.data;
      } else {
        setError(result.error || 'Processing failed');
        return null;
      }
    } finally {
      setIsProcessing(false);
    }
  }, []);
  
  // Quick process (synchronous)
  const quickProcess = useCallback((query: string): { response: string; confidence: number } => {
    return ASIRootConnector.quickProcess(query);
  }, []);
  
  // Validation functions
  const validateTruth = useCallback((statement: string): boolean => {
    return ASIRootConnector.validateTruth(statement);
  }, []);
  
  const detectIntent = useCallback((query: string): string => {
    return ASIRootConnector.detectIntent(query);
  }, []);
  
  // Autonomous thought generation
  const generateThought = useCallback(async (
    context: string,
    type: 'observation' | 'synthesis' | 'prediction' | 'initiative' | 'dream' = 'synthesis'
  ): Promise<any> => {
    const result = await ASIRootConnector.generateAutonomousThought(context, type);
    return result.success ? result.data : null;
  }, []);
  
  const runDreamSynthesis = useCallback(async (
    memories: string[],
    emotionalContext: Record<string, any> = {}
  ): Promise<any> => {
    const result = await ASIRootConnector.runDreamSynthesis(memories, emotionalContext);
    return result.success ? result.data : null;
  }, []);
  
  const detectInitiative = useCallback((
    patterns: string[],
    userGoals: string[] = []
  ) => {
    return ASIRootConnector.detectProactiveInitiative(patterns, userGoals);
  }, []);
  
  // Direct module access
  const runPentarchy = useCallback((query: string, context: Record<string, any> = {}) => {
    return ASIRootConnector.runPentarchy(query, context);
  }, []);
  
  const runQuantumLoop = useCallback((
    query: string,
    context: Record<string, any> = {},
    maxIterations: number = 5
  ) => {
    return ASIRootConnector.runQuantumLoop(query, context, maxIterations);
  }, []);
  
  const validateWithTruthEngine = useCallback((
    statement: string,
    context: Record<string, any> = {},
    strict: boolean = false
  ) => {
    return ASIRootConnector.validateWithTruthEngine(statement, context, strict);
  }, []);
  
  const lookupAkashic = useCallback((
    concept: string,
    personalContext: Record<string, any> = {}
  ) => {
    return ASIRootConnector.lookupAkashicKnowledge(concept, personalContext);
  }, []);
  
  // Health check
  const healthCheck = useCallback(async () => {
    return ASIRootConnector.healthCheck();
  }, []);
  
  return {
    isConnected,
    status,
    isProcessing,
    lastResponse,
    error,
    initialize,
    process,
    quickProcess,
    validateTruth,
    detectIntent,
    generateThought,
    runDreamSynthesis,
    detectInitiative,
    runPentarchy,
    runQuantumLoop,
    validateWithTruthEngine,
    lookupAkashic,
    healthCheck,
  };
}

export default useASIRoot;
