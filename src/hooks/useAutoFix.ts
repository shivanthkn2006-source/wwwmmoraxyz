import { useEffect, useCallback } from 'react';
import { quickValidate } from '@/core/neurosymbolic/CodeValidationLayer';

interface Issue {
  type: string;
  description: string;
  fixed: boolean;
}

export const useAutoFix = () => {
  const runDiagnostics = useCallback((): Issue[] => {
    const issues: Issue[] = [];
    
    // Check localStorage bloat
    try {
      const totalSize = Object.keys(localStorage).reduce((acc, key) => {
        return acc + (localStorage.getItem(key)?.length || 0);
      }, 0);
      if (totalSize > 4000000) { // 4MB threshold
        // Auto-fix: Clear old cached data
        const keysToClean = ['zoe-old-cache', 'temp-data', 'expired-sessions'];
        keysToClean.forEach(k => localStorage.removeItem(k));
        issues.push({ type: 'storage', description: 'Cleared bloated localStorage', fixed: true });
      }
    } catch (e) {
      console.warn('AutoFix: localStorage check failed');
    }

    // Check for excessive DOM nodes (memory/performance indicator)
    try {
      const domNodeCount = document.querySelectorAll('*').length;
      if (domNodeCount > 3000) {
        issues.push({ type: 'memory', description: `High DOM node count: ${domNodeCount}`, fixed: false });
      }
    } catch (e) {}

    // Check for console errors in session
    const errorLog = sessionStorage.getItem('autofix-errors');
    if (errorLog) {
      const errors = JSON.parse(errorLog);
      if (errors.length > 10) {
        sessionStorage.removeItem('autofix-errors');
        issues.push({ type: 'errors', description: 'Cleared accumulated error log', fixed: true });
      }
    }

    // Code validation gate — validate any cached code patches before applying
    const pendingPatches = sessionStorage.getItem('autofix-pending-patches');
    if (pendingPatches) {
      try {
        const patches = JSON.parse(pendingPatches);
        const validatedPatches = patches.filter((patch: { code: string }) => {
          const validation = quickValidate(patch.code);
          if (!validation.valid) {
            issues.push({ type: 'code', description: `Blocked unsafe patch: ${validation.errors[0]}`, fixed: true });
          }
          return validation.valid;
        });
        if (validatedPatches.length < patches.length) {
          sessionStorage.setItem('autofix-pending-patches', JSON.stringify(validatedPatches));
        }
      } catch { /* ignore parse errors */ }
    }

    return issues;
  }, []);

  // Global error capture
  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      try {
        const errors = JSON.parse(sessionStorage.getItem('autofix-errors') || '[]');
        errors.push({
          message: event.message,
          timestamp: Date.now(),
          filename: event.filename
        });
        // Keep only last 20 errors
        sessionStorage.setItem('autofix-errors', JSON.stringify(errors.slice(-20)));
      } catch (e) {}
    };

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      try {
        const errors = JSON.parse(sessionStorage.getItem('autofix-errors') || '[]');
        errors.push({
          message: String(event.reason),
          timestamp: Date.now(),
          type: 'unhandled-rejection'
        });
        sessionStorage.setItem('autofix-errors', JSON.stringify(errors.slice(-20)));
      } catch (e) {}
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    // Auto-run diagnostics silently on mount - no prompts, no popups
    runDiagnostics();
    
    // Schedule periodic silent scans every 5 minutes
    const intervalId = setInterval(() => {
      runDiagnostics();
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, [runDiagnostics]);

  return { runDiagnostics };
};
