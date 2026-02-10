import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

/**
 * Hook to sync Zoe's state across the entire user session
 * From sign-in to sign-out, maintains context and continuity
 */
export const useZoeSessionSync = () => {
  const { user } = useAuth();
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastInteractionRef = useRef<Date>(new Date());

  useEffect(() => {
    if (!user) return;

    // Initial sync on mount
    syncSession();

    // Sync every 30 seconds
    syncIntervalRef.current = setInterval(syncSession, 30000);

    // Sync on user interactions
    const handleInteraction = () => {
      lastInteractionRef.current = new Date();
      syncSession();
    };

    window.addEventListener('zoe-command', handleInteraction);
    window.addEventListener('zoe-response', handleInteraction);

    // Sync on page visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        syncSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Sync on before unload
    const handleBeforeUnload = () => {
      syncSession();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      window.removeEventListener('zoe-command', handleInteraction);
      window.removeEventListener('zoe-response', handleInteraction);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  const syncSession = async () => {
    if (!user) return;

    try {
      // Update last interaction timestamp (use onConflict to avoid duplicate key errors)
      await supabase
        .from('zoe_emotional_state')
        .upsert({
          user_id: user.id,
          last_interaction: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      // Track session duration in learning preferences (use onConflict to avoid duplicate key errors)
      await supabase
        .from('zoe_learning_preferences')
        .upsert({
          user_id: user.id,
          last_learning_update: new Date().toISOString()
        }, { onConflict: 'user_id' });

    } catch (error) {
      console.error('Error syncing Zoe session:', error);
    }
  };

  return {
    syncSession,
    lastInteraction: lastInteractionRef.current
  };
};
