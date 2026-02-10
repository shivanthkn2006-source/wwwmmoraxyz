import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export type AccessMethod = 'search' | 'direct' | 'voice' | 'onboarding';

export const useFeatureAnalytics = () => {
  const { user } = useAuth();

  const trackFeatureAccess = useCallback(async (
    featureId: string,
    featureName: string,
    accessMethod: AccessMethod,
    location?: string
  ) => {
    if (!user) return;

    try {
      // Get user's city from profile if available
      const { data: profile } = await supabase
        .from('profiles')
        .select('city')
        .eq('user_id', user.id)
        .single();

      await supabase
        .from('feature_analytics')
        .insert({
          user_id: user.id,
          feature_id: featureId,
          feature_name: featureName,
          access_method: accessMethod,
          location: location || profile?.city || null,
          city: profile?.city || null
        });
    } catch (error) {
      console.error('Error tracking feature access:', error);
    }
  }, [user]);

  const getFeatureStats = useCallback(async () => {
    if (!user) return null;

    try {
      // Get total feature usage
      const { data: totalUsage, error: totalError } = await supabase
        .from('feature_analytics')
        .select('id')
        .eq('user_id', user.id);

      if (totalError) throw totalError;

      // Get usage by access method
      const { data: byMethod, error: methodError } = await supabase
        .from('feature_analytics')
        .select('access_method')
        .eq('user_id', user.id);

      if (methodError) throw methodError;

      // Count by method
      const methodCounts = byMethod.reduce((acc: any, item: any) => {
        acc[item.access_method] = (acc[item.access_method] || 0) + 1;
        return acc;
      }, {});

      // Get most used features
      const { data: features, error: featuresError } = await supabase
        .from('feature_analytics')
        .select('feature_name, feature_id')
        .eq('user_id', user.id);

      if (featuresError) throw featuresError;

      const featureCounts = features.reduce((acc: any, item: any) => {
        const key = item.feature_id;
        if (!acc[key]) {
          acc[key] = { name: item.feature_name, count: 0 };
        }
        acc[key].count++;
        return acc;
      }, {});

      const topFeatures = Object.entries(featureCounts)
        .map(([id, data]: [string, any]) => ({ id, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Get usage by location
      const { data: byLocation, error: locationError } = await supabase
        .from('feature_analytics')
        .select('city, feature_name')
        .eq('user_id', user.id)
        .not('city', 'is', null);

      if (locationError) throw locationError;

      const locationStats = byLocation.reduce((acc: any, item: any) => {
        if (!acc[item.city]) {
          acc[item.city] = {};
        }
        acc[item.city][item.feature_name] = (acc[item.city][item.feature_name] || 0) + 1;
        return acc;
      }, {});

      return {
        totalUsage: totalUsage.length,
        byMethod: methodCounts,
        topFeatures,
        locationStats
      };
    } catch (error) {
      console.error('Error fetching feature stats:', error);
      return null;
    }
  }, [user]);

  return {
    trackFeatureAccess,
    getFeatureStats
  };
};
