// ═══════════════════════════════════════════════════════════════════════════════
// ZOE CDSP PAYMENT RAILS - Commerce Integration Layer
// Part of Code Genesis Manifesto - Secure Payment Processing
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT RAILS TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type PaymentMethod = 'credits' | 'karma_points' | 'external' | 'trial';
export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
export type TransactionType = 
  | 'feature_unlock'
  | 'premium_access'
  | 'skill_purchase'
  | 'agent_deployment'
  | 'credit_topup'
  | 'karma_exchange';

interface PaymentTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  metadata: Record<string, any>;
  createdAt: string;
  completedAt?: string;
}

interface WalletBalance {
  credits: number;
  karmaPoints: number;
  pendingCredits: number;
  lifetimeSpent: number;
  lastTopUp?: string;
}

interface CDSPPaymentRailsState {
  isProcessing: boolean;
  wallet: WalletBalance | null;
  recentTransactions: PaymentTransaction[];
  lastError: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRICING CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const FEATURE_PRICING: Record<string, { credits: number; karmaEquivalent: number; name: string }> = {
  'dreams_analysis': { credits: 5, karmaEquivalent: 500, name: 'Dreams AI Analysis' },
  'timeline_search': { credits: 3, karmaEquivalent: 300, name: 'Timeline Deep Search' },
  'architect_project': { credits: 10, karmaEquivalent: 1000, name: 'Architect Project' },
  'video_creation': { credits: 15, karmaEquivalent: 1500, name: 'AI Video Creation' },
  'multiagent_task': { credits: 8, karmaEquivalent: 800, name: 'Multi-Agent Execution' },
  'skill_upload': { credits: 20, karmaEquivalent: 2000, name: 'Skill Upload & Merge' },
  'agent_deploy_hour': { credits: 2, karmaEquivalent: 200, name: 'Agent Deployment (1hr)' },
};

const KARMA_TO_CREDIT_RATE = 100; // 100 karma = 1 credit

// ═══════════════════════════════════════════════════════════════════════════════
// CDSP PAYMENT RAILS HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useCDSPPaymentRails = () => {
  const { user } = useAuth();
  const [state, setState] = useState<CDSPPaymentRailsState>({
    isProcessing: false,
    wallet: null,
    recentTransactions: [],
    lastError: null,
  });

  // ═══ FETCH WALLET BALANCE ═══
  const fetchWalletBalance = useCallback(async (): Promise<WalletBalance | null> => {
    if (!user) return null;

    try {
      // Get credits from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('user_id', user.id)
        .single();

      // Get karma from exodus_players
      const { data: player } = await supabase
        .from('exodus_players')
        .select('resonance_points')
        .eq('user_id', user.id)
        .single();

      // Calculate credits from total points
      const karmaPoints = player?.resonance_points || 0;
      const baseCredits = Math.floor((profile?.total_points || 0) / 1000);

      const wallet: WalletBalance = {
        credits: baseCredits,
        karmaPoints: karmaPoints,
        pendingCredits: 0,
        lifetimeSpent: 0,
      };

      setState(prev => ({ ...prev, wallet }));
      return wallet;

    } catch (error) {
      console.error('[CDSP-PaymentRails] Wallet fetch error:', error);
      return null;
    }
  }, [user]);

  // ═══ CHECK FEATURE AFFORDABILITY ═══
  const canAffordFeature = useCallback((featureKey: string): { 
    canAfford: boolean; 
    method: PaymentMethod; 
    cost: number;
    alternative?: { method: PaymentMethod; cost: number };
  } => {
    const pricing = FEATURE_PRICING[featureKey];
    if (!pricing || !state.wallet) {
      return { canAfford: false, method: 'credits', cost: 0 };
    }

    // Check credits first
    if (state.wallet.credits >= pricing.credits) {
      return { 
        canAfford: true, 
        method: 'credits', 
        cost: pricing.credits,
        alternative: state.wallet.karmaPoints >= pricing.karmaEquivalent 
          ? { method: 'karma_points', cost: pricing.karmaEquivalent }
          : undefined
      };
    }

    // Check karma as alternative
    if (state.wallet.karmaPoints >= pricing.karmaEquivalent) {
      return { 
        canAfford: true, 
        method: 'karma_points', 
        cost: pricing.karmaEquivalent 
      };
    }

    return { 
      canAfford: false, 
      method: 'credits', 
      cost: pricing.credits 
    };
  }, [state.wallet]);

  // ═══ PROCESS PAYMENT ═══
  const processPayment = useCallback(async (
    featureKey: string,
    paymentMethod: PaymentMethod = 'credits',
    metadata: Record<string, any> = {}
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const pricing = FEATURE_PRICING[featureKey];
    if (!pricing) {
      return { success: false, error: 'Unknown feature' };
    }

    setState(prev => ({ ...prev, isProcessing: true, lastError: null }));

    try {
      const affordability = canAffordFeature(featureKey);
      if (!affordability.canAfford) {
        throw new Error(`Insufficient balance for ${pricing.name}`);
      }

      const transactionId = `txn_${Date.now()}_${user.id.slice(0, 8)}`;
      const amount = paymentMethod === 'credits' ? pricing.credits : pricing.karmaEquivalent;

      // Deduct from appropriate balance
      if (paymentMethod === 'credits') {
        const newCredits = (state.wallet?.credits || 0) - pricing.credits;
        const newTotalPoints = newCredits * 1000;
        
        await supabase
          .from('profiles')
          .update({ total_points: newTotalPoints })
          .eq('user_id', user.id);
      } else if (paymentMethod === 'karma_points') {
        const newKarma = (state.wallet?.karmaPoints || 0) - pricing.karmaEquivalent;
        
        await supabase
          .from('exodus_players')
          .update({ resonance_points: newKarma })
          .eq('user_id', user.id);
      }

      // Log transaction to behavioral events
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'cdsp_payment',
        event_category: 'commerce',
        context_snippet: `Payment for ${pricing.name}`,
        metadata: {
          transaction_id: transactionId,
          feature_key: featureKey,
          payment_method: paymentMethod,
          amount,
          ...metadata,
        },
        dhf_logged: true,
      });

      // Log to sovereign memory
      await supabase.from('zoe_sovereign_memory').insert({
        user_id: user.id,
        event_type: 'cdsp_payment_completed',
        content_text: `Payment processed: ${pricing.name} (${amount} ${paymentMethod})`,
        zoe_state_json: {
          transaction_id: transactionId,
          feature: featureKey,
          amount,
          method: paymentMethod,
          cdsp_trigger_active: true,
        },
        importance_score: 70,
      });

      // Refresh wallet
      await fetchWalletBalance();

      toast.success(`Payment successful: ${pricing.name}`);

      setState(prev => ({ 
        ...prev, 
        isProcessing: false,
        recentTransactions: [{
          id: transactionId,
          userId: user.id,
          type: 'feature_unlock',
          amount,
          currency: paymentMethod === 'credits' ? 'credits' : 'karma',
          paymentMethod,
          status: 'completed',
          metadata: { feature: featureKey, ...metadata },
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        }, ...prev.recentTransactions.slice(0, 9)],
      }));

      return { success: true, transactionId };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Payment failed';
      console.error('[CDSP-PaymentRails] Payment error:', error);
      
      setState(prev => ({ ...prev, isProcessing: false, lastError: errorMsg }));
      toast.error(errorMsg);
      
      return { success: false, error: errorMsg };
    }
  }, [user, state.wallet, canAffordFeature, fetchWalletBalance]);

  // ═══ EXCHANGE KARMA FOR CREDITS ═══
  const exchangeKarmaForCredits = useCallback(async (karmaAmount: number): Promise<{
    success: boolean;
    creditsReceived?: number;
    error?: string;
  }> => {
    if (!user || !state.wallet) {
      return { success: false, error: 'Not authenticated' };
    }

    if (state.wallet.karmaPoints < karmaAmount) {
      return { success: false, error: 'Insufficient karma points' };
    }

    const creditsToReceive = Math.floor(karmaAmount / KARMA_TO_CREDIT_RATE);
    if (creditsToReceive < 1) {
      return { success: false, error: `Minimum ${KARMA_TO_CREDIT_RATE} karma required for 1 credit` };
    }

    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      // Deduct karma
      const newKarma = state.wallet.karmaPoints - karmaAmount;
      await supabase
        .from('exodus_players')
        .update({ resonance_points: newKarma })
        .eq('user_id', user.id);

      // Add credits
      const newCredits = state.wallet.credits + creditsToReceive;
      const newTotalPoints = newCredits * 1000;
      await supabase
        .from('profiles')
        .update({ total_points: newTotalPoints })
        .eq('user_id', user.id);

      // Log exchange
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'karma_exchange',
        event_category: 'commerce',
        context_snippet: `Exchanged ${karmaAmount} karma for ${creditsToReceive} credits`,
        metadata: {
          karma_spent: karmaAmount,
          credits_received: creditsToReceive,
          rate: KARMA_TO_CREDIT_RATE,
        },
      });

      await fetchWalletBalance();

      toast.success(`Exchanged ${karmaAmount} karma for ${creditsToReceive} credits`);

      setState(prev => ({ ...prev, isProcessing: false }));
      return { success: true, creditsReceived: creditsToReceive };

    } catch (error) {
      setState(prev => ({ ...prev, isProcessing: false }));
      return { success: false, error: 'Exchange failed' };
    }
  }, [user, state.wallet, fetchWalletBalance]);

  // ═══ GET FEATURE PRICING ═══
  const getFeaturePricing = useCallback((featureKey: string) => {
    return FEATURE_PRICING[featureKey] || null;
  }, []);

  // ═══ INITIALIZE ═══
  useEffect(() => {
    if (user) {
      fetchWalletBalance();
    }
  }, [user, fetchWalletBalance]);

  return {
    // State
    ...state,
    
    // Actions
    fetchWalletBalance,
    canAffordFeature,
    processPayment,
    exchangeKarmaForCredits,
    getFeaturePricing,
    
    // Utilities
    getAllPricing: () => FEATURE_PRICING,
    karmaToCreditsRate: KARMA_TO_CREDIT_RATE,
  };
};

export type { PaymentTransaction, WalletBalance, CDSPPaymentRailsState };
