// ═══════════════════════════════════════════════════════════════════════════════
// ZOE DREAMER HOOK
// Autonomous Night Processing - Dream synthesis and proactive initiatives
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DreamInsight {
  category: 'pattern' | 'emotion' | 'behavior' | 'opportunity' | 'concern';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  suggestedActions?: string[];
}

export interface DreamSynthesis {
  dreamId: string;
  synthesizedAt: string;
  briefing: string;
  insights: DreamInsight[];
  emotionalTrend: {
    direction: 'improving' | 'stable' | 'declining';
    dominantEmotion: string;
    variance: number;
  };
  proactiveInitiatives: Array<{
    title: string;
    description: string;
    priority: number;
    autoExecute: boolean;
  }>;
  dataPointsAnalyzed: number;
}

export interface UseZoeDreamerReturn {
  latestDream: DreamSynthesis | null;
  fetchLatestDream: () => Promise<void>;
  triggerDreamCycle: () => Promise<DreamSynthesis | null>;
  isDreaming: boolean;
  hasUnreadDream: boolean;
  markDreamAsRead: () => void;
  dreamHistory: DreamSynthesis[];
}

export function useZoeDreamer(): UseZoeDreamerReturn {
  const [latestDream, setLatestDream] = useState<DreamSynthesis | null>(null);
  const [dreamHistory, setDreamHistory] = useState<DreamSynthesis[]>([]);
  const [isDreaming, setIsDreaming] = useState(false);
  const [hasUnreadDream, setHasUnreadDream] = useState(false);
  const { toast } = useToast();

  const fetchLatestDream = useCallback(async (): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch from cortical memories where we store dream syntheses
      const { data, error } = await supabase
        .from('cortical_stack_memories')
        .select('*')
        .eq('user_id', user.id)
        .eq('role', 'dream_synthesis')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data && data.length > 0) {
        const dreams: DreamSynthesis[] = data.map(d => {
          try {
            const parsed = JSON.parse(d.content);
            return {
              dreamId: d.id,
              synthesizedAt: d.created_at,
              briefing: parsed.briefing || d.summary || '',
              insights: parsed.insights || [],
              emotionalTrend: parsed.emotionalTrend || {
                direction: 'stable',
                dominantEmotion: 'neutral',
                variance: 0
              },
              proactiveInitiatives: parsed.proactiveInitiatives || [],
              dataPointsAnalyzed: parsed.dataPointsAnalyzed || 0
            };
          } catch {
            return {
              dreamId: d.id,
              synthesizedAt: d.created_at,
              briefing: d.content,
              insights: [],
              emotionalTrend: { direction: 'stable' as const, dominantEmotion: 'neutral', variance: 0 },
              proactiveInitiatives: [],
              dataPointsAnalyzed: 0
            };
          }
        });

        setDreamHistory(dreams);
        setLatestDream(dreams[0]);

        // Check if latest dream is from today and unread
        const today = new Date().toDateString();
        const dreamDate = new Date(dreams[0].synthesizedAt).toDateString();
        if (dreamDate === today) {
          const readKey = `dream_read_${dreams[0].dreamId}`;
          if (!localStorage.getItem(readKey)) {
            setHasUnreadDream(true);
          }
        }
      }
    } catch (error) {
      console.error('[DREAMER] Fetch error:', error);
    }
  }, []);

  const triggerDreamCycle = useCallback(async (): Promise<DreamSynthesis | null> => {
    setIsDreaming(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to trigger dream cycle",
          variant: "destructive"
        });
        return null;
      }

      const { data, error } = await supabase.functions.invoke('zoe-dreamer-agent', {
        body: {
          userId: user.id,
          manualTrigger: true
        }
      });

      if (error) throw error;

      if (data?.synthesis) {
        const synthesis = data.synthesis as DreamSynthesis;
        setLatestDream(synthesis);
        setHasUnreadDream(true);

        toast({
          title: "Dream Cycle Complete",
          description: `Analyzed ${synthesis.dataPointsAnalyzed} data points`,
        });

        return synthesis;
      }

      return null;

    } catch (error) {
      console.error('[DREAMER] Dream cycle error:', error);
      toast({
        title: "Dream Cycle Error",
        description: error instanceof Error ? error.message : "Failed to complete dream cycle",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsDreaming(false);
    }
  }, [toast]);

  const markDreamAsRead = useCallback(() => {
    if (latestDream) {
      localStorage.setItem(`dream_read_${latestDream.dreamId}`, 'true');
      setHasUnreadDream(false);
    }
  }, [latestDream]);

  // Fetch latest dream on mount
  useEffect(() => {
    fetchLatestDream();
  }, [fetchLatestDream]);

  return {
    latestDream,
    fetchLatestDream,
    triggerDreamCycle,
    isDreaming,
    hasUnreadDream,
    markDreamAsRead,
    dreamHistory
  };
}

export default useZoeDreamer;
