// ═══════════════════════════════════════════════════════════════════════════════
// USE ANIMA SYNERGY - React Hook for Soul Connection Matching
// Zero-Swipe • Zero-Knowledge • Destiny-Based Matching
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { 
  AnimaEngine, 
  type SoulVector, 
  type SoulConnection, 
  type AnimaProfile,
  type DestinyNotification 
} from '@/core/quantum/AnimaEngine';
import { calculateAge, getCurrentLifePhase } from '@/core/quantum/KronosEngine';
import { calculateConductorNumber, reduceToSingleDigit, calculateVibrationNumber } from '@/core/quantum';

export interface UseAnimaSynergyReturn {
  myVector: SoulVector | null;
  topConnections: SoulConnection[];
  destinyNotifications: DestinyNotification[];
  isSearching: boolean;
  isLoading: boolean;
  error: string | null;
  enableSearch: () => void;
  disableSearch: () => void;
  analyzeConnection: (otherUserId: string) => Promise<SoulConnection | null>;
  refreshConnections: () => Promise<void>;
  dismissNotification: (notificationId: string) => void;
}

export const useAnimaSynergy = (): UseAnimaSynergyReturn => {
  const { user } = useAuth();
  const [myVector, setMyVector] = useState<SoulVector | null>(null);
  const [topConnections, setTopConnections] = useState<SoulConnection[]>([]);
  const [destinyNotifications, setDestinyNotifications] = useState<DestinyNotification[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Build soul vector from user data
   */
  const buildSoulVector = useCallback(async (userId: string): Promise<SoulVector | null> => {
    try {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!profile?.birth_date) return null;

      const birthDate = new Date(profile.birth_date);
      const birthDay = birthDate.getDate();
      const currentYear = new Date().getFullYear();

      // Fetch soul codex if available
      const { data: codex } = await supabase
        .from('dhf_soul_codex')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // Calculate numbers
      const driverNumber = reduceToSingleDigit(birthDay);
      const conductorNumber = calculateConductorNumber(birthDate);
      const vibrationNumber = calculateVibrationNumber(profile.username || 'User');
      const personalYear = reduceToSingleDigit(currentYear + conductorNumber);

      // Get life phase
      const age = calculateAge(birthDate);
      const lifePhase = getCurrentLifePhase(age);

      // Build vector
      const vector: SoulVector = {
        userId,
        driverNumber,
        conductorNumber,
        vibrationNumber,
        humorStyle: (codex?.humor_style as SoulVector['humorStyle']) || 'neutral',
        conflictStyle: (codex?.conflict_resolution as SoulVector['conflictStyle']) || 'diplomatic',
        decisionStyle: (codex?.decision_making_style as SoulVector['decisionStyle']) || 'balanced',
        stressResponse: (codex?.stress_response as SoulVector['stressResponse']) || 'adaptive',
        currentLifePhase: lifePhase.phaseName,
        karmicTheme: lifePhase.karmicTheme,
        currentAge: age,
        personalYear,
        activeCycles: [] // Would be populated from Kronos echoes
      };

      return vector;
    } catch (err) {
      console.error('[AnimaSynergy] Error building vector:', err);
      return null;
    }
  }, []);

  /**
   * Initialize user's soul vector
   */
  const initializeVector = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const vector = await buildSoulVector(user.id);
      
      if (vector) {
        setMyVector(vector);
        
        // Log to DHF
        window.dispatchEvent(new CustomEvent('zoe-dhf-anima-initialized', {
          detail: {
            userId: user.id,
            lifePhase: vector.currentLifePhase,
            personalYear: vector.personalYear
          }
        }));
      } else {
        setError('Birth date required for Soul Synergy. Please update your profile.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize Anima');
    } finally {
      setIsLoading(false);
    }
  }, [user, buildSoulVector]);

  useEffect(() => {
    initializeVector();
  }, [initializeVector]);

  /**
   * Enable Anima search mode
   */
  const enableSearch = useCallback(() => {
    if (!myVector) {
      setError('Please complete your profile first');
      return;
    }
    setIsSearching(true);
    
    // Log to DHF
    window.dispatchEvent(new CustomEvent('zoe-dhf-anima-search-enabled', {
      detail: { userId: user?.id }
    }));
  }, [myVector, user]);

  /**
   * Disable Anima search mode
   */
  const disableSearch = useCallback(() => {
    setIsSearching(false);
  }, []);

  /**
   * Analyze connection with specific user
   */
  const analyzeConnection = useCallback(async (otherUserId: string): Promise<SoulConnection | null> => {
    if (!myVector) return null;

    try {
      const otherVector = await buildSoulVector(otherUserId);
      if (!otherVector) return null;

      const connection = AnimaEngine.analyzeSoulConnection(myVector, otherVector);

      // Create destiny notification if high match
      if (connection.resonanceScore >= 85) {
        const notification = AnimaEngine.createDestinyNotification(connection, true);
        setDestinyNotifications(prev => [...prev, notification]);
      }

      return connection;
    } catch (err) {
      console.error('[AnimaSynergy] Error analyzing connection:', err);
      return null;
    }
  }, [myVector, buildSoulVector]);

  /**
   * Refresh top connections
   */
  const refreshConnections = useCallback(async () => {
    if (!myVector || !isSearching) return;

    try {
      // Fetch potential matches (users with birth_date)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id')
        .not('birth_date', 'is', null)
        .neq('user_id', user?.id)
        .limit(20);

      if (!profiles || profiles.length === 0) return;

      // Build vectors and analyze
      const connections: SoulConnection[] = [];
      
      for (const profile of profiles) {
        const otherVector = await buildSoulVector(profile.user_id);
        if (otherVector) {
          const connection = AnimaEngine.analyzeSoulConnection(myVector, otherVector);
          if (connection.resonanceScore >= 60) {
            connections.push(connection);
          }
        }
      }

      // Sort by score and take top 5
      connections.sort((a, b) => b.resonanceScore - a.resonanceScore);
      setTopConnections(connections.slice(0, 5));

    } catch (err) {
      console.error('[AnimaSynergy] Error refreshing connections:', err);
    }
  }, [myVector, isSearching, user, buildSoulVector]);

  /**
   * Dismiss a destiny notification
   */
  const dismissNotification = useCallback((notificationId: string) => {
    setDestinyNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Auto-refresh when searching
  useEffect(() => {
    if (isSearching && myVector) {
      refreshConnections();
      
      // Refresh every 5 minutes while searching
      const interval = setInterval(refreshConnections, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isSearching, myVector, refreshConnections]);

  return {
    myVector,
    topConnections,
    destinyNotifications,
    isSearching,
    isLoading,
    error,
    enableSearch,
    disableSearch,
    analyzeConnection,
    refreshConnections,
    dismissNotification
  };
};

export default useAnimaSynergy;
