// ═══════════════════════════════════════════════════════════════════════════════
// DHF AUTONOMY HOOK - Manages DHF Stack operations with safety controls
// Includes VETO feedback integration and latency optimization
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface DHFSession {
  id: string;
  isActive: boolean;
  pausedAt: string | null;
  actionCount: number;
  lastCheckIn: string | null;
}

interface LatencyMetrics {
  lastOperationMs: number;
  averageMs: number;
  slaTarget: number;
  slaMet: boolean;
}

interface VETOResult {
  vetoed: boolean;
  reason?: string;
  rule?: string;
  overrideAllowed: boolean;
}

export interface UseDHFAutonomyReturn {
  session: DHFSession | null;
  isActive: boolean;
  latencyMetrics: LatencyMetrics;
  autonomyTolerance: number;
  startSession: () => Promise<string | null>;
  endSession: () => Promise<void>;
  pauseSession: (reason?: string) => Promise<void>;
  resumeSession: () => Promise<void>;
  executeWithVETO: <T>(
    action: () => Promise<T>,
    actionDescription: string,
    category: 'financial' | 'security' | 'destructive' | 'social' | 'privacy'
  ) => Promise<{ result: T | null; vetoed: boolean; vetoReason?: string }>;
  checkVETO: (actionDescription: string) => Promise<VETOResult>;
  recordLatency: (operationType: string, latencyMs: number, targetMs: number) => Promise<void>;
  getOptimizedContext: (contextKey: string) => Promise<any | null>;
  cacheContext: (contextKey: string, response: any) => Promise<void>;
}

export const useDHFAutonomy = (): UseDHFAutonomyReturn => {
  const { user } = useAuth();
  const [session, setSession] = useState<DHFSession | null>(null);
  const [autonomyTolerance, setAutonomyTolerance] = useState(0.7);
  const [latencyMetrics, setLatencyMetrics] = useState<LatencyMetrics>({
    lastOperationMs: 0,
    averageMs: 0,
    slaTarget: 1000,
    slaMet: true,
  });

  const latencyHistory = useRef<number[]>([]);

  // Load user's autonomy tolerance
  useEffect(() => {
    const loadTolerance = async () => {
      if (!user) return;

      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        const tolerance = (data as any)?.dhf_autonomy_tolerance;
        if (tolerance) {
          setAutonomyTolerance(tolerance);
        }
      } catch (err) {
        console.error('Failed to load autonomy tolerance:', err);
      }
    };

    loadTolerance();
  }, [user]);

  const startSession = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('dhf_stack_sessions')
        .insert({
          user_id: user.id,
          is_active: true,
          session_start: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;

      setSession({
        id: data.id,
        isActive: true,
        pausedAt: null,
        actionCount: 0,
        lastCheckIn: null,
      });

      toast.success('DHF Stack Activated', {
        description: 'Autonomous operations are now enabled.',
      });

      return data.id;
    } catch (err) {
      console.error('Failed to start DHF session:', err);
      toast.error('Failed to start DHF Stack');
      return null;
    }
  }, [user]);

  const endSession = useCallback(async () => {
    if (!user || !session) return;

    try {
      await supabase
        .from('dhf_stack_sessions')
        .update({
          is_active: false,
          session_end: new Date().toISOString(),
        })
        .eq('id', session.id);

      setSession(null);
      toast.info('DHF Stack Deactivated');
    } catch (err) {
      console.error('Failed to end DHF session:', err);
    }
  }, [user, session]);

  const pauseSession = useCallback(async (reason?: string) => {
    if (!user || !session) return;

    try {
      await supabase
        .from('dhf_stack_sessions')
        .update({
          is_active: false,
          paused_at: new Date().toISOString(),
          pause_reason: reason || 'user_requested',
        })
        .eq('id', session.id);

      setSession(prev => prev ? { ...prev, isActive: false, pausedAt: new Date().toISOString() } : null);
    } catch (err) {
      console.error('Failed to pause DHF session:', err);
    }
  }, [user, session]);

  const resumeSession = useCallback(async () => {
    if (!user || !session) return;

    try {
      await supabase
        .from('dhf_stack_sessions')
        .update({
          is_active: true,
          paused_at: null,
          user_confirmed_continue: true,
        })
        .eq('id', session.id);

      setSession(prev => prev ? { ...prev, isActive: true, pausedAt: null } : null);
    } catch (err) {
      console.error('Failed to resume DHF session:', err);
    }
  }, [user, session]);

  const checkVETO = useCallback(async (actionDescription: string): Promise<VETOResult> => {
    if (!user) {
      return { vetoed: false, overrideAllowed: true };
    }

    try {
      // Call the security governance tool via edge function
      const { data, error } = await supabase.functions.invoke('zoe-core-executor', {
        body: {
          command: `Check if this action should be vetoed: "${actionDescription}"`,
          userId: user.id,
          intent: 'semantic_veto',
          options: {
            forceThinkingLevel: 'high',
          },
        },
      });

      if (error) throw error;

      // Parse VETO result from response
      const vetoTriggered = data?.tool_executions?.some(
        (t: any) => t.tool === 'security_governance' && t.result?.vetoed
      );

      if (vetoTriggered) {
        return {
          vetoed: true,
          reason: 'Action blocked by DHF VETO system',
          rule: data?.tool_executions?.find((t: any) => t.tool === 'security_governance')?.result?.rule,
          overrideAllowed: autonomyTolerance > 0.8,
        };
      }

      return { vetoed: false, overrideAllowed: true };
    } catch (err) {
      console.error('VETO check failed:', err);
      // Fail open with warning
      return { vetoed: false, overrideAllowed: true };
    }
  }, [user, autonomyTolerance]);

  const executeWithVETO = useCallback(async <T>(
    action: () => Promise<T>,
    actionDescription: string,
    category: 'financial' | 'security' | 'destructive' | 'social' | 'privacy'
  ): Promise<{ result: T | null; vetoed: boolean; vetoReason?: string }> => {
    const startTime = performance.now();

    // Check VETO first
    const vetoResult = await checkVETO(actionDescription);

    if (vetoResult.vetoed) {
      const latency = performance.now() - startTime;
      await recordLatency('veto_check', latency, 1000);

      return {
        result: null,
        vetoed: true,
        vetoReason: vetoResult.reason,
      };
    }

    // Execute the action
    try {
      const result = await action();
      const latency = performance.now() - startTime;
      await recordLatency(`${category}_action`, latency, 1000);

      // Increment action count
      if (session) {
        setSession(prev => prev ? { ...prev, actionCount: prev.actionCount + 1 } : null);
      }

      return { result, vetoed: false };
    } catch (err) {
      console.error('Action execution failed:', err);
      return { result: null, vetoed: false };
    }
  }, [checkVETO, session]);

  const recordLatency = useCallback(async (
    operationType: string,
    latencyMs: number,
    targetMs: number
  ) => {
    if (!user) return;

    // Update local metrics
    latencyHistory.current.push(latencyMs);
    if (latencyHistory.current.length > 50) {
      latencyHistory.current.shift();
    }

    const average = latencyHistory.current.reduce((a, b) => a + b, 0) / latencyHistory.current.length;

    setLatencyMetrics({
      lastOperationMs: latencyMs,
      averageMs: average,
      slaTarget: targetMs,
      slaMet: latencyMs <= targetMs,
    });

    // Log to database (fire and forget) - use void to ignore promise
    void supabase.from('latency_benchmarks').insert({
      user_id: user.id,
      operation_type: operationType,
      thinking_level: latencyMs < 500 ? 'low' : latencyMs < 1000 ? 'medium' : 'high',
      measured_latency_ms: Math.round(latencyMs),
      target_latency_ms: targetMs,
      sla_met: latencyMs <= targetMs,
      cache_hit: false,
    } as any);
  }, [user]);

  const getOptimizedContext = useCallback(async (contextKey: string): Promise<any | null> => {
    if (!user) return null;

    try {
      // Use contextual memory for caching - simplified for now
      console.log('Getting optimized context for:', contextKey);
      return null; // Will be fully implemented when types are updated
    } catch (err) {
      console.error('Failed to get cached context:', err);
      return null;
    }
  }, [user]);

  const cacheContext = useCallback(async (contextKey: string, response: any) => {
    if (!user) return;

    try {
      console.log('Caching context:', contextKey);
      // Will be fully implemented when types are updated
    } catch (err) {
      console.error('Failed to cache context:', err);
    }
  }, [user]);

  return {
    session,
    isActive: session?.isActive || false,
    latencyMetrics,
    autonomyTolerance,
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    executeWithVETO,
    checkVETO,
    recordLatency,
    getOptimizedContext,
    cacheContext,
  };
};

export default useDHFAutonomy;
