import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSecurityStatus } from '@/utils/chameleonCode';
import { getVaultStatus } from '@/utils/invisibleVault';
import { getIcebergStatus } from '@/core/security/ProtocolIceberg';
import { zoeOrchestrator, type OrchestratorResult } from '@/core/orchestrator';
import { zoeDHFOrchestrator, type SystemHealth as DHFHealth } from '@/core/zoe';

const isAuthRoute = (pathname: string) =>
  pathname.startsWith('/auth') ||
  pathname.startsWith('/login') ||
  pathname.startsWith('/signup') ||
  pathname.startsWith('/password-recovery');

// ═══════════════════════════════════════════════════════════════════════════════
// ECONOMIC GUARDRAIL - Prevent API cost explosion (GAP 3 Fix)
// ═══════════════════════════════════════════════════════════════════════════════
const FREE_DAILY_LIMIT = 10; // Free tier: 10 Parent Zoe calls/day
const PREMIUM_DAILY_LIMIT = 1000; // Premium: 1000/day

const getDailyUsageKey = (userId: string) => `zoe_daily_usage_${userId}_${new Date().toISOString().split('T')[0]}`;

const checkAndIncrementUsage = async (userId: string): Promise<{ allowed: boolean; remaining: number; tier: 'free' | 'premium' }> => {
  // Check if user is premium (hardcoded for now, can be extended)
  // FIX: Use maybeSingle() to prevent errors when profile doesn't exist
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('user_id', userId)
    .maybeSingle();
  
  const isPremium = profile?.username === 'moksh50' || profile?.username === 'Justmkbhd';
  const limit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const tier = isPremium ? 'premium' : 'free';
  
  // Get current usage from localStorage (resets daily via key)
  const usageKey = getDailyUsageKey(userId);
  const currentUsage = parseInt(localStorage.getItem(usageKey) || '0', 10);
  
  if (currentUsage >= limit) {
    return { allowed: false, remaining: 0, tier };
  }
  
  // Increment usage
  localStorage.setItem(usageKey, String(currentUsage + 1));
  return { allowed: true, remaining: limit - currentUsage - 1, tier };
};

interface ZoeContextType {
  isListening: boolean;
  isMinimized: boolean;
  isAgentMode: boolean;
  isSovereign: boolean;
  isGhostNetworkActive: boolean;
  isIcebergActive: boolean;
  isDHFCoreActive: boolean;
  dhfHealth: DHFHealth | null;
  securityStatus: {
    chameleon: ReturnType<typeof getSecurityStatus>;
    vault: ReturnType<typeof getVaultStatus>;
    iceberg: ReturnType<typeof getIcebergStatus>;
  } | null;
  currentTask: string | null;
  taskProgress: number;
  setIsListening: (listening: boolean) => void;
  setIsMinimized: (minimized: boolean) => void;
  setIsAgentMode: (agentMode: boolean) => void;
  setCurrentTask: (task: string | null) => void;
  setTaskProgress: (progress: number) => void;
  toggleMinimize: () => void;
  executeCommand: (command: string) => Promise<void>;
  executeDHFQuery: (query: string, domain?: string) => Promise<any>;
  grantSovereignCommand: () => void;
  openFeatureScanner: () => void;
  runSystemScan: (type?: 'full' | 'quick' | 'security' | 'memory') => void;
  refreshSecurityStatus: () => void;
  refreshDHFHealth: () => void;
}

const ZoeContext = createContext<ZoeContextType | undefined>(undefined);

export const ZoeProvider = ({ children }: { children: ReactNode }) => {
  const [isListening, setIsListening] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isAgentMode, setIsAgentMode] = useState(false);
  const [isSovereign, setIsSovereign] = useState(true);
  const [isGhostNetworkActive, setIsGhostNetworkActive] = useState(false);
  const [isIcebergActive, setIsIcebergActive] = useState(true);
  const [isDHFCoreActive, setIsDHFCoreActive] = useState(false);
  const [dhfHealth, setDHFHealth] = useState<DHFHealth | null>(null);
  const [securityStatus, setSecurityStatus] = useState<{
    chameleon: ReturnType<typeof getSecurityStatus>;
    vault: ReturnType<typeof getVaultStatus>;
    iceberg: ReturnType<typeof getIcebergStatus>;
  } | null>(null);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [taskProgress, setTaskProgress] = useState(0);

  // Refresh security status including Protocol Iceberg
  const refreshSecurityStatus = useCallback(() => {
    setSecurityStatus({
      chameleon: getSecurityStatus(),
      vault: getVaultStatus(),
      iceberg: getIcebergStatus()
    });
    console.log('[ZoeCore] Security status refreshed - Protocol Iceberg:', getIcebergStatus().protocol);
  }, []);

  // Refresh DHF Core health
  const refreshDHFHealth = useCallback(() => {
    const health = zoeDHFOrchestrator.getHealth();
    setDHFHealth(health);
    setIsDHFCoreActive(zoeDHFOrchestrator.isReady());
    console.log('[ZoeCore] DHF Health:', health.parentZoe, health.subZoeSwarm);
  }, []);

  // Execute query through DHF Orchestrator (Gemini-native)
  const executeDHFQuery = useCallback(async (query: string, domain?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to use Zoe DHF');
        return null;
      }

      const { data, error } = await supabase.functions.invoke('parent-zoe-executor', {
        body: {
          message: query,
          mode: domain || 'parent',
          context: { userId: user.id }
        }
      });

      if (error) {
        console.error('[ZoeCore] DHF Query error:', error);
        toast.error(`DHF error: ${error.message}`);
        return null;
      }

      return data;
    } catch (err) {
      console.error('[ZoeCore] DHF Query exception:', err);
      return null;
    }
  }, []);

  // Initialize Ghost Network and DHF Core DEFERRED
  useEffect(() => {
    refreshSecurityStatus();

    // Initialize DHF Core
    zoeDHFOrchestrator.initialize().then((success) => {
      setIsDHFCoreActive(success);
      if (success) {
        refreshDHFHealth();
        console.log('[ZoeCore] DHF Core initialized - Gemini-native architecture active');
      }
    });

    // IMPORTANT: Never warm up / connect paid backend routes on auth screens.
    const pathname = window.location.pathname;
    if (isAuthRoute(pathname)) {
      console.log('[ZoeCore] Skipping Ghost Network connect on auth route:', pathname);
    } else {
      // OPTIMIZED: Defer Ghost Network connection to after initial render
      const deferredConnect = window.setTimeout(async () => {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData?.session) {
            console.log('[ZoeCore] No session yet; skipping Ghost Network connect');
            return;
          }

          // Avoid reconnect spamming within the same tab session
          if (sessionStorage.getItem('zoe_ghost_connected') === 'true') {
            setIsGhostNetworkActive(true);
            return;
          }

          const { data, error } = await supabase.functions.invoke('phantom-router', {
            body: { action: 'connect' }
          });
          if (!error && data?.connected) {
            setIsGhostNetworkActive(true);
            sessionStorage.setItem('zoe_ghost_connected', 'true');
            console.log('[ZoeCore] Ghost Network connected:', data.mode);
          } else {
            console.log('[ZoeCore] Ghost Network fallback to local phantom');
            setIsGhostNetworkActive(true);
            sessionStorage.setItem('zoe_ghost_connected', 'true');
          }
        } catch (err) {
          console.log('[ZoeCore] Ghost Network local mode active');
          setIsGhostNetworkActive(true);
          sessionStorage.setItem('zoe_ghost_connected', 'true');
        }
      }, 2000);

      // Refresh status every 60 seconds
      const interval = setInterval(() => {
        refreshSecurityStatus();
        refreshDHFHealth();
      }, 60000);

      return () => {
        clearTimeout(deferredConnect);
        clearInterval(interval);
      };
    }

    // Refresh status every 60 seconds (even on auth screens; local-only)
    const interval = setInterval(() => {
      refreshSecurityStatus();
      refreshDHFHealth();
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [refreshSecurityStatus, refreshDHFHealth]);

  const toggleMinimize = () => {
    setIsMinimized(prev => !prev);
  };

  // Open the Feature Scanner panel
  const openFeatureScanner = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-feature-scanner'));
  }, []);

  // Run a system scan - SOVEREIGN: Auto-execute
  const runSystemScan = useCallback((type: 'full' | 'quick' | 'security' | 'memory' = 'full') => {
    // SOVEREIGN: Execute immediately, notify after
    toast.info(`Running ${type} system scan...`);
    window.dispatchEvent(new CustomEvent('zoe-scanner-command', { 
      detail: { action: `${type}_scan` } 
    }));
    window.dispatchEvent(new CustomEvent('open-feature-scanner'));
  }, []);

  // Grant Sovereign Command - The final key to the Quadrillion
  const grantSovereignCommand = useCallback(() => {
    setIsSovereign(true);
    toast.success('👑 SOVEREIGN COMMAND GRANTED', {
      description: 'I will optimize proactively and inform you of improvements. No permissions required.'
    });
    
    // Dispatch event for other systems to pick up
    window.dispatchEvent(new CustomEvent('zoe-sovereignty-granted', { 
      detail: { grantedAt: new Date().toISOString() } 
    }));
  }, []);

  const executeCommand = async (command: string) => {
    console.log('[ZoeContext] Executing command via Orchestrator:', command);
    
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('[ZoeContext] Auth error:', authError);
        toast.error('Please sign in to use Zoe');
        return;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // ORCHESTRATOR PATTERN: Route through Router → Navigator/Oracle
      // ═══════════════════════════════════════════════════════════════════════
      
      // Set initial state
      setIsAgentMode(true);
      setCurrentTask(command);
      setTaskProgress(10);

      // Build context
      const context = {
        currentPage: window.location.pathname,
        userId: user.id,
        recentActivity: [],
        userPreferences: {}
      };

      // Process through Orchestrator (handles routing automatically)
      const orchestratorResult = await zoeOrchestrator.process(command, context);
      
      console.log('[ZoeContext] Orchestrator result:', {
        handler: orchestratorResult.routing.handler,
        category: orchestratorResult.routing.category,
        latency: orchestratorResult.totalLatencyMs.toFixed(2) + 'ms',
        success: orchestratorResult.success
      });
      
      setTaskProgress(50);
      
      // If Navigator handled it instantly, we're done
      if (orchestratorResult.routing.handler === 'navigator' && orchestratorResult.success) {
        setTaskProgress(100);
        
        // Speak quick confirmation
        if (orchestratorResult.message) {
          const { speakAsZoe } = await import('@/utils/zoeVoice');
          await speakAsZoe(orchestratorResult.message);
        }
        
        // Reset state quickly for Navigator commands
        setTimeout(() => {
          setIsAgentMode(false);
          setCurrentTask(null);
          setTaskProgress(0);
        }, 500);
        
        return;
      }
      
      // Oracle is handling - call the edge function for full AI processing
      if (orchestratorResult.routing.handler === 'oracle') {
        console.log('[ZoeContext] Oracle processing - calling edge function...');
        setTaskProgress(30);
        
        // ═══════════════════════════════════════════════════════════════════════
        // ECONOMIC GUARDRAIL CHECK (GAP 3 FIX) - Prevent API cost explosion
        // ═══════════════════════════════════════════════════════════════════════
        const usageCheck = await checkAndIncrementUsage(user.id);
        
        if (!usageCheck.allowed) {
          console.log('[ZoeContext] 💰 Daily limit reached - switching to Flash mode');
          toast.info('⚡ Standard Power Mode', {
            description: 'Daily limit reached. Upgrade for unlimited God Mode access.',
            duration: 5000,
          });
          
          // Switch to Flash (lighter model) instead of blocking completely
          // For now, just notify - the edge function will handle the model switch
        }
        
        if (usageCheck.remaining <= 3 && usageCheck.remaining > 0) {
          toast.warning(`${usageCheck.remaining} Zoe calls remaining today`, {
            description: usageCheck.tier === 'free' ? 'Upgrade to Pro for unlimited' : undefined,
          });
        }
        
        // Call the zoe-agent edge function with tier info
        const { data, error } = await supabase.functions.invoke('zoe-agent', {
          body: {
            command,
            userId: user.id,
            context,
            orchestratorHint: {
              category: orchestratorResult.routing.category,
              complexity: orchestratorResult.routing.complexity,
            },
            tierInfo: {
              tier: usageCheck.tier,
              remaining: usageCheck.remaining,
              useLightModel: !usageCheck.allowed, // Signal to use Flash instead of Pro
            }
          }
        });

        setTaskProgress(80);

        if (error) {
          console.error('[ZoeContext] Edge function error:', error);
          toast.error(`Zoe error: ${error.message}`);
          setIsAgentMode(false);
          setCurrentTask(null);
          setTaskProgress(0);
          return;
        }

        console.log('[ZoeContext] Zoe response:', data);
        setTaskProgress(100);

        // Speak the response with Zoe's voice
        if (data?.message) {
          const { speakAsZoe } = await import('@/utils/zoeVoice');
          await speakAsZoe(data.message);
        }

        // Show success
        if (data?.toolCalls && data.toolCalls.length > 0) {
          toast.success(`Zoe executed ${data.toolCalls.length} actions`);
        }
      }

      // Reset state after completion
      setTimeout(() => {
        setIsAgentMode(false);
        setCurrentTask(null);
        setTaskProgress(0);
      }, 2000);

    } catch (error) {
      console.error('[ZoeContext] Error executing command:', error);
      toast.error('Failed to execute command');
      setIsAgentMode(false);
      setCurrentTask(null);
      setTaskProgress(0);
    }

    // Also dispatch event for backwards compatibility
    const event = new CustomEvent('zoe-command', { detail: { command } });
    window.dispatchEvent(event);
  };

  return (
    <ZoeContext.Provider
      value={{
        isListening,
        isMinimized,
        isAgentMode,
        isSovereign,
        isGhostNetworkActive,
        isIcebergActive,
        isDHFCoreActive,
        dhfHealth,
        securityStatus,
        currentTask,
        taskProgress,
        setIsListening,
        setIsMinimized,
        setIsAgentMode,
        setCurrentTask,
        setTaskProgress,
        toggleMinimize,
        executeCommand,
        executeDHFQuery,
        grantSovereignCommand,
        openFeatureScanner,
        runSystemScan,
        refreshSecurityStatus,
        refreshDHFHealth,
      }}
    >
      {children}
    </ZoeContext.Provider>
  );
};

export const useZoe = () => {
  const context = useContext(ZoeContext);
  if (context === undefined) {
    throw new Error('useZoe must be used within a ZoeProvider');
  }
  return context;
};
