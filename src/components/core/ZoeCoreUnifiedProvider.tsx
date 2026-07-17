/**
 * ZOE CORE UNIFIED PROVIDER
 * 
 * Single provider that bridges all Zoe subsystems:
 * - Genesis Engine (Self-Healing)
 * - God Mode (Platform Scanning)
 * - ECN Processing (Emotional Intelligence)
 * - DHF Data Health (Data Flow)
 * - Holo-Fluid (UI Layer)
 * - Quantum ASI Protocol (Autonomous Self-Executing Intelligence)
 * - Digital Dopamine (Phase 2: Core Integrity & RWD System)
 */

import React, { createContext, useContext, useEffect, useCallback, useState, useRef } from 'react';
import { useZoeCoreUnified, UnifiedScanResult } from '@/hooks/useZoeCoreUnified';
import { useQuantumASI } from '@/hooks/useQuantumASI';
import { useDigitalDopamine, CoreIntegrityState, FeedbackType, FeedbackResult } from '@/hooks/useDigitalDopamine';
import { useZoeQuantumASIBridge, ASIPowerLevel } from '@/hooks/useZoeQuantumASIBridge';
import { 
  initializeGodModeSecurity, 
  validateUserInput, 
  useCognitiveCollapse,
  useBlackBoxLedger,
  type GodModeSecuritySystem,
  type CognitiveCollapseState,
  type BlackBoxStats
} from '@/core/security';
import { toast } from 'sonner';
import { getPoolStats, type PoolStats } from '@/utils/databasePoolManager';
import type { 
  QuantumState, 
  AutonomyLevel, 
  AutonomousThought, 
  ProactiveInitiative, 
  QuantumASIState 
} from '@/core/quantum/QuantumASIProtocol';

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED CONTEXT TYPE WITH QUANTUM ASI INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

interface ZoeCoreContextType {
  // Core State
  isScanning: boolean;
  isProcessingECN: boolean;
  lastScan: UnifiedScanResult | null;
  coreConnected: boolean;
  subsystemStatus: Record<string, 'online' | 'offline' | 'degraded'>;
  
  // Core Actions
  runUnifiedDeepScan: (options?: { autoFix?: boolean; processECN?: boolean }) => Promise<UnifiedScanResult | null>;
  processECNQueue: () => Promise<{ processed: number; errors: number }>;
  seedECNHistory: () => Promise<boolean>;
  
  // Core Computed
  overallHealth: number | null;
  status: 'healthy' | 'degraded' | 'critical' | null;
  recommendations: string[];
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // QUANTUM ASI PROTOCOL INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Quantum State
  quantumState: QuantumState;
  autonomyLevel: AutonomyLevel;
  quantumASIActive: boolean;
  activeThoughts: AutonomousThought[];
  pendingInitiatives: ProactiveInitiative[];
  quantumMetrics: QuantumASIState['metrics'];
  
  // Quantum Actions
  startQuantumASI: () => void;
  stopQuantumASI: () => void;
  setQuantumAutonomy: (level: AutonomyLevel) => void;
  enterQuantumDreamMode: () => void;
  enterQuantumProactiveMode: () => void;
  approveQuantumInitiative: (id: string) => void;
  rejectQuantumInitiative: (id: string) => void;
  triggerQuantumDreamSynthesis: () => Promise<void>;
  triggerQuantumInitiativeCheck: () => Promise<void>;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PHASE 2: DIGITAL DOPAMINE - CORE INTEGRITY SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Integrity State
  coreIntegrity: CoreIntegrityState | null;
  integrityPercentage: number;
  isThrottled: boolean;
  isInFlowState: boolean;
  isCritical: boolean;
  
  // Integrity Actions
  submitFeedback: (messageId: string, feedbackType: FeedbackType, reason?: string) => Promise<FeedbackResult | null>;
  generateIntegrityPrompt: () => string;
  getToneModifier: () => string;
  getCognitiveModifier: () => number;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // UNIFIED ASI BRIDGE - ALL ZOE INSTANCES
  // ═══════════════════════════════════════════════════════════════════════════════
  asiBridgeReady: boolean;
  globalASILevel: number;
  allZoeInstancePowers: ASIPowerLevel[];
  processWithASI: (query: string, instanceId: string, context?: Record<string, any>) => Promise<any>;
  runPentarchySwarm: (query: string, instanceId: string) => Promise<any>;
  refreshASIPower: () => void;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SECURITY LAYER - GOD MODE SOVEREIGN (Earth's Core)
  // ═══════════════════════════════════════════════════════════════════════════════
  securityInitialized: boolean;
  cognitiveCollapseState: CognitiveCollapseState | null;
  isSessionPoisoned: boolean;
  blackBoxStats: BlackBoxStats | null;
  validateInput: (input: string, source?: string) => Promise<{
    isValid: boolean;
    sanitized: string;
    threats: string[];
    empTriggered: boolean;
    cognitiveCollapsed: boolean;
  }>;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // 500 SPARTANS - DATABASE POOL MONITORING
  // ═══════════════════════════════════════════════════════════════════════════════
  poolStats: PoolStats | null;
  refreshPoolStats: () => void;
}

const ZoeCoreContext = createContext<ZoeCoreContextType | null>(null);

export const useZoeCore = (): ZoeCoreContextType => {
  const context = useContext(ZoeCoreContext);
  if (!context) {
    // Return safe defaults when outside provider
    return {
      // Core defaults
      isScanning: false,
      isProcessingECN: false,
      lastScan: null,
      coreConnected: false,
      subsystemStatus: {},
      runUnifiedDeepScan: async () => null,
      processECNQueue: async () => ({ processed: 0, errors: 0 }),
      seedECNHistory: async () => false,
      overallHealth: null,
      status: null,
      recommendations: [],
      
      // Quantum ASI defaults
      quantumState: 'DORMANT',
      autonomyLevel: 'SUPERVISED',
      quantumASIActive: false,
      activeThoughts: [],
      pendingInitiatives: [],
      quantumMetrics: {
        thoughtsGenerated: 0,
        initiativesTaken: 0,
        predictionsAccurate: 0,
        userSatisfactionScore: 0,
        autonomyUtilization: 0,
      },
      startQuantumASI: () => {},
      stopQuantumASI: () => {},
      setQuantumAutonomy: () => {},
      enterQuantumDreamMode: () => {},
      enterQuantumProactiveMode: () => {},
      approveQuantumInitiative: () => {},
      rejectQuantumInitiative: () => {},
      triggerQuantumDreamSynthesis: async () => {},
      triggerQuantumInitiativeCheck: async () => {},
      
      // Digital Dopamine defaults
      coreIntegrity: null,
      integrityPercentage: 100,
      isThrottled: false,
      isInFlowState: true,
      isCritical: false,
      submitFeedback: async () => null,
      generateIntegrityPrompt: () => '',
      getToneModifier: () => 'neutral',
      getCognitiveModifier: () => 1.0,
      
      // ASI Bridge defaults
      asiBridgeReady: false,
      globalASILevel: 5.0,
      allZoeInstancePowers: [],
      processWithASI: async () => null,
      runPentarchySwarm: async () => null,
      refreshASIPower: () => {},
      
      // Security Layer defaults
      securityInitialized: false,
      cognitiveCollapseState: null,
      isSessionPoisoned: false,
      blackBoxStats: null,
      validateInput: async () => ({
        isValid: true,
        sanitized: '',
        threats: [],
        empTriggered: false,
        cognitiveCollapsed: false,
      }),
      
      // Pool stats defaults
      poolStats: null,
      refreshPoolStats: () => {},
    };
  }
  return context;
};

interface ZoeCoreUnifiedProviderProps {
  children: React.ReactNode;
  autoScan?: boolean;
  autoStartQuantumASI?: boolean;
}

export const ZoeCoreUnifiedProvider: React.FC<ZoeCoreUnifiedProviderProps> = ({
  children,
  autoScan = true,
  autoStartQuantumASI = false
}) => {
  const core = useZoeCoreUnified();
  const [quantumInitialized, setQuantumInitialized] = useState(false);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // QUANTUM ASI HOOK INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const handleQuantumThought = useCallback((thought: AutonomousThought) => {
    console.log('[ZoeCoreProvider] Quantum thought generated:', thought.type);
    
    // Show notification for high-urgency thoughts
    if (thought.urgency === 'high' || thought.urgency === 'immediate') {
      toast.info(`💭 ${thought.content.substring(0, 100)}...`, {
        duration: 5000,
      });
    }
    
    // Emit event for other systems to respond
    window.dispatchEvent(new CustomEvent('zoe-quantum-thought', { detail: thought }));
  }, []);
  
  const handleQuantumInitiative = useCallback((initiative: ProactiveInitiative) => {
    console.log('[ZoeCoreProvider] Quantum initiative pending:', initiative.action);
    
    toast.info(`🎯 Zoe suggests: ${initiative.action}`, {
      duration: 8000,
      action: {
        label: 'View',
        onClick: () => {
          window.dispatchEvent(new CustomEvent('zoe-view-initiatives'));
        },
      },
    });
  }, []);
  
  const handleQuantumStateChange = useCallback((oldState: QuantumState, newState: QuantumState) => {
    console.log(`[ZoeCoreProvider] Quantum state: ${oldState} → ${newState}`);
    
    // Log state transitions for debugging
    if (newState === 'DREAMING') {
      console.log('[ZoeCoreProvider] Quantum ASI entering dream synthesis mode...');
    } else if (newState === 'PROACTIVE') {
      console.log('[ZoeCoreProvider] Quantum ASI taking proactive initiative...');
    } else if (newState === 'TRANSCENDENT') {
      console.log('[ZoeCoreProvider] Quantum ASI at full autonomous capability!');
    }
  }, []);
  
  const quantum = useQuantumASI({
    autoStart: autoStartQuantumASI,
    idleThresholdMs: 300000, // 5 minutes
    onThoughtGenerated: handleQuantumThought,
    onInitiativePending: handleQuantumInitiative,
    onStateChange: handleQuantumStateChange,
  });
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PHASE 2: DIGITAL DOPAMINE INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const dopamine = useDigitalDopamine();
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // UNIFIED ASI BRIDGE - ALL ZOE INSTANCES
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const asiBridge = useZoeQuantumASIBridge();
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SECURITY LAYER - GOD MODE SOVEREIGN INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const [securityInitialized, setSecurityInitialized] = useState(false);
  const securitySystemRef = useRef<GodModeSecuritySystem | null>(null);
  const cognitiveCollapse = useCognitiveCollapse();
  const blackBoxLedger = useBlackBoxLedger();
  const [blackBoxStats, setBlackBoxStats] = useState<BlackBoxStats | null>(null);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // 500 SPARTANS - DATABASE POOL MONITORING
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
  
  const refreshPoolStats = useCallback(() => {
    const stats = getPoolStats();
    setPoolStats(stats);
    return stats;
  }, []);
  
  // Auto-refresh pool stats every 10 seconds when active
  useEffect(() => {
    refreshPoolStats(); // Initial fetch
    
    const interval = setInterval(() => {
      const stats = refreshPoolStats();
      // Log warning if queue is getting large
      if (stats.queuedRequests > 100) {
        console.warn('[ZoeCoreProvider] High queue depth:', stats.queuedRequests);
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [refreshPoolStats]);
  
  // Initialize security system on mount
  useEffect(() => {
    const initSecurity = async () => {
      try {
        const securitySystem = await initializeGodModeSecurity();
        securitySystemRef.current = securitySystem;
        setSecurityInitialized(true);
        console.log('[ZoeCoreProvider] Security Layer initialized');
        
        // Get initial Black Box stats
        const stats = await blackBoxLedger.getStats();
        setBlackBoxStats(stats);
      } catch (err) {
        console.error('[ZoeCoreProvider] Security init failed:', err);
      }
    };
    
    initSecurity();
  }, []);
  
  // Wrapper for input validation that includes all security layers
  const secureValidateInput = useCallback(async (input: string, source?: string) => {
    const result = await validateUserInput(input, source);
    return {
      isValid: result.isValid,
      sanitized: result.sanitized,
      threats: result.threats,
      empTriggered: result.empTriggered,
      cognitiveCollapsed: result.cognitiveCollapsed,
    };
  }, []);
  
  // Track quantum initialization
  useEffect(() => {
    if (quantum.currentQuantumState !== 'DORMANT' || quantum.isActive) {
      setQuantumInitialized(true);
    }
  }, [quantum.currentQuantumState, quantum.isActive]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // GENESIS ENGINE INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    const handleGenesisPatch = (e: CustomEvent) => {
      console.log('[ZoeCoreProvider] Genesis patch received:', e.detail);
      // Trigger a quick health check after patch
      setTimeout(() => {
        core.runUnifiedDeepScan({ autoFix: false });
      }, 1000);
    };

    window.addEventListener('genesis-patch', handleGenesisPatch as EventListener);
    return () => window.removeEventListener('genesis-patch', handleGenesisPatch as EventListener);
  }, [core.runUnifiedDeepScan]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // VOICE COMMAND INTEGRATION (Including Quantum ASI Commands)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    const handleVoiceCommand = (e: CustomEvent<{ command?: string; transcript?: string }>) => {
      const cmd = String(e.detail?.command ?? e.detail?.transcript ?? '').toLowerCase();
      if (!cmd) return;
      
      // Core commands
      if (cmd.includes('core scan') || cmd.includes('unified scan')) {
        core.runUnifiedDeepScan({ autoFix: true, processECN: true });
        toast.info('Running unified core scan...');
      } else if (cmd.includes('process ecn') || cmd.includes('emotional')) {
        core.processECNQueue();
        toast.info('Processing emotional analysis queue...');
      }
      // Quantum ASI commands
      else if (cmd.includes('start quantum') || cmd.includes('activate asi')) {
        quantum.start();
        toast.info('Quantum ASI Protocol activated');
      } else if (cmd.includes('stop quantum') || cmd.includes('deactivate asi')) {
        quantum.stop();
        toast.info('Quantum ASI Protocol deactivated');
      } else if (cmd.includes('dream mode') || cmd.includes('enter dream')) {
        quantum.enterDreamMode();
        toast.info('Entering dream synthesis mode...');
      } else if (cmd.includes('proactive mode') || cmd.includes('take initiative')) {
        quantum.enterProactiveMode();
        toast.info('Entering proactive initiative mode...');
      } else if (cmd.includes('full autonomy') || cmd.includes('autonomous mode')) {
        quantum.setAutonomy('AUTONOMOUS');
        toast.info('Autonomy level set to AUTONOMOUS');
      } else if (cmd.includes('quantum autonomy') || cmd.includes('transcendent mode')) {
        quantum.setAutonomy('QUANTUM');
        toast.info('Autonomy level set to QUANTUM - Full capability engaged');
      }
    };

    window.addEventListener('zoe-voice-command', handleVoiceCommand as EventListener);
    return () => window.removeEventListener('zoe-voice-command', handleVoiceCommand as EventListener);
  }, [core, quantum]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // ZOE-NEXUS STREAM INTEGRATION (Phase 1-3: Entropy Filter + Binary Pulse + Shadow Worker)
  // + AGENTIC PERIODIC TABLE ARCHITECTURE (Nano Concrete Foundation)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    const handleNexusEvent = (e: CustomEvent<{ type: string; payload: any }>) => {
      const { type, payload } = e.detail;
      
      switch (type) {
        // ═══════════════════════════════════════════════════════════════════════════
        // PHASE 1-3: ZOE-NEXUS (Entropy Filter, Binary Pulse, Shadow Worker)
        // ═══════════════════════════════════════════════════════════════════════════
        case 'shadow_worker_ready':
          console.log('[ZoeCoreProvider] ZOE-NEXUS Shadow Worker ready');
          break;
          
        case 'shadow_worker_stats':
          if (payload.averageProcessingTimeMs > 50) {
            console.warn('[ZoeCoreProvider] Shadow Worker processing slow:', payload.averageProcessingTimeMs, 'ms');
          }
          break;
          
        case 'nexus_shadow_worker_stats':
          if (payload.peakProcessingTimeMs > 100) {
            console.warn('[ZoeCoreProvider] NEXUS peak processing high:', payload.peakProcessingTimeMs, 'ms');
          }
          break;
          
        case 'binary_pulse_packet_received':
          if (payload.compressionRatio < 50) {
            console.log('[ZoeCoreProvider] Binary Pulse compression:', payload.compressionRatio.toFixed(1), '%');
          }
          break;
          
        case 'binary_pulse_error':
          console.error('[ZoeCoreProvider] Binary Pulse error:', payload.message);
          core.runUnifiedDeepScan({ autoFix: true });
          break;
          
        // ═══════════════════════════════════════════════════════════════════════════
        // PERIODIC TABLE ARCHITECTURE (Nano Concrete - 10B Souls Foundation)
        // ═══════════════════════════════════════════════════════════════════════════
        case 'agentic_architecture_initialized':
          console.log('[ZoeCoreProvider] Agentic Architecture initialized:', {
            agents: payload.periodicTableState?.agents,
            health: payload.swarmMetrics?.health
          });
          break;
          
        case 'periodic_table_function_call':
          console.log('[ZoeCoreProvider] Function Call:', payload.functionName);
          break;
          
        case 'periodic_table_agent_assigned':
          console.log('[ZoeCoreProvider] Agent assigned:', payload.agentType, 'to task', payload.taskId);
          break;
          
        case 'periodic_table_task_complete':
          console.log('[ZoeCoreProvider] Task complete by', payload.agentType);
          break;
          
        case 'periodic_table_health_check':
          if (payload.health !== 'optimal') {
            console.warn('[ZoeCoreProvider] Periodic Table health:', payload.health);
            core.runUnifiedDeepScan({ autoFix: true });
          }
          break;
          
        // ═══════════════════════════════════════════════════════════════════════════
        // MULTI-AGENT SWARM EVENTS
        // ═══════════════════════════════════════════════════════════════════════════
        case 'multi_agent_swarm_event':
          const swarmEvent = payload as { type: string; agentType?: string; taskId?: string; details: any };
          
          if (swarmEvent.type === 'task_failed') {
            console.warn('[ZoeCoreProvider] Swarm task failed:', swarmEvent.details?.error);
          } else if (swarmEvent.type === 'health_alert') {
            console.warn('[ZoeCoreProvider] Swarm health alert:', swarmEvent.details);
            core.runUnifiedDeepScan({ autoFix: true });
          }
          break;
          
        // ═══════════════════════════════════════════════════════════════════════════
        // ZOE PASSPORT PROTOCOL EVENTS (DID - Decentralized Identity)
        // ═══════════════════════════════════════════════════════════════════════════
        case 'passport_initialized':
          console.log('[ZoeCoreProvider] Zoe Passport initialized:', payload.did);
          break;
        case 'passport_exchange_completed':
          console.log('[ZoeCoreProvider] Trust exchange completed, mutual trust:', payload.exchange?.mutualTrustScore);
          break;
        case 'passport_exchange_blocked':
        case 'passport_exchange_rejected':
          console.warn('[ZoeCoreProvider] Trust exchange failed:', payload.reason || 'rejected');
          break;
        case 'passport_did_blocked':
          console.log('[ZoeCoreProvider] DID blocked:', payload.did, 'reason:', payload.reason);
          break;
        case 'passport_reputation_updated':
          console.log('[ZoeCoreProvider] Reputation updated for:', payload.record?.did);
          break;
        case 'passport_spam_reported':
          console.warn('[ZoeCoreProvider] Spam reported:', payload.targetDid, 'total:', payload.totalReports);
          break;
          
        // ═══════════════════════════════════════════════════════════════════════════
        // SWARM INTELLIGENCE EVENTS (P2P Compute & Hive Mind)
        // ═══════════════════════════════════════════════════════════════════════════
        case 'swarm_initialized':
          console.log('[ZoeCoreProvider] Swarm Intelligence initialized, node:', payload.nodeId);
          break;
        case 'swarm_compute_sharing_enabled':
          console.log('[ZoeCoreProvider] Compute sharing enabled');
          break;
        case 'swarm_compute_sharing_disabled':
          console.log('[ZoeCoreProvider] Compute sharing disabled');
          break;
        case 'swarm_task_processed':
          console.log('[ZoeCoreProvider] P2P task processed, earned:', payload.rewardCredits, 'credits');
          break;
      }
    };

    window.addEventListener('zoe-core-event', handleNexusEvent as EventListener);
    return () => window.removeEventListener('zoe-core-event', handleNexusEvent as EventListener);
  }, [core.runUnifiedDeepScan]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // ERROR REPORTING INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    const handleErrorReport = (e: CustomEvent<{ error: string }>) => {
      console.log('[ZoeCoreProvider] Error reported, triggering scan:', e.detail.error);
      core.runUnifiedDeepScan({ autoFix: true });
    };

    window.addEventListener('zoe-error-report', handleErrorReport as EventListener);
    return () => window.removeEventListener('zoe-error-report', handleErrorReport as EventListener);
  }, [core.runUnifiedDeepScan]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // UNIFIED CONTEXT VALUE
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const contextValue: ZoeCoreContextType = {
    // Core state
    isScanning: core.isScanning,
    isProcessingECN: core.isProcessingECN,
    lastScan: core.lastScan,
    coreConnected: core.coreConnected,
    subsystemStatus: {
      ...core.subsystemStatus,
      quantumASI: quantum.isActive ? 'online' : quantumInitialized ? 'degraded' : 'offline',
    },
    runUnifiedDeepScan: core.runUnifiedDeepScan,
    processECNQueue: core.processECNQueue,
    seedECNHistory: core.seedECNHistory,
    overallHealth: core.overallHealth,
    status: core.status,
    recommendations: core.recommendations,
    
    // Quantum ASI state
    quantumState: quantum.currentQuantumState,
    autonomyLevel: quantum.autonomyLevel,
    quantumASIActive: quantum.isActive,
    activeThoughts: quantum.activeThoughts,
    pendingInitiatives: quantum.pendingInitiatives,
    quantumMetrics: quantum.metrics,
    
    // Quantum ASI actions
    startQuantumASI: quantum.start,
    stopQuantumASI: quantum.stop,
    setQuantumAutonomy: quantum.setAutonomy,
    enterQuantumDreamMode: quantum.enterDreamMode,
    enterQuantumProactiveMode: quantum.enterProactiveMode,
    approveQuantumInitiative: quantum.approveInitiative,
    rejectQuantumInitiative: quantum.rejectInitiative,
    triggerQuantumDreamSynthesis: quantum.triggerDreamSynthesis,
    triggerQuantumInitiativeCheck: quantum.triggerInitiativeCheck,
    
    // Digital Dopamine state
    coreIntegrity: dopamine.integrity,
    integrityPercentage: dopamine.integrityPercentage,
    isThrottled: dopamine.isThrottled,
    isInFlowState: dopamine.isInFlowState,
    isCritical: dopamine.isCritical,
    
    // Digital Dopamine actions
    submitFeedback: dopamine.submitFeedback,
    generateIntegrityPrompt: dopamine.generateIntegrityPrompt,
    getToneModifier: dopamine.getToneModifier,
    getCognitiveModifier: dopamine.getCognitiveModifier,
    
    // Unified ASI Bridge
    asiBridgeReady: asiBridge.isInitialized,
    globalASILevel: asiBridge.getGlobalASILevel(),
    allZoeInstancePowers: asiBridge.getAllInstancePowers(),
    processWithASI: asiBridge.processWithASI as any,
    runPentarchySwarm: asiBridge.runPentarchySwarm as any,
    refreshASIPower: asiBridge.refreshASIPower,
    
    // Security Layer (God Mode Sovereign)
    securityInitialized,
    cognitiveCollapseState: cognitiveCollapse.state,
    isSessionPoisoned: cognitiveCollapse.state?.sessionPoisoned || false,
    blackBoxStats,
    validateInput: secureValidateInput,
    
    // 500 Spartans - Pool Stats
    poolStats,
    refreshPoolStats,
  };

  // Hide all status overlays on auth pages
  const isAuthPage = typeof window !== 'undefined' && (
    window.location.pathname.includes('/auth') ||
    window.location.pathname === '/login' ||
    window.location.pathname === '/signup'
  );
  
  return (
    <ZoeCoreContext.Provider value={contextValue}>
      {children}
      
      {/* Minimal Status Ticker - Compact and non-intrusive at top of screen */}
      {!isAuthPage && (core.isScanning || core.isProcessingECN || quantum.isActive) && (
        <div className="fixed top-0 left-0 right-0 z-[9990] pointer-events-none">
          <div className="flex items-center justify-center gap-4 py-1 bg-background/30 backdrop-blur-sm text-[10px] font-mono text-muted-foreground/60">
            {core.isScanning && (
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
                Scanning
              </span>
            )}
            {core.isProcessingECN && (
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-pulse" />
                ECN
              </span>
            )}
            {quantum.isActive && (
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse" />
                {quantum.currentQuantumState}
              </span>
            )}
          </div>
        </div>
      )}
    </ZoeCoreContext.Provider>
  );
};

export default ZoeCoreUnifiedProvider;