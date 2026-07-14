// ═══════════════════════════════════════════════════════════════════════════════
// MOOD-ADAPTIVE UI HOOK
// Reads ECN emotional state and maps to UI mode for dynamic menu adaptation
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  validateUIMode,
  type UIMode,
  type MenuItem,
} from '@/core/neurosymbolic/UIConstraintValidator';

interface MoodAdaptiveState {
  uiMode: UIMode;
  visibleMenuItems: MenuItem[];
  hiddenMenuItems: MenuItem[];
  suggestedAction: string | null;
  currentEmotion: string;
}

/** Map ECN primary emotions → UI modes */
function emotionToUIMode(emotion: string, stressLevel: number): UIMode {
  if (stressLevel > 0.7) return 'calm';

  const lower = emotion.toLowerCase();
  if (['stressed', 'anxious', 'overwhelmed', 'fear'].includes(lower)) return 'calm';
  if (['happy', 'joy', 'excitement', 'creative', 'energetic'].includes(lower)) return 'creative';
  if (['focused', 'determined', 'flow'].includes(lower)) return 'minimal';
  if (['sad', 'lonely', 'grief', 'vulnerable'].includes(lower)) return 'supportive';
  return 'default';
}

/** Suggest a contextual action based on mood */
function suggestAction(emotion: string): string | null {
  const lower = emotion.toLowerCase();
  if (['stressed', 'anxious'].includes(lower)) return 'Try journaling to release tension';
  if (['sad', 'lonely'].includes(lower)) return 'Talk to Zoe — she is here for you';
  if (['happy', 'joy'].includes(lower)) return 'Create something on Webdrop!';
  if (['focused'].includes(lower)) return 'Deep work mode — distractions minimized';
  return null;
}

/**
 * Hook that subscribes to ECN emotional state and returns adaptive UI config
 * 
 * Usage:
 *   const { uiMode, visibleMenuItems } = useMoodAdaptiveUI();
 */
export function useMoodAdaptiveUI(): MoodAdaptiveState {
  const { user } = useAuth();
  const channelNameRef = useRef(`ecn-mood-ui:${Math.random().toString(36).slice(2, 8)}`);
  const [state, setState] = useState<MoodAdaptiveState>(() => {
    const defaultValidation = validateUIMode('default');
    return {
      uiMode: 'default',
      visibleMenuItems: defaultValidation.visibleItems,
      hiddenMenuItems: defaultValidation.hiddenItems,
      suggestedAction: null,
      currentEmotion: 'neutral',
    };
  });

  const updateFromECN = useCallback((emotion: string, stressLevel: number) => {
    const mode = emotionToUIMode(emotion, stressLevel);
    const validation = validateUIMode(mode);

    setState({
      uiMode: mode,
      visibleMenuItems: validation.visibleItems,
      hiddenMenuItems: validation.hiddenItems,
      suggestedAction: suggestAction(emotion),
      currentEmotion: emotion,
    });

    // Dispatch event for LivingAtmosphereWrapper and other listeners
    window.dispatchEvent(
      new CustomEvent('mood-adaptive-ui-change', {
        detail: { uiMode: mode, emotion, stressLevel },
      })
    );
  }, []);

  // Fetch initial ECN state
  useEffect(() => {
    if (!user?.id) return;

    const fetchInitial = async () => {
      const { data } = await supabase
        .from('ecn_history')
        .select('primary_emotion, stress_level')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(1);

      if (data?.[0]) {
        updateFromECN(
          data[0].primary_emotion || 'neutral',
          data[0].stress_level || 0
        );
      }
    };

    fetchInitial();

    // Subscribe to real-time ECN changes
    const channel = supabase
      .channel(channelNameRef.current)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ecn_history',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          updateFromECN(
            newRow.primary_emotion || 'neutral',
            newRow.stress_level || 0
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, updateFromECN]);

  return state;
}

export default useMoodAdaptiveUI;
