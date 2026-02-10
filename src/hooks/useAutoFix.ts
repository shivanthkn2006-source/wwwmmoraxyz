import { useEffect, useCallback } from 'react';

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

    // Check for stale event listeners (memory leak prevention)
    try {
      const eventCount = (window as any).__eventListenerCount || 0;
      if (eventCount > 100) {
        issues.push({ type: 'memory', description: 'High event listener count detected', fixed: false });
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
