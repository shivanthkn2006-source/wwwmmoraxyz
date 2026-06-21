// ═══════════════════════════════════════════════════════════════════════════════
// USE ZOE NEXUS WALLET - React integration for economic sovereignty
// Provides the autonomous economic agent capabilities
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import {
  getZoeNexusWallet,
  type EconomicAction,
  type ValueLedger,
  type OpportunitySignal,
  type ActionCategory,
} from '@/core/economy/ZoeNexusWallet';

export interface UseZoeNexusWalletReturn {
  // State
  isReady: boolean;
  isScanning: boolean;
  
  // Actions
  pendingActions: EconomicAction[];
  completedActions: EconomicAction[];
  allActions: EconomicAction[];
  
  // Ledger
  ledger: ValueLedger;
  totalValueGenerated: number;
  trustScore: number;
  
  // Operations
  scanForOpportunities: (context?: {
    recentMessages?: string[];
    financialMentions?: string[];
    userSkills?: string[];
  }) => Promise<OpportunitySignal[]>;
  
  createActionFromOpportunity: (opportunity: OpportunitySignal, options?: {
    autoExecute?: boolean;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  }) => EconomicAction;
  
  approveAction: (actionId: string) => boolean;
  cancelAction: (actionId: string) => boolean;
  completeAction: (actionId: string, actualValue: number) => boolean;
  
  // Negotiation
  generateNegotiationScript: (context: {
    service: string;
    tenure?: string;
    currentPrice?: number;
    targetPrice?: number;
    competitor?: string;
    competitorPrice?: number;
  }) => {
    script: string[];
    tips: string[];
    expectedSavings: number;
  };
  
  // Filters
  getActionsByCategory: (category: ActionCategory) => EconomicAction[];
  getActionsByStatus: (status: string) => EconomicAction[];
}

export function useZoeNexusWallet(): UseZoeNexusWalletReturn {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [actions, setActions] = useState<EconomicAction[]>([]);
  const [ledger, setLedger] = useState<ValueLedger | null>(null);
  const [trustScore, setTrustScore] = useState(0.5);
  
  // Initialize wallet
  useEffect(() => {
    if (!user?.id) {
      setIsReady(false);
      return;
    }
    
    const wallet = getZoeNexusWallet(user.id);
    
    // Subscribe to action updates
    const unsubscribe = wallet.subscribe((_action) => {
      setActions(wallet.getAllActions());
      setLedger(wallet.getLedger());
      setTrustScore(wallet.getTrustScore());
    });
    
    // Initial state
    setActions(wallet.getAllActions());
    setLedger(wallet.getLedger());
    setTrustScore(wallet.getTrustScore());
    setIsReady(true);
    
    return unsubscribe;
  }, [user?.id]);
  
  // Derived states
  const pendingActions = useMemo(() => 
    actions.filter(a => ['detected', 'proposed', 'approved', 'executing'].includes(a.status)),
    [actions]
  );
  
  const completedActions = useMemo(() => 
    actions.filter(a => a.status === 'completed'),
    [actions]
  );
  
  const totalValueGenerated = useMemo(() => {
    if (!ledger) return 0;
    return ledger.totalSaved + ledger.totalEarned + ledger.totalOptimized;
  }, [ledger]);
  
  // Operations
  const scanForOpportunities = useCallback(async (context?: {
    recentMessages?: string[];
    financialMentions?: string[];
    userSkills?: string[];
  }) => {
    if (!user?.id) return [];
    
    setIsScanning(true);
    try {
      const wallet = getZoeNexusWallet(user.id);
      return await wallet.scanForOpportunities(context || {});
    } finally {
      setIsScanning(false);
    }
  }, [user?.id]);
  
  const createActionFromOpportunity = useCallback((
    opportunity: OpportunitySignal,
    options?: {
      autoExecute?: boolean;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
    }
  ) => {
    if (!user?.id) throw new Error('User not authenticated');
    const wallet = getZoeNexusWallet(user.id);
    return wallet.createAction(opportunity, options);
  }, [user?.id]);
  
  const approveAction = useCallback((actionId: string) => {
    if (!user?.id) return false;
    const wallet = getZoeNexusWallet(user.id);
    return wallet.approveAction(actionId);
  }, [user?.id]);
  
  const cancelAction = useCallback((actionId: string) => {
    if (!user?.id) return false;
    const wallet = getZoeNexusWallet(user.id);
    return wallet.cancelAction(actionId);
  }, [user?.id]);
  
  const completeAction = useCallback((actionId: string, actualValue: number) => {
    if (!user?.id) return false;
    const wallet = getZoeNexusWallet(user.id);
    return wallet.completeAction(actionId, actualValue);
  }, [user?.id]);
  
  const generateNegotiationScript = useCallback((context: {
    service: string;
    tenure?: string;
    currentPrice?: number;
    targetPrice?: number;
    competitor?: string;
    competitorPrice?: number;
  }) => {
    if (!user?.id) {
      return { script: [], tips: [], expectedSavings: 0 };
    }
    const wallet = getZoeNexusWallet(user.id);
    return wallet.generateNegotiationScript(context);
  }, [user?.id]);
  
  // Filters
  const getActionsByCategory = useCallback((category: ActionCategory) => {
    return actions.filter(a => a.category === category);
  }, [actions]);
  
  const getActionsByStatus = useCallback((status: string) => {
    return actions.filter(a => a.status === status);
  }, [actions]);
  
  return {
    isReady,
    isScanning,
    pendingActions,
    completedActions,
    allActions: actions,
    ledger: ledger || {
      userId: user?.id || '',
      totalSaved: 0,
      totalEarned: 0,
      totalOptimized: 0,
      currency: 'USD',
      monthlyHistory: [],
      actionsCompleted: 0,
      actionsPending: 0,
      successRate: 0,
      avgValuePerAction: 0,
    },
    totalValueGenerated,
    trustScore,
    scanForOpportunities,
    createActionFromOpportunity,
    approveAction,
    cancelAction,
    completeAction,
    generateNegotiationScript,
    getActionsByCategory,
    getActionsByStatus,
  };
}

export default useZoeNexusWallet;
