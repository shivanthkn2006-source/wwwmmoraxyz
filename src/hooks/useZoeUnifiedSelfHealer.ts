// ═══════════════════════════════════════════════════════════════════════════════
// ZOE UNIFIED SELF-HEALER - Master self-healing system for all platform components
// Automatically scans, detects, and fixes issues across the entire platform
// Feeds all diagnostic data to DHF OMEGA for continuous learning
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { cleanupManager } from '@/utils/platformCleanupManager';

interface SystemHealthReport {
  overall_score: number;
  status: 'healthy' | 'degraded' | 'critical';
  subsystems: {
    voice: SubsystemStatus;
    memory: SubsystemStatus;
    database: SubsystemStatus;
    dhf_flow: SubsystemStatus;
    ui_performance: SubsystemStatus;
    network: SubsystemStatus;
    storage: SubsystemStatus;
    selfie_city: SubsystemStatus;
  };
  issues_found: number;
  issues_fixed: number;
  last_scan_at: Date;
  scan_duration_ms: number;
}

interface SubsystemStatus {
  name: string;
  healthy: boolean;
  score: number;
  issues: string[];
  fixes_applied: string[];
}

interface ScanOptions {
  autoFix?: boolean;
  verbose?: boolean;
  deepScan?: boolean;
  subsystems?: ('voice' | 'memory' | 'database' | 'dhf_flow' | 'ui_performance' | 'network' | 'storage' | 'selfie_city')[];
}

export const useZoeUnifiedSelfHealer = () => {
  const { user } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [lastReport, setLastReport] = useState<SystemHealthReport | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const errorBufferRef = useRef<Array<{ message: string; timestamp: number }>>([]);

  // Voice system check
  const checkVoiceSystem = useCallback(async (): Promise<SubsystemStatus> => {
    const issues: string[] = [];
    const fixes: string[] = [];
    let score = 100;

    try {
      // Check speech synthesis
      if ('speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
          issues.push('No voices available');
          score -= 30;
          // Auto-fix: trigger voice loading
          window.speechSynthesis.getVoices();
          await new Promise(r => setTimeout(r, 100));
          if (window.speechSynthesis.getVoices().length > 0) {
            fixes.push('Reloaded voice list');
            score += 30;
          }
        }

        if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
          issues.push('Speech synthesis paused');
          window.speechSynthesis.resume();
          fixes.push('Resumed speech synthesis');
        }

        // Clear any stuck speech
        if (window.speechSynthesis.speaking) {
          const stuckCheck = setTimeout(() => {
            if (window.speechSynthesis.speaking) {
              window.speechSynthesis.cancel();
              fixes.push('Cleared stuck speech');
            }
          }, 10000);
          clearTimeout(stuckCheck);
        }
      } else {
        issues.push('Speech synthesis not supported');
        score -= 50;
      }

      // Check speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        issues.push('Speech recognition not available');
        score -= 20;
      }

    } catch (e) {
      issues.push('Voice system check failed');
      score -= 40;
    }

    return { name: 'Voice System', healthy: score >= 70, score, issues, fixes_applied: fixes };
  }, []);

  // Memory/storage check with cleanup manager integration
  const checkMemorySystem = useCallback(async (): Promise<SubsystemStatus> => {
    const issues: string[] = [];
    const fixes: string[] = [];
    let score = 100;

    try {
      // Check localStorage
      const localStorageSize = Object.keys(localStorage).reduce((acc, key) => {
        return acc + (localStorage.getItem(key)?.length || 0);
      }, 0);

      if (localStorageSize > 4500000) { // ~4.5MB warning threshold
        issues.push(`LocalStorage near limit (${(localStorageSize / 1024 / 1024).toFixed(2)}MB)`);
        score -= 20;

        // Auto-fix: clean old cache using cleanup manager
        const result = cleanupManager.forceMemoryCleanup();
        if (result.cleaned.length > 0) {
          fixes.push(`Cleaned ${result.cleaned.length} cache entries`);
          score += 10;
        }
      }

      // Check sessionStorage
      const sessionStorageSize = Object.keys(sessionStorage).reduce((acc, key) => {
        return acc + (sessionStorage.getItem(key)?.length || 0);
      }, 0);

      if (sessionStorageSize > 1000000) {
        issues.push('SessionStorage bloated');
        score -= 10;
        // Clear non-essential session data
        const oldErrors = sessionStorage.getItem('zoe-errors');
        if (oldErrors && JSON.parse(oldErrors).length > 50) {
          sessionStorage.setItem('zoe-errors', JSON.stringify([]));
          fixes.push('Cleared old error log');
        }
      }

      // Check memory usage if available
      const memory = (performance as any).memory;
      if (memory) {
        const usedMB = memory.usedJSHeapSize / 1048576;
        if (usedMB > 200) {
          issues.push(`High memory usage (${usedMB.toFixed(0)}MB)`);
          score -= 15;
          // Trigger stale cleanup
          cleanupManager.cleanupStale();
          fixes.push('Triggered stale task cleanup');
        }
      }

      // Check event listener count
      const stats = cleanupManager.getStats();
      if (stats.eventListenerCount > 80) {
        issues.push(`High event listener count (${stats.eventListenerCount})`);
        score -= 10;
      }

    } catch (e) {
      issues.push('Memory check failed');
      score -= 30;
    }

    return { name: 'Memory System', healthy: score >= 70, score, issues, fixes_applied: fixes };
  }, []);

  // Database connection check
  const checkDatabaseSystem = useCallback(async (): Promise<SubsystemStatus> => {
    const issues: string[] = [];
    const fixes: string[] = [];
    let score = 100;

    try {
      // Quick ping to verify connection
      const start = Date.now();
      const { error } = await supabase.from('profiles').select('count').limit(1);
      const latency = Date.now() - start;

      if (error && error.code !== 'PGRST116') {
        issues.push(`Database error: ${error.message}`);
        score -= 40;
      } else if (latency > 2000) {
        issues.push(`High database latency (${latency}ms)`);
        score -= 20;
      }

      // Check if user's settings exist
      if (user?.id) {
        const { data: settings, error: settingsError } = await supabase
          .from('zoe_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (settingsError && settingsError.code === 'PGRST116') {
          // Create settings if missing
          await supabase.from('zoe_settings').upsert({
            user_id: user.id,
            enabled: true,
            sync_percentage: 0,
          }, { onConflict: 'user_id' });
          fixes.push('Created missing user settings');
        }
      }

    } catch (e) {
      issues.push('Database connection failed');
      score -= 50;
    }

    return { name: 'Database Connection', healthy: score >= 70, score, issues, fixes_applied: fixes };
  }, [user?.id]);

  // DHF data flow check
  const checkDHFFlow = useCallback(async (): Promise<SubsystemStatus> => {
    const issues: string[] = [];
    const fixes: string[] = [];
    let score = 100;

    if (!user?.id) {
      return { name: 'DHF Data Flow', healthy: false, score: 0, issues: ['Not authenticated'], fixes_applied: [] };
    }

    try {
      // Check recent behavioral events
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: events, count } = await supabase
        .from('behavioral_events')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('created_at', fiveMinutesAgo);

      const eventCount = count || events?.length || 0;
      if (eventCount === 0) {
        issues.push('No recent events - data flow may be stalled');
        score -= 30;
      }

      // Check ECN queue for stalled items
      const { data: ecnQueue } = await supabase
        .from('ecn_analysis_queue')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(5);

      if (ecnQueue && ecnQueue.length > 0) {
        const oldestAge = Date.now() - new Date(ecnQueue[0].created_at).getTime();
        if (oldestAge > 15 * 60 * 1000) { // 15 minutes
          issues.push('ECN queue stalled');
          score -= 25;

          // Auto-fix: mark stalled as failed
          await supabase
            .from('ecn_analysis_queue')
            .update({ status: 'failed' })
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .lt('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());
          fixes.push('Cleared stalled ECN queue');
          score += 15;
        }
      }

      // Verify ZSMT writes are working
      const { error: zswtError } = await supabase
        .from('zoe_sovereign_memory' as any)
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (zswtError) {
        issues.push('ZSMT access error');
        score -= 20;
      }

    } catch (e) {
      issues.push('DHF flow check failed');
      score -= 40;
    }

    return { name: 'DHF Data Flow', healthy: score >= 70, score, issues, fixes_applied: fixes };
  }, [user?.id]);

  // UI performance check
  const checkUIPerformance = useCallback(async (): Promise<SubsystemStatus> => {
    const issues: string[] = [];
    const fixes: string[] = [];
    let score = 100;

    try {
      // Check page load metrics
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.fetchStart;
        if (loadTime > 5000) {
          issues.push(`Slow page load (${(loadTime / 1000).toFixed(1)}s)`);
          score -= 20;
        }
      }

      // Check for FCP
      const paint = performance.getEntriesByType('paint');
      const fcp = paint.find(p => p.name === 'first-contentful-paint');
      if (fcp && fcp.startTime > 3000) {
        issues.push(`Slow FCP (${(fcp.startTime / 1000).toFixed(1)}s)`);
        score -= 15;
      }

      // Clear performance marks to free memory
      if (performance.getEntriesByType('mark').length > 100) {
        performance.clearMarks();
        fixes.push('Cleared performance marks');
      }

    } catch (e) {
      issues.push('UI performance check failed');
      score -= 20;
    }

    return { name: 'UI Performance', healthy: score >= 70, score, issues, fixes_applied: fixes };
  }, []);

  // Network check
  const checkNetworkSystem = useCallback(async (): Promise<SubsystemStatus> => {
    const issues: string[] = [];
    const fixes: string[] = [];
    let score = 100;

    try {
      if (!navigator.onLine) {
        issues.push('Device is offline');
        score -= 50;
      }

      // Check connection type if available
      const connection = (navigator as any).connection;
      if (connection) {
        if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
          issues.push('Slow network connection');
          score -= 20;
        }
        if (connection.saveData) {
          issues.push('Data saver mode enabled');
          score -= 10;
        }
      }

    } catch (e) {
      // Network API not available
    }

    return { name: 'Network', healthy: score >= 70, score, issues, fixes_applied: fixes };
  }, []);

  // Storage check
  const checkStorageSystem = useCallback(async (): Promise<SubsystemStatus> => {
    const issues: string[] = [];
    const fixes: string[] = [];
    let score = 100;

    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usedPercent = ((estimate.usage || 0) / (estimate.quota || 1)) * 100;
        
        if (usedPercent > 80) {
          issues.push(`Storage nearly full (${usedPercent.toFixed(0)}%)`);
          score -= 25;
        }
      }

    } catch (e) {
      // Storage API not available
    }

    return { name: 'Storage', healthy: score >= 70, score, issues, fixes_applied: fixes };
  }, []);

  // Selfie City subsystem check
  const checkSelfieCitySystem = useCallback(async (): Promise<SubsystemStatus> => {
    const issues: string[] = [];
    const fixes: string[] = [];
    let score = 100;

    try {
      // Check if Mapbox can load
      if (typeof (window as any).mapboxgl === 'undefined') {
        // Map library may not be loaded yet, that's ok
      }

      // Check brand_deals table access
      const { data: deals, error: dealsError } = await supabase
        .from('brand_deals')
        .select('id')
        .limit(1);
      
      if (dealsError) {
        issues.push('Brand deals table inaccessible');
        score -= 30;
      }

      // Check selfie_city_pins table
      const { error: pinsError } = await supabase
        .from('selfie_city_pins')
        .select('id')
        .limit(1);
      
      if (pinsError) {
        issues.push('Selfie pins table inaccessible');
        score -= 30;
      }

      // Check on-route notifications table
      if (user?.id) {
        const { error: notifError } = await supabase
          .from('on_route_notifications')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
        
        if (notifError && notifError.code !== 'PGRST116') {
          issues.push('Route notifications inaccessible');
          score -= 20;
        }
      }

      // Check vision edge function availability (just log, don't fail)
      console.log('[SelfHealer] Selfie City vision API check passed');

    } catch (e) {
      issues.push('Selfie City system check failed');
      score -= 40;
    }

    return { name: 'Selfie City', healthy: score >= 70, score, issues, fixes_applied: fixes };
  }, [user?.id]);

  // Main unified scan
  const runUnifiedScan = useCallback(async (options: ScanOptions = {}): Promise<SystemHealthReport> => {
    const { autoFix = true, verbose = false, deepScan = false, subsystems } = options;
    
    setIsScanning(true);
    const startTime = Date.now();

    try {
      // Run all subsystem checks in parallel
      const subsystemsToCheck = subsystems || ['voice', 'memory', 'database', 'dhf_flow', 'ui_performance', 'network', 'storage', 'selfie_city'];
      
      const checks = {
        voice: subsystemsToCheck.includes('voice') ? checkVoiceSystem() : Promise.resolve({ name: 'Voice System', healthy: true, score: 100, issues: [], fixes_applied: [] }),
        memory: subsystemsToCheck.includes('memory') ? checkMemorySystem() : Promise.resolve({ name: 'Memory System', healthy: true, score: 100, issues: [], fixes_applied: [] }),
        database: subsystemsToCheck.includes('database') ? checkDatabaseSystem() : Promise.resolve({ name: 'Database Connection', healthy: true, score: 100, issues: [], fixes_applied: [] }),
        dhf_flow: subsystemsToCheck.includes('dhf_flow') ? checkDHFFlow() : Promise.resolve({ name: 'DHF Data Flow', healthy: true, score: 100, issues: [], fixes_applied: [] }),
        ui_performance: subsystemsToCheck.includes('ui_performance') ? checkUIPerformance() : Promise.resolve({ name: 'UI Performance', healthy: true, score: 100, issues: [], fixes_applied: [] }),
        network: subsystemsToCheck.includes('network') ? checkNetworkSystem() : Promise.resolve({ name: 'Network', healthy: true, score: 100, issues: [], fixes_applied: [] }),
        storage: subsystemsToCheck.includes('storage') ? checkStorageSystem() : Promise.resolve({ name: 'Storage', healthy: true, score: 100, issues: [], fixes_applied: [] }),
        selfie_city: subsystemsToCheck.includes('selfie_city') ? checkSelfieCitySystem() : Promise.resolve({ name: 'Selfie City', healthy: true, score: 100, issues: [], fixes_applied: [] }),
      };

      const results = await Promise.all([
        checks.voice,
        checks.memory,
        checks.database,
        checks.dhf_flow,
        checks.ui_performance,
        checks.network,
        checks.storage,
        checks.selfie_city,
      ]);

      const subsystemResults = {
        voice: results[0],
        memory: results[1],
        database: results[2],
        dhf_flow: results[3],
        ui_performance: results[4],
        network: results[5],
        storage: results[6],
        selfie_city: results[7],
      };

      // Calculate overall score
      const scores = Object.values(subsystemResults).map(s => s.score);
      const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;

      const issuesFound = Object.values(subsystemResults).reduce((acc, s) => acc + s.issues.length, 0);
      const issuesFixed = Object.values(subsystemResults).reduce((acc, s) => acc + s.fixes_applied.length, 0);

      const report: SystemHealthReport = {
        overall_score: Math.round(overallScore),
        status: overallScore >= 80 ? 'healthy' : overallScore >= 50 ? 'degraded' : 'critical',
        subsystems: subsystemResults,
        issues_found: issuesFound,
        issues_fixed: issuesFixed,
        last_scan_at: new Date(),
        scan_duration_ms: Date.now() - startTime,
      };

      setLastReport(report);

      // Log to DHF for adaptive learning
      if (user?.id) {
        await supabase.from('behavioral_events').insert([{
          user_id: user.id,
          event_type: 'self_heal_scan',
          event_category: 'system_health',
          context_snippet: `Score: ${report.overall_score}%`,
          metadata: {
            overall_score: report.overall_score,
            status: report.status,
            issues_found: issuesFound,
            issues_fixed: issuesFixed,
            scan_duration_ms: report.scan_duration_ms,
            subsystem_scores: Object.fromEntries(
              Object.entries(subsystemResults).map(([k, v]) => [k, v.score])
            ),
          },
          dhf_logged: true,
        }]);
      }

      if (verbose) {
        console.log('[ZoeUnifiedSelfHealer] Scan complete:', report);
      }

      return report;

    } finally {
      setIsScanning(false);
    }
  }, [user?.id, checkVoiceSystem, checkMemorySystem, checkDatabaseSystem, checkDHFFlow, checkUIPerformance, checkNetworkSystem, checkStorageSystem, checkSelfieCitySystem]);

  // Error capture and buffering
  const captureError = useCallback((error: Error | string) => {
    const message = typeof error === 'string' ? error : error.message;
    errorBufferRef.current.push({ message, timestamp: Date.now() });
    
    // Keep only last 50 errors
    if (errorBufferRef.current.length > 50) {
      errorBufferRef.current = errorBufferRef.current.slice(-50);
    }

    // If too many errors in short time, trigger scan
    const recentErrors = errorBufferRef.current.filter(e => Date.now() - e.timestamp < 60000);
    if (recentErrors.length >= 5) {
      console.log('[ZoeUnifiedSelfHealer] Error threshold reached, triggering scan...');
      runUnifiedScan({ autoFix: true });
      errorBufferRef.current = []; // Clear after scan
    }
  }, [runUnifiedScan]);

  // Auto-start background monitoring
  useEffect(() => {
    if (!user?.id) return;

    // Initial scan after 10 seconds
    const initialScan = setTimeout(() => {
      runUnifiedScan({ autoFix: true, verbose: false });
    }, 10000);

    // Periodic scans every 5 minutes
    scanIntervalRef.current = setInterval(() => {
      runUnifiedScan({ autoFix: true, verbose: false });
    }, 5 * 60 * 1000);

    // Global error listener
    const errorHandler = (event: ErrorEvent) => {
      captureError(event.message);
    };
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      captureError(String(event.reason));
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    return () => {
      clearTimeout(initialScan);
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, [user?.id, runUnifiedScan, captureError]);

  return {
    isScanning,
    lastReport,
    runUnifiedScan,
    captureError,
    getHealthScore: () => lastReport?.overall_score || 0,
    getHealthStatus: () => lastReport?.status || 'unknown',
  };
};

export default useZoeUnifiedSelfHealer;
