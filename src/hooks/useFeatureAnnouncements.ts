import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface FeatureAnnouncement {
  id: string;
  user_id: string;
  feature_id: string;
  feature_name: string;
  announced_at: string;
}

export const useFeatureAnnouncements = () => {
  const { user } = useAuth();
  const [announcedFeatures, setAnnouncedFeatures] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Load user's announced features
  useEffect(() => {
    const loadAnnouncedFeatures = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('feature_announcements')
          .select('feature_id')
          .eq('user_id', user.id);

        if (error) throw error;

        const featureIds = new Set(data?.map(item => item.feature_id) || []);
        setAnnouncedFeatures(featureIds);
      } catch (error) {
        console.error('Error loading announced features:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnnouncedFeatures();
  }, [user]);

  // Check if a feature has been announced
  const hasBeenAnnounced = useCallback((featureId: string): boolean => {
    return announcedFeatures.has(featureId);
  }, [announcedFeatures]);

  // Mark a feature as announced
  const markAsAnnounced = useCallback(async (featureId: string, featureName: string): Promise<boolean> => {
    if (!user || announcedFeatures.has(featureId)) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('feature_announcements')
        .insert({
          user_id: user.id,
          feature_id: featureId,
          feature_name: featureName
        });

      if (error) throw error;

      setAnnouncedFeatures(prev => new Set([...prev, featureId]));
      return true;
    } catch (error) {
      console.error('Error marking feature as announced:', error);
      return false;
    }
  }, [user, announcedFeatures]);

  // Trigger feature announcement
  const announceFeature = useCallback(async (
    featureId: string,
    featureName: string,
    announcementText: string
  ): Promise<void> => {
    if (!user || isLoading || hasBeenAnnounced(featureId)) {
      return;
    }

    // Dispatch custom event for Lisa to handle
    const event = new CustomEvent('feature-announcement', {
      detail: {
        featureId,
        featureName,
        announcementText
      }
    });
    window.dispatchEvent(event);

    // Mark as announced
    await markAsAnnounced(featureId, featureName);
  }, [user, isLoading, hasBeenAnnounced, markAsAnnounced]);

  return {
    announcedFeatures,
    isLoading,
    hasBeenAnnounced,
    markAsAnnounced,
    announceFeature
  };
};