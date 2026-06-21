import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 4: THE TRUTH LEDGER - React Hook
// ═══════════════════════════════════════════════════════════════════════════════
// Purpose: Access and manage user's permanent truths and sovereign context
// ═══════════════════════════════════════════════════════════════════════════════

export interface Truth {
  id: string;
  truth_key: string;
  truth_value: string;
  truth_category: string;
  confidence_score: number;
  first_observed_at: string;
  last_confirmed_at: string;
  confirmation_count: number;
  is_active: boolean;
}

export interface SovereignContext {
  current_project: string | null;
  current_mood: string | null;
  current_focus: string | null;
  active_goals: unknown;
  recent_topics: string[] | null;
  relationship_map: Record<string, unknown> | null;
  preferences_snapshot: Record<string, unknown> | null;
  message_count_since_scribe: number | null;
  last_scribe_run_at: string | null;
}

export interface TruthLedgerReturn {
  truths: Truth[];
  context: SovereignContext | null;
  isLoading: boolean;
  error: string | null;
  
  // Query methods
  getTruthsByCategory: (category: string) => Truth[];
  getTruth: (key: string) => Truth | undefined;
  searchTruths: (query: string) => Truth[];
  
  // Mutation methods
  refreshTruths: () => Promise<void>;
  triggerScribe: (messages?: string) => Promise<void>;
  incrementMessageCount: () => Promise<void>;
  
  // Context helpers
  getCurrentProject: () => string | null;
  getRelationship: (key: string) => any;
  getPreference: (key: string) => any;
}

export const useTruthLedger = (): TruthLedgerReturn => {
  const { user } = useAuth();
  const [truths, setTruths] = useState<Truth[]>([]);
  const [context, setContext] = useState<SovereignContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch truths from ledger
  const refreshTruths = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch active truths
      const { data: truthData, error: truthError } = await supabase
        .from('universal_truth_ledger')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_confirmed_at', { ascending: false });

      if (truthError) throw truthError;
      setTruths(truthData || []);

      // Fetch sovereign context
      const { data: contextData, error: contextError } = await supabase
        .from('sovereign_context')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (contextError && contextError.code !== 'PGRST116') {
        console.warn('[TruthLedger] Context fetch warning:', contextError);
      }
      
      // Map database response to our interface
      if (contextData) {
        setContext({
          current_project: contextData.current_project,
          current_mood: contextData.current_mood,
          current_focus: contextData.current_focus,
          active_goals: contextData.active_goals,
          recent_topics: contextData.recent_topics,
          relationship_map: contextData.relationship_map as Record<string, unknown> | null,
          preferences_snapshot: contextData.preferences_snapshot as Record<string, unknown> | null,
          message_count_since_scribe: contextData.message_count_since_scribe,
          last_scribe_run_at: contextData.last_scribe_run_at
        });
      } else {
        setContext(null);
      }

    } catch (err) {
      console.error('[TruthLedger] Error fetching truths:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch truths');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Initial fetch
  useEffect(() => {
    if (user?.id) {
      refreshTruths();
    }
  }, [user?.id, refreshTruths]);

  // Get truths by category
  const getTruthsByCategory = useCallback((category: string): Truth[] => {
    return truths.filter(t => t.truth_category === category);
  }, [truths]);

  // Get single truth by key
  const getTruth = useCallback((key: string): Truth | undefined => {
    return truths.find(t => t.truth_key === key);
  }, [truths]);

  // Search truths
  const searchTruths = useCallback((query: string): Truth[] => {
    const lowerQuery = query.toLowerCase();
    return truths.filter(t => 
      t.truth_key.toLowerCase().includes(lowerQuery) ||
      t.truth_value.toLowerCase().includes(lowerQuery)
    );
  }, [truths]);

  // Trigger the Scribe edge function
  const triggerScribe = useCallback(async (messages?: string) => {
    if (!user?.id) return;

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('zoe-truth-scribe', {
        body: { 
          userId: user.id, 
          messages,
          forceRun: true 
        }
      });

      if (invokeError) throw invokeError;

      console.log('[TruthLedger] Scribe completed:', data);
      
      // Refresh truths after scribe run
      await refreshTruths();

    } catch (err) {
      console.error('[TruthLedger] Scribe error:', err);
      setError(err instanceof Error ? err.message : 'Scribe failed');
    }
  }, [user?.id, refreshTruths]);

  // Increment message count (call after each message exchange)
  const incrementMessageCount = useCallback(async () => {
    if (!user?.id) return;

    try {
      const currentCount = context?.message_count_since_scribe || 0;
      const newCount = currentCount + 1;

      // Update count
      await supabase
        .from('sovereign_context')
        .upsert({
          user_id: user.id,
          message_count_since_scribe: newCount,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      // If hit threshold, trigger scribe
      if (newCount >= 5) {
        console.log('[TruthLedger] Threshold reached, triggering Scribe...');
        await triggerScribe();
      } else {
        // Just update local state
        setContext(prev => prev ? { ...prev, message_count_since_scribe: newCount } : null);
      }

    } catch (err) {
      console.error('[TruthLedger] Failed to increment message count:', err);
    }
  }, [user?.id, context?.message_count_since_scribe, triggerScribe]);

  // Context helper: Get current project
  const getCurrentProject = useCallback((): string | null => {
    return context?.current_project || null;
  }, [context]);

  // Context helper: Get relationship by key
  const getRelationship = useCallback((key: string): any => {
    return context?.relationship_map?.[key] || null;
  }, [context]);

  // Context helper: Get preference by key
  const getPreference = useCallback((key: string): unknown => {
    // First check context snapshot
    const snapshot = context?.preferences_snapshot as Record<string, unknown> | null;
    if (snapshot?.[key]) {
      return snapshot[key];
    }
    // Then check truth ledger
    const truth = truths.find(t =>
      t.truth_category === 'preference' && 
      t.truth_key.includes(key)
    );
    return truth?.truth_value || null;
  }, [context, truths]);

  return {
    truths,
    context,
    isLoading,
    error,
    getTruthsByCategory,
    getTruth,
    searchTruths,
    refreshTruths,
    triggerScribe,
    incrementMessageCount,
    getCurrentProject,
    getRelationship,
    getPreference
  };
};

export default useTruthLedger;
