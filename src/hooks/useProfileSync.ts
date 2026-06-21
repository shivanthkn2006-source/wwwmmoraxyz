import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

/**
 * Hook for profile synchronization with real-time updates
 * Phase 5: Database Synchronization - Profile Sync
 */
export const useProfileSync = () => {
  const { user } = useAuth();

  /**
   * Dispatch a profile-updated event to trigger UI refreshes
   */
  const dispatchProfileUpdate = useCallback(() => {
    window.dispatchEvent(new CustomEvent('profile-updated', {
      detail: { userId: user?.id, timestamp: Date.now() }
    }));
  }, [user?.id]);

  /**
   * Update profile field with automatic sync dispatch
   */
  const updateProfileField = useCallback(async (
    field: string, 
    value: any
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      toast.error('Please log in to update your profile');
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ [field]: value })
        .eq('user_id', user.id);

      if (error) {
        console.error(`[ProfileSync] Error updating ${field}:`, error);
        toast.error(`Failed to update ${field}: ${error.message}`);
        return { success: false, error: error.message };
      }

      // Dispatch profile update event for all listeners
      dispatchProfileUpdate();
      
      return { success: true };
    } catch (err: any) {
      console.error(`[ProfileSync] Unexpected error updating ${field}:`, err);
      toast.error(`Failed to update ${field}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }, [user?.id, dispatchProfileUpdate]);

  /**
   * Update multiple profile fields at once
   */
  const updateProfileFields = useCallback(async (
    fields: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      toast.error('Please log in to update your profile');
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update(fields)
        .eq('user_id', user.id);

      if (error) {
        console.error('[ProfileSync] Error updating profile:', error);
        toast.error(`Failed to update profile: ${error.message}`);
        return { success: false, error: error.message };
      }

      // Dispatch profile update event
      dispatchProfileUpdate();
      
      return { success: true };
    } catch (err: any) {
      console.error('[ProfileSync] Unexpected error updating profile:', err);
      toast.error(`Failed to update profile: ${err.message}`);
      return { success: false, error: err.message };
    }
  }, [user?.id, dispatchProfileUpdate]);

  /**
   * Force refresh profile data by dispatching update event
   */
  const forceProfileRefresh = useCallback(() => {
    dispatchProfileUpdate();
  }, [dispatchProfileUpdate]);

  return {
    updateProfileField,
    updateProfileFields,
    forceProfileRefresh,
    dispatchProfileUpdate,
  };
};
