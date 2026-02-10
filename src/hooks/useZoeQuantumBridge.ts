// ═══════════════════════════════════════════════════════════════════════════════
// ZOE QUANTUM BRIDGE - Unified System Integration Layer
// Connects: Quantum Engine ↔ DHF Core ↔ VR Nervous System ↔ Sovereign Core
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useZoeQuantumLevel } from './useZoeQuantumLevel';
import { useVRDHFNervousSystem } from './useVRDHFNervousSystem';
import { useZoeSovereignCore } from './useZoeSovereignCore';
import { supabase } from '@/integrations/supabase/client';
import { AnkaShastraEngine, TemporalQuantumState } from '@/core/quantum';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type BridgeConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error';

export interface QuantumDHFSync {
  lastSyncAt: string | null;
  syncScore: number;
  temporalState: TemporalQuantumState | null;
  quantumReadingsCount: number;
  dhfIntegrationActive: boolean;
}

export interface BridgeHealthMetrics {
  overallHealth: number;
  quantumEngineHealth: number;
  dhfCoreHealth: number;
  nervousSystemHealth: number;
  sovereignCoreHealth: number;
  lastHealthCheck: string;
}

export interface UnifiedPrediction {
  type: 'lost_object' | 'money_recovery' | 'compatibility' | 'temporal' | 'general';
  prediction: string;
  confidence: number;
  planetaryInfluence: string;
  dhfCorrelation: string;
  sovereignInsight: string;
  timestamp: string;
}

export interface QuantumBridgeState {
  connectionStatus: BridgeConnectionStatus;
  isQuantumModeActive: boolean;
  healthMetrics: BridgeHealthMetrics;
  dhfSync: QuantumDHFSync;
  recentPredictions: UnifiedPrediction[];
  errorLog: Array<{ timestamp: string; error: string; component: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useZoeQuantumBridge() {
  // Sub-system hooks
  const quantumLevel = useZoeQuantumLevel();
  const nervousSystem = useVRDHFNervousSystem();
  const sovereignCore = useZoeSovereignCore();

  // Bridge state
  const [state, setState] = useState<QuantumBridgeState>({
    connectionStatus: 'disconnected',
    isQuantumModeActive: false,
    healthMetrics: {
      overallHealth: 100,
      quantumEngineHealth: 100,
      dhfCoreHealth: 100,
      nervousSystemHealth: 100,
      sovereignCoreHealth: 100,
      lastHealthCheck: new Date().toISOString()
    },
    dhfSync: {
      lastSyncAt: null,
      syncScore: 0,
      temporalState: null,
      quantumReadingsCount: 0,
      dhfIntegrationActive: false
    },
    recentPredictions: [],
    errorLog: []
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH MONITORING
  // ═══════════════════════════════════════════════════════════════════════════

  const calculateHealthMetrics = useCallback((): BridgeHealthMetrics => {
    // Quantum Engine health
    const quantumHealth = quantumLevel.isAnkaModeActive ? 100 : 80;

    // DHF Core health from nervous system
    const nsState = nervousSystem.state;
    const dhfHealth = nsState?.overallHealth === 'optimal' ? 100 :
                      nsState?.overallHealth === 'degraded' ? 70 :
                      nsState?.overallHealth === 'critical' ? 40 : 20;

    // Nervous System health - convert Map to array for counting
    let nsHealth = 50;
    if (nervousSystem.isRunning && nsState?.nodes) {
      const nodesArray = Array.from(nsState.nodes.values());
      const activeNodes = nodesArray.filter(n => n.status === 'active').length;
      nsHealth = nodesArray.length > 0 ? (activeNodes / nodesArray.length) * 100 : 50;
    }

    // Sovereign Core health (check if it has been used successfully)
    const scHealth = sovereignCore.lastResponse ? 100 : 
                     sovereignCore.isProcessing ? 70 : 60;

    const overall = Math.round((quantumHealth + dhfHealth + nsHealth + scHealth) / 4);

    return {
      overallHealth: overall,
      quantumEngineHealth: quantumHealth,
      dhfCoreHealth: dhfHealth,
      nervousSystemHealth: Math.round(nsHealth),
      sovereignCoreHealth: scHealth,
      lastHealthCheck: new Date().toISOString()
    };
  }, [quantumLevel.isAnkaModeActive, nervousSystem.state, nervousSystem.isRunning, sovereignCore.isProcessing, sovereignCore.lastResponse]);

  // ═══════════════════════════════════════════════════════════════════════════
  // UNIFIED PREDICTION ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  const executeUnifiedPrediction = useCallback(async (
    type: UnifiedPrediction['type'],
    params: {
      prasnaNumber?: number;
      debtorDestiny?: number;
      yourNumber?: number;
      targetNumber?: number;
      birthDate?: Date;
      name?: string;
      query?: string;
    }
  ): Promise<UnifiedPrediction | null> => {
    setState(prev => ({ ...prev, connectionStatus: 'syncing' }));

    try {
      let prediction = '';
      let confidence = 0;
      let planetaryInfluence = '';
      let dhfCorrelation = '';
      let sovereignInsight = '';

      // Execute quantum reading based on type
      switch (type) {
        case 'lost_object':
          if (params.prasnaNumber) {
            const reading = quantumLevel.findLostObject(params.prasnaNumber);
            prediction = reading.prediction;
            confidence = reading.recoveryLikelihood === 'Recoverable' ? 85 : 
                        reading.recoveryLikelihood === 'Difficult' ? 55 : 25;
            planetaryInfluence = `${reading.planetaryLord.planet} (${reading.planetaryLord.sanskrit}) - ${reading.direction}`;
            dhfCorrelation = `Pattern matches ${reading.planetaryLord.karmaType} tendencies in DHF profile`;
          }
          break;

        case 'money_recovery':
          if (params.debtorDestiny) {
            const reading = quantumLevel.checkMoneyRecovery(params.debtorDestiny);
            prediction = reading.prediction;
            confidence = reading.willRecover ? 75 : 35;
            planetaryInfluence = `Combined vibration: ${reading.combinedNumber}`;
            dhfCorrelation = `Financial karma pattern: ${reading.karmicAdvice}`;
          }
          break;

        case 'compatibility':
          if (params.yourNumber && params.targetNumber) {
            const reading = quantumLevel.checkCompatibility(params.yourNumber, params.targetNumber);
            prediction = reading.analysis;
            confidence = reading.compatibilityScore;
            planetaryInfluence = `${reading.yourPlanet.planet} ↔ ${reading.targetPlanet.planet}`;
            dhfCorrelation = `Relationship: ${reading.relationship}`;
          }
          break;

        case 'temporal':
          if (params.birthDate) {
            const temporal = quantumLevel.getTemporalState(params.birthDate, params.name);
            prediction = temporal.synthesis.evolutionaryPath;
            confidence = temporal.synthesis.temporalAlignment;
            planetaryInfluence = temporal.present.activeEnergies.map(e => e.planet).join(', ');
            dhfCorrelation = `Karma Balance: ${temporal.synthesis.karmaBalance}`;
          }
          break;

        case 'general':
          if (params.query) {
            const result = await quantumLevel.executeQuantumReading(
              params.query, 
              'full_reading',
              { name: params.name, dateOfBirth: params.birthDate?.toISOString() }
            );
            if (result) {
              prediction = result.reading;
              confidence = 80;
              planetaryInfluence = 'Multiple planetary alignments analyzed';
              dhfCorrelation = 'Deep DHF pattern matching applied';
            }
          }
          break;
      }

      // Get sovereign insight
      if (prediction && sovereignCore.chat) {
        try {
          const insight = await sovereignCore.chat(
            `Provide a one-sentence insight on this quantum prediction: "${prediction.substring(0, 200)}"`
          );
          sovereignInsight = insight?.message || 'Sovereign core confirms alignment';
        } catch {
          sovereignInsight = 'Sovereign insight pending synchronization';
        }
      } else {
        sovereignInsight = 'Quantum-DHF bridge active';
      }

      const unifiedPrediction: UnifiedPrediction = {
        type,
        prediction,
        confidence: Math.round(confidence),
        planetaryInfluence,
        dhfCorrelation,
        sovereignInsight,
        timestamp: new Date().toISOString()
      };

      setState(prev => ({
        ...prev,
        connectionStatus: 'connected',
        recentPredictions: [unifiedPrediction, ...prev.recentPredictions.slice(0, 9)],
        dhfSync: {
          ...prev.dhfSync,
          quantumReadingsCount: prev.dhfSync.quantumReadingsCount + 1,
          lastSyncAt: new Date().toISOString()
        }
      }));

      // Log to DHF
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('behavioral_events').insert({
            user_id: user.id,
            event_type: 'quantum_bridge_prediction',
            event_category: 'quantum_analysis',
            metadata: {
              prediction_type: type,
              confidence,
              timestamp: new Date().toISOString()
            }
          });
        }
      } catch (e) {
        console.log('DHF logging optional:', e);
      }

      return unifiedPrediction;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
        errorLog: [...prev.errorLog, { 
          timestamp: new Date().toISOString(), 
          error: errorMsg, 
          component: 'quantum_bridge' 
        }]
      }));
      return null;
    }
  }, [quantumLevel, sovereignCore]);

  // ═══════════════════════════════════════════════════════════════════════════
  // BRIDGE ACTIVATION
  // ═══════════════════════════════════════════════════════════════════════════

  const activateQuantumBridge = useCallback(async () => {
    setState(prev => ({ ...prev, connectionStatus: 'connecting' }));

    try {
      // Activate all subsystems
      quantumLevel.activateAnkaMode();
      
      if (!nervousSystem.isRunning) {
        await nervousSystem.start();
      }

      setState(prev => ({
        ...prev,
        connectionStatus: 'connected',
        isQuantumModeActive: true,
        healthMetrics: calculateHealthMetrics(),
        dhfSync: {
          ...prev.dhfSync,
          dhfIntegrationActive: true
        }
      }));

      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
        errorLog: [...prev.errorLog, {
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Activation failed',
          component: 'bridge_activation'
        }]
      }));
      return false;
    }
  }, [quantumLevel, nervousSystem, calculateHealthMetrics]);

  const deactivateQuantumBridge = useCallback(() => {
    quantumLevel.deactivateAnkaMode();
    nervousSystem.stop();

    setState(prev => ({
      ...prev,
      connectionStatus: 'disconnected',
      isQuantumModeActive: false,
      dhfSync: {
        ...prev.dhfSync,
        dhfIntegrationActive: false
      }
    }));
  }, [quantumLevel, nervousSystem]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FORCE SYNCHRONIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  const forceSynchronize = useCallback(async () => {
    setState(prev => ({ ...prev, connectionStatus: 'syncing' }));

    try {
      // Sync nervous system
      if (nervousSystem.forceSyncAll) {
        await nervousSystem.forceSyncAll();
      }

      // Update health
      const metrics = calculateHealthMetrics();

      setState(prev => ({
        ...prev,
        connectionStatus: 'connected',
        healthMetrics: metrics,
        dhfSync: {
          ...prev.dhfSync,
          lastSyncAt: new Date().toISOString(),
          syncScore: metrics.overallHealth
        }
      }));

      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        connectionStatus: 'error'
      }));
      return false;
    }
  }, [nervousSystem, calculateHealthMetrics]);

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO HEALTH MONITORING
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!state.isQuantumModeActive) return;

    const interval = setInterval(() => {
      const metrics = calculateHealthMetrics();
      setState(prev => ({
        ...prev,
        healthMetrics: metrics
      }));
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [state.isQuantumModeActive, calculateHealthMetrics]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DIAGNOSTIC REPORT
  // ═══════════════════════════════════════════════════════════════════════════

  const diagnosticReport = useMemo(() => {
    const nodesArray = nervousSystem.state?.nodes ? Array.from(nervousSystem.state.nodes.values()) : [];
    
    return {
      bridge: {
        status: state.connectionStatus,
        quantumModeActive: state.isQuantumModeActive,
        health: state.healthMetrics.overallHealth
      },
      subsystems: {
        quantumEngine: {
          active: quantumLevel.isAnkaModeActive,
          lastReading: quantumLevel.lastReading ? new Date().toISOString() : null
        },
        nervousSystem: {
          running: nervousSystem.isRunning,
          initialized: nervousSystem.isInitialized,
          nodeCount: nodesArray.length
        },
        sovereignCore: {
          connected: !!sovereignCore.lastResponse,
          processing: sovereignCore.isProcessing
        }
      },
      metrics: state.healthMetrics,
      sync: state.dhfSync,
      recentPredictions: state.recentPredictions.length,
      errors: state.errorLog.length
    };
  }, [state, quantumLevel, nervousSystem, sovereignCore]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // State
    state,
    diagnosticReport,

    // Subsystems (exposed for direct access)
    quantumLevel,
    nervousSystem,
    sovereignCore,

    // Bridge controls
    activateQuantumBridge,
    deactivateQuantumBridge,
    forceSynchronize,

    // Unified operations
    executeUnifiedPrediction,

    // Quick helpers
    isActive: state.isQuantumModeActive,
    isHealthy: state.healthMetrics.overallHealth >= 70,
    connectionStatus: state.connectionStatus
  };
}

export default useZoeQuantumBridge;
