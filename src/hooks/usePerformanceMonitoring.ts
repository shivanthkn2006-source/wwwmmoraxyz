import { useEffect, useState, useRef } from 'react';
import { collectPerformanceMetrics, detectPerformanceIssues, autoFixPerformanceIssues, type PerformanceMetrics, type PerformanceIssue } from '@/utils/platformPerformanceOptimizer';

/**
 * Hook for deferred performance monitoring with auto-fix capabilities
 * Optimized to not block initial render
 */
export const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [issues, setIssues] = useState<PerformanceIssue[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    // Skip if already initialized
    if (initialized.current) return;
    initialized.current = true;

    // Defer initial performance check significantly to not block render
    const initialTimeout = setTimeout(() => {
      // Use requestIdleCallback for non-blocking execution
      const runCheck = () => {
        const initialMetrics = collectPerformanceMetrics();
        if (initialMetrics) {
          setMetrics(initialMetrics);
          const detectedIssues = detectPerformanceIssues(initialMetrics);
          setIssues(detectedIssues);
        }
      };

      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(runCheck, { timeout: 5000 });
      } else {
        runCheck();
      }
    }, 5000); // 5 second delay before first check

    // Start continuous monitoring with longer interval
    setIsMonitoring(true);
    const interval = setInterval(() => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          const newMetrics = collectPerformanceMetrics();
          if (newMetrics) {
            setMetrics(newMetrics);
            const newIssues = detectPerformanceIssues(newMetrics);
            setIssues(newIssues);
          }
        }, { timeout: 10000 });
      } else {
        const newMetrics = collectPerformanceMetrics();
        if (newMetrics) {
          setMetrics(newMetrics);
          const newIssues = detectPerformanceIssues(newMetrics);
          setIssues(newIssues);
        }
      }
    }, 120000); // Check every 2 minutes instead of 1

    // Defer auto-fix even more
    const autoFixTimeout = setTimeout(() => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          const { fixed } = autoFixPerformanceIssues();
          if (fixed.length > 0) {
            console.log('[PerformanceOptimizer] Auto-fixed:', fixed);
          }
        }, { timeout: 10000 });
      }
    }, 10000); // 10 second delay

    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(autoFixTimeout);
      clearInterval(interval);
      setIsMonitoring(false);
    };
  }, []);

  const runManualOptimization = () => {
    const { fixed, manual } = autoFixPerformanceIssues();
    return { fixed, manual };
  };

  return {
    metrics,
    issues,
    isMonitoring,
    criticalIssues: issues.filter(i => i.severity === 'critical' || i.severity === 'high'),
    runManualOptimization,
  };
};
