/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY — OFFLINE TEST RUNNER UI (Phase 4)
 * Visual interface for running and displaying integration tests
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useOfflineIntegrationTest, type TestResult, type IntegrationTestReport } from '@/hooks/useOfflineIntegrationTest';

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const PHASE_CONFIG: Record<number, { name: string; icon: string; color: string }> = {
  1: { name: 'PWA + Storage', icon: '💾', color: 'text-blue-400' },
  2: { name: 'Voice + Network', icon: '🎙️', color: 'text-green-400' },
  3: { name: 'Local LLM', icon: '🧠', color: 'text-purple-400' },
  4: { name: 'Background Sync', icon: '🔄', color: 'text-amber-400' },
  5: { name: 'Initiative Protocol', icon: '💫', color: 'text-pink-400' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface TestResultItemProps {
  result: TestResult;
  index: number;
}

const TestResultItem: React.FC<TestResultItemProps> = ({ result, index }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'border rounded-lg overflow-hidden transition-colors',
        result.passed ? 'border-green-500/20 bg-green-500/5' : 'border-destructive/20 bg-destructive/5'
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center gap-3 text-left"
      >
        {result.passed ? (
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">{result.name}</span>
            <span className={cn('text-xs', PHASE_CONFIG[result.phase]?.color)}>
              Phase {result.phase}
            </span>
          </div>
        </div>
        
        <span className="text-xs text-muted-foreground">{result.duration}ms</span>
        
        {(result.details || result.error) && (
          expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      
      <AnimatePresence>
        {expanded && (result.details || result.error) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 text-xs">
              {result.details && (
                <p className="text-muted-foreground">{result.details}</p>
              )}
              {result.error && (
                <p className="text-destructive mt-1">Error: {result.error}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface PhaseGroupProps {
  phase: number;
  results: TestResult[];
}

const PhaseGroup: React.FC<PhaseGroupProps> = ({ phase, results }) => {
  const [collapsed, setCollapsed] = useState(false);
  const config = PHASE_CONFIG[phase];
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const allPassed = passed === total;

  return (
    <div className="mb-4">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 mb-2 text-left"
      >
        <span className="text-lg">{config?.icon}</span>
        <span className={cn('text-sm font-medium', config?.color)}>{config?.name}</span>
        <span className={cn(
          'text-xs px-1.5 py-0.5 rounded',
          allPassed ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
        )}>
          {passed}/{total}
        </span>
        <div className="flex-1" />
        {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>
      
      {!collapsed && (
        <div className="space-y-2 pl-6">
          {results.map((result, i) => (
            <TestResultItem key={result.name} result={result} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface OfflineTestRunnerProps {
  className?: string;
  onClose?: () => void;
}

export const OfflineTestRunner: React.FC<OfflineTestRunnerProps> = ({ className, onClose }) => {
  const { user } = useAuth();
  const { isRunning, progress, lastReport, runTests, abort } = useOfflineIntegrationTest(user?.id || null);

  const handleRunTests = async () => {
    try {
      await runTests();
    } catch (err) {
      console.error('[OfflineTestRunner] Test run failed:', err);
    }
  };

  // Group results by phase - memoized to prevent recalculation
  const groupedResults = React.useMemo(() => {
    if (!lastReport?.results) return {};
    return lastReport.results.reduce((acc, result) => {
      if (!acc[result.phase]) acc[result.phase] = [];
      acc[result.phase].push(result);
      return acc;
    }, {} as Record<number, TestResult[]>);
  }, [lastReport?.results]);

  return (
    <div className={cn('bg-background border border-border rounded-2xl overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Offline Architecture Test</h3>
              <p className="text-xs text-muted-foreground">Validate all 5 phases</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={isRunning ? abort : handleRunTests}
            disabled={!user}
            className={cn(
              'flex-1 py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors',
              isRunning
                ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
              !user && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running... {progress}%
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run All Tests
              </>
            )}
          </button>
          
          {lastReport && !isRunning && (
            <button
              onClick={handleRunTests}
              className="p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
              title="Re-run tests"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        {!user && (
          <p className="text-xs text-amber-500 mt-2 text-center">
            Please log in to run tests
          </p>
        )}
      </div>

      {/* Progress Bar */}
      {isRunning && (
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Results */}
      {lastReport && !isRunning && (
        <div className="p-4">
          {/* Summary */}
          <div className={cn(
            'p-4 rounded-xl mb-4 flex items-center gap-4',
            lastReport.overallStatus === 'pass' ? 'bg-green-500/10' :
            lastReport.overallStatus === 'fail' ? 'bg-destructive/10' : 'bg-amber-500/10'
          )}>
            {lastReport.overallStatus === 'pass' ? (
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            ) : lastReport.overallStatus === 'fail' ? (
              <XCircle className="w-8 h-8 text-destructive" />
            ) : (
              <AlertCircle className="w-8 h-8 text-amber-500" />
            )}
            <div>
              <p className="font-semibold text-foreground">
                {lastReport.passed}/{lastReport.totalTests} Tests Passed
              </p>
              <p className="text-xs text-muted-foreground">
                Completed in {lastReport.duration}ms
              </p>
            </div>
          </div>

          {/* Recommendations */}
          {lastReport.recommendations.length > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Recommendations:</p>
              <ul className="space-y-1">
                {lastReport.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Grouped Results */}
          <div className="max-h-[400px] overflow-y-auto pr-2">
            {Object.entries(groupedResults)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([phase, results]) => (
                <PhaseGroup key={phase} phase={Number(phase)} results={results} />
              ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!lastReport && !isRunning && (
        <div className="p-8 text-center text-muted-foreground">
          <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Click "Run All Tests" to validate offline architecture</p>
        </div>
      )}
    </div>
  );
};

export default OfflineTestRunner;
