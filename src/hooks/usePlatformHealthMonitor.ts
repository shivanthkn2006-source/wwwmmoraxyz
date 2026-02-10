import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface HealthIssue {
  id: string;
  category: 'error' | 'warning' | 'performance' | 'security' | 'database' | 'ui' | 'architecture';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  location: string;
  suggestedFix?: string;
  autoFixable: boolean;
  detected_at: string;
}

export interface PlatformHealth {
  score: number;
  status: 'healthy' | 'warning' | 'critical';
  issues: HealthIssue[];
  lastScan: string;
  suggestions: string[];
}

/**
 * GOD MODE: Autonomous Platform Health Monitor
 * Continuously scans the entire platform for issues, bugs, and optimization opportunities
 */
export const usePlatformHealthMonitor = () => {
  const { user } = useAuth();
  const [health, setHealth] = useState<PlatformHealth>({
    score: 100,
    status: 'healthy',
    issues: [],
    lastScan: new Date().toISOString(),
    suggestions: [],
  });
  const [isScanning, setIsScanning] = useState(false);
  const [autoScanEnabled, setAutoScanEnabled] = useState(true);

  // Comprehensive platform diagnostics
  const runDiagnostics = useCallback(async (): Promise<HealthIssue[]> => {
    const issues: HealthIssue[] = [];

    try {
      // 1. Database Health Check
      const { error: dbError } = await supabase.from('profiles').select('count').limit(1);
      if (dbError) {
        issues.push({
          id: 'db-connection',
          category: 'database',
          severity: 'critical',
          title: 'Database Connection Issue',
          description: `Database query failed: ${dbError.message}`,
          location: 'Database Layer',
          autoFixable: false,
          detected_at: new Date().toISOString(),
        });
      }

      // 2. Console Error Detection
      const consoleErrors = (window as any).__platformErrors || [];
      consoleErrors.forEach((error: any, index: number) => {
        issues.push({
          id: `console-error-${index}`,
          category: 'error',
          severity: 'high',
          title: 'JavaScript Console Error',
          description: error.message || 'Unknown console error',
          location: error.stack || 'Unknown location',
          autoFixable: false,
          detected_at: new Date().toISOString(),
        });
      });

      // 3. Performance Metrics
      if (window.performance) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
          if (loadTime > 3000) {
            issues.push({
              id: 'slow-load',
              category: 'performance',
              severity: 'medium',
              title: 'Slow Page Load',
              description: `Page load time: ${loadTime}ms (threshold: 3000ms)`,
              location: 'Application Bootstrap',
              suggestedFix: 'Consider code splitting, lazy loading, or optimizing bundle size',
              autoFixable: false,
              detected_at: new Date().toISOString(),
            });
          }
        }
      }

      // 4. Memory Leak Detection
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        const usedMemoryMB = memory.usedJSHeapSize / 1048576;
        const limitMemoryMB = memory.jsHeapSizeLimit / 1048576;
        
        if (usedMemoryMB > limitMemoryMB * 0.9) {
          issues.push({
            id: 'memory-high',
            category: 'performance',
            severity: 'high',
            title: 'High Memory Usage',
            description: `Memory usage: ${usedMemoryMB.toFixed(2)}MB / ${limitMemoryMB.toFixed(2)}MB`,
            location: 'Runtime Memory',
            suggestedFix: 'Check for memory leaks, unbounded arrays, or event listener cleanup',
            autoFixable: false,
            detected_at: new Date().toISOString(),
          });
        }
      }

      // 5. LocalStorage Health
      try {
        localStorage.setItem('health-check', 'ok');
        localStorage.removeItem('health-check');
      } catch (e) {
        issues.push({
          id: 'storage-quota',
          category: 'error',
          severity: 'medium',
          title: 'LocalStorage Quota Exceeded',
          description: 'LocalStorage is full or unavailable',
          location: 'Browser Storage',
          suggestedFix: 'Clear old data or implement storage cleanup',
          autoFixable: true,
          detected_at: new Date().toISOString(),
        });
      }

      // 6. Network Health
      if (!navigator.onLine) {
        issues.push({
          id: 'offline',
          category: 'error',
          severity: 'critical',
          title: 'No Internet Connection',
          description: 'Application is offline',
          location: 'Network Layer',
          autoFixable: false,
          detected_at: new Date().toISOString(),
        });
      }

      // 7. Unhandled Promise Rejections
      const unhandledRejections = (window as any).__unhandledRejections || [];
      unhandledRejections.forEach((rejection: any, index: number) => {
        issues.push({
          id: `rejection-${index}`,
          category: 'error',
          severity: 'high',
          title: 'Unhandled Promise Rejection',
          description: rejection.reason || 'Unknown rejection',
          location: 'Async Operations',
          autoFixable: false,
          detected_at: new Date().toISOString(),
        });
      });

      // 8. React Error Boundaries
      const reactErrors = (window as any).__reactErrors || [];
      reactErrors.forEach((error: any, index: number) => {
        issues.push({
          id: `react-error-${index}`,
          category: 'ui',
          severity: 'critical',
          title: 'React Component Error',
          description: error.message || 'Component rendering failed',
          location: error.componentStack || 'Unknown component',
          autoFixable: false,
          detected_at: new Date().toISOString(),
        });
      });

    } catch (error) {
      console.error('Diagnostics error:', error);
      issues.push({
        id: 'diagnostic-failure',
        category: 'error',
        severity: 'high',
        title: 'Diagnostic System Error',
        description: error instanceof Error ? error.message : 'Unknown diagnostic error',
        location: 'Health Monitor',
        autoFixable: false,
        detected_at: new Date().toISOString(),
      });
    }

    return issues;
  }, []);

  // Calculate health score
  const calculateHealthScore = (issues: HealthIssue[]): number => {
    let score = 100;
    
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 8;
          break;
        case 'low':
          score -= 3;
          break;
      }
    });

    return Math.max(0, score);
  };

  // Run full platform scan
  const scanPlatform = useCallback(async () => {
    if (isScanning) return;

    setIsScanning(true);
    try {
      const issues = await runDiagnostics();
      const score = calculateHealthScore(issues);
      
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (score < 50) status = 'critical';
      else if (score < 80) status = 'warning';

      const suggestions = generateSuggestions(issues);

      setHealth({
        score,
        status,
        issues,
        lastScan: new Date().toISOString(),
        suggestions,
      });

      // Store in database for admin review
      if (user?.id) {
        await supabase.from('platform_health_logs').insert({
          user_id: user.id,
          score,
          status,
          issues_count: issues.length,
          critical_issues: issues.filter(i => i.severity === 'critical').length,
          scan_data: issues as any,
        } as any);
      }

      if (issues.length > 0) {
        toast.warning(`Found ${issues.length} issue(s). Health Score: ${score}/100`);
      }

    } catch (error) {
      console.error('Platform scan failed:', error);
      toast.error('Platform scan failed');
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, runDiagnostics, user?.id]);

  // Generate intelligent suggestions
  const generateSuggestions = (issues: HealthIssue[]): string[] => {
    const suggestions: string[] = [];

    if (issues.some(i => i.category === 'performance')) {
      suggestions.push('Consider implementing code splitting and lazy loading');
      suggestions.push('Optimize image loading with lazy loading and WebP format');
    }

    if (issues.some(i => i.category === 'database')) {
      suggestions.push('Check database connection settings and RLS policies');
      suggestions.push('Review database query performance and indexing');
    }

    if (issues.some(i => i.category === 'error')) {
      suggestions.push('Implement comprehensive error boundaries');
      suggestions.push('Add proper error logging and monitoring');
    }

    if (issues.some(i => i.severity === 'critical')) {
      suggestions.push('Critical issues detected - immediate attention required');
    }

    return suggestions;
  };

  // Auto-scan at intervals
  useEffect(() => {
    if (!autoScanEnabled) return;

    // Initial scan
    scanPlatform();

    // Scan every 5 minutes for continuous monitoring
    const interval = setInterval(scanPlatform, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoScanEnabled, scanPlatform]);

  // Auto-refresh on critical issues detected
  useEffect(() => {
    const criticalIssues = health.issues.filter(i => i.severity === 'critical');
    
    if (criticalIssues.length > 0 && autoScanEnabled) {
      // Trigger more frequent scans when critical issues are present
      const criticalInterval = setInterval(scanPlatform, 2 * 60 * 1000); // Every 2 minutes
      return () => clearInterval(criticalInterval);
    }
  }, [health.issues, autoScanEnabled, scanPlatform]);

  // Setup error listeners
  useEffect(() => {
    // Track console errors
    const originalError = console.error;
    (window as any).__platformErrors = [];
    
    console.error = (...args: any[]) => {
      (window as any).__platformErrors.push({
        message: args.join(' '),
        timestamp: new Date().toISOString(),
      });
      originalError.apply(console, args);
    };

    // Track unhandled rejections
    (window as any).__unhandledRejections = [];
    const handleRejection = (event: PromiseRejectionEvent) => {
      (window as any).__unhandledRejections.push({
        reason: event.reason,
        timestamp: new Date().toISOString(),
      });
    };
    window.addEventListener('unhandledrejection', handleRejection);

    // Track React errors
    (window as any).__reactErrors = [];

    return () => {
      console.error = originalError;
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return {
    health,
    isScanning,
    autoScanEnabled,
    setAutoScanEnabled,
    scanPlatform,
  };
};
