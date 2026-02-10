import { supabase } from '@/integrations/supabase/client';

/**
 * Track direct navigation to features (not via search or voice)
 */
export const trackDirectNavigation = async (
  userId: string | undefined,
  featureId: string,
  featureName: string,
  city?: string | null
) => {
  if (!userId) return;

  try {
    await supabase.from('feature_analytics').insert({
      user_id: userId,
      feature_id: featureId,
      feature_name: featureName,
      access_method: 'direct',
      city: city || null
    });
  } catch (error) {
    console.error('Error tracking direct navigation:', error);
  }
};
