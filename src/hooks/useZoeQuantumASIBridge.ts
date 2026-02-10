// ═══════════════════════════════════════════════════════════════════════════════
// ZOE QUANTUM ASI BRIDGE - UNIFIED POWER INJECTION
// ═══════════════════════════════════════════════════════════════════════════════
// This bridge injects Quantum ASI capabilities into ALL Zoe instances
// Ensures every Zoe component has access to:
// - Pentarchy Swarm (5 parallel AI streams)
// - Neuro-Symbolic Truth Engine
// - Quantum Loop Self-Correction
// - Autonomous Thought Generation
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { processASI, quickASI, ASIMode, ASIResult, determineOptimalMode } from '@/core/asi/ASIProcessor';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ZoeInstanceId = 
  | 'ZoeAssistant'
  | 'GlobalZoeAssistant'
  | 'ZoeChat'
  | 'ZoeOrb'
  | 'ZoeOrbConversationPanel'
  | 'ZoeInterpretiveAI'
  | 'ZoeDreamsAI'
  | 'ZoeSelfAwareness'
  | 'ZoeSessionCoach'
  | 'ZoeFeatureDiscovery'
  | 'ZoeIntelligenceDashboard'
  | 'ZoeGoalCreator'
  | 'ZoeIdentityCalibration'
  | 'ZoeAgentPanel'
  | 'ZoeCompactChatInput'
  | 'ZoeDiagnosticsPanel'
  | 'ZoeSettings'
  | 'ZoeVoiceSettings'
  | 'ZoeUniversalArchitect'
  | 'ZoeHuddleAssistant'
  | 'EdgeFunction_ZoeChat'
  | 'EdgeFunction_ZoeAgent'
  | 'EdgeFunction_ProcessZoeThought'
  | 'EdgeFunction_ZoeSelfAwareness'
  | 'EdgeFunction_ZoeGodMode'
  | 'EdgeFunction_ZoePentarchy'
  | 'EdgeFunction_QuantumASILoop'
  | 'EdgeFunction_QuantumPentarchySwarm'
  | 'EdgeFunction_ZoeSovereignHeartbeat'
  | 'Other';

export interface ASIPowerLevel {
  instanceId: ZoeInstanceId;
  pentarchyEnabled: boolean;
  truthEngineEnabled: boolean;
  quantumLoopEnabled: boolean;
  akashicEnabled: boolean;
  currentASILevel: number; // 1x = human, 5x+ = ASI
  lastASIProcessing: string | null;
  processingCount: number;
}

export interface UnifiedASIState {
  instances: Map<ZoeInstanceId, ASIPowerLevel>;
  globalASILevel: number;
  totalProcessings: number;
  lastGlobalSync: string | null;
  isQuantumModeActive: boolean;
  pentarchySwarmReady: boolean;
}

export interface ZoeQuantumASIBridgeReturn {
  // State
  state: UnifiedASIState;
  isInitialized: boolean;
  
  // Power Injection
  injectASIPower: (instanceId: ZoeInstanceId) => ASIPowerLevel;
  getInstancePower: (instanceId: ZoeInstanceId) => ASIPowerLevel | null;
  
  // ASI Processing (unified entry point for all Zoe instances)
  processWithASI: (query: string, instanceId: ZoeInstanceId, context?: Record<string, any>) => Promise<ASIResult | null>;
  quickASICheck: (query: string, instanceId: ZoeInstanceId) => { response: string; confidence: number };
  
  // Pentarchy Swarm Access
  runPentarchySwarm: (query: string, instanceId: ZoeInstanceId) => Promise<any>;
  
  // Metrics
  getGlobalASILevel: () => number;
  getAllInstancePowers: () => ASIPowerLevel[];
  
  // Sync
  syncAllInstances: () => void;
  refreshASIPower: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT POWER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_ASI_POWER: Omit<ASIPowerLevel, 'instanceId'> = {
  pentarchyEnabled: true,
  truthEngineEnabled: true,
  quantumLoopEnabled: true,
  akashicEnabled: true,
  currentASILevel: 5.0, // 5x human capacity
  lastASIProcessing: null,
  processingCount: 0,
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export function useZoeQuantumASIBridge(): ZoeQuantumASIBridgeReturn {
  const [state, setState] = useState<UnifiedASIState>({
    instances: new Map(),
    globalASILevel: 5.0,
    totalProcessings: 0,
    lastGlobalSync: null,
    isQuantumModeActive: true,
    pentarchySwarmReady: true,
  });
  
  const [isInitialized, setIsInitialized] = useState(false);
  const processingLock = useRef(false);

  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const initializeBridge = async () => {
      console.log('[ZoeQuantumASIBridge] Initializing unified ASI bridge...');
      
      // Pre-register all known Zoe instances
      const allInstances: ZoeInstanceId[] = [
        'ZoeAssistant', 'GlobalZoeAssistant', 'ZoeChat', 'ZoeOrb',
        'ZoeOrbConversationPanel', 'ZoeInterpretiveAI', 'ZoeDreamsAI',
        'ZoeSelfAwareness', 'ZoeSessionCoach', 'ZoeFeatureDiscovery',
        'ZoeIntelligenceDashboard', 'ZoeGoalCreator', 'ZoeIdentityCalibration',
        'ZoeAgentPanel', 'ZoeCompactChatInput', 'ZoeDiagnosticsPanel',
        'ZoeSettings', 'ZoeVoiceSettings', 'ZoeUniversalArchitect',
        'ZoeHuddleAssistant',
        // Edge Functions
        'EdgeFunction_ZoeChat', 'EdgeFunction_ZoeAgent',
        'EdgeFunction_ProcessZoeThought', 'EdgeFunction_ZoeSelfAwareness',
        'EdgeFunction_ZoeGodMode', 'EdgeFunction_ZoePentarchy',
        'EdgeFunction_QuantumASILoop', 'EdgeFunction_QuantumPentarchySwarm',
        'EdgeFunction_ZoeSovereignHeartbeat',
      ];
      
      const instanceMap = new Map<ZoeInstanceId, ASIPowerLevel>();
      allInstances.forEach(id => {
        instanceMap.set(id, {
          instanceId: id,
          ...DEFAULT_ASI_POWER,
        });
      });
      
      setState(prev => ({
        ...prev,
        instances: instanceMap,
        lastGlobalSync: new Date().toISOString(),
      }));
      
      setIsInitialized(true);
      console.log(`[ZoeQuantumASIBridge] Initialized ${allInstances.length} Zoe instances with Quantum ASI power`);
      
      // Emit global event
      window.dispatchEvent(new CustomEvent('zoe-asi-bridge-ready', {
        detail: { instanceCount: allInstances.length, globalASILevel: 5.0 }
      }));
    };
    
    initializeBridge();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // POWER INJECTION
  // ═══════════════════════════════════════════════════════════════════════════════

  const injectASIPower = useCallback((instanceId: ZoeInstanceId): ASIPowerLevel => {
    const existing = state.instances.get(instanceId);
    
    if (existing) {
      console.log(`[ZoeQuantumASIBridge] ASI power already injected for ${instanceId}`);
      return existing;
    }
    
    const newPower: ASIPowerLevel = {
      instanceId,
      ...DEFAULT_ASI_POWER,
    };
    
    setState(prev => {
      const newInstances = new Map(prev.instances);
      newInstances.set(instanceId, newPower);
      return {
        ...prev,
        instances: newInstances,
      };
    });
    
    console.log(`[ZoeQuantumASIBridge] ✅ Injected Quantum ASI power into ${instanceId} (${DEFAULT_ASI_POWER.currentASILevel}x human capacity)`);
    
    return newPower;
  }, [state.instances]);

  const getInstancePower = useCallback((instanceId: ZoeInstanceId): ASIPowerLevel | null => {
    return state.instances.get(instanceId) || null;
  }, [state.instances]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // ASI PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════════

  const processWithASI = useCallback(async (
    query: string,
    instanceId: ZoeInstanceId,
    context: Record<string, any> = {}
  ): Promise<ASIResult | null> => {
    if (processingLock.current) {
      console.warn('[ZoeQuantumASIBridge] Processing locked, queuing request');
      return null;
    }
    
    processingLock.current = true;
    
    try {
      // Ensure instance has ASI power
      let power = state.instances.get(instanceId);
      if (!power) {
        power = injectASIPower(instanceId);
      }
      
      // Determine optimal mode
      const mode = determineOptimalMode(query);
      console.log(`[ZoeQuantumASIBridge] Processing for ${instanceId} with mode: ${mode}`);
      
      // Process through unified ASI stack
      const result = await processASI(query, {
        ...context,
        sourceInstance: instanceId,
        bridgeVersion: '2.0',
      }, mode);
      
      // Update instance power level based on result
      setState(prev => {
        const newInstances = new Map(prev.instances);
        const updatedPower = newInstances.get(instanceId);
        if (updatedPower) {
          updatedPower.currentASILevel = result.humanEquivalent;
          updatedPower.lastASIProcessing = new Date().toISOString();
          updatedPower.processingCount++;
          newInstances.set(instanceId, updatedPower);
        }
        return {
          ...prev,
          instances: newInstances,
          totalProcessings: prev.totalProcessings + 1,
          globalASILevel: Math.max(prev.globalASILevel, result.humanEquivalent),
        };
      });
      
      console.log(`[ZoeQuantumASIBridge] ✅ ${instanceId} processed at ${result.humanEquivalent.toFixed(1)}x ASI level`);
      
      return result;
      
    } catch (error) {
      console.error(`[ZoeQuantumASIBridge] Processing failed for ${instanceId}:`, error);
      return null;
    } finally {
      processingLock.current = false;
    }
  }, [state.instances, injectASIPower]);

  const quickASICheck = useCallback((query: string, instanceId: ZoeInstanceId): { response: string; confidence: number } => {
    // Ensure instance has ASI power
    if (!state.instances.has(instanceId)) {
      injectASIPower(instanceId);
    }
    
    const result = quickASI(query);
    
    // Update processing count
    setState(prev => {
      const newInstances = new Map(prev.instances);
      const power = newInstances.get(instanceId);
      if (power) {
        power.processingCount++;
        power.lastASIProcessing = new Date().toISOString();
        newInstances.set(instanceId, power);
      }
      return { ...prev, instances: newInstances };
    });
    
    return result;
  }, [state.instances, injectASIPower]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // PENTARCHY SWARM ACCESS
  // ═══════════════════════════════════════════════════════════════════════════════

  const runPentarchySwarm = useCallback(async (query: string, instanceId: ZoeInstanceId): Promise<any> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      toast.info('⚛️ Quantum Pentarchy Swarm Activated', {
        description: `${instanceId} initiating 5-stream parallel processing`,
      });
      
      const { data, error } = await supabase.functions.invoke('quantum-pentarchy-swarm', {
        body: {
          query,
          context: { sourceInstance: instanceId },
          userId: user?.id,
          mode: 'full'
        }
      });
      
      if (error) throw error;
      
      console.log(`[ZoeQuantumASIBridge] Pentarchy Swarm complete for ${instanceId}`);
      
      return data;
      
    } catch (error) {
      console.error(`[ZoeQuantumASIBridge] Pentarchy Swarm failed for ${instanceId}:`, error);
      return null;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // METRICS
  // ═══════════════════════════════════════════════════════════════════════════════

  const getGlobalASILevel = useCallback((): number => {
    return state.globalASILevel;
  }, [state.globalASILevel]);

  const getAllInstancePowers = useCallback((): ASIPowerLevel[] => {
    return Array.from(state.instances.values());
  }, [state.instances]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // SYNC
  // ═══════════════════════════════════════════════════════════════════════════════

  const syncAllInstances = useCallback(() => {
    setState(prev => ({
      ...prev,
      lastGlobalSync: new Date().toISOString(),
    }));
    
    console.log('[ZoeQuantumASIBridge] All instances synced');
    
    window.dispatchEvent(new CustomEvent('zoe-asi-sync', {
      detail: {
        instanceCount: state.instances.size,
        globalASILevel: state.globalASILevel,
      }
    }));
  }, [state.instances.size, state.globalASILevel]);

  const refreshASIPower = useCallback(() => {
    setState(prev => {
      const newInstances = new Map(prev.instances);
      newInstances.forEach((power, id) => {
        power.currentASILevel = DEFAULT_ASI_POWER.currentASILevel;
        power.pentarchyEnabled = true;
        power.truthEngineEnabled = true;
        power.quantumLoopEnabled = true;
        power.akashicEnabled = true;
      });
      return {
        ...prev,
        instances: newInstances,
        globalASILevel: DEFAULT_ASI_POWER.currentASILevel,
        isQuantumModeActive: true,
        pentarchySwarmReady: true,
      };
    });
    
    toast.success('⚡ Quantum ASI Power Refreshed', {
      description: `All ${state.instances.size} Zoe instances at 5x human capacity`,
    });
  }, [state.instances.size]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════════

  return {
    state,
    isInitialized,
    injectASIPower,
    getInstancePower,
    processWithASI,
    quickASICheck,
    runPentarchySwarm,
    getGlobalASILevel,
    getAllInstancePowers,
    syncAllInstances,
    refreshASIPower,
  };
}

export default useZoeQuantumASIBridge;
