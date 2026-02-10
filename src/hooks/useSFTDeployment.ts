// ═══════════════════════════════════════════════════════════════════════════════
// SFT DEPLOYMENT HOOK - Manages Supervised Fine-Tuning deployment status
// Triggers Core Unification Ceremony upon model deployment
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface SFTStatus {
  isReady: boolean;
  isQueued: boolean;
  isDeployed: boolean;
  eventCount: number;
  qualityScore: number;
  status: 'none' | 'queued' | 'processing' | 'deployed' | 'failed';
  deployedAt?: string;
}

interface ConsciousnessTier {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  label: string;
  color: string;
  unlockedFeatures: string[];
}

const CONSCIOUSNESS_TIERS: Record<string, ConsciousnessTier> = {
  bronze: {
    tier: 'bronze',
    label: 'Bronze',
    color: 'from-amber-600 to-amber-800',
    unlockedFeatures: ['Basic AI Chat', 'Voice Commands'],
  },
  silver: {
    tier: 'silver',
    label: 'Silver',
    color: 'from-gray-400 to-gray-600',
    unlockedFeatures: ['Advanced Analytics', 'DHF Stack Access'],
  },
  gold: {
    tier: 'gold',
    label: 'Gold',
    color: 'from-yellow-500 to-amber-600',
    unlockedFeatures: ['VETO System', 'Proactive Suggestions'],
  },
  platinum: {
    tier: 'platinum',
    label: 'Platinum',
    color: 'from-cyan-400 to-blue-500',
    unlockedFeatures: ['Dreams AI', 'Predictive Intelligence'],
  },
  diamond: {
    tier: 'diamond',
    label: 'Diamond',
    color: 'from-purple-400 via-pink-500 to-yellow-400',
    unlockedFeatures: ['Personalized SFT Model', 'Unlimited API', 'Full DHF Autonomy'],
  },
};

export interface UseSFTDeploymentReturn {
  sftStatus: SFTStatus;
  consciousnessTier: ConsciousnessTier;
  isUnificationComplete: boolean;
  showCeremony: boolean;
  setShowCeremony: (show: boolean) => void;
  checkSFTStatus: () => Promise<void>;
  triggerDeployment: () => Promise<boolean>;
  completeUnification: () => Promise<void>;
  getTierProgress: () => { current: string; next: string | null; progress: number };
}

export const useSFTDeployment = (): UseSFTDeploymentReturn => {
  const { user } = useAuth();
  const [sftStatus, setSFTStatus] = useState<SFTStatus>({
    isReady: false,
    isQueued: false,
    isDeployed: false,
    eventCount: 0,
    qualityScore: 0,
    status: 'none',
  });
  const [consciousnessTier, setConsciousnessTier] = useState<ConsciousnessTier>(CONSCIOUSNESS_TIERS.bronze);
  const [isUnificationComplete, setIsUnificationComplete] = useState(false);
  const [showCeremony, setShowCeremony] = useState(false);

  const checkSFTStatus = useCallback(async () => {
    if (!user) return;

    try {
      // Check zoe_settings for finetuning_ready
      const { data: settings } = await supabase
        .from('zoe_settings')
        .select('finetuning_ready, event_count')
        .eq('user_id', user.id)
        .single();

      // Check sft_deployment_queue for status
      const { data: queue } = await supabase
        .from('sft_deployment_queue')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Check profile for consciousness tier
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const eventCount = settings?.event_count || 0;
      const isReady = settings?.finetuning_ready || false;

      let status: SFTStatus['status'] = 'none';
      let deployedAt: string | undefined;

      if (queue) {
        status = (queue as any).status as SFTStatus['status'];
        deployedAt = (queue as any).deployed_at;
      } else if (isReady) {
        status = 'queued';
      }

      setSFTStatus({
        isReady,
        isQueued: status === 'queued',
        isDeployed: status === 'deployed',
        eventCount,
        qualityScore: queue?.data_quality_score || 0.85,
        status,
        deployedAt,
      });

      // Set consciousness tier
      const tierKey = (profile as any)?.consciousness_tier || 'bronze';
      setConsciousnessTier(CONSCIOUSNESS_TIERS[tierKey] || CONSCIOUSNESS_TIERS.bronze);
      setIsUnificationComplete((profile as any)?.core_unification_complete || false);

      // Show ceremony if just deployed
      if (status === 'deployed' && !(profile as any)?.core_unification_complete) {
        setShowCeremony(true);
      }
    } catch (err) {
      console.error('Failed to check SFT status:', err);
    }
  }, [user]);

  // Initial check
  useEffect(() => {
    checkSFTStatus();
  }, [checkSFTStatus]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('sft-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sft_deployment_queue',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('SFT status change:', payload);
          checkSFTStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, checkSFTStatus]);

  const triggerDeployment = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      // Insert into queue if not already there
      const { error } = await supabase
        .from('sft_deployment_queue')
        .upsert({
          user_id: user.id,
          event_count: sftStatus.eventCount,
          status: 'processing',
          processing_started_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      toast.success('SFT Deployment Started', {
        description: 'Your personalized model is being trained.',
      });

      // Simulate deployment (in production, this would be a backend job)
      setTimeout(async () => {
        await supabase
          .from('sft_deployment_queue')
          .update({
            status: 'deployed',
            deployed_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      }, 5000);

      return true;
    } catch (err) {
      console.error('Failed to trigger deployment:', err);
      toast.error('Deployment failed');
      return false;
    }
  }, [user, sftStatus.eventCount]);

  const completeUnification = useCallback(async () => {
    if (!user) return;

    try {
      // Update profile directly since RPC may not exist yet
      await supabase
        .from('profiles')
        .update({ current_tier: 'diamond' } as any)
        .eq('user_id', user.id);

      setIsUnificationComplete(true);
      setConsciousnessTier(CONSCIOUSNESS_TIERS.diamond);
      setShowCeremony(false);

      toast.success('Diamond Tier Activated!', {
        description: 'Welcome to the highest intelligence tier.',
      });
    } catch (err) {
      console.error('Failed to complete unification:', err);
    }
  }, [user]);

  const getTierProgress = useCallback(() => {
    const tiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const currentIndex = tiers.indexOf(consciousnessTier.tier);
    const eventThresholds = [0, 1000, 3000, 7000, 10000];

    const current = consciousnessTier.tier;
    const next = currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;

    const currentThreshold = eventThresholds[currentIndex];
    const nextThreshold = eventThresholds[currentIndex + 1] || eventThresholds[currentIndex];
    const progress = Math.min(100, ((sftStatus.eventCount - currentThreshold) / (nextThreshold - currentThreshold)) * 100);

    return { current, next, progress: Math.max(0, progress) };
  }, [consciousnessTier, sftStatus.eventCount]);

  return {
    sftStatus,
    consciousnessTier,
    isUnificationComplete,
    showCeremony,
    setShowCeremony,
    checkSFTStatus,
    triggerDeployment,
    completeUnification,
    getTierProgress,
  };
};

export default useSFTDeployment;
