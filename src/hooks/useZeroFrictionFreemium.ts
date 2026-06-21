// ═══════════════════════════════════════════════════════════════════════════════
// ZERO-FRICTION FREEMIUM TIER HOOK
// Growth Layer 1: Immediate value before philosophical commitment
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export type FreemiumTier = 'free' | 'trial' | 'premium' | 'enterprise';

export type FreeTierFeature = 
  | 'solar_system' 
  | 'basic_chat' 
  | 'basic_voice' 
  | 'timeline_view'
  | 'loops_view';

export type PremiumFeature = 
  | 'universal_architect' 
  | 'raa_debugger' 
  | 'dhf_visualization'
  | 'dreams_ai'
  | 'multiagent'
  | 'advanced_voice'
  | 'mind_merge';

export interface FreemiumAccess {
  access_granted: boolean;
  tier: FreemiumTier;
  reason: string;
  gate_type?: 'break_the_ice' | 'trial_offer' | 'upgrade';
  engagement_score?: number;
  show_trial_offer?: boolean;
  trial_ends?: string;
}

export interface TrialInfo {
  feature: string;
  trialEnd: Date;
  daysRemaining: number;
  isActive: boolean;
}

export const useZeroFrictionFreemium = () => {
  const { user } = useAuth();
  const [currentTier, setCurrentTier] = useState<FreemiumTier>('free');
  const [engagementScore, setEngagementScore] = useState(0);
  const [activeTrial, setActiveTrial] = useState<TrialInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Free tier features that are always accessible
  const FREE_TIER_FEATURES: FreeTierFeature[] = [
    'solar_system',
    'basic_chat',
    'basic_voice',
    'timeline_view',
    'loops_view'
  ];

  // Premium features that require Break the Ice gate
  const PREMIUM_FEATURES: PremiumFeature[] = [
    'universal_architect',
    'raa_debugger',
    'dhf_visualization',
    'dreams_ai',
    'multiagent',
    'advanced_voice',
    'mind_merge'
  ];

  // Check if feature is free tier
  const isFreeTierFeature = useCallback((feature: string): boolean => {
    return FREE_TIER_FEATURES.includes(feature as FreeTierFeature);
  }, []);

  // Check user's engagement score
  const checkEngagementScore = useCallback(async () => {
    if (!user) return 0;
    
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('behavioral_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo);
      
      const score = count || 0;
      setEngagementScore(score);
      return score;
    } catch (error) {
      console.error('Error checking engagement:', error);
      return 0;
    }
  }, [user]);

  // Check active trial
  const checkActiveTrial = useCallback(async () => {
    if (!user) return null;
    
    try {
      const { data, error } = await (supabase as any)
        .from('trial_access')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gt('trial_end', new Date().toISOString())
        .maybeSingle();
      
      if (error || !data) {
        setActiveTrial(null);
        return null;
      }
      
      const trialEnd = new Date(data.trial_end);
      const daysRemaining = Math.ceil((trialEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      
      const trialInfo: TrialInfo = {
        feature: data.feature,
        trialEnd,
        daysRemaining,
        isActive: true
      };
      
      setActiveTrial(trialInfo);
      return trialInfo;
    } catch (error) {
      console.error('Error checking trial:', error);
      return null;
    }
  }, [user]);

  // Check feature access
  const checkFeatureAccess = useCallback(async (feature: string): Promise<FreemiumAccess> => {
    if (!user) {
      return {
        access_granted: isFreeTierFeature(feature),
        tier: 'free',
        reason: isFreeTierFeature(feature) ? 'Free tier feature' : 'Login required'
      };
    }

    setIsChecking(true);
    
    try {
      // Check if premium user (moksh50, Justmkbhd)
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (profile?.username && ['moksh50', 'Justmkbhd'].includes(profile.username)) {
        setCurrentTier('premium');
        return {
          access_granted: true,
          tier: 'premium',
          reason: 'Premium user - unlimited access'
        };
      }
      
      // Free tier features always accessible
      if (isFreeTierFeature(feature)) {
        return {
          access_granted: true,
          tier: 'free',
          reason: 'Free tier feature'
        };
      }
      
      // Check for active trial
      const trial = await checkActiveTrial();
      if (trial && trial.feature === feature) {
        setCurrentTier('trial');
        return {
          access_granted: true,
          tier: 'trial',
          trial_ends: trial.trialEnd.toISOString(),
          reason: `Trial active - ${trial.daysRemaining} days remaining`
        };
      }
      
      // Check engagement for progressive nudges
      const engagement = await checkEngagementScore();
      
      // Premium feature - show gate
      return {
        access_granted: false,
        tier: 'free',
        gate_type: engagement > 50 ? 'trial_offer' : 'break_the_ice',
        engagement_score: engagement,
        show_trial_offer: engagement > 50,
        reason: 'Premium feature - upgrade required'
      };
    } catch (error) {
      console.error('Error checking access:', error);
      return {
        access_granted: isFreeTierFeature(feature),
        tier: 'free',
        reason: 'Error checking access'
      };
    } finally {
      setIsChecking(false);
    }
  }, [user, isFreeTierFeature, checkActiveTrial, checkEngagementScore]);

  // Start a trial
  const startTrial = useCallback(async (feature: PremiumFeature, days: number = 7): Promise<boolean> => {
    if (!user) {
      toast.error('Please log in to start a trial');
      return false;
    }
    
    try {
      const trialEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      
      const { error } = await (supabase as any)
        .from('trial_access')
        .upsert({
          user_id: user.id,
          feature,
          trial_end: trialEnd.toISOString(),
          is_active: true
        }, { onConflict: 'user_id' });
      
      if (error) throw error;
      
      // Log conversion event
      await (supabase as any).from('conversion_events').insert({
        user_id: user.id,
        from_tier: 'free',
        to_tier: 'trial',
        trigger_type: 'trial_start',
        trigger_feature: feature
      });
      
      // Update ZSMT
      await (supabase as any).from('zoe_sovereign_memory').insert({
        user_id: user.id,
        event_type: 'trial_started',
        content_text: `${days}-day trial started for ${feature}`,
        freemium_tier: 'trial',
        conversion_trigger_type: 'trial_start'
      });
      
      setCurrentTier('trial');
      setActiveTrial({
        feature,
        trialEnd,
        daysRemaining: days,
        isActive: true
      });
      
      toast.success(`${days}-Day Trial Activated!`, {
        description: `You now have full access to ${feature.replace(/_/g, ' ')}`,
        icon: '🎉'
      });
      
      return true;
    } catch (error) {
      console.error('Error starting trial:', error);
      toast.error('Failed to start trial');
      return false;
    }
  }, [user]);

  // Show progressive engagement nudge
  const showProgressiveNudge = useCallback((feature: string) => {
    if (engagementScore > 10 && engagementScore <= 50) {
      toast('You\'re making great progress!', {
        description: `Complete ${50 - engagementScore} more actions to unlock a free trial`,
        icon: '📈',
        duration: 5000
      });
    } else if (engagementScore > 50) {
      toast('You\'re ready for the full experience!', {
        description: 'Unlock the Mind Merge Protocol to activate deeper reasoning',
        icon: '🧠',
        action: {
          label: 'Start Trial',
          onClick: () => startTrial(feature as PremiumFeature)
        },
        duration: 8000
      });
    }
  }, [engagementScore, startTrial]);

  // Track feature gate hit
  const trackFeatureGate = useCallback(async (feature: string) => {
    if (!user) return;
    
    try {
      await (supabase as any).from('zoe_sovereign_memory').insert({
        user_id: user.id,
        event_type: 'feature_gate_hit',
        content_text: `User attempted to access ${feature} - conversion gate shown`,
        conversion_trigger_type: 'feature_gate'
      });
      
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'feature_gate_hit',
        event_category: 'conversion',
        context_snippet: feature,
        metadata: { feature, engagement_score: engagementScore }
      });
    } catch (error) {
      console.error('Error tracking gate:', error);
    }
  }, [user, engagementScore]);

  // Initialize
  useEffect(() => {
    if (user) {
      checkEngagementScore();
      checkActiveTrial();
    }
  }, [user, checkEngagementScore, checkActiveTrial]);

  return {
    currentTier,
    engagementScore,
    activeTrial,
    isChecking,
    isFreeTierFeature,
    checkFeatureAccess,
    startTrial,
    showProgressiveNudge,
    trackFeatureGate,
    FREE_TIER_FEATURES,
    PREMIUM_FEATURES
  };
};
