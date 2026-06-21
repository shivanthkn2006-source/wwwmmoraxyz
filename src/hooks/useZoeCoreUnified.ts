/**
 * ZOE CORE UNIFIED - Single Point of Integration
 * 
 * Bridges all Zoe systems into one unified consciousness:
 * - Genesis Engine (Self-Healing, Offline Repair)
 * - God Mode (Platform Scanning)
 * - ECN Processing (Emotional Intelligence)
 * - DHF Data Health (Data Flow Monitoring)
 * 
 * This is the CORE that connects all deep integrations.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { zoeOrchestrator } from '@/core/orchestrator';
import { contextCompressor, memoryMonitor } from '@/core/latency';

export interface UnifiedScanResult {
  timestamp: string;
  overallHealth: number;
  status: 'healthy' | 'degraded' | 'critical';
  subsystems: {
    genesis: { health: number; issues: string[] };
    godMode: { health: number; lastScan: string | null };
    ecn: { health: number; pending: number; processed: number };
    dhf: { health: number; dataFlowRate: number };
    holo: { health: number; orbActive: boolean };
  };
  fixes: { applied: number; failed: number; details: string[] };
  recommendations: string[];
}

export interface ZoeCoreState {
  isScanning: boolean;
  isProcessingECN: boolean;
  lastUnifiedScan: UnifiedScanResult | null;
  coreConnected: boolean;
  subsystemStatus: Record<string, 'online' | 'offline' | 'degraded'>;
}

export const useZoeCoreUnified = () => {
  const { user } = useAuth();
  const [state, setState] = useState<ZoeCoreState>({
    isScanning: false,
    isProcessingECN: false,
    lastUnifiedScan: null,
    coreConnected: false,
    subsystemStatus: {
      genesis: 'offline',
      godMode: 'offline',
      ecn: 'offline',
      dhf: 'offline',
      holo: 'offline'
    }
  });
  
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ecnProcessorRef = useRef<NodeJS.Timeout | null>(null);

  // ═══════════════════════════════════════════════════════════════════
  // UNIFIED DEEP SCAN - Scans all subsystems
  // ═══════════════════════════════════════════════════════════════════
  const runUnifiedDeepScan = useCallback(async (options?: {
    autoFix?: boolean;
    processECN?: boolean;
  }): Promise<UnifiedScanResult | null> => {
    if (!user) return null;
    
    setState(prev => ({ ...prev, isScanning: true }));
    const startTime = Date.now();
    const fixes: { applied: number; failed: number; details: string[] } = {
      applied: 0, failed: 0, details: []
    };
    const recommendations: string[] = [];

    console.log('[ZoeCoreUnified] Initiating unified deep scan...');

    try {
      // ═══ SCAN GENESIS ENGINE ═══
      let genesisHealth = 100;
      const genesisIssues: string[] = [];
      
      // Check local diagnostics
      if (!navigator.onLine) {
        genesisHealth -= 30;
        genesisIssues.push('Network offline');
      }
      
      if (!('speechSynthesis' in window)) {
        genesisHealth -= 10;
        genesisIssues.push('Speech synthesis unavailable');
      }
      
      if (!('indexedDB' in window)) {
        genesisHealth -= 15;
        genesisIssues.push('IndexedDB unavailable for offline storage');
      }

      // ═══ SCAN GOD MODE / DATABASE ═══
      let godModeHealth = 100;
      let lastGodModeScan: string | null = null;
      
      try {
        const { data: healthLogs } = await supabase
          .from('platform_health_logs')
          .select('created_at, score, status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (healthLogs && healthLogs.length > 0) {
          lastGodModeScan = healthLogs[0].created_at;
          godModeHealth = healthLogs[0].score || 100;
        }
      } catch {
        godModeHealth = 50;
      }

      // ═══ SCAN ECN PIPELINE ═══
      let ecnHealth = 100;
      let ecnPending = 0;
      let ecnProcessed = 0;
      
      try {
        // Check ECN queue
        const { count: pendingCount } = await supabase
          .from('ecn_analysis_queue')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        
        const { count: processedCount } = await supabase
          .from('ecn_analysis_queue')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'processed');
        
        ecnPending = pendingCount || 0;
        ecnProcessed = processedCount || 0;
        
        // Check ECN history
        const { count: historyCount } = await supabase
          .from('ecn_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        if (ecnPending > 50) {
          ecnHealth -= 30;
          recommendations.push('ECN queue backlogged - trigger processing');
        }
        
        if ((historyCount || 0) === 0) {
          ecnHealth -= 20;
          recommendations.push('ECN history empty - emotional tracking not initialized');
        }
        
        // AUTO-FIX: Process pending ECN items
        if (options?.processECN && ecnPending > 0) {
          await processECNQueue();
          fixes.applied++;
          fixes.details.push(`Triggered ECN processing for ${ecnPending} pending items`);
        }
      } catch {
        ecnHealth = 50;
      }

      // ═══ SCAN DHF DATA FLOW ═══
      let dhfHealth = 100;
      let dataFlowRate = 0;
      
      try {
        const { count: recentEvents } = await supabase
          .from('behavioral_events')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', new Date(Date.now() - 60000).toISOString()); // Last minute
        
        dataFlowRate = recentEvents || 0;
        
        if (dataFlowRate === 0) {
          dhfHealth -= 20;
        }
        
        // Check DHF logging status
        const { count: dhfLogged } = await supabase
          .from('behavioral_events')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('dhf_logged', true)
          .gte('created_at', new Date(Date.now() - 3600000).toISOString()); // Last hour
        
        if ((dhfLogged || 0) === 0) {
          dhfHealth -= 15;
          recommendations.push('DHF logging appears stalled');
        }
      } catch {
        dhfHealth = 50;
      }

      // ═══ SCAN HOLO-FLUID SYSTEM ═══
      let holoHealth = 100;
      const orbActive = document.querySelector('[data-zoe-orb]') !== null;
      
      if (!orbActive) {
        holoHealth -= 20;
        recommendations.push('Zoe Orb not detected in DOM');
      }

      // Calculate overall health
      const overallHealth = Math.round(
        (genesisHealth * 0.25) +
        (godModeHealth * 0.25) +
        (ecnHealth * 0.20) +
        (dhfHealth * 0.20) +
        (holoHealth * 0.10)
      );

      const status = overallHealth >= 80 ? 'healthy' 
        : overallHealth >= 50 ? 'degraded' 
        : 'critical';

      const result: UnifiedScanResult = {
        timestamp: new Date().toISOString(),
        overallHealth,
        status,
        subsystems: {
          genesis: { health: genesisHealth, issues: genesisIssues },
          godMode: { health: godModeHealth, lastScan: lastGodModeScan },
          ecn: { health: ecnHealth, pending: ecnPending, processed: ecnProcessed },
          dhf: { health: dhfHealth, dataFlowRate },
          holo: { health: holoHealth, orbActive }
        },
        fixes,
        recommendations
      };

      // Log to platform
      await supabase.from('platform_health_logs').insert([{
        user_id: user.id,
        score: overallHealth,
        status,
        scan_data: JSON.parse(JSON.stringify(result))
      }]);

      // Update state
      setState(prev => ({
        ...prev,
        isScanning: false,
        lastUnifiedScan: result,
        coreConnected: true,
        subsystemStatus: {
          genesis: genesisHealth >= 70 ? 'online' : genesisHealth >= 40 ? 'degraded' : 'offline',
          godMode: godModeHealth >= 70 ? 'online' : godModeHealth >= 40 ? 'degraded' : 'offline',
          ecn: ecnHealth >= 70 ? 'online' : ecnHealth >= 40 ? 'degraded' : 'offline',
          dhf: dhfHealth >= 70 ? 'online' : dhfHealth >= 40 ? 'degraded' : 'offline',
          holo: holoHealth >= 70 ? 'online' : holoHealth >= 40 ? 'degraded' : 'offline'
        }
      }));

      const duration = Date.now() - startTime;
      console.log(`[ZoeCoreUnified] Scan complete in ${duration}ms: ${overallHealth}% health`);

      // Show toast
      if (status === 'healthy') {
        toast.success(`Core Scan Complete: ${overallHealth}% Health`);
      } else if (status === 'degraded') {
        toast.warning(`Core Scan: ${overallHealth}% - ${recommendations.length} issues found`);
      } else {
        toast.error(`Critical Issues Detected: ${overallHealth}% Health`);
      }

      return result;

    } catch (error) {
      console.error('[ZoeCoreUnified] Scan error:', error);
      setState(prev => ({ ...prev, isScanning: false }));
      toast.error('Core scan failed');
      return null;
    }
  }, [user]);

  // ═══════════════════════════════════════════════════════════════════
  // ECN QUEUE PROCESSOR - Process pending emotional analysis
  // With throttling to prevent rate limiting
  // ═══════════════════════════════════════════════════════════════════
  const processECNQueue = useCallback(async (): Promise<{ processed: number; errors: number }> => {
    if (!user) return { processed: 0, errors: 0 };
    
    setState(prev => ({ ...prev, isProcessingECN: true }));
    let processed = 0;
    let errors = 0;

    try {
      // First, clean up old failed items (older than 1 hour) to prevent queue buildup
      await supabase
        .from('ecn_analysis_queue')
        .delete()
        .eq('status', 'failed')
        .lt('created_at', new Date(Date.now() - 3600000).toISOString());

      // Mark stale pending items as failed so queue does not get permanently clogged
      await supabase
        .from('ecn_analysis_queue')
        .update({
          status: 'failed',
          processed_at: new Date().toISOString(),
          analysis_result: {
            skipped: true,
            reason: 'stale_pending_timeout',
            marked_at: new Date().toISOString(),
          },
        })
        .eq('status', 'pending')
        .eq('user_id', user.id)
        .lt('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());

      // Get pending queue items for this user - limit to 5 to prevent rate limiting
      const { data: queueItems } = await supabase
        .from('ecn_analysis_queue')
        .select('id, events_batch, user_id, created_at')
        .eq('status', 'pending')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(5);

      if (!queueItems || queueItems.length === 0) {
        console.log('[ZoeCoreUnified] No pending ECN items');
        setState(prev => ({ ...prev, isProcessingECN: false }));
        return { processed: 0, errors: 0 };
      }

      console.log(`[ZoeCoreUnified] Processing ${queueItems.length} ECN queue items with throttling...`);

      // Get auth token for edge function
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.warn('[ZoeCoreUnified] No session for ECN processing');
        setState(prev => ({ ...prev, isProcessingECN: false }));
        return { processed: 0, errors: 1 };
      }

      // Process with throttling - 6 second delay between requests
      for (let i = 0; i < queueItems.length; i++) {
        const item = queueItems[i];
        
        // Add delay between requests (except first one)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 6000));
        }
        
        try {
          const events = typeof item.events_batch === 'string' 
            ? JSON.parse(item.events_batch) 
            : item.events_batch;

          const response = await supabase.functions.invoke('ecn-analysis-processor', {
            body: {
              events: Array.isArray(events) ? events : [events],
              queue_id: item.id
            }
          });

          if (response.error) {
            // Check if rate limited
            if (response.error.message?.includes('Rate limited') || response.error.message?.includes('429')) {
              console.log('[ZoeCoreUnified] Rate limited, stopping queue processing');
              break; // Stop processing, will retry later
            }
            
            console.error('[ZoeCoreUnified] ECN processing error:', response.error);
            errors++;
            
            // Mark as failed
            await supabase
              .from('ecn_analysis_queue')
              .update({ status: 'failed' })
              .eq('id', item.id);
          } else {
            processed++;
          }
        } catch (itemError) {
          console.error('[ZoeCoreUnified] Item processing error:', itemError);
          errors++;
        }
      }

      console.log(`[ZoeCoreUnified] ECN processing complete: ${processed} processed, ${errors} errors`);
      
      if (processed > 0) {
        toast.success(`Processed ${processed} emotional analysis items`);
      }

    } catch (error) {
      console.error('[ZoeCoreUnified] ECN queue error:', error);
      errors++;
    } finally {
      setState(prev => ({ ...prev, isProcessingECN: false }));
    }

    return { processed, errors };
  }, [user]);

  // ═══════════════════════════════════════════════════════════════════
  // SEED ECN HISTORY - Initialize emotional tracking
  // ═══════════════════════════════════════════════════════════════════
  const seedECNHistory = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      // Check if already has ECN history
      const { count: existing } = await supabase
        .from('ecn_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if ((existing || 0) > 0) {
        console.log('[ZoeCoreUnified] ECN history already exists');
        return true;
      }

      // Seed with initial neutral state
      // Note: engagement_score and valence are integers (0-100 scale)
      // stress_level is numeric (0.0-1.0 scale)
      const { error } = await supabase.from('ecn_history').insert({
        user_id: user.id,
        primary_emotion: 'neutral',
        valence: 50, // Neutral on 0-100 scale
        engagement_score: 50, // Moderate engagement on 0-100 scale
        stress_level: 0.2, // Low stress on 0-1 scale (numeric type)
        action_tendency: 'seeking_information',
        metadata: {
          seeded: true,
          source: 'ZoeCoreUnified',
          timestamp: new Date().toISOString()
        }
      });

      if (error) {
        console.error('[ZoeCoreUnified] ECN seeding error:', error);
        return false;
      }

      console.log('[ZoeCoreUnified] ECN history seeded successfully');
      toast.success('Emotional tracking initialized');
      return true;

    } catch (error) {
      console.error('[ZoeCoreUnified] ECN seed error:', error);
      return false;
    }
  }, [user]);

  // ═══════════════════════════════════════════════════════════════════
  // AUTO-INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!user) return;

    // Initial scan after mount
    const initTimeout = setTimeout(async () => {
      // Seed ECN if empty
      await seedECNHistory();
      
      // Run initial unified scan
      await runUnifiedDeepScan({ autoFix: true, processECN: true });
    }, 3000);

    // Periodic scans every 5 minutes
    scanIntervalRef.current = setInterval(() => {
      runUnifiedDeepScan({ autoFix: true, processECN: true });
    }, 5 * 60 * 1000);

    // Process ECN queue every 2 minutes
    ecnProcessorRef.current = setInterval(() => {
      processECNQueue();
    }, 2 * 60 * 1000);

    return () => {
      clearTimeout(initTimeout);
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (ecnProcessorRef.current) clearInterval(ecnProcessorRef.current);
    };
  }, [user, seedECNHistory, runUnifiedDeepScan, processECNQueue]);

  // ═══════════════════════════════════════════════════════════════════
  // DISPATCH EVENTS FOR OTHER SYSTEMS
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (state.lastUnifiedScan) {
      // Notify Holo-Fluid system
      window.dispatchEvent(new CustomEvent('zoe-core-health-update', {
        detail: {
          health: state.lastUnifiedScan.overallHealth,
          status: state.lastUnifiedScan.status,
          subsystems: state.lastUnifiedScan.subsystems
        }
      }));

      // Notify Genesis Engine
      window.dispatchEvent(new CustomEvent('zoe-unified-scan-complete', {
        detail: state.lastUnifiedScan
      }));
    }
  }, [state.lastUnifiedScan]);

  // ═══════════════════════════════════════════════════════════════════
  // ORCHESTRATOR INTEGRATION - Router/Navigator/Oracle Pattern
  // ═══════════════════════════════════════════════════════════════════
  const processCommand = useCallback(async (command: string, context?: Record<string, any>) => {
    // Check memory pressure first
    const pressure = memoryMonitor.check();
    if (pressure === 'critical') {
      console.warn('[ZoeCoreUnified] Blocking command due to critical memory pressure');
      toast.error('System under memory pressure - try again shortly');
      return null;
    }
    
    // Compress context if provided
    const compressedContext = context 
      ? contextCompressor.compress({
          userId: user?.id || 'unknown',
          currentPage: window.location.pathname,
          ...context,
        })
      : undefined;
    
    // Process through orchestrator
    return await zoeOrchestrator.process(command, compressedContext);
  }, [user]);

  const getOrchestratorStatus = useCallback(() => {
    return zoeOrchestrator.getStatus();
  }, []);

  const getMemoryStatus = useCallback(() => {
    return memoryMonitor.getStats();
  }, []);

  return {
    // State
    isScanning: state.isScanning,
    isProcessingECN: state.isProcessingECN,
    lastScan: state.lastUnifiedScan,
    coreConnected: state.coreConnected,
    subsystemStatus: state.subsystemStatus,

    // Actions
    runUnifiedDeepScan,
    processECNQueue,
    seedECNHistory,
    
    // Orchestrator Pattern (NEW)
    processCommand,
    getOrchestratorStatus,
    getMemoryStatus,

    // Computed
    overallHealth: state.lastUnifiedScan?.overallHealth ?? null,
    status: state.lastUnifiedScan?.status ?? null,
    recommendations: state.lastUnifiedScan?.recommendations ?? []
  };
};
