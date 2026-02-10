import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AnkaShastraEngine, type TemporalQuantumState, type LostObjectReading, type MoneyRecoveryReading, type CompatibilityReading } from '@/core/quantum/AnkaShastraEngine';

export type QueryType = 'lost_object' | 'money_recovery' | 'compatibility' | 'full_reading' | 'temporal_analysis';

export interface QuantumReading {
  success: boolean;
  reading: string;
  computed: {
    soulNumbers: { driverNumber: number | null; conductorNumber: number | null; vibrationNumber: number | null; personalYear: number | null };
    queryAnalysis: any;
  };
  temporal: { past: string | null; present: string; future: string | null };
  metadata: { protocol: string; latency_ms: number; timestamp: string };
}

export const useZoeQuantumLevel = () => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastReading, setLastReading] = useState<QuantumReading | null>(null);
  const [isAnkaModeActive, setIsAnkaModeActive] = useState(false);

  const activateAnkaMode = useCallback(() => setIsAnkaModeActive(true), []);
  const deactivateAnkaMode = useCallback(() => setIsAnkaModeActive(false), []);

  const executeQuantumReading = useCallback(async (
    command: string,
    queryType: QueryType,
    options?: { prasnaNumber?: number; name?: string; dateOfBirth?: string; targetNumber?: number; debtorDestiny?: number }
  ): Promise<QuantumReading | null> => {
    if (!user) return null;
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('zoe-quantum-anka', {
        body: { command, userId: user.id, queryType, ...options }
      });

      if (error) throw error;
      setLastReading(data);
      return data;
    } catch (error) {
      console.error('Quantum reading error:', error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [user]);

  // Client-side calculations (instant, no API call)
  const findLostObject = useCallback((prasnaNumber: number): LostObjectReading => 
    AnkaShastraEngine.calculateLostObjectReading(prasnaNumber), []);

  const checkMoneyRecovery = useCallback((debtorDestiny: number): MoneyRecoveryReading => 
    AnkaShastraEngine.calculateMoneyRecovery(debtorDestiny), []);

  const checkCompatibility = useCallback((yourNumber: number, targetNumber: number): CompatibilityReading => 
    AnkaShastraEngine.calculateCompatibility(yourNumber, targetNumber), []);

  const getTemporalState = useCallback((dob: Date, name?: string): TemporalQuantumState => {
    const driver = AnkaShastraEngine.calculateDriverNumber(dob.getDate());
    const conductor = AnkaShastraEngine.calculateConductorNumber(dob);
    const vibration = name ? AnkaShastraEngine.calculateVibrationNumber(name) : driver;
    return AnkaShastraEngine.generateTemporalQuantumState(driver, conductor, vibration);
  }, []);

  return {
    executeQuantumReading,
    findLostObject,
    checkMoneyRecovery,
    checkCompatibility,
    getTemporalState,
    activateAnkaMode,
    deactivateAnkaMode,
    isAnkaModeActive,
    isProcessing,
    lastReading,
    engine: AnkaShastraEngine
  };
};

export default useZoeQuantumLevel;
