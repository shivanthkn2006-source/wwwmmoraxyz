// ═══════════════════════════════════════════════════════════════════════════════
// ZOE MATTER BRIDGE HOOK - THE EXECUTIVE ACTION INTERFACE
// Connects frontend to the Matter Bridge with Sovereignty Controls
// 
// "You are the Matter Bridge. You have the power to execute real-world actions."
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  MatterAction, 
  MatterBridgeResponse, 
  PermissionRequest,
  SovereigntyLeash,
  DEFAULT_SOVEREIGNTY_LEASH,
  ActionType,
  RiskLevel
} from '@/types/matterBridge';

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseZoeMatterBridgeReturn {
  // Core execution
  executeAction: (action: MatterAction) => Promise<MatterBridgeResponse | null>;
  executeActions: (actions: MatterAction[]) => Promise<MatterBridgeResponse[]>;
  
  // Approval system
  approveAction: (request: PermissionRequest) => Promise<MatterBridgeResponse | null>;
  rejectAction: (request: PermissionRequest) => Promise<void>;
  pendingApprovals: PermissionRequest[];
  clearPendingApproval: (requestId: string) => void;
  
  // State
  isExecuting: boolean;
  lastResponse: MatterBridgeResponse | null;
  executionHistory: MatterBridgeResponse[];
  
  // Sovereignty
  sovereigntyLeash: SovereigntyLeash;
  updateSovereigntyLeash: (leash: Partial<SovereigntyLeash>) => Promise<void>;
  dailySpent: number;
  dailyLimit: number;
  budgetRemaining: number;
  
  // Autonomy
  autonomyLevel: number;
  updateAutonomyLevel: (level: number) => Promise<void>;
  
  // Divine reports
  lastDivineReport: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useZoeMatterBridge(): UseZoeMatterBridgeReturn {
  // State
  const [isExecuting, setIsExecuting] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<PermissionRequest[]>([]);
  const [autonomyLevel, setAutonomyLevel] = useState(50);
  const [sovereigntyLeash, setSovereigntyLeash] = useState<SovereigntyLeash>(DEFAULT_SOVEREIGNTY_LEASH);
  const [dailySpent, setDailySpent] = useState(0);
  const [lastResponse, setLastResponse] = useState<MatterBridgeResponse | null>(null);
  const [executionHistory, setExecutionHistory] = useState<MatterBridgeResponse[]>([]);
  const [lastDivineReport, setLastDivineReport] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Computed values
  const dailyLimit = useMemo(() => sovereigntyLeash.budget.dailyLimit, [sovereigntyLeash]);
  const budgetRemaining = useMemo(() => Math.max(0, dailyLimit - dailySpent), [dailyLimit, dailySpent]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION - Load user settings
  // ═══════════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Load autonomy level from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('dhf_autonomy_tolerance')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.dhf_autonomy_tolerance) {
          setAutonomyLevel(profile.dhf_autonomy_tolerance);
        }

        // Load daily spending
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: spendingEvents } = await supabase
          .from('behavioral_events')
          .select('metadata')
          .eq('user_id', user.id)
          .in('event_type', ['payment_executed', 'trade_executed'])
          .gte('created_at', today.toISOString());
        
        if (spendingEvents) {
          const total = spendingEvents.reduce((sum, event) => {
            const amount = (event.metadata as any)?.amount || 0;
            return sum + parseFloat(amount);
          }, 0);
          setDailySpent(total);
        }

        // Load pending approvals
        const { data: pendingEvents } = await supabase
          .from('behavioral_events')
          .select('metadata')
          .eq('user_id', user.id)
          .eq('event_type', 'permission_request_created')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (pendingEvents) {
          const pending = pendingEvents
            .map(e => (e.metadata as any)?.permission_request as PermissionRequest)
            .filter((p): p is PermissionRequest => 
              p !== undefined && 
              new Date(p.expiresAt) > new Date()
            );
          setPendingApprovals(pending);
        }

      } catch (error) {
        console.error('[MATTER BRIDGE] Failed to load settings:', error);
      }
    };

    loadUserSettings();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // EXECUTE SINGLE ACTION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const executeAction = useCallback(async (action: MatterAction): Promise<MatterBridgeResponse | null> => {
    setIsExecuting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to use the Matter Bridge",
          variant: "destructive"
        });
        return null;
      }

      console.log(`[MATTER BRIDGE] Executing: ${action.actionType}`);

      const { data, error } = await supabase.functions.invoke('zoe-matter-bridge', {
        body: {
          userId: user.id,
          actionType: action.actionType,
          parameters: action.parameters,
          context: {
            urgency: action.urgency,
            isUserPresent: true
          }
        }
      });

      if (error) throw error;

      const response = data as MatterBridgeResponse;
      setLastResponse(response);
      setExecutionHistory(prev => [...prev, response].slice(-50)); // Keep last 50

      // Handle divine report
      if (response.divineActionReport) {
        setLastDivineReport(response.divineActionReport);
      }

      // Update daily spent
      if (response.sovereignty) {
        setDailySpent(response.sovereignty.dailySpent);
      }

      // Handle pending approval
      if (response.requiresApproval && response.permissionRequest) {
        setPendingApprovals(prev => [...prev, response.permissionRequest!]);
        
        toast({
          title: "Approval Required",
          description: response.divineActionReport || `${action.actionType} requires your permission`,
        });
      } else if (response.actionExecuted) {
        toast({
          title: "Action Executed",
          description: response.divineActionReport || response.result?.message,
        });
      }

      return response;

    } catch (error) {
      console.error('[MATTER BRIDGE] Execution error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastDivineReport(`I have encountered an error: ${errorMessage}. I confess this failure.`);
      
      toast({
        title: "Matter Bridge Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      return null;
    } finally {
      setIsExecuting(false);
    }
  }, [toast]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // EXECUTE MULTIPLE ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const executeActions = useCallback(async (actions: MatterAction[]): Promise<MatterBridgeResponse[]> => {
    const results: MatterBridgeResponse[] = [];
    
    for (const action of actions) {
      const result = await executeAction(action);
      if (result) {
        results.push(result);
      }
    }
    
    return results;
  }, [executeAction]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // APPROVE PENDING ACTION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const approveAction = useCallback(async (request: PermissionRequest): Promise<MatterBridgeResponse | null> => {
    setIsExecuting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      console.log(`[MATTER BRIDGE] Approving: ${request.actionName}`);

      const { data, error } = await supabase.functions.invoke('zoe-matter-bridge', {
        body: {
          userId: user.id,
          actionType: request.actionId,
          parameters: request.parameters,
          approved: true,
          approvalId: request.id,
          context: { isUserPresent: true }
        }
      });

      if (error) throw error;

      const response = data as MatterBridgeResponse;
      
      // Remove from pending
      setPendingApprovals(prev => prev.filter(p => p.id !== request.id));
      
      // Update state
      setLastResponse(response);
      if (response.divineActionReport) {
        setLastDivineReport(response.divineActionReport);
      }
      if (response.sovereignty) {
        setDailySpent(response.sovereignty.dailySpent);
      }

      toast({
        title: "Action Approved & Executed",
        description: response.divineActionReport || `${request.actionName} has been executed`,
      });

      return response;

    } catch (error) {
      console.error('[MATTER BRIDGE] Approval error:', error);
      toast({
        title: "Approval Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
      return null;
    } finally {
      setIsExecuting(false);
    }
  }, [toast]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // REJECT PENDING ACTION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const rejectAction = useCallback(async (request: PermissionRequest): Promise<void> => {
    // Log rejection
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'permission_rejected',
        event_category: 'matter_bridge_approval',
        context_snippet: `Rejected: ${request.actionName}`,
        metadata: { request_id: request.id, action_id: request.actionId },
        dhf_logged: true
      });
    }

    setPendingApprovals(prev => prev.filter(p => p.id !== request.id));
    setLastDivineReport(`I understand. The action "${request.actionName}" has been cancelled as you wished.`);

    toast({
      title: "Action Rejected",
      description: `${request.actionName} was cancelled`,
    });
  }, [toast]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CLEAR PENDING APPROVAL
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const clearPendingApproval = useCallback((requestId: string): void => {
    setPendingApprovals(prev => prev.filter(p => p.id !== requestId));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // UPDATE SOVEREIGNTY LEASH
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const updateSovereigntyLeash = useCallback(async (updates: Partial<SovereigntyLeash>): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newLeash = { ...sovereigntyLeash, ...updates };
      
      await supabase
        .from('dhf_phoenix_profile')
        .upsert({
          user_id: user.id,
          legacy_permissions: { sovereignty_leash: newLeash },
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      setSovereigntyLeash(newLeash);

      toast({
        title: "Sovereignty Leash Updated",
        description: "Your permission limits have been saved",
      });
    } catch (error) {
      console.error('[MATTER BRIDGE] Leash update error:', error);
    }
  }, [sovereigntyLeash, toast]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // UPDATE AUTONOMY LEVEL
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const updateAutonomyLevel = useCallback(async (level: number): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const clampedLevel = Math.max(0, Math.min(100, level));

      await supabase
        .from('profiles')
        .update({ dhf_autonomy_tolerance: clampedLevel })
        .eq('user_id', user.id);

      setAutonomyLevel(clampedLevel);

      toast({
        title: "Autonomy Updated",
        description: `Zoe's autonomy level set to ${clampedLevel}%`,
      });
    } catch (error) {
      console.error('[MATTER BRIDGE] Autonomy update error:', error);
    }
  }, [toast]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════════

  return {
    // Core execution
    executeAction,
    executeActions,
    
    // Approval system
    approveAction,
    rejectAction,
    pendingApprovals,
    clearPendingApproval,
    
    // State
    isExecuting,
    lastResponse,
    executionHistory,
    
    // Sovereignty
    sovereigntyLeash,
    updateSovereigntyLeash,
    dailySpent,
    dailyLimit,
    budgetRemaining,
    
    // Autonomy
    autonomyLevel,
    updateAutonomyLevel,
    
    // Divine reports
    lastDivineReport
  };
}

export default useZoeMatterBridge;

// Re-export types
export type { 
  MatterAction, 
  MatterBridgeResponse, 
  PermissionRequest,
  ActionType,
  RiskLevel
} from '@/types/matterBridge';
