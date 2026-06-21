// ═══════════════════════════════════════════════════════════════════════════════
// USE TEMPORAL RADAR - React Hook for Dark Cycle Pattern Detection
// The Wormhole Warning System - 33-Year Metonic Cycle + Vedic Dasha
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { 
  DarkCycleEngine,
  type DarkCycleReading,
  type TemporalEcho,
  type TriquetralNode,
  type DarkCycleWarning
} from '@/core/quantum/DarkCycleEngine';

export interface UseTemporalRadarReturn {
  reading: DarkCycleReading | null;
  pastNode: TriquetralNode | null;
  presentNode: TriquetralNode | null;
  futureNode: TriquetralNode | null;
  activeEchoes: TemporalEcho[];
  currentWarning: DarkCycleWarning | null;
  warningLevel: 'safe' | 'caution' | 'warning' | 'critical';
  isLoading: boolean;
  error: string | null;
  refreshReading: () => Promise<void>;
  // Time Travel Controls
  selectedYear: number;
  isTimeTravel: boolean;
  jumpToYear: (year: number) => void;
  returnToPresent: () => void;
}

export const useTemporalRadar = (): UseTemporalRadarReturn => {
  const { user } = useAuth();
  const [reading, setReading] = useState<DarkCycleReading | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Time Travel State
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isTimeTravel, setIsTimeTravel] = useState(false);
  const [birthDate, setBirthDate] = useState<Date | null>(null);

  const fetchAndGenerateReading = useCallback(async (targetYear?: number) => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch user profile with birth date
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('birth_date, birth_place, user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile?.birth_date) {
        setError('Birth date required for Temporal Radar. Please update your profile.');
        setIsLoading(false);
        return;
      }

      const userBirthDate = new Date(profile.birth_date);
      setBirthDate(userBirthDate);
      
      // Calculate adjusted birth date for time travel
      const yearToUse = targetYear || selectedYear;
      const yearDiff = yearToUse - currentYear;
      const adjustedDate = new Date(userBirthDate);
      // For time travel, we simulate as if "today" is the target year
      
      // Generate Dark Cycle Reading with optional year offset
      const darkReading = DarkCycleEngine.generateDarkCycleReading(
        user.id, 
        userBirthDate,
        yearToUse !== currentYear ? yearToUse : undefined
      );
      setReading(darkReading);

      // Log to DHF for tracking
      window.dispatchEvent(new CustomEvent('zoe-dhf-temporal-radar', {
        detail: {
          userId: user.id,
          age: darkReading.currentAge,
          warningLevel: darkReading.warningLevel,
          activeEchoes: darkReading.activeEchoes.length,
          temporalAlignment: darkReading.temporalAlignment,
          isTimeTravel: yearToUse !== currentYear,
          targetYear: yearToUse
        }
      }));

    } catch (err) {
      console.error('[TemporalRadar] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate Temporal Radar');
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedYear, currentYear]);

  useEffect(() => {
    fetchAndGenerateReading();
  }, [fetchAndGenerateReading]);

  // Time Travel Functions
  const jumpToYear = useCallback((year: number) => {
    if (year >= 1900 && year <= 2100) {
      setSelectedYear(year);
      setIsTimeTravel(year !== currentYear);
      fetchAndGenerateReading(year);
    }
  }, [currentYear, fetchAndGenerateReading]);

  const returnToPresent = useCallback(() => {
    setSelectedYear(currentYear);
    setIsTimeTravel(false);
    fetchAndGenerateReading(currentYear);
  }, [currentYear, fetchAndGenerateReading]);

  return {
    reading,
    pastNode: reading?.pastNode || null,
    presentNode: reading?.presentNode || null,
    futureNode: reading?.futureNode || null,
    activeEchoes: reading?.activeEchoes || [],
    currentWarning: reading?.currentWarning || null,
    warningLevel: reading?.warningLevel || 'safe',
    isLoading,
    error,
    refreshReading: () => fetchAndGenerateReading(),
    // Time Travel Controls
    selectedYear,
    isTimeTravel,
    jumpToYear,
    returnToPresent
  };
};

export default useTemporalRadar;
