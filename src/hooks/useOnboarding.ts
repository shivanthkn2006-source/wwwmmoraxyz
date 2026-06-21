import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export const useOnboarding = () => {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOnboardingProgress = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if onboarding was shown today
      const lastShownDate = localStorage.getItem(`onboarding_shown_${user.id}`);
      const today = new Date().toDateString();
      
      if (lastShownDate === today) {
        setLoading(false);
        return; // Already shown today
      }

      try {
        const { data: progress } = await supabase
          .from('onboarding_progress')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!progress) {
          // New user - show onboarding
          setShowOnboarding(true);
          setCurrentStep(0);
          setCompletedSteps([]);
          
          // Create initial progress
          await supabase
            .from('onboarding_progress')
            .insert({
              user_id: user.id,
              current_step: 0,
              completed_steps: []
            });
          
          // Mark as shown today
          localStorage.setItem(`onboarding_shown_${user.id}`, today);
        } else if (!progress.completed && !progress.skipped) {
          // User hasn't completed onboarding - show again
          setShowOnboarding(true);
          setCurrentStep(progress.current_step);
          const steps = Array.isArray(progress.completed_steps) 
            ? (progress.completed_steps as number[])
            : [];
          setCompletedSteps(steps);
          
          // Mark as shown today
          localStorage.setItem(`onboarding_shown_${user.id}`, today);
        }
      } catch (error) {
        console.error('Error loading onboarding progress:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOnboardingProgress();
  }, [user]);

  const completeStep = useCallback(async (step: number) => {
    if (!user) return;

    const newCompletedSteps = [...completedSteps, step];
    setCompletedSteps(newCompletedSteps);

    try {
      await supabase
        .from('onboarding_progress')
        .update({
          completed_steps: newCompletedSteps,
          current_step: step + 1
        })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error updating onboarding step:', error);
    }
  }, [user, completedSteps]);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => prev + 1);
  }, []);

  const previousStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  const skipOnboarding = useCallback(async () => {
    if (!user) return;

    setShowOnboarding(false);
    
    try {
      await supabase
        .from('onboarding_progress')
        .update({ skipped: true })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    }
  }, [user]);

  const completeOnboarding = useCallback(async () => {
    if (!user) return;

    setShowOnboarding(false);
    
    try {
      await supabase
        .from('onboarding_progress')
        .update({ completed: true })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }, [user]);

  const restartOnboarding = useCallback(async () => {
    if (!user) return;

    setShowOnboarding(true);
    setCurrentStep(0);
    setCompletedSteps([]);
    
    try {
      await supabase
        .from('onboarding_progress')
        .update({
          current_step: 0,
          completed_steps: [],
          completed: false,
          skipped: false
        })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error restarting onboarding:', error);
    }
  }, [user]);

  return {
    showOnboarding,
    currentStep,
    completedSteps,
    loading,
    completeStep,
    nextStep,
    previousStep,
    skipOnboarding,
    completeOnboarding,
    restartOnboarding
  };
};
