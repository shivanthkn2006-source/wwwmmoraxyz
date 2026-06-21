import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface SessionSummary {
  emotional_themes: string;
  key_facts: string[];
  intimacy_moments: string;
  user_mood_arc: string;
  topics_discussed: string[];
  raw_summary: string;
}

export function useZoeSessionSummariser(userId: string | undefined) {
  const isSummarisingRef = useRef(false);

  const summariseAndStore = useCallback(async (
    messages: Message[]
  ): Promise<SessionSummary | null> => {
    if (!userId || messages.length < 5) return null;
    if (isSummarisingRef.current) return null;

    isSummarisingRef.current = true;

    try {
      // Call the new edge function
      const { data, error } = await supabase.functions.invoke(
        'zoe-session-summariser',
        {
          body: {
            messages,
            userId,
            sessionId: `session_${Date.now()}`,
          }
        }
      );

      if (error || !data?.summary) {
        console.warn('Session summariser returned no data:', error);
        return null;
      }

      const summary: SessionSummary = data.summary;

      // Store compressed summary in zoe_infinity_memories table
      // as a special memory_type = 'session_summary'
      const { error: storeError } = await supabase
        .from('zoe_infinity_memories')
        .insert({
          user_id: userId,
          key: `session_summary_${Date.now()}`,
          value: summary.raw_summary,
          memory_type: 'session_summary',
          importance_score: 8,
          context: JSON.stringify({
            emotional_themes: summary.emotional_themes,
            key_facts: summary.key_facts,
            intimacy_moments: summary.intimacy_moments,
            user_mood_arc: summary.user_mood_arc,
            topics_discussed: summary.topics_discussed,
          }),
          created_at: new Date().toISOString(),
        });

      if (storeError) {
        console.warn('Could not store session summary:', storeError);
      }

      return summary;

    } catch (err) {
      console.error('Session summariser error:', err);
      return null;
    } finally {
      isSummarisingRef.current = false;
    }
  }, [userId]);

  // Call this when user leaves the page or closes tab
  const summariseOnExit = useCallback((messages: Message[]) => {
    // Use sendBeacon pattern for reliable exit saving
    if (messages.length >= 5) {
      summariseAndStore(messages);
    }
  }, [summariseAndStore]);

  return {
    summariseAndStore,
    summariseOnExit,
  };
}
