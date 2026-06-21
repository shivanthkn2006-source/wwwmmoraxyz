import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTutorial = () => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkTutorialStatus();
  }, []);

  const checkTutorialStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsChecking(false);
        return;
      }

      // Check if tutorial was shown today
      const lastShownDate = localStorage.getItem(`tutorial_shown_${user.id}`);
      const today = new Date().toDateString();
      
      if (lastShownDate === today) {
        setIsChecking(false);
        return; // Already shown today
      }

      const { data: progress } = await supabase
        .from('tutorial_progress')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Show tutorial if no progress exists or if not completed/skipped
      if (!progress || (!progress.completed && !progress.skipped)) {
        setShowTutorial(true);
        // Mark as shown today
        localStorage.setItem(`tutorial_shown_${user.id}`, today);
      }
    } catch (error) {
      console.error('Error checking tutorial status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const restartTutorial = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('tutorial_progress')
          .delete()
          .eq('user_id', user.id);
        
        setShowTutorial(true);
      }
    } catch (error) {
      console.error('Error restarting tutorial:', error);
    }
  };

  const completeTutorial = () => {
    setShowTutorial(false);
  };

  const skipTutorial = () => {
    setShowTutorial(false);
  };

  return {
    showTutorial,
    isChecking,
    completeTutorial,
    skipTutorial,
    restartTutorial
  };
};
