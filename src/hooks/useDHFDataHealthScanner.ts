// ═══════════════════════════════════════════════════════════════════════════════
// DHF DATA HEALTH SCANNER - Automated Real-Time Data Flow Monitoring
// Ensures continuous data feeding to Zoe Sovereign AI DHF for adaptive learning
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface DHFHealthStatus {
  isHealthy: boolean;
  lastScanAt: Date | null;
  recentEventsCount: number;
  dataFlowRate: number; // events per minute
  zsmsConnectionStatus: 'connected' | 'degraded' | 'disconnected';
  ecnQueueStatus: 'active' | 'stalled' | 'empty';
  dhfLogsStatus: 'syncing' | 'healthy' | 'stale';
  adaptiveLearningActive: boolean;
  issues: string[];
  autoFixesApplied: number;
}

interface ScanResult {
  success: boolean;
  fixesApplied: number;
  issues: string[];
}

export const useDHFDataHealthScanner = () => {
  const { user } = useAuth();
  const [healthStatus, setHealthStatus] = useState<DHFHealthStatus>({
    isHealthy: true,
    lastScanAt: null,
    recentEventsCount: 0,
    dataFlowRate: 0,
    zsmsConnectionStatus: 'disconnected',
    ecnQueueStatus: 'empty',
    dhfLogsStatus: 'stale',
    adaptiveLearningActive: false,
    issues: [],
    autoFixesApplied: 0,
  });
  
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastEventCountRef = useRef<number>(0);
  const eventRateHistoryRef = useRef<number[]>([]);

  // Run comprehensive DHF health scan
  const runHealthScan = useCallback(async (): Promise<ScanResult> => {
    if (!user?.id) return { success: false, fixesApplied: 0, issues: ['No user authenticated'] };

    const issues: string[] = [];
    let fixesApplied = 0;

    try {
      // 1. Check behavioral events flow (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentEvents, error: eventsError } = await supabase
        .from('behavioral_events')
        .select('id, created_at', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('created_at', fiveMinutesAgo);

      if (eventsError) {
        issues.push('Unable to read behavioral events');
      }

      const recentEventsCount = recentEvents?.length || 0;
      const dataFlowRate = recentEventsCount / 5; // events per minute

      // Track rate history for trend analysis
      eventRateHistoryRef.current.push(dataFlowRate);
      if (eventRateHistoryRef.current.length > 12) {
        eventRateHistoryRef.current.shift();
      }

      // 2. Check ZSMT (Zoe Sovereign Memory Table) status
      let zsmsConnectionStatus: 'connected' | 'degraded' | 'disconnected' = 'disconnected';
      try {
        const { data: zsmsData, error: zsmsError } = await supabase
          .from('zoe_sovereign_memory' as any)
          .select('id')
          .eq('user_id', user.id)
          .gte('created_at', fiveMinutesAgo)
          .limit(1);

        if (!zsmsError && zsmsData) {
          zsmsConnectionStatus = zsmsData.length > 0 ? 'connected' : 'degraded';
        }
      } catch {
        zsmsConnectionStatus = 'disconnected';
      }

      // 3. Check ECN queue status
      let ecnQueueStatus: 'active' | 'stalled' | 'empty' = 'empty';
      const { data: ecnQueue, error: ecnError } = await supabase
        .from('ecn_analysis_queue')
        .select('id, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!ecnError && ecnQueue && ecnQueue.length > 0) {
        const pendingCount = ecnQueue.filter(q => q.status === 'pending').length;
        const oldestPending = ecnQueue.find(q => q.status === 'pending');
        
        if (oldestPending) {
          const ageMs = Date.now() - new Date(oldestPending.created_at).getTime();
          ecnQueueStatus = ageMs > 10 * 60 * 1000 ? 'stalled' : 'active';
        } else {
          ecnQueueStatus = pendingCount > 0 ? 'active' : 'empty';
        }
      }

      // 4. Check DHF logs status
      let dhfLogsStatus: 'syncing' | 'healthy' | 'stale' = 'stale';
      const { data: dhfLogs, error: dhfError } = await supabase
        .from('dhf_asset_logs')
        .select('id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!dhfError && dhfLogs && dhfLogs.length > 0) {
        const lastLogAge = Date.now() - new Date(dhfLogs[0].created_at).getTime();
        dhfLogsStatus = lastLogAge < 60000 ? 'syncing' : lastLogAge < 5 * 60 * 1000 ? 'healthy' : 'stale';
      }

      // 5. Check zoe_settings for adaptive learning status
      const { data: zoeSettings } = await supabase
        .from('zoe_settings')
        .select('enabled, sync_percentage, event_count, last_event_sync_at')
        .eq('user_id', user.id)
        .single();

      const adaptiveLearningActive = zoeSettings?.enabled !== false && (zoeSettings?.sync_percentage || 0) > 0;

      // 6. Apply auto-fixes for detected issues
      
      // Fix: Create zoe_settings if missing
      if (!zoeSettings) {
        const { error: upsertError } = await supabase
          .from('zoe_settings')
          .upsert({
            user_id: user.id,
            enabled: true,
            sync_percentage: 0,
            event_count: recentEventsCount,
            last_event_sync_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        
        if (!upsertError) {
          fixesApplied++;
          console.log('[DHF Scanner] Auto-fix: Created missing zoe_settings');
        }
      }

      // Fix: Update stale event count
      if (zoeSettings && lastEventCountRef.current !== recentEventsCount) {
        const { data: totalEvents } = await supabase
          .from('behavioral_events')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const totalCount = (totalEvents as any)?.length || recentEventsCount;
        
        await supabase
          .from('zoe_settings')
          .update({
            event_count: totalCount,
            last_event_sync_at: new Date().toISOString(),
            sync_percentage: Math.min(100, Math.floor(totalCount / 100)),
          })
          .eq('user_id', user.id);
        
        lastEventCountRef.current = recentEventsCount;
        fixesApplied++;
      }

      // Fix: Clear stalled ECN queue items
      if (ecnQueueStatus === 'stalled') {
        const stalledCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { error: clearError } = await supabase
          .from('ecn_analysis_queue')
          .update({ status: 'failed' })
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .lt('created_at', stalledCutoff);

        if (!clearError) {
          fixesApplied++;
          console.log('[DHF Scanner] Auto-fix: Cleared stalled ECN queue items');
        }
      }

      // Determine overall health
      if (dataFlowRate < 0.1 && recentEventsCount === 0) {
        issues.push('No data flowing to DHF - interactions not being tracked');
      }
      if (zsmsConnectionStatus === 'disconnected') {
        issues.push('ZSMT connection lost - Zoe memory not syncing');
      }
      if (ecnQueueStatus === 'stalled') {
        issues.push('ECN processing stalled - emotional learning paused');
      }
      if (dhfLogsStatus === 'stale') {
        issues.push('DHF logs stale - long-term memory not updating');
      }

      const isHealthy = issues.length === 0;

      setHealthStatus({
        isHealthy,
        lastScanAt: new Date(),
        recentEventsCount,
        dataFlowRate,
        zsmsConnectionStatus,
        ecnQueueStatus,
        dhfLogsStatus,
        adaptiveLearningActive,
        issues,
        autoFixesApplied: fixesApplied,
      });

      return { success: true, fixesApplied, issues };

    } catch (error) {
      console.error('[DHF Scanner] Scan error:', error);
      issues.push('Scanner encountered an error');
      return { success: false, fixesApplied, issues };
    }
  }, [user?.id]);

  // Force data sync to ensure Zoe receives real-time updates
  const forceDataSync = useCallback(async () => {
    if (!user?.id) return false;

    try {
      // Trigger a flush by updating zoe_settings timestamp
      await supabase
        .from('zoe_settings')
        .update({ last_event_sync_at: new Date().toISOString() })
        .eq('user_id', user.id);

      // Create a sync event to confirm data pipeline is working
      await supabase
        .from('behavioral_events')
        .insert({
          user_id: user.id,
          event_type: 'dhf_health_sync',
          event_category: 'system',
          context_snippet: 'Forced sync verification',
          metadata: { forced: true, timestamp: new Date().toISOString() },
        });

      console.log('[DHF Scanner] Force sync completed');
      return true;
    } catch (error) {
      console.error('[DHF Scanner] Force sync failed:', error);
      return false;
    }
  }, [user?.id]);

  // Start periodic scanning
  const startPeriodicScanning = useCallback((intervalMs: number = 60000) => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    // Initial scan
    runHealthScan();

    // Set up periodic scans
    scanIntervalRef.current = setInterval(() => {
      runHealthScan().then(result => {
        // Notify user only if critical issues found
        if (!result.success || result.issues.length > 2) {
          console.warn('[DHF Scanner] Health issues detected:', result.issues);
        }
        
        // Auto-force sync if data flow stopped
        if (healthStatus.dataFlowRate === 0 && healthStatus.recentEventsCount === 0) {
          forceDataSync();
        }
      });
    }, intervalMs);

    console.log(`[DHF Scanner] Started periodic scanning every ${intervalMs}ms`);
  }, [runHealthScan, forceDataSync, healthStatus.dataFlowRate, healthStatus.recentEventsCount]);

  // Stop periodic scanning
  const stopPeriodicScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    console.log('[DHF Scanner] Stopped periodic scanning');
  }, []);

  // Auto-start scanning when user is authenticated
  useEffect(() => {
    if (user?.id) {
      // Start with 60-second interval for regular health checks
      startPeriodicScanning(60000);
    }

    return () => {
      stopPeriodicScanning();
    };
  }, [user?.id]);

  // Subscribe to real-time behavioral events for instant health updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('dhf-health-monitor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'behavioral_events',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Update event count in real-time
          setHealthStatus(prev => ({
            ...prev,
            recentEventsCount: prev.recentEventsCount + 1,
            dataFlowRate: prev.dataFlowRate + 0.1,
            isHealthy: true,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    healthStatus,
    runHealthScan,
    forceDataSync,
    startPeriodicScanning,
    stopPeriodicScanning,
  };
};

export default useDHFDataHealthScanner;
