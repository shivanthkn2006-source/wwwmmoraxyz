import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type FeatureType = 'architect' | 'timeline_search' | 'dreams' | 'video' | 'multiagent' | 'api';

export interface TierLimit {
  allowed: boolean;
  remaining: number;
  tier: string;
  is_premium: boolean;
}

export const useTierLimits = () => {
  const { toast } = useToast();
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [currentTier, setCurrentTier] = useState<string>('free');

  useEffect(() => {
    checkPremiumStatus();
  }, []);

  const checkPremiumStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', user.id)
      .single();

    if (profile?.username === 'moksh50' || profile?.username === 'Justmkbhd') {
      setIsPremiumUser(true);
      setCurrentTier('unlimited');
    }
  };

  const checkFeatureLimit = async (feature: FeatureType): Promise<TierLimit> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { allowed: false, remaining: 0, tier: 'free', is_premium: false };
    }

    const { data, error } = await supabase.rpc('check_feature_limit', {
      p_user_id: user.id,
      p_feature: feature
    });

    if (error || !data) {
      console.error('Error checking feature limit:', error);
      return { allowed: false, remaining: 0, tier: 'free', is_premium: false };
    }

    const result = data as unknown as TierLimit;
    return result;
  };

  const incrementFeatureUsage = async (feature: FeatureType): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.rpc('increment_feature_usage', {
      p_user_id: user.id,
      p_feature: feature
    });

    if (error) {
      console.error('Error incrementing feature usage:', error);
    }
  };

  const showUpgradePrompt = (feature: string, tier: string) => {
    const tierMessages: Record<string, string> = {
      'architect': 'Upgrade to Zoe Pro for unlimited Architect projects with full multi-agent planning',
      'timeline_search': 'Upgrade to Zoe Pro for unlimited Timeline searches and predictive scenarios',
      'dreams': 'Upgrade to Zoe Pro for advanced dream pattern analysis and 12-month forecasts',
      'video': 'Upgrade to Zoe Pro for 4K video creation with AI narration',
      'multiagent': 'Upgrade to Enterprise for unlimited multi-agent executions and private deployments',
      'api': 'Upgrade to Developer Edition for higher API rate limits and dedicated support'
    };

    toast({
      title: `${tier === 'free' ? 'Free Tier' : tier} Limit Reached`,
      description: tierMessages[feature] || 'Upgrade to unlock this feature',
      variant: 'destructive',
    });
  };

  return {
    isPremiumUser,
    currentTier,
    checkFeatureLimit,
    incrementFeatureUsage,
    showUpgradePrompt,
  };
};
