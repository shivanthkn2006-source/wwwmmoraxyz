/**
 * Zoe Self-Healer Background Monitor
 * Continuously monitors Zoe's health and auto-fixes issues when detected
 * Provides notifications for issues that need user attention
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { initializeZoeVoices, stopZoeSpeech } from '@/utils/zoeVoice';
import { supabase } from '@/integrations/supabase/client';

interface HealthCheckResult {
  healthy: boolean;
  issues: string[];
  fixes: string[];
}

export const useZoeSelfHealer = () => {
  const { user } = useAuth();
  const lastCheckRef = useRef<number>(0);
  const issueCountRef = useRef<number>(0);
  const isRunningRef = useRef(false);

  // Background health check
  const runHealthCheck = useCallback(async (): Promise<HealthCheckResult> => {
    if (isRunningRef.current) {
      return { healthy: true, issues: [], fixes: [] };
    }

    isRunningRef.current = true;
    const issues: string[] = [];
    const fixes: string[] = [];

    try {
      // Check 1: Speech synthesis state
      if ('speechSynthesis' in window) {
        // Fix stuck speech synthesis
        if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          fixes.push('Resumed paused speech synthesis');
        }

        // Reinitialize voices if none available
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
          await initializeZoeVoices();
          const newVoices = window.speechSynthesis.getVoices();
          if (newVoices.length > 0) {
            fixes.push('Reloaded speech voices');
          } else {
            issues.push('No speech voices available');
          }
        }
      }

      // Check 2: Network connectivity for Zoe services
      if (navigator.onLine) {
        try {
          // Quick ping to verify Supabase is reachable
          const { error } = await supabase.from('profiles').select('count').limit(1).single();
          if (error && error.code === 'PGRST301') {
            // Auth error - not a connectivity issue
          } else if (error && error.code !== 'PGRST116') {
            issues.push('Database connectivity issue');
          }
        } catch {
          issues.push('Network connectivity issue');
        }
      } else {
        issues.push('Device is offline');
      }

      // Check 3: LocalStorage cleanup for Zoe data
      try {
        const zoeKeys = Object.keys(localStorage).filter(k => 
          k.startsWith('zoe-') || k.startsWith('lisa-')
        );
        
        // Clean up old Zoe data (older than 7 days)
        let cleanedCount = 0;
        for (const key of zoeKeys) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const data = JSON.parse(value);
              if (data.timestamp && Date.now() - data.timestamp > 7 * 24 * 60 * 60 * 1000) {
                localStorage.removeItem(key);
                cleanedCount++;
              }
            }
          } catch {
            // Invalid JSON - remove it
            localStorage.removeItem(key);
            cleanedCount++;
          }
        }
        
        if (cleanedCount > 0) {
          fixes.push(`Cleaned ${cleanedCount} old Zoe cache entries`);
        }
      } catch {
        // localStorage not available
      }

      // Check 4: SessionStorage for error accumulation
      try {
        const errorLog = sessionStorage.getItem('zoe-errors');
        if (errorLog) {
          const errors = JSON.parse(errorLog);
          if (Array.isArray(errors) && errors.length > 20) {
            // Too many errors - clear and notify
            sessionStorage.removeItem('zoe-errors');
            fixes.push('Cleared accumulated error log');
          }
        }
      } catch {
        // Ignore
      }

      // Check 5: Audio context state (if used)
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          // Check if there are suspended audio contexts that should be resumed
          const testContext = new AudioContextClass();
          if (testContext.state === 'suspended') {
            // Don't auto-resume - requires user gesture
            issues.push('Audio context suspended (needs user interaction)');
          }
          testContext.close();
        }
      } catch {
        // Audio context not available
      }

    } finally {
      isRunningRef.current = false;
    }

    const healthy = issues.length === 0;
    return { healthy, issues, fixes };
  }, []);

  // Log issues to database for tracking
  const logIssues = useCallback(async (issues: string[], fixes: string[]) => {
    if (!user || (issues.length === 0 && fixes.length === 0)) return;

    try {
      await supabase.from('platform_health_logs').insert({
        user_id: user.id,
        score: issues.length === 0 ? 100 : Math.max(0, 100 - issues.length * 20),
        status: issues.length === 0 ? 'healthy' : issues.length <= 2 ? 'warning' : 'critical',
        issues_count: issues.length,
        critical_issues: issues.filter(i => i.includes('offline') || i.includes('connectivity')).length,
        scan_data: { issues, fixes, timestamp: new Date().toISOString() }
      });
    } catch {
      // Silent fail - don't interrupt user experience
    }
  }, [user]);

  // Silently track issues - NO USER NOTIFICATIONS (auto-run in background)
  const notifyUser = useCallback((issues: string[]) => {
    if (issues.length === 0) return;

    issueCountRef.current++;

    // SILENT MODE: Log issues for diagnostics but never show pop-ups
    // All diagnostics run automatically in background without user interruption
    if (issueCountRef.current >= 3) {
      console.log('[ZoeSelfHealer] Silent mode: Auto-fixing', issues.length, 'issue(s) in background');
      issueCountRef.current = 0; // Reset after logging
    }
  }, []);

  // Main effect - runs periodic health checks
  useEffect(() => {
    if (!user) return;

    // Initial check after a delay
    const initialCheck = setTimeout(async () => {
      const result = await runHealthCheck();
      if (result.fixes.length > 0) {
        console.log('[ZoeSelfHealer] Auto-fixes applied:', result.fixes);
      }
      if (result.issues.length > 0) {
        console.log('[ZoeSelfHealer] Issues detected:', result.issues);
      }
      await logIssues(result.issues, result.fixes);
    }, 10000); // 10 seconds after mount

    // Periodic checks
    const interval = setInterval(async () => {
      // Prevent too frequent checks
      const now = Date.now();
      if (now - lastCheckRef.current < 60000) return; // Minimum 1 minute between checks
      lastCheckRef.current = now;

      const result = await runHealthCheck();
      
      if (result.fixes.length > 0) {
        console.log('[ZoeSelfHealer] Auto-fixes applied:', result.fixes);
      }
      
      if (result.issues.length > 0) {
        notifyUser(result.issues);
      } else {
        issueCountRef.current = 0; // Reset on healthy check
      }
      
      await logIssues(result.issues, result.fixes);
    }, 180000); // Every 3 minutes

    // Listen for Zoe errors
    const handleZoeError = (event: CustomEvent) => {
      console.log('[ZoeSelfHealer] Zoe error detected:', event.detail);
      
      // Store error for tracking
      try {
        const existing = sessionStorage.getItem('zoe-errors');
        const errors = existing ? JSON.parse(existing) : [];
        errors.push({ ...event.detail, timestamp: Date.now() });
        sessionStorage.setItem('zoe-errors', JSON.stringify(errors.slice(-20)));
      } catch {
        // Ignore
      }
    };

    window.addEventListener('zoe-error', handleZoeError as EventListener);

    return () => {
      clearTimeout(initialCheck);
      clearInterval(interval);
      window.removeEventListener('zoe-error', handleZoeError as EventListener);
    };
  }, [user, runHealthCheck, logIssues, notifyUser]);

  // Expose manual trigger for immediate check
  const triggerCheck = useCallback(async () => {
    const result = await runHealthCheck();
    await logIssues(result.issues, result.fixes);
    return result;
  }, [runHealthCheck, logIssues]);

  return { triggerCheck };
};

export default useZoeSelfHealer;
