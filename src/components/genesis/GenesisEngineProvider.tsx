/**
 * GENESIS ENGINE PROVIDER
 * Project Exodus 2120 - Level 4 Autonomous Agent
 * 
 * Provides global access to Zoe's self-evolution capabilities
 */

import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useGenesisEngine, DiagnosticResult, GenesisTask } from '@/hooks/useGenesisEngine';
import { toast } from 'sonner';

interface GenesisContextType {
  // State
  isOnline: boolean;
  isScanning: boolean;
  diagnostics: DiagnosticResult[];
  activeTasks: GenesisTask[];
  agentMode: 'idle' | 'planning' | 'executing' | 'critiquing';
  systemHealth: number | null;

  // Actions
  runDiagnostic: () => Promise<DiagnosticResult[]>;
  traceScan: (error: string) => Promise<{ identified: boolean; applied: boolean }>;
  runUltraDeepScan: () => Promise<{ score: number; issues: string[]; fixes: string[] }>;
  executeProtocol: (name: string, params?: Record<string, any>) => Promise<{ success: boolean; result: string }>;
  queueOfflineRepair: (job: { type: string; priority: 'low' | 'medium' | 'high' | 'critical'; description: string }) => string;
}

const GenesisContext = createContext<GenesisContextType | null>(null);

export const useGenesis = () => {
  const context = useContext(GenesisContext);
  if (!context) {
    // Return safe defaults
    return {
      isOnline: true,
      isScanning: false,
      diagnostics: [],
      activeTasks: [],
      agentMode: 'idle' as const,
      systemHealth: null,
      runDiagnostic: async () => [],
      traceScan: async () => ({ identified: false, applied: false }),
      runUltraDeepScan: async () => ({ score: 100, issues: [], fixes: [] }),
      executeProtocol: async () => ({ success: false, result: 'Genesis not initialized' }),
      queueOfflineRepair: () => '',
    };
  }
  return context;
};

interface GenesisEngineProviderProps {
  children: React.ReactNode;
  autoScan?: boolean;
  scanInterval?: number; // in minutes
}

export const GenesisEngineProvider: React.FC<GenesisEngineProviderProps> = ({
  children,
  autoScan = true,
  scanInterval = 10,
}) => {
  const genesis = useGenesisEngine();

  // Listen for voice commands
  useEffect(() => {
    const handleVoiceCommand = (e: CustomEvent<{ command: string; params?: any }>) => {
      const { command, params } = e.detail;
      const cmd = command.toLowerCase();

      if (cmd.includes('diagnostic') || cmd.includes('scan')) {
        genesis.Zoe_System_Diagnostic();
        toast.info('Running system diagnostic...');
      } else if (cmd.includes('protocol')) {
        const protocolName = cmd.replace('protocol', '').replace('initialize', '').trim();
        genesis.executeProtocol(protocolName, params);
      } else if (cmd.includes('fix') || cmd.includes('repair')) {
        genesis.traceScan(cmd);
      } else if (cmd.includes('deep scan') || cmd.includes('ultra scan')) {
        genesis.runUltraDeepScan().then(result => {
          toast.success(`Deep scan complete: ${result.score}% health`);
        });
      }
    };

    window.addEventListener('zoe-voice-command', handleVoiceCommand as EventListener);
    return () => window.removeEventListener('zoe-voice-command', handleVoiceCommand as EventListener);
  }, [genesis]);

  // Listen for error reports from chat
  useEffect(() => {
    const handleErrorReport = (e: CustomEvent<{ error: string }>) => {
      console.log('[Genesis] Error reported:', e.detail.error);
      genesis.traceScan(e.detail.error);
    };

    window.addEventListener('zoe-error-report', handleErrorReport as EventListener);
    return () => window.removeEventListener('zoe-error-report', handleErrorReport as EventListener);
  }, [genesis]);

  // PHASE 6: Listen for Platform Purge events - reconnect Zoe Core DHF (SILENT)
  useEffect(() => {
    const handlePlatformPurge = (e: CustomEvent<{ version: string; keysCleared: number; silent?: boolean }>) => {
      console.log('[Genesis] Platform purge detected (silent):', e.detail);
      // NO TOAST - purge should be silent to avoid sound triggers
    };

    const handleCoreReconnect = (e: CustomEvent<{ token: string }>) => {
      console.log('[Genesis] Zoe Core reconnect signal received:', e.detail.token);
      // Trigger a fresh diagnostic after reconnect (SILENTLY - no toast)
      setTimeout(() => {
        genesis.Zoe_System_Diagnostic();
        // NO TOAST - reconnect should be silent
      }, 500);
    };

    window.addEventListener('zoe-platform-purged', handlePlatformPurge as EventListener);
    window.addEventListener('zoe-core-reconnect', handleCoreReconnect as EventListener);
    
    return () => {
      window.removeEventListener('zoe-platform-purged', handlePlatformPurge as EventListener);
      window.removeEventListener('zoe-core-reconnect', handleCoreReconnect as EventListener);
    };
  }, [genesis]);

  // PROJECT RE-SLEEVE: Listen for Re-Sleeve events - Agentic Vocational Prosthetics
  useEffect(() => {
    const handleSoulScan = (e: CustomEvent<{ result: any; userId: string }>) => {
      console.log('[Genesis] Re-Sleeve soul scan complete:', e.detail.result);
    };

    // PROJECT AGASTHYA: Divine Career Engine events
    const handleAgasthyaPrediction = (e: CustomEvent<{ prediction: any; birthData: any }>) => {
      console.log('[Genesis] Agasthya career prediction:', e.detail.prediction.primaryArchetype.name);
      console.log('[Genesis] Karma Processor activated for:', e.detail.birthData.name);
    };

    window.addEventListener('zoe-agasthya-prediction', handleAgasthyaPrediction as EventListener);

    const handleSleeveEquipped = (e: CustomEvent<{ sleeve: any; transformations: any }>) => {
      console.log('[Genesis] Skill sleeve equipped:', e.detail.sleeve.name);
      // UI transformations dispatched to other systems
      window.dispatchEvent(new CustomEvent('zoe-ui-transform', {
        detail: e.detail.transformations
      }));
    };

    const handleSleeveUnequipped = (e: CustomEvent<{ sleeveId: string }>) => {
      console.log('[Genesis] Skill sleeve unequipped:', e.detail.sleeveId);
      // Reset UI transformations
      window.dispatchEvent(new CustomEvent('zoe-ui-transform', {
        detail: { reset: true }
      }));
    };

    const handlePrecisionStep = (e: CustomEvent<{ taskId: string; step: string; progress: number }>) => {
      console.log(`[Genesis] Precision task step: ${e.detail.step} (${Math.round(e.detail.progress * 100)}%)`);
    };

    // PHASE 3: Life You Want Journey Events
    const handleDiscoveryPrompt = (e: CustomEvent<{ talentName: string; sleeveId: string; confidence: number }>) => {
      console.log('[Genesis] Discovery prompt shown:', e.detail.talentName, `(${e.detail.confidence}% confidence)`);
    };

    const handleTransformationStart = (e: CustomEvent<{ sleeveId: string; timestamp: number }>) => {
      console.log('[Genesis] Transformation started:', e.detail.sleeveId);
    };

    const handleTransformationComplete = (e: CustomEvent<{ sleeveId: string; timestamp: number }>) => {
      console.log('[Genesis] Transformation complete:', e.detail.sleeveId);
    };

    const handleJourneyPhase = (e: CustomEvent<{ phase: string; sleeveId?: string }>) => {
      console.log('[Genesis] Journey phase:', e.detail.phase, e.detail.sleeveId || '');
    };

    const handleJourneyComplete = (e: CustomEvent<{ result: any; sleeveId?: string }>) => {
      console.log('[Genesis] Journey complete - User became professional:', e.detail.sleeveId);
    };

    const handleCreativeExecution = (e: CustomEvent<{ step: string; description?: string; sleeveId: string }>) => {
      console.log('[Genesis] Creative execution:', e.detail.step, e.detail.description || '');
    };

    // PROJECT AGASTHYA: Karma Code Vedic Computation Events
    const handleKarmaCodeComputed = (e: CustomEvent<{ chart: any; decree: any; birthData: any }>) => {
      console.log('[Genesis] Karma Code computed - Divine Decree:', e.detail.decree.ultimateProfession);
      console.log('[Genesis] Strongest Planet:', e.detail.chart.strongestPlanet.name);
      console.log('[Genesis] Lagna:', e.detail.chart.lagna.english, '| Moon:', e.detail.chart.moonSign.english);
    };

    const handleCareerDivinityView = (e: CustomEvent<{ timestamp: number }>) => {
      console.log('[Genesis] Career Divinity Temple accessed');
    };

    window.addEventListener('zoe-resleeve-scan', handleSoulScan as EventListener);
    window.addEventListener('zoe-sleeve-equipped', handleSleeveEquipped as EventListener);
    window.addEventListener('zoe-sleeve-unequipped', handleSleeveUnequipped as EventListener);
    window.addEventListener('zoe-precision-step', handlePrecisionStep as EventListener);
    window.addEventListener('zoe-discovery-prompt', handleDiscoveryPrompt as EventListener);
    window.addEventListener('zoe-transformation-start', handleTransformationStart as EventListener);
    window.addEventListener('zoe-transformation-complete', handleTransformationComplete as EventListener);
    window.addEventListener('zoe-journey-phase', handleJourneyPhase as EventListener);
    window.addEventListener('zoe-journey-complete', handleJourneyComplete as EventListener);
    window.addEventListener('zoe-creative-execution', handleCreativeExecution as EventListener);
    window.addEventListener('zoe-karma-code-computed', handleKarmaCodeComputed as EventListener);
    window.addEventListener('zoe-career-divinity-view', handleCareerDivinityView as EventListener);
    
    return () => {
      window.removeEventListener('zoe-resleeve-scan', handleSoulScan as EventListener);
      window.removeEventListener('zoe-sleeve-equipped', handleSleeveEquipped as EventListener);
      window.removeEventListener('zoe-sleeve-unequipped', handleSleeveUnequipped as EventListener);
      window.removeEventListener('zoe-precision-step', handlePrecisionStep as EventListener);
      window.removeEventListener('zoe-discovery-prompt', handleDiscoveryPrompt as EventListener);
      window.removeEventListener('zoe-transformation-start', handleTransformationStart as EventListener);
      window.removeEventListener('zoe-transformation-complete', handleTransformationComplete as EventListener);
      window.removeEventListener('zoe-journey-phase', handleJourneyPhase as EventListener);
      window.removeEventListener('zoe-journey-complete', handleJourneyComplete as EventListener);
      window.removeEventListener('zoe-creative-execution', handleCreativeExecution as EventListener);
      window.removeEventListener('zoe-agasthya-prediction', handleAgasthyaPrediction as EventListener);
      window.removeEventListener('zoe-karma-code-computed', handleKarmaCodeComputed as EventListener);
      window.removeEventListener('zoe-career-divinity-view', handleCareerDivinityView as EventListener);
    };
  }, []);

  // Auto-scan on interval
  useEffect(() => {
    if (!autoScan) return;

    // Initial scan after mount
    const initialTimeout = setTimeout(() => {
      genesis.Zoe_System_Diagnostic();
    }, 5000);

    // Periodic scans
    const interval = setInterval(() => {
      genesis.Zoe_System_Diagnostic();
    }, scanInterval * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [autoScan, scanInterval, genesis.Zoe_System_Diagnostic]);

  // Queue repairs when offline
  useEffect(() => {
    if (!genesis.isOnline) {
      // Auto-queue critical system check
      genesis.queueOfflineRepair({
        type: 'deep_scan',
        priority: 'medium',
        description: 'Scheduled deep scan while offline'
      });
    }
  }, [genesis.isOnline, genesis.queueOfflineRepair]);

  const contextValue: GenesisContextType = {
    isOnline: genesis.isOnline,
    isScanning: genesis.isScanning,
    diagnostics: genesis.diagnostics,
    activeTasks: genesis.activeTasks,
    agentMode: genesis.agentMode,
    systemHealth: genesis.systemHealth,
    runDiagnostic: genesis.Zoe_System_Diagnostic,
    traceScan: genesis.traceScan,
    runUltraDeepScan: genesis.runUltraDeepScan,
    executeProtocol: genesis.executeProtocol,
    queueOfflineRepair: genesis.queueOfflineRepair,
  };

  // Hide overlays on auth pages
  const isAuthPage = typeof window !== 'undefined' && (
    window.location.pathname.includes('/auth') ||
    window.location.pathname === '/login' ||
    window.location.pathname === '/signup'
  );

  return (
    <GenesisContext.Provider value={contextValue}>
      {children}
      
      {/* Minimal status moved to top ticker - NO floating bottom popups */}
      {/* Agent mode and offline indicators are now in the unified top ticker via ZoeCoreUnifiedProvider */}
    </GenesisContext.Provider>
  );
};

export default GenesisEngineProvider;
