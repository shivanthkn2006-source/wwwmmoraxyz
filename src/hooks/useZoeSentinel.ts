import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SentinelDashboard {
  systemIntegrity: number;
  attacksRepelledToday: number;
  incidentsToday: number;
  autoPatchesApplied: number;
  lastScan: string | null;
  activeLockdowns: any[];
  recentRepairs: any[];
  shieldStatus: 'ACTIVE' | 'LOCKDOWN' | 'COMPROMISED';
}

export interface NightWatchReport {
  cycleId: string;
  status: 'completed' | 'failed' | 'interrupted';
  edgeFunctionsScanned: number;
  databaseTriggersScanned: number;
  shadowAIDetected: number;
  attacksBlocked: number;
  autoPatchesApplied: number;
  systemIntegrityScore: number;
  repairs: any[];
  incidents: any[];
  snapshot: any;
}

export function useZoeSentinel() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [dashboard, setDashboard] = useState<SentinelDashboard | null>(null);
  const [lastReport, setLastReport] = useState<NightWatchReport | null>(null);
  const [isLockdownActive, setIsLockdownActive] = useState(false);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('zoe-sentinel', {
        body: { action: 'dashboard' }
      });

      if (error) throw error;
      
      setDashboard(data);
      setIsLockdownActive(data.activeLockdowns?.length > 0);
      return data;
    } catch (error: any) {
      console.error('[SENTINEL] Dashboard fetch error:', error);
      return null;
    }
  }, []);

  // Run Night Watch scan
  const runNightWatch = useCallback(async () => {
    setIsScanning(true);
    
    try {
      toast({
        title: "🛡️ Sentinel Night Watch",
        description: "Initiating automated security scan...",
      });

      const { data, error } = await supabase.functions.invoke('zoe-sentinel', {
        body: { action: 'night_watch' }
      });

      if (error) throw error;
      
      setLastReport(data);
      
      // Refresh dashboard
      await fetchDashboard();
      
      toast({
        title: "✅ Night Watch Complete",
        description: `System Integrity: ${data.systemIntegrityScore}% | Attacks Blocked: ${data.attacksBlocked} | Patches: ${data.autoPatchesApplied}`,
      });

      return data;
    } catch (error: any) {
      console.error('[SENTINEL] Night Watch error:', error);
      toast({
        title: "⚠️ Night Watch Failed",
        description: error.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsScanning(false);
    }
  }, [toast, fetchDashboard]);

  // Initiate DHF Lockdown
  const initiateLockdown = useCallback(async (reason: string, lockdownType: 'full' | 'partial' | 'api_only' | 'emergency' = 'full') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      toast({
        title: "🔒 DHF LOCKDOWN",
        description: "Freezing all external ports...",
        variant: "destructive"
      });

      const { data, error } = await supabase.functions.invoke('zoe-sentinel', {
        body: { 
          action: 'lockdown',
          requestData: {
            lockdownType,
            reason,
            initiatedBy: user.id
          }
        }
      });

      if (error) throw error;
      
      setIsLockdownActive(true);
      await fetchDashboard();
      
      toast({
        title: "🔐 LOCKDOWN ACTIVE",
        description: "All external connections frozen. Auto-release in 1 hour.",
        variant: "destructive"
      });

      return data;
    } catch (error: any) {
      console.error('[SENTINEL] Lockdown error:', error);
      toast({
        title: "Lockdown Failed",
        description: error.message,
        variant: "destructive"
      });
      return null;
    }
  }, [toast, fetchDashboard]);

  // Release Lockdown
  const releaseLockdown = useCallback(async (lockdownId: string, reason: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('zoe-sentinel', {
        body: {
          action: 'release_lockdown',
          requestData: {
            lockdownId,
            releasedBy: user.id,
            reason
          }
        }
      });

      if (error) throw error;
      
      setIsLockdownActive(false);
      await fetchDashboard();
      
      toast({
        title: "🔓 LOCKDOWN RELEASED",
        description: "Systems restored to normal operation.",
      });

      return data;
    } catch (error: any) {
      console.error('[SENTINEL] Release error:', error);
      return null;
    }
  }, [toast, fetchDashboard]);

  // Analyze request for Shadow AI
  const analyzeRequest = useCallback(async (requestData: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('zoe-sentinel', {
        body: { action: 'analyze_request', requestData }
      });

      if (error && error.message.includes('403')) {
        return { allowed: false, reason: 'Shadow AI detected' };
      }
      
      return data;
    } catch (error: any) {
      console.error('[SENTINEL] Analysis error:', error);
      return { allowed: true, error: error.message };
    }
  }, []);

  // Record biometric auth event
  const recordBiometricAuth = useCallback(async (authData: {
    authMethod: 'voice_print' | 'face_liveness' | 'behavioral' | 'memory_question' | 'bio_hash' | 'fallback';
    success: boolean;
    confidenceScore: number;
    microJitterDetected: boolean;
    deviceFingerprint?: string;
    ipAddress?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase.functions.invoke('zoe-sentinel', {
        body: {
          action: 'biometric_auth',
          requestData: {
            userId: user.id,
            ...authData
          }
        }
      });

      if (error) throw error;
      
      if (data.shadowAISuspected) {
        toast({
          title: "⚠️ Security Alert",
          description: "Unusual authentication pattern detected. Please verify your identity.",
          variant: "destructive"
        });
      }

      return data;
    } catch (error: any) {
      console.error('[SENTINEL] Biometric auth error:', error);
      return null;
    }
  }, [toast]);

  return {
    // State
    isScanning,
    dashboard,
    lastReport,
    isLockdownActive,
    
    // Actions
    fetchDashboard,
    runNightWatch,
    initiateLockdown,
    releaseLockdown,
    analyzeRequest,
    recordBiometricAuth,
    
    // Computed
    shieldStatus: dashboard?.shieldStatus || 'ACTIVE',
    systemIntegrity: dashboard?.systemIntegrity || 100
  };
}
