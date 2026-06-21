// ═══════════════════════════════════════════════════════════════════════════════
// USE KRONOS TIMELINE - React Hook for Fractal Time Pattern Recognition
// Jupiter Cycle • Nodal Cycle • Saturn Return • Life Phase Tracking
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { 
  generateKronosReading,
  type KronosReading, 
  type KarmicEcho, 
  type FractalPattern, 
  type LifePhase 
} from '@/core/quantum/KronosEngine';

export interface UseKronosTimelineReturn {
  kronosReading: KronosReading | null;
  currentPhase: LifePhase | null;
  activeEchoes: KarmicEcho[];
  upcomingEchoes: KarmicEcho[];
  fractalPatterns: FractalPattern[];
  isLoading: boolean;
  error: string | null;
  refreshReading: () => Promise<void>;
  getEchoWarning: () => string | null;
}

export const useKronosTimeline = (): UseKronosTimelineReturn => {
  const { user } = useAuth();
  const [kronosReading, setKronosReading] = useState<KronosReading | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAndGenerateReading = useCallback(async () => {
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
        setError('Birth date required for Kronos Timeline. Please update your profile.');
        setIsLoading(false);
        return;
      }

      const birthDate = new Date(profile.birth_date);
      
      // Generate Kronos Reading
      const reading = generateKronosReading(user.id, birthDate);
      setKronosReading(reading);

      // Log to DHF for tracking
      window.dispatchEvent(new CustomEvent('zoe-dhf-kronos-reading', {
        detail: {
          userId: user.id,
          age: reading.currentAge,
          phase: reading.currentLifePhase.phaseName,
          activeEchoes: reading.activeKarmicCycles.length,
          timelineAlignment: reading.timelineAlignment
        }
      }));

    } catch (err) {
      console.error('[KronosTimeline] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate Kronos reading');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAndGenerateReading();
  }, [fetchAndGenerateReading]);

  /**
   * Get warning message if active karmic echoes exist
   */
  const getEchoWarning = useCallback((): string | null => {
    if (!kronosReading || kronosReading.activeKarmicCycles.length === 0) return null;

    const echoes = kronosReading.activeKarmicCycles;
    if (echoes.length === 1) {
      return `⚡ Active Karmic Cycle: ${echoes[0].emotionalSignature}. ${echoes[0].patternDescription}`;
    }
    return `⚡ ${echoes.length} Active Karmic Cycles detected. Review your timeline for pattern insights.`;
  }, [kronosReading]);

  return {
    kronosReading,
    currentPhase: kronosReading?.currentLifePhase || null,
    activeEchoes: kronosReading?.activeKarmicCycles || [],
    upcomingEchoes: kronosReading?.upcomingEchoes || [],
    fractalPatterns: kronosReading?.fractalPatterns || [],
    isLoading,
    error,
    refreshReading: fetchAndGenerateReading,
    getEchoWarning
  };
};

export default useKronosTimeline;
