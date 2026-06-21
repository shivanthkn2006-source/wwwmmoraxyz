// ═══════════════════════════════════════════════════════════════════════════════
// USE UNIFIED ZOE HOOK - SINGLE ENTRY POINT FOR ALL ZOE FUNCTIONALITY
// Combines all ASI modules into one easy-to-use hook
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { UnifiedModuleHub, UnifiedHubStatus } from '@/core/UnifiedModuleHub';
import { useZoeMatterBridge } from './useZoeMatterBridge';
import { useZoeNexus } from './useZoeNexus';
import { useZoeDreamer } from './useZoeDreamer';
import { useASIRoot } from './useASIRoot';
import type { MatterAction, MatterBridgeResponse, PermissionRequest } from '@/types/matterBridge';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface UnifiedZoeState {
  initialized: boolean;
  isProcessing: boolean;
  hubStatus: UnifiedHubStatus | null;
  lastDivineReport: string | null;
}

export interface UnifiedZoeReturn {
  // State
  state: UnifiedZoeState;
  
  // Initialization
  initialize: () => Promise<boolean>;
  reset: () => void;
  
  // Core Processing
  process: (query: string, mode?: 'QUICK' | 'STANDARD' | 'DEEP' | 'MAXIMUM') => Promise<any>;
  quickProcess: (query: string) => { response: string; confidence: number };
  
  // Matter Bridge (Actions)
  executeAction: (action: MatterAction) => Promise<MatterBridgeResponse | null>;
  pendingApprovals: PermissionRequest[];
  approveAction: (request: PermissionRequest) => Promise<MatterBridgeResponse | null>;
  rejectAction: (request: PermissionRequest) => Promise<void>;
  budgetRemaining: number;
  autonomyLevel: number;
  setAutonomyLevel: (level: number) => Promise<void>;
  
  // Nexus (Routing)
  routeMessage: (message: string) => Promise<any>;
  lastRouting: any;
  
  // Dreamer (Dreams)
  latestDream: any;
  triggerDreamCycle: () => Promise<any>;
  isDreaming: boolean;
  
  // ASI Root
  asiStatus: any;
  
  // Health
  healthCheck: () => Promise<{ healthy: boolean; issues: string[]; recommendations: string[] }>;
  
  // Sub-hooks (for advanced usage)
  matterBridge: ReturnType<typeof useZoeMatterBridge>;
  nexus: ReturnType<typeof useZoeNexus>;
  dreamer: ReturnType<typeof useZoeDreamer>;
  asiRoot: ReturnType<typeof useASIRoot>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useUnifiedZoe(): UnifiedZoeReturn {
  const { user } = useAuth();
  const initializedRef = useRef(false);
  
  // State
  const [state, setState] = useState<UnifiedZoeState>({
    initialized: false,
    isProcessing: false,
    hubStatus: null,
    lastDivineReport: null
  });
  
  // Sub-hooks
  const matterBridge = useZoeMatterBridge();
  const nexus = useZoeNexus();
  const dreamer = useZoeDreamer();
  const asiRoot = useASIRoot();
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const initialize = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      console.log('[UnifiedZoe] No user, skipping initialization');
      return false;
    }
    
    if (initializedRef.current) {
      console.log('[UnifiedZoe] Already initialized');
      return true;
    }
    
    console.log('[UnifiedZoe] 🚀 Initializing unified Zoe system...');
    
    const result = await UnifiedModuleHub.initialize(user.id);
    
    if (result.success) {
      initializedRef.current = true;
      setState(prev => ({
        ...prev,
        initialized: true,
        hubStatus: UnifiedModuleHub.getStatus()
      }));
      console.log('[UnifiedZoe] ✅ Initialization complete');
      return true;
    }
    
    console.error('[UnifiedZoe] ❌ Initialization failed:', result.error);
    return false;
  }, [user?.id]);
  
  const reset = useCallback(() => {
    UnifiedModuleHub.reset();
    initializedRef.current = false;
    setState({
      initialized: false,
      isProcessing: false,
      hubStatus: null,
      lastDivineReport: null
    });
  }, []);
  
  // Auto-initialize on user change
  useEffect(() => {
    if (user?.id && !initializedRef.current) {
      initialize();
    }
  }, [user?.id, initialize]);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const process = useCallback(async (
    query: string, 
    mode: 'QUICK' | 'STANDARD' | 'DEEP' | 'MAXIMUM' = 'STANDARD'
  ): Promise<any> => {
    setState(prev => ({ ...prev, isProcessing: true }));
    
    try {
      const result = await UnifiedModuleHub.process(query, { mode });
      return result.data;
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, []);
  
  const quickProcess = useCallback((query: string): { response: string; confidence: number } => {
    return UnifiedModuleHub.quickProcess(query);
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // MATTER BRIDGE WRAPPERS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const executeAction = useCallback(async (action: MatterAction): Promise<MatterBridgeResponse | null> => {
    const result = await matterBridge.executeAction(action);
    
    if (result?.divineActionReport) {
      setState(prev => ({ ...prev, lastDivineReport: result.divineActionReport || null }));
    }
    
    return result;
  }, [matterBridge]);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const healthCheck = useCallback(async () => {
    const hubHealth = await UnifiedModuleHub.healthCheck();
    
    // Update status
    setState(prev => ({
      ...prev,
      hubStatus: UnifiedModuleHub.getStatus()
    }));
    
    return hubHealth;
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════════
  
  return {
    // State
    state,
    
    // Initialization
    initialize,
    reset,
    
    // Core Processing
    process,
    quickProcess,
    
    // Matter Bridge
    executeAction,
    pendingApprovals: matterBridge.pendingApprovals,
    approveAction: matterBridge.approveAction,
    rejectAction: matterBridge.rejectAction,
    budgetRemaining: matterBridge.budgetRemaining,
    autonomyLevel: matterBridge.autonomyLevel,
    setAutonomyLevel: matterBridge.updateAutonomyLevel,
    
    // Nexus
    routeMessage: nexus.routeMessage,
    lastRouting: nexus.lastRouting,
    
    // Dreamer
    latestDream: dreamer.latestDream,
    triggerDreamCycle: dreamer.triggerDreamCycle,
    isDreaming: dreamer.isDreaming,
    
    // ASI Root
    asiStatus: asiRoot.status,
    
    // Health
    healthCheck,
    
    // Sub-hooks
    matterBridge,
    nexus,
    dreamer,
    asiRoot
  };
}

export default useUnifiedZoe;
