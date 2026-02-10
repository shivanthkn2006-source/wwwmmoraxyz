// ═══════════════════════════════════════════════════════════════════════════════
// USE EDGE BRAIN - Local Processing Hook
// Zero server cost - Sentiment & Matchmaking on device
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { 
  analyzeSentimentLocal, 
  analyzeConversationTrend,
  type SentimentResult,
  type SentimentTrend 
} from '@/utils/edgeBrainSentiment';
import {
  soulVectorCache,
  calculateCompatibilityLocal,
  findTopMatchesLocal,
  buildCacheableSoulVector,
  type CachedSoulVector,
  type CompatibilityResult,
  type MatchResult
} from '@/utils/edgeBrainMatchmaking';
import { reduceToSingleDigit, calculateConductorNumber, calculateVibrationNumber } from '@/core/quantum';
import { calculateAge, getCurrentLifePhase } from '@/core/quantum/KronosEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface EdgeBrainState {
  mySoulVector: CachedSoulVector | null;
  currentMood: SentimentResult | null;
  conversationTrend: SentimentTrend | null;
  topMatches: MatchResult[];
  isVectorReady: boolean;
  isMatchingActive: boolean;
  cachedVectorCount: number;
}

export interface UseEdgeBrainReturn extends EdgeBrainState {
  // Sentiment (Local)
  analyzeMood: (text: string) => SentimentResult;
  trackConversation: (messages: string[]) => SentimentTrend;
  
  // Matchmaking (Local)
  calculateCompatibility: (otherUserId: string) => CompatibilityResult | null;
  findMatches: (limit?: number, minScore?: number) => MatchResult[];
  enableMatching: () => Promise<void>;
  disableMatching: () => void;
  
  // Cache Management
  refreshNearbyVectors: () => Promise<number>;
  clearVectorCache: () => void;
  
  // Stats
  getStats: () => { 
    sentimentAnalyses: number;
    matchCalculations: number;
    serverCallsSaved: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export const useEdgeBrain = (): UseEdgeBrainReturn => {
  const { user } = useAuth();
  
  // State
  const [mySoulVector, setMySoulVector] = useState<CachedSoulVector | null>(null);
  const [currentMood, setCurrentMood] = useState<SentimentResult | null>(null);
  const [conversationTrend, setConversationTrend] = useState<SentimentTrend | null>(null);
  const [topMatches, setTopMatches] = useState<MatchResult[]>([]);
  const [isVectorReady, setIsVectorReady] = useState(false);
  const [isMatchingActive, setIsMatchingActive] = useState(false);
  const [cachedVectorCount, setCachedVectorCount] = useState(soulVectorCache.size());

  // Stats tracking (kept locally, no server calls)
  const statsRef = useRef({
    sentimentAnalyses: 0,
    matchCalculations: 0,
    serverCallsSaved: 0
  });

  // ─── BUILD MY SOUL VECTOR (One-time fetch, then cached) ───
  const buildMyVector = useCallback(async () => {
    if (!user) return null;

    // Check cache first
    const cached = soulVectorCache.get(user.id);
    if (cached) {
      setMySoulVector(cached);
      setIsVectorReady(true);
      return cached;
    }

    try {
      // Fetch profile (single DB call)
      const { data: profile } = await supabase
        .from('profiles')
        .select('birth_date, username, city')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.birth_date) {
        console.warn('[EdgeBrain] No birth date for user');
        return null;
      }

      const birthDate = new Date(profile.birth_date);
      const birthDay = birthDate.getDate();
      const currentYear = new Date().getFullYear();

      // Fetch soul codex if exists
      const { data: codex } = await supabase
        .from('dhf_soul_codex')
        .select('humor_style, conflict_resolution, decision_making_style, stress_response')
        .eq('user_id', user.id)
        .maybeSingle();

      // Calculate all numerology locally
      const driverNumber = reduceToSingleDigit(birthDay);
      const conductorNumber = calculateConductorNumber(birthDate);
      const vibrationNumber = calculateVibrationNumber(profile.username || 'User');
      const personalYear = reduceToSingleDigit(currentYear + conductorNumber);
      const age = calculateAge(birthDate);
      const lifePhase = getCurrentLifePhase(age);

      // Build and cache vector (no location - not in schema)
      const vector = buildCacheableSoulVector(
        user.id,
        driverNumber,
        conductorNumber,
        vibrationNumber,
        codex?.humor_style || 'neutral',
        codex?.conflict_resolution || 'diplomatic',
        codex?.decision_making_style || 'balanced',
        codex?.stress_response || 'adaptive',
        lifePhase.phaseName,
        personalYear,
        undefined // Location not available in profiles
      );

      soulVectorCache.set(vector);
      setMySoulVector(vector);
      setIsVectorReady(true);
      setCachedVectorCount(soulVectorCache.size());

      return vector;
    } catch (error) {
      console.error('[EdgeBrain] Error building vector:', error);
      return null;
    }
  }, [user]);

  // Initialize on mount
  useEffect(() => {
    if (user) {
      buildMyVector();
    }
  }, [user, buildMyVector]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SENTIMENT ANALYSIS (100% LOCAL)
  // ═══════════════════════════════════════════════════════════════════════════

  const analyzeMood = useCallback((text: string): SentimentResult => {
    statsRef.current.sentimentAnalyses++;
    statsRef.current.serverCallsSaved++; // Would have been a cloud API call
    
    const result = analyzeSentimentLocal(text);
    setCurrentMood(result);
    
    // Log to DHF without blocking (fire and forget)
    if (user) {
      window.dispatchEvent(new CustomEvent('zoe-edge-brain-mood', {
        detail: { 
          userId: user.id, 
          mood: result.mood, 
          score: result.score,
          local: true 
        }
      }));
    }
    
    return result;
  }, [user]);

  const trackConversation = useCallback((messages: string[]): SentimentTrend => {
    statsRef.current.sentimentAnalyses += messages.length;
    statsRef.current.serverCallsSaved += messages.length;
    
    const trend = analyzeConversationTrend(messages);
    setConversationTrend(trend);
    return trend;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // MATCHMAKING (100% LOCAL after initial cache)
  // ═══════════════════════════════════════════════════════════════════════════

  const refreshNearbyVectors = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    try {
      // Single DB call to get profiles with birth dates
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, birth_date, username')
        .not('birth_date', 'is', null)
        .neq('user_id', user.id)
        .limit(50); // Limit to 50 users

      if (!profiles || profiles.length === 0) return 0;

      // Batch fetch soul codex data
      const userIds = profiles.map((p: { user_id: string }) => p.user_id);
      const { data: codexData } = await supabase
        .from('dhf_soul_codex')
        .select('user_id, humor_style, conflict_resolution, decision_making_style, stress_response')
        .in('user_id', userIds);

      const codexMap = new Map(codexData?.map(c => [c.user_id, c]) || []);
      const currentYear = new Date().getFullYear();

      // Build vectors locally
      const vectors: CachedSoulVector[] = [];
      for (const profile of profiles as { user_id: string; birth_date: string; username: string | null }[]) {
        const birthDate = new Date(profile.birth_date);
        const birthDay = birthDate.getDate();
        const codex = codexMap.get(profile.user_id);

        const driverNumber = reduceToSingleDigit(birthDay);
        const conductorNumber = calculateConductorNumber(birthDate);
        const vibrationNumber = calculateVibrationNumber(profile.username || 'User');
        const personalYear = reduceToSingleDigit(currentYear + conductorNumber);
        const age = calculateAge(birthDate);
        const lifePhase = getCurrentLifePhase(age);

        const vector = buildCacheableSoulVector(
          profile.user_id,
          driverNumber,
          conductorNumber,
          vibrationNumber,
          codex?.humor_style || 'neutral',
          codex?.conflict_resolution || 'diplomatic',
          codex?.decision_making_style || 'balanced',
          codex?.stress_response || 'adaptive',
          lifePhase.phaseName,
          personalYear,
          undefined // Location not available
        );

        vectors.push(vector);
      }

      // Cache all vectors
      soulVectorCache.setMany(vectors);
      setCachedVectorCount(soulVectorCache.size());

      console.log(`[EdgeBrain] Cached ${vectors.length} soul vectors for local matching`);
      return vectors.length;
    } catch (error) {
      console.error('[EdgeBrain] Error refreshing vectors:', error);
      return 0;
    }
  }, [user]);

  const calculateCompatibility = useCallback((otherUserId: string): CompatibilityResult | null => {
    if (!mySoulVector) return null;

    const otherVector = soulVectorCache.get(otherUserId);
    if (!otherVector) {
      console.warn('[EdgeBrain] Vector not cached for user:', otherUserId);
      return null;
    }

    statsRef.current.matchCalculations++;
    statsRef.current.serverCallsSaved++; // Would have been server CPU

    return calculateCompatibilityLocal(mySoulVector, otherVector);
  }, [mySoulVector]);

  const findMatches = useCallback((limit: number = 10, minScore: number = 60): MatchResult[] => {
    if (!mySoulVector) return [];

    const cachedCount = soulVectorCache.size();
    statsRef.current.matchCalculations += cachedCount;
    statsRef.current.serverCallsSaved += cachedCount; // All local!

    const matches = findTopMatchesLocal(mySoulVector, limit, minScore);
    setTopMatches(matches);
    return matches;
  }, [mySoulVector]);

  const enableMatching = useCallback(async (): Promise<void> => {
    if (!mySoulVector) {
      await buildMyVector();
    }
    
    // Refresh cache
    await refreshNearbyVectors();
    setIsMatchingActive(true);
    
    // Find initial matches
    findMatches();
  }, [mySoulVector, buildMyVector, refreshNearbyVectors, findMatches]);

  const disableMatching = useCallback(() => {
    setIsMatchingActive(false);
    setTopMatches([]);
  }, []);

  const clearVectorCache = useCallback(() => {
    soulVectorCache.clear();
    setCachedVectorCount(0);
  }, []);

  const getStats = useCallback(() => ({
    sentimentAnalyses: statsRef.current.sentimentAnalyses,
    matchCalculations: statsRef.current.matchCalculations,
    serverCallsSaved: statsRef.current.serverCallsSaved
  }), []);

  return {
    // State
    mySoulVector,
    currentMood,
    conversationTrend,
    topMatches,
    isVectorReady,
    isMatchingActive,
    cachedVectorCount,

    // Sentiment
    analyzeMood,
    trackConversation,

    // Matchmaking
    calculateCompatibility,
    findMatches,
    enableMatching,
    disableMatching,

    // Cache
    refreshNearbyVectors,
    clearVectorCache,

    // Stats
    getStats
  };
};

export default useEdgeBrain;
