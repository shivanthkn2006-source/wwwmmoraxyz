import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, XCircle, Activity } from 'lucide-react';
import { collectPerformanceMetrics, detectPerformanceIssues, type PerformanceIssue, type PerformanceMetrics } from '@/utils/platformPerformanceOptimizer';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

/**
 * Real-time Platform Health Monitor
 * Displays performance warnings to users when issues are detected
 */
export const PlatformHealthMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [issues, setIssues] = useState<PerformanceIssue[]>([]);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // Defer initial check significantly to not block page load
    const initialTimeout = setTimeout(() => {
      const initialMetrics = collectPerformanceMetrics();
      if (initialMetrics) {
        setMetrics(initialMetrics);
        const detectedIssues = detectPerformanceIssues(initialMetrics);
        setIssues(detectedIssues);
        
        // Show warning if critical or high severity issues found
        if (detectedIssues.some(i => i.severity === 'critical' || i.severity === 'high')) {
          setShowWarning(true);
          // Auto-hide after 8 seconds
          setTimeout(() => setShowWarning(false), 8000);
        }
      }
    }, 8000); // 8 second delay - let page fully load first

    // Monitor continuously with longer interval
    const interval = setInterval(() => {
      const newMetrics = collectPerformanceMetrics();
      if (newMetrics) {
        setMetrics(newMetrics);
        const newIssues = detectPerformanceIssues(newMetrics);
        setIssues(newIssues);
      }
    }, 120000); // Check every 2 minutes

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  const criticalIssues = issues.filter(i => i.severity === 'critical' || i.severity === 'high');

  if (!showWarning || criticalIssues.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-20 right-4 z-[9999] max-w-sm"
      >
        <Card 
          className="p-4 backdrop-blur-2xl border-yellow-500/30 shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, hsl(45, 93%, 47% / 0.1), hsl(25, 95%, 53% / 0.15))',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="animate-gpu-warning-shake">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Performance Advisory</h4>
                <button
                  onClick={() => setShowWarning(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
              
              {criticalIssues.slice(0, 2).map(issue => (
                <div key={issue.id} className="text-xs space-y-1">
                  <Badge 
                    variant="outline"
                    className="text-[10px]"
                    style={{
                      borderColor: issue.severity === 'critical' ? '#ef4444' : '#f59e0b',
                      color: issue.severity === 'critical' ? '#ef4444' : '#f59e0b',
                    }}
                  >
                    {issue.severity.toUpperCase()}
                  </Badge>
                  <p className="text-muted-foreground">{issue.description}</p>
                </div>
              ))}
              
              <p className="text-[10px] text-muted-foreground mt-2">
                Platform is self-optimizing in background
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
