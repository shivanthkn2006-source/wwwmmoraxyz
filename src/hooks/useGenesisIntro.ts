// ═══════════════════════════════════════════════════════════════════════════════
// USE GENESIS INTRO HOOK - First-Time User Detection & Cinematic Trigger
// Checks onboarding_progress for first-time users to trigger Genesis Trailer
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface GenesisIntroState {
  showGenesis: boolean;
  isLoading: boolean;
  isFirstTimeUser: boolean;
  selectedAvatar: string | null;
  hasCompletedGenesis: boolean;
}

interface UseGenesisIntroReturn extends GenesisIntroState {
  completeGenesis: (selectedAvatar?: string) => Promise<void>;
  skipGenesis: () => Promise<void>;
  resetGenesis: () => Promise<void>;
}

const GENESIS_STORAGE_KEY = 'genesis_intro_completed';
const AVATAR_STORAGE_KEY = 'genesis_selected_avatar';

export const useGenesisIntro = (): UseGenesisIntroReturn => {
  const { user } = useAuth();
  const [state, setState] = useState<GenesisIntroState>({
    showGenesis: false,
    isLoading: true,
    isFirstTimeUser: false,
    selectedAvatar: null,
    hasCompletedGenesis: false,
  });

  // Check if user is first-time and should see Genesis intro
  useEffect(() => {
    const checkFirstTimeUser = async () => {
      if (!user) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        // Check localStorage first for quick detection
        const localCompleted = localStorage.getItem(`${GENESIS_STORAGE_KEY}_${user.id}`);
        const localAvatar = localStorage.getItem(`${AVATAR_STORAGE_KEY}_${user.id}`);
        
        if (localCompleted === 'true') {
          setState({
            showGenesis: false,
            isLoading: false,
            isFirstTimeUser: false,
            selectedAvatar: localAvatar,
            hasCompletedGenesis: true,
          });
          return;
        }

        // Check database for onboarding progress
        const { data: onboarding, error } = await supabase
          .from('onboarding_progress')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('[GenesisIntro] Error checking onboarding:', error);
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        // Also check user_sessions for first session
        const { data: sessions, error: sessionsError } = await supabase
          .from('user_sessions')
          .select('id')
          .eq('user_id', user.id)
          .order('started_at', { ascending: true })
          .limit(2);

        const isVeryFirstSession = !sessionsError && sessions && sessions.length <= 1;

        // Check profile for avatar selection
        const { data: avatarProfile } = await supabase
          .from('zoe_avatar_profiles')
          .select('avatar_type')
          .eq('user_id', user.id)
          .maybeSingle();

        // User should see Genesis if:
        // 1. No onboarding record exists, OR
        // 2. Onboarding not completed AND not skipped, AND
        // 3. This is their first/second session
        const shouldShowGenesis = (
          !onboarding || 
          (!onboarding.completed && !onboarding.skipped && isVeryFirstSession)
        );

        // Check if they have a completed_steps array that includes genesis
        const genesisCompleted = onboarding?.completed_steps && 
          Array.isArray(onboarding.completed_steps) && 
          onboarding.completed_steps.includes('genesis_intro');

        setState({
          showGenesis: shouldShowGenesis && !genesisCompleted,
          isLoading: false,
          isFirstTimeUser: !onboarding,
          selectedAvatar: avatarProfile?.avatar_type || localAvatar,
          hasCompletedGenesis: !!genesisCompleted,
        });

      } catch (err) {
        console.error('[GenesisIntro] Check failed:', err);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkFirstTimeUser();
  }, [user]);

  // Complete the Genesis intro
  const completeGenesis = useCallback(async (selectedAvatar?: string) => {
    if (!user) return;

    try {
      // Store in localStorage
      localStorage.setItem(`${GENESIS_STORAGE_KEY}_${user.id}`, 'true');
      if (selectedAvatar) {
        localStorage.setItem(`${AVATAR_STORAGE_KEY}_${user.id}`, selectedAvatar);
      }

      // Update onboarding_progress
      const { data: existing } = await supabase
        .from('onboarding_progress')
        .select('id, completed_steps')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const currentSteps = Array.isArray(existing.completed_steps) 
          ? existing.completed_steps 
          : [];
        
        await supabase
          .from('onboarding_progress')
          .update({
            completed_steps: [...currentSteps, 'genesis_intro'],
            current_step: 1,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('onboarding_progress')
          .insert({
            user_id: user.id,
            current_step: 1,
            completed_steps: ['genesis_intro'],
          });
      }

      // Store avatar selection if provided
      if (selectedAvatar) {
        const { data: existingAvatar } = await supabase
          .from('zoe_avatar_profiles')
          .select('id')
          .eq('user_id', user.id)
          .eq('avatar_type', 'genesis_selection')
          .maybeSingle();

        if (!existingAvatar) {
          await supabase
            .from('zoe_avatar_profiles')
            .insert({
              user_id: user.id,
              avatar_name: selectedAvatar,
              avatar_type: 'genesis_selection',
              avatar_data: {
                selected_at: new Date().toISOString(),
                vessel: selectedAvatar,
              },
            });
        }
      }

      // Log to behavioral events
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'genesis_intro_completed',
        event_category: 'onboarding',
        metadata: {
          selected_avatar: selectedAvatar,
          completed_at: new Date().toISOString(),
        },
      });

      setState(prev => ({
        ...prev,
        showGenesis: false,
        selectedAvatar: selectedAvatar || prev.selectedAvatar,
        hasCompletedGenesis: true,
      }));

    } catch (err) {
      console.error('[GenesisIntro] Complete failed:', err);
    }
  }, [user]);

  // Skip the Genesis intro
  const skipGenesis = useCallback(async () => {
    if (!user) return;

    try {
      localStorage.setItem(`${GENESIS_STORAGE_KEY}_${user.id}`, 'true');

      await supabase
        .from('onboarding_progress')
        .upsert({
          user_id: user.id,
          skipped: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      // Log skip event
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'genesis_intro_skipped',
        event_category: 'onboarding',
        metadata: { skipped_at: new Date().toISOString() },
      });

      setState(prev => ({
        ...prev,
        showGenesis: false,
        hasCompletedGenesis: true,
      }));

    } catch (err) {
      console.error('[GenesisIntro] Skip failed:', err);
    }
  }, [user]);

  // Reset Genesis (for testing/debugging)
  const resetGenesis = useCallback(async () => {
    if (!user) return;

    try {
      localStorage.removeItem(`${GENESIS_STORAGE_KEY}_${user.id}`);
      localStorage.removeItem(`${AVATAR_STORAGE_KEY}_${user.id}`);

      await supabase
        .from('onboarding_progress')
        .update({
          completed: false,
          skipped: false,
          completed_steps: [],
          current_step: 0,
        })
        .eq('user_id', user.id);

      setState({
        showGenesis: true,
        isLoading: false,
        isFirstTimeUser: true,
        selectedAvatar: null,
        hasCompletedGenesis: false,
      });

    } catch (err) {
      console.error('[GenesisIntro] Reset failed:', err);
    }
  }, [user]);

  return {
    ...state,
    completeGenesis,
    skipGenesis,
    resetGenesis,
  };
};

export default useGenesisIntro;
