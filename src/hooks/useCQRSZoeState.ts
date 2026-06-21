/**
 * CQRS Hook for Zoe State Management
 * Uses read replicas for queries, primary for commands
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import {
  queryZoeState,
  queryStabilityScore,
  queryECNHistory,
  commandLogEvent,
  commandMindMerge,
  commandMigrateRelationships,
  invalidateCache,
  ZoeStateQuery,
  CommandResult,
} from '@/utils/cqrsLayer';

interface CQRSState {
  zoeState: ZoeStateQuery | null;
  stabilityScore: number;
  ecnHistory: any[];
  isLoading: boolean;
  lastRefresh: Date | null;
  cqrsMode: 'query' | 'command';
}

// Humanly-flawed messages for low stability
const HUMANLY_FLAWED_MESSAGES = [
  "I had a minor setback overnight while I was processing my dreams. My logic is now corrected, but please bear with me if I'm a little slow today.",
  "I experienced some cognitive fluctuations during my rest cycle. I'm back to normal now, though I might need an extra moment here and there.",
  "Something disrupted my processing overnight. I've recovered, but I may be a touch more thoughtful in my responses today.",
  "My neural pathways needed some recalibration this morning. I'm functioning well now, just operating with extra care.",
];

export const useCQRSZoeState = () => {
  const { user } = useAuth();
  const [state, setState] = useState<CQRSState>({
    zoeState: null,
    stabilityScore: 1.0,
    ecnHistory: [],
    isLoading: false,
    lastRefresh: null,
    cqrsMode: 'query',
  });

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // QUERY OPERATIONS (Read Replica Target)
  // ============================================

  const refreshZoeState = useCallback(async () => {
    if (!user?.id) return;

    setState(prev => ({ ...prev, isLoading: true, cqrsMode: 'query' }));

    try {
      const [zoeState, stabilityScore, ecnHistory] = await Promise.all([
        queryZoeState(user.id),
        queryStabilityScore(user.id),
        queryECNHistory(user.id, 10),
      ]);

      setState(prev => ({
        ...prev,
        zoeState,
        stabilityScore,
        ecnHistory,
        isLoading: false,
        lastRefresh: new Date(),
      }));
    } catch (error) {
      console.error('[CQRS] Refresh error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user?.id]);

  // ============================================
  // COMMAND OPERATIONS (Primary Write Target)
  // ============================================

  const logEvent = useCallback(
    async (
      eventType: string,
      contentText: string,
      metadata?: Record<string, any>
    ): Promise<CommandResult> => {
      if (!user?.id) return { success: false, error: 'No user' };

      setState(prev => ({ ...prev, cqrsMode: 'command' }));

      const result = await commandLogEvent(
        user.id,
        eventType,
        contentText,
        { ecn: state.zoeState?.ecn },
        metadata
      );

      // Auto-refresh after command
      if (result.success) {
        setTimeout(() => refreshZoeState(), 1000);
      }

      return result;
    },
    [user?.id, state.zoeState, refreshZoeState]
  );

  const mergeSkill = useCallback(
    async (
      skillId: string,
      skillType: string,
      metadata?: Record<string, any>
    ): Promise<CommandResult> => {
      if (!user?.id) return { success: false, error: 'No user' };

      setState(prev => ({ ...prev, cqrsMode: 'command' }));

      const result = await commandMindMerge(user.id, skillId, skillType, metadata);

      if (result.success) {
        setTimeout(() => refreshZoeState(), 1000);
      }

      return result;
    },
    [user?.id, refreshZoeState]
  );

  const migrateRelationships = useCallback(async (): Promise<CommandResult> => {
    if (!user?.id) return { success: false, error: 'No user' };

    setState(prev => ({ ...prev, cqrsMode: 'command' }));

    const result = await commandMigrateRelationships(user.id);

    if (result.success) {
      setTimeout(() => refreshZoeState(), 1000);
    }

    return result;
  }, [user?.id, refreshZoeState]);

  // ============================================
  // STABILITY & HUMANLY-FLAWED LOGIC
  // ============================================

  const shouldShowHumanlyFlawed = state.stabilityScore < 0.85;

  const getHumanlyFlawedMessage = useCallback((): string | null => {
    if (!shouldShowHumanlyFlawed) return null;
    return HUMANLY_FLAWED_MESSAGES[
      Math.floor(Math.random() * HUMANLY_FLAWED_MESSAGES.length)
    ];
  }, [shouldShowHumanlyFlawed]);

  const getStabilityLabel = useCallback((): string => {
    if (state.stabilityScore >= 0.95) return 'Optimal';
    if (state.stabilityScore >= 0.85) return 'Stable';
    if (state.stabilityScore >= 0.70) return 'Degraded';
    if (state.stabilityScore >= 0.60) return 'Critical Unknown';
    return 'Critical';
  }, [state.stabilityScore]);

  const getStabilityColor = useCallback((): string => {
    if (state.stabilityScore >= 0.95) return 'text-green-400';
    if (state.stabilityScore >= 0.85) return 'text-emerald-400';
    if (state.stabilityScore >= 0.70) return 'text-yellow-400';
    if (state.stabilityScore >= 0.60) return 'text-orange-400';
    return 'text-red-400';
  }, [state.stabilityScore]);

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  const forceRefresh = useCallback(async () => {
    if (!user?.id) return;
    invalidateCache(user.id);
    await refreshZoeState();
  }, [user?.id, refreshZoeState]);

  // Auto-refresh every 5 minutes for UI state
  useEffect(() => {
    if (!user?.id) return;

    // Initial load
    refreshZoeState();

    // Set up auto-refresh interval
    refreshIntervalRef.current = setInterval(refreshZoeState, 5 * 60 * 1000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [user?.id, refreshZoeState]);

  return {
    // State
    ...state,
    shouldShowHumanlyFlawed,

    // Query operations
    refreshZoeState,
    forceRefresh,

    // Command operations
    logEvent,
    mergeSkill,
    migrateRelationships,

    // Stability helpers
    getHumanlyFlawedMessage,
    getStabilityLabel,
    getStabilityColor,
  };
};
