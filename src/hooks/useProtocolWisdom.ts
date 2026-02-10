// ═══════════════════════════════════════════════════════════════════════════════
// USE PROTOCOL WISDOM HOOK
// React hook for integrating the Wisdom Engine into components
// 
// IBM Intelligence Model:
// - MACRO = User's "WHY" (North Star goals, never changed by AI)
// - MICRO = AI's "HOW" (Daily actionable tasks derived from macros)
// - WISDOM CHECK = Validation that actions serve the macro goals
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import {
  getWisdomEngine,
  type MacroGoal,
  type MicroGoal,
  type WisdomCheckResult,
  type LifeCodex,
  type GoalDomain,
} from '@/core/wisdom/ProtocolWisdom';
import { toast } from 'sonner';

export interface UseProtocolWisdomReturn {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  lifeCodex: LifeCodex | null;
  macroGoals: MacroGoal[];
  microGoals: MicroGoal[];
  todaysMicroGoals: MicroGoal[];
  wisdomLevel: number;

  // Macro Goal Actions (User-Defined)
  addMacroGoal: (goal: {
    title: string;
    purpose: string;
    domain: GoalDomain;
    priority: 'critical' | 'high' | 'medium' | 'low';
    targetDate?: Date;
    emotionalAnchors?: string[];
  }) => Promise<MacroGoal | null>;

  // Micro Goal Actions
  completeMicroGoal: (goalId: string) => Promise<boolean>;
  skipMicroGoal: (goalId: string, reason?: string) => Promise<boolean>;

  // Wisdom Check
  checkWisdom: (action: string, context?: {
    domain?: GoalDomain;
    estimatedCost?: number;
    estimatedTime?: number;
    urgency?: 'immediate' | 'normal' | 'low';
  }) => WisdomCheckResult;

  // Quick Helpers
  isActionAligned: (action: string) => boolean;
  getRecommendation: (action: string) => 'proceed' | 'modify' | 'reject' | 'defer';

  // Refresh
  refresh: () => Promise<void>;
}

export function useProtocolWisdom(): UseProtocolWisdomReturn {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lifeCodex, setLifeCodex] = useState<LifeCodex | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Get or create wisdom engine for this user
  const engine = useMemo(() => {
    if (!user?.id) return null;
    return getWisdomEngine(user.id);
  }, [user?.id]);

  // Initialize engine
  useEffect(() => {
    if (!engine) return;

    const init = async () => {
      setIsLoading(true);
      try {
        await engine.initialize();
        setLifeCodex(engine.getLifeCodex());
        setIsInitialized(true);
      } catch (error) {
        console.error('[WISDOM HOOK] Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [engine, refreshTrigger]);

  // Add a macro goal
  const addMacroGoal = useCallback(async (goal: {
    title: string;
    purpose: string;
    domain: GoalDomain;
    priority: 'critical' | 'high' | 'medium' | 'low';
    targetDate?: Date;
    emotionalAnchors?: string[];
  }): Promise<MacroGoal | null> => {
    if (!engine) return null;

    try {
      const newGoal = await engine.addMacroGoal({
        ...goal,
        status: 'active',
        milestones: [],
        emotionalAnchors: goal.emotionalAnchors || [],
      });

      if (newGoal) {
        setLifeCodex(engine.getLifeCodex());
        toast.success('🌟 North Star Goal Added', {
          description: `"${goal.title}" is now guiding your daily actions`
        });
      }

      return newGoal;
    } catch (error) {
      console.error('[WISDOM HOOK] Add macro goal error:', error);
      toast.error('Failed to add goal');
      return null;
    }
  }, [engine]);

  // Complete a micro goal
  const completeMicroGoal = useCallback(async (goalId: string): Promise<boolean> => {
    if (!engine) return false;

    try {
      const success = await engine.completeMicroGoal(goalId);
      if (success) {
        setLifeCodex(engine.getLifeCodex());
        toast.success('✅ Task completed!', {
          description: 'One step closer to your North Star'
        });
      }
      return success;
    } catch (error) {
      console.error('[WISDOM HOOK] Complete micro goal error:', error);
      return false;
    }
  }, [engine]);

  // Skip a micro goal
  const skipMicroGoal = useCallback(async (goalId: string, reason?: string): Promise<boolean> => {
    if (!engine) return false;

    try {
      const success = await engine.skipMicroGoal(goalId, reason);
      if (success) {
        setLifeCodex(engine.getLifeCodex());
      }
      return success;
    } catch (error) {
      console.error('[WISDOM HOOK] Skip micro goal error:', error);
      return false;
    }
  }, [engine]);

  // Perform wisdom check
  const checkWisdom = useCallback((
    action: string,
    context?: {
      domain?: GoalDomain;
      estimatedCost?: number;
      estimatedTime?: number;
      urgency?: 'immediate' | 'normal' | 'low';
    }
  ): WisdomCheckResult => {
    if (!engine) {
      return {
        passed: true,
        confidenceScore: 0,
        alignedMacroGoals: [],
        conflictingMacroGoals: [],
        reasoning: 'Wisdom engine not initialized',
        recommendation: 'proceed',
        longTermImpact: 'neutral',
        processingTimeMs: 0
      };
    }

    return engine.performWisdomCheck(action, context);
  }, [engine]);

  // Quick helper: Is action aligned?
  const isActionAligned = useCallback((action: string): boolean => {
    const result = checkWisdom(action);
    return result.passed;
  }, [checkWisdom]);

  // Quick helper: Get recommendation
  const getRecommendation = useCallback((action: string): 'proceed' | 'modify' | 'reject' | 'defer' => {
    const result = checkWisdom(action);
    return result.recommendation;
  }, [checkWisdom]);

  // Refresh
  const refresh = useCallback(async () => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Derived values
  const macroGoals = useMemo(() => lifeCodex?.macroGoals || [], [lifeCodex]);
  const microGoals = useMemo(() => lifeCodex?.microGoals || [], [lifeCodex]);
  const todaysMicroGoals = useMemo(() => engine?.getTodaysMicroGoals() || [], [engine, lifeCodex]);
  const wisdomLevel = useMemo(() => lifeCodex?.wisdomLevel || 0, [lifeCodex]);

  return {
    // State
    isInitialized,
    isLoading,
    lifeCodex,
    macroGoals,
    microGoals,
    todaysMicroGoals,
    wisdomLevel,

    // Macro Goal Actions
    addMacroGoal,

    // Micro Goal Actions
    completeMicroGoal,
    skipMicroGoal,

    // Wisdom Check
    checkWisdom,

    // Quick Helpers
    isActionAligned,
    getRecommendation,

    // Refresh
    refresh,
  };
}

export default useProtocolWisdom;
