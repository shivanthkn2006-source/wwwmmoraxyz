// ═══════════════════════════════════════════════════════════════════════════════
// ZOE QUANTUM BRIDGE HOOK
// Unified Anka Shastra (Time) + Vastu Shastra (Space) DHF Integration
// Module 5000.1 - Space-Time Quantum Entity
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import type { RoomPlacement, QuantumVastuReading } from '@/core/quantum/VastuShastraEngine';
import type { LostObjectReading, MoneyRecoveryReading, CompatibilityReading, TemporalQuantumState } from '@/core/quantum/AnkaShastraEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type QueryType = 
  | 'lost_object' 
  | 'money_recovery' 
  | 'compatibility' 
  | 'full_reading' 
  | 'temporal_analysis'
  | 'vastu_scan'
  | 'quantum_synthesis';

export interface QuantumQuery {
  queryType: QueryType;
  command?: string;
  prasnaNumber?: number;
  name?: string;
  dateOfBirth?: string;
  targetNumber?: number;
  debtorDestiny?: number;
  vastuPlacements?: RoomPlacement[];
  context?: Record<string, any>;
}

export interface QuantumResponse {
  success: boolean;
  reading: string;
  computed: {
    soulNumbers: {
      driverNumber: number | null;
      conductorNumber: number | null;
      vibrationNumber: number | null;
      personalYear: number | null;
    };
    queryAnalysis: any;
    planetaryLords: Record<number, any>;
    vastuAnalysis?: QuantumVastuReading;
  };
  temporal: {
    past: string | null;
    present: string;
    future: string | null;
  };
  metadata: {
    protocol: string;
    model: string;
    latency_ms: number;
    timestamp: string;
  };
  error?: string;
}

export interface BridgeStatus {
  isConnected: boolean;
  lastSync: string | null;
  ankaReady: boolean;
  vastuReady: boolean;
  quantumCoherence: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUANTUM BRIDGE HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useQuantumBridge = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<QuantumResponse | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>({
    isConnected: false,
    lastSync: null,
    ankaReady: true,
    vastuReady: true,
    quantumCoherence: 99
  });
  const queryQueue = useRef<QuantumQuery[]>([]);

  /**
   * Execute a quantum query through the edge function
   */
  const executeQuery = useCallback(async (query: QuantumQuery): Promise<QuantumResponse | null> => {
    if (!user) {
      toast.error('Authentication required for Quantum Access');
      return null;
    }

    setIsLoading(true);
    setBridgeStatus(prev => ({ ...prev, isConnected: true }));

    try {
      const { data, error } = await supabase.functions.invoke('zoe-quantum-anka', {
        body: {
          userId: user.id,
          ...query
        }
      });

      if (error) {
        console.error('[QuantumBridge] Edge function error:', error);
        toast.error('Quantum Bridge interference detected');
        setBridgeStatus(prev => ({ ...prev, isConnected: false, quantumCoherence: prev.quantumCoherence - 5 }));
        return null;
      }

      const response = data as QuantumResponse;
      setLastResponse(response);
      setBridgeStatus(prev => ({
        ...prev,
        isConnected: true,
        lastSync: new Date().toISOString(),
        quantumCoherence: Math.min(99, prev.quantumCoherence + 1)
      }));

      // Log to DHF behavioral events for learning
      try {
        await supabase.from('behavioral_events').insert({
          user_id: user.id,
          event_type: 'quantum_bridge_query',
          event_category: query.queryType,
          context_snippet: query.command?.substring(0, 50) || query.queryType,
          metadata: {
            query_type: query.queryType,
            latency_ms: response.metadata?.latency_ms,
            success: response.success,
            timestamp: new Date().toISOString()
          }
        });
      } catch (logError) {
        console.log('[QuantumBridge] DHF logging optional:', logError);
      }

      return response;
    } catch (err) {
      console.error('[QuantumBridge] Query failed:', err);
      toast.error('The Archive encountered interference. Please retry.');
      setBridgeStatus(prev => ({ ...prev, isConnected: false }));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Query for lost object reading (Arudha Method)
   */
  const queryLostObject = useCallback(async (prasnaNumber: number): Promise<LostObjectReading | null> => {
    const response = await executeQuery({
      queryType: 'lost_object',
      prasnaNumber,
      command: `Find my lost object using number ${prasnaNumber}`
    });

    if (response?.success && response.computed?.queryAnalysis) {
      return response.computed.queryAnalysis as LostObjectReading;
    }
    return null;
  }, [executeQuery]);

  /**
   * Query for money recovery reading (Hora Method)
   */
  const queryMoneyRecovery = useCallback(async (debtorDestiny: number): Promise<MoneyRecoveryReading | null> => {
    const response = await executeQuery({
      queryType: 'money_recovery',
      debtorDestiny,
      command: `Analyze money recovery for debtor destiny ${debtorDestiny}`
    });

    if (response?.success && response.computed?.queryAnalysis) {
      return response.computed.queryAnalysis as MoneyRecoveryReading;
    }
    return null;
  }, [executeQuery]);

  /**
   * Query for compatibility reading (Vedic Grid)
   */
  const queryCompatibility = useCallback(async (
    targetNumber: number, 
    name?: string, 
    dateOfBirth?: string
  ): Promise<CompatibilityReading | null> => {
    const response = await executeQuery({
      queryType: 'compatibility',
      targetNumber,
      name,
      dateOfBirth,
      command: `Check compatibility with number ${targetNumber}`
    });

    if (response?.success && response.computed?.queryAnalysis) {
      return response.computed.queryAnalysis as CompatibilityReading;
    }
    return null;
  }, [executeQuery]);

  /**
   * Query for full temporal analysis (Past/Present/Future)
   */
  const queryTemporalAnalysis = useCallback(async (
    name: string, 
    dateOfBirth: string
  ): Promise<TemporalQuantumState | null> => {
    const response = await executeQuery({
      queryType: 'temporal_analysis',
      name,
      dateOfBirth,
      command: `Generate complete temporal quantum analysis for ${name}`
    });

    if (response?.success) {
      return response.temporal as unknown as TemporalQuantumState;
    }
    return null;
  }, [executeQuery]);

  /**
   * Query for Vastu space analysis
   */
  const queryVastuScan = useCallback(async (
    placements: RoomPlacement[],
    name?: string,
    dateOfBirth?: string
  ): Promise<QuantumVastuReading | null> => {
    const response = await executeQuery({
      queryType: 'vastu_scan',
      vastuPlacements: placements,
      name,
      dateOfBirth,
      command: `Analyze Vastu energy grid with ${placements.length} room placements`
    });

    if (response?.success && response.computed?.vastuAnalysis) {
      return response.computed.vastuAnalysis;
    }
    return null;
  }, [executeQuery]);

  /**
   * Query for quantum synthesis (combined Anka + Vastu)
   */
  const queryQuantumSynthesis = useCallback(async (
    name: string,
    dateOfBirth: string,
    placements: RoomPlacement[]
  ): Promise<QuantumResponse | null> => {
    return executeQuery({
      queryType: 'quantum_synthesis',
      name,
      dateOfBirth,
      vastuPlacements: placements,
      command: `Synthesize Space-Time Quantum analysis for ${name} with ${placements.length} zones`
    });
  }, [executeQuery]);

  /**
   * Get current bridge status
   */
  const checkBridgeStatus = useCallback(() => {
    return bridgeStatus;
  }, [bridgeStatus]);

  /**
   * Reset bridge state
   */
  const resetBridge = useCallback(() => {
    setLastResponse(null);
    setBridgeStatus({
      isConnected: false,
      lastSync: null,
      ankaReady: true,
      vastuReady: true,
      quantumCoherence: 99
    });
    queryQueue.current = [];
  }, []);

  return {
    // State
    isLoading,
    lastResponse,
    bridgeStatus,
    
    // Core query function
    executeQuery,
    
    // Specialized queries
    queryLostObject,
    queryMoneyRecovery,
    queryCompatibility,
    queryTemporalAnalysis,
    queryVastuScan,
    queryQuantumSynthesis,
    
    // Utilities
    checkBridgeStatus,
    resetBridge
  };
};

export default useQuantumBridge;
