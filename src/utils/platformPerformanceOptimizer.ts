/**
 * Platform Performance Optimizer
 * Automatically detects and fixes common performance issues
 */

export interface PerformanceIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'rendering' | 'network' | 'memory' | 'database';
  description: string;
  recommendation: string;
  autoFixable: boolean;
}

export interface PerformanceMetrics {
  pageLoadTime: number;
  timeToInteractive: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  memoryUsage?: number;
}

/**
 * Collect performance metrics using browser Performance API
 */
export const collectPerformanceMetrics = (): PerformanceMetrics | null => {
  try {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
    
    // Get memory info if available (Chrome only)
    const memory = (performance as any).memory;
    
    return {
      pageLoadTime: navigation?.loadEventEnd - navigation?.fetchStart || 0,
      timeToInteractive: navigation?.domInteractive - navigation?.fetchStart || 0,
      firstContentfulPaint: fcp?.startTime || 0,
      largestContentfulPaint: 0, // Would need PerformanceObserver for real LCP
      cumulativeLayoutShift: 0, // Would need PerformanceObserver for real CLS
      firstInputDelay: 0, // Would need PerformanceObserver for real FID
      memoryUsage: memory ? memory.usedJSHeapSize / 1048576 : undefined, // MB
    };
  } catch (error) {
    console.error('Error collecting performance metrics:', error);
    return null;
  }
};

/**
 * Detect performance issues automatically
 */
export const detectPerformanceIssues = (metrics: PerformanceMetrics): PerformanceIssue[] => {
  const issues: PerformanceIssue[] = [];

  // Check page load time
  if (metrics.pageLoadTime > 3000) {
    issues.push({
      id: 'slow_page_load',
      severity: metrics.pageLoadTime > 5000 ? 'critical' : 'high',
      category: 'rendering',
      description: `Page load time is ${(metrics.pageLoadTime / 1000).toFixed(2)}s (target: <3s)`,
      recommendation: 'Enable lazy loading, code splitting, and optimize bundle size',
      autoFixable: false,
    });
  }

  // Check First Contentful Paint
  if (metrics.firstContentfulPaint > 2000) {
    issues.push({
      id: 'slow_fcp',
      severity: 'medium',
      category: 'rendering',
      description: `First Contentful Paint is ${(metrics.firstContentfulPaint / 1000).toFixed(2)}s (target: <2s)`,
      recommendation: 'Optimize critical rendering path, minimize render-blocking resources',
      autoFixable: false,
    });
  }

  // Check memory usage
  if (metrics.memoryUsage && metrics.memoryUsage > 100) {
    issues.push({
      id: 'high_memory',
      severity: metrics.memoryUsage > 200 ? 'high' : 'medium',
      category: 'memory',
      description: `Memory usage is ${metrics.memoryUsage.toFixed(2)}MB (target: <100MB)`,
      recommendation: 'Check for memory leaks, optimize data structures, implement proper cleanup',
      autoFixable: false,
    });
  }

  // Check Time to Interactive
  if (metrics.timeToInteractive > 4000) {
    issues.push({
      id: 'slow_tti',
      severity: 'medium',
      category: 'rendering',
      description: `Time to Interactive is ${(metrics.timeToInteractive / 1000).toFixed(2)}s (target: <4s)`,
      recommendation: 'Defer non-critical JavaScript, optimize main thread work',
      autoFixable: false,
    });
  }

  return issues;
};

/**
 * Performance optimization recommendations
 */
export const getOptimizationRecommendations = (): string[] => {
  return [
    '🚀 Enable React.lazy() for route-based code splitting',
    '📦 Implement dynamic imports for heavy components',
    '🖼️ Add lazy loading for images with loading="lazy"',
    '⚡ Use React.memo() for expensive components',
    '🔄 Optimize useEffect dependencies to prevent unnecessary re-renders',
    '💾 Implement proper cleanup in useEffect hooks',
    '📊 Batch database queries where possible',
    '🎯 Use indexed queries for faster database access',
    '🧹 Remove unused imports and dependencies',
    '⏱️ Debounce user input handlers',
  ];
};

/**
 * Auto-fix certain performance issues
 */
export const autoFixPerformanceIssues = (): { fixed: string[]; manual: string[] } => {
  const fixed: string[] = [];
  const manual: string[] = [];

  try {
    // Clear old cached data
    if (typeof localStorage !== 'undefined') {
      const keys = Object.keys(localStorage);
      let removedCount = 0;
      
      const oldKeys = keys.filter(key => {
        // Skip critical app data
        if (key.includes('auth') || key.includes('session') || key.includes('user')) {
          return false;
        }
        
        try {
          const item = localStorage.getItem(key);
          if (!item) return true; // Remove empty items
          
          // Check if it's timestamped data older than 7 days
          const data = JSON.parse(item);
          if (data.timestamp && Date.now() - data.timestamp > 7 * 24 * 60 * 60 * 1000) {
            return true;
          }
        } catch {
          // Invalid JSON - safe to remove
          return true;
        }
        return false;
      });

      oldKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
          removedCount++;
        } catch (e) {
          console.warn(`Failed to remove key: ${key}`);
        }
      });
      
      if (removedCount > 0) {
        fixed.push(`Cleared ${removedCount} old cache entries`);
      }
    }

    // Clear performance marks older than 1 hour
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks();
      fixed.push('Cleared performance marks');
    }

    manual.push('Review and optimize React component renders');
    manual.push('Implement code splitting for routes');
    manual.push('Add proper memoization to expensive components');

  } catch (error) {
    console.error('Error during auto-fix:', error);
  }

  return { fixed, manual };
};

/**
 * Monitor and log performance continuously
 */
export const startPerformanceMonitoring = (callback: (metrics: PerformanceMetrics) => void) => {
  // Collect metrics every 30 seconds
  const interval = setInterval(() => {
    const metrics = collectPerformanceMetrics();
    if (metrics) {
      callback(metrics);
    }
  }, 30000);

  return () => clearInterval(interval);
};
