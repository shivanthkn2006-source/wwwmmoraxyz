// ═══════════════════════════════════════════════════════════════════════════════
// ZOE DHF FEATURE SCANNER PANEL
// Visual interface for system-wide scanning, error detection, and auto-fix
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scan,
  Shield,
  Cpu,
  Database,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  RefreshCw,
  Activity,
  Brain,
  Eye,
  Wrench,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  Volume2,
  VolumeX,
  Play,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeatureScanner, FeatureCapability, ScanError, SCANNER_VOICE_COMMANDS } from '@/hooks/useFeatureScanner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY ICONS
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  core_tools: <Cpu className="w-4 h-4" />,
  interface_elements: <LayoutGrid className="w-4 h-4" />,
  cognitive_modules: <Brain className="w-4 h-4" />,
  vr_features: <Eye className="w-4 h-4" />,
  security: <Shield className="w-4 h-4" />,
  ai_systems: <Sparkles className="w-4 h-4" />,
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  new: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  updated: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const ERROR_TYPE_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  error: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  security: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  performance: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  memory: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface FeatureScannerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeatureScannerPanel: React.FC<FeatureScannerPanelProps> = ({ isOpen, onClose }) => {
  const scanner = useFeatureScanner();
  const [activeTab, setActiveTab] = useState<'overview' | 'features' | 'errors' | 'commands'>('overview');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['core_tools', 'vr_features']));

  // Group features by category
  const featuresByCategory = scanner.systemManifest.reduce((acc, feature) => {
    if (!acc[feature.category]) acc[feature.category] = [];
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, FeatureCapability[]>);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Store scanner ref for stable auto-scan trigger
  const scannerRef = useRef(scanner);
  useEffect(() => {
    scannerRef.current = scanner;
  }, [scanner]);
  
  // Auto-run quick scan on open
  useEffect(() => {
    if (isOpen) {
      const currentScanner = scannerRef.current;
      if (!currentScanner.lastScan && !currentScanner.isScanning) {
        // Small delay to ensure panel is mounted
        const timer = setTimeout(() => {
          currentScanner.runScan('quick', { speak: false });
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const healthScore = scanner.lastScan?.summary.healthScore ?? 100;
  const healthColor = healthScore > 80 ? 'text-green-400' : healthScore > 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-4xl max-h-[85vh] mx-4 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 rounded-2xl border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-purple-500/5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Scan className={cn("w-6 h-6 text-cyan-400", scanner.isScanning && "animate-pulse")} />
                {scanner.isScanning && (
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-gpu-ring-expand" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Zoe Feature Scanner</h2>
                <p className="text-xs text-gray-400">System-wide diagnostics & auto-fix</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Health Score */}
              <div className="flex items-center gap-2">
                <Activity className={cn("w-5 h-5", healthColor)} />
                <span className={cn("text-2xl font-bold font-mono", healthColor)}>
                  {healthScore}%
                </span>
              </div>

              {/* Voice Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => scanner.setVoiceEnabled(!scanner.voiceEnabled)}
                className="p-2"
              >
                {scanner.voiceEnabled ? (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-gray-500" />
                )}
              </Button>

              {/* Close */}
              <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
                <XCircle className="w-5 h-5 text-gray-400" />
              </Button>
            </div>
          </div>

          {/* Scan Progress */}
          {scanner.isScanning && (
            <div className="px-6 py-3 bg-cyan-500/5 border-b border-cyan-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-cyan-300">{scanner.currentPhase}</span>
                <span className="text-sm text-cyan-400 font-mono">{scanner.scanProgress}%</span>
              </div>
              <Progress value={scanner.scanProgress} className="h-2" />
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-gray-700/50 bg-gray-900/50">
            {(['overview', 'features', 'errors', 'commands'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-3 text-sm font-medium transition-colors capitalize",
                  activeTab === tab 
                    ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5" 
                    : "text-gray-400 hover:text-white"
                )}
              >
                {tab}
                {tab === 'errors' && scanner.lastScan?.errors.length ? (
                  <Badge variant="destructive" className="ml-2 text-[10px] px-1.5">
                    {scanner.lastScan.errors.length}
                  </Badge>
                ) : null}
                {tab === 'features' && (
                  <Badge variant="outline" className="ml-2 text-[10px] px-1.5 border-cyan-500/50 text-cyan-400">
                    {scanner.systemManifest.length}
                  </Badge>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <ScrollArea className="h-[calc(85vh-200px)]">
            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Button
                      onClick={() => scanner.runScan('full')}
                      disabled={scanner.isScanning}
                      className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
                    >
                      {scanner.isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
                      Full Scan
                    </Button>
                    <Button
                      onClick={() => scanner.runScan('security')}
                      disabled={scanner.isScanning}
                      variant="outline"
                      className="flex items-center gap-2 border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                    >
                      <Shield className="w-4 h-4" />
                      Security
                    </Button>
                    <Button
                      onClick={() => scanner.runScan('memory')}
                      disabled={scanner.isScanning}
                      variant="outline"
                      className="flex items-center gap-2 border-pink-500/50 text-pink-400 hover:bg-pink-500/10"
                    >
                      <Database className="w-4 h-4" />
                      Memory
                    </Button>
                    <Button
                      onClick={() => scanner.runScan('errors', { autoFix: true })}
                      disabled={scanner.isScanning}
                      variant="outline"
                      className="flex items-center gap-2 border-green-500/50 text-green-400 hover:bg-green-500/10"
                    >
                      <Wrench className="w-4 h-4" />
                      Fix Errors
                    </Button>
                  </div>

                  {/* Summary Cards */}
                  {scanner.lastScan && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <SummaryCard
                        title="Features"
                        value={scanner.lastScan.summary.totalFeatures}
                        subtitle={`${scanner.lastScan.summary.newFeatures} new`}
                        icon={<Sparkles className="w-5 h-5 text-cyan-400" />}
                      />
                      <SummaryCard
                        title="Errors"
                        value={scanner.lastScan.summary.errors}
                        subtitle={`${scanner.lastScan.summary.warnings} warnings`}
                        icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
                        variant={scanner.lastScan.summary.errors > 0 ? 'error' : 'default'}
                      />
                      <SummaryCard
                        title="Fixes Applied"
                        value={scanner.lastScan.summary.fixesApplied}
                        subtitle="auto-fixed"
                        icon={<Wrench className="w-5 h-5 text-green-400" />}
                        variant="success"
                      />
                      <SummaryCard
                        title="Health"
                        value={`${scanner.lastScan.summary.healthScore}%`}
                        subtitle={scanner.lastScan.summary.healthScore > 80 ? 'Healthy' : 'Needs attention'}
                        icon={<Activity className="w-5 h-5" style={{ color: healthColor.replace('text-', '') }} />}
                      />
                    </div>
                  )}

                  {/* Recommendations */}
                  {scanner.lastScan?.recommendations.length ? (
                    <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20">
                      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        Recommendations
                      </h3>
                      <ul className="space-y-2">
                        {scanner.lastScan.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                            <span className="text-cyan-400">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {/* Last Scan Info */}
                  {scanner.lastScan && (
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <RefreshCw className="w-3 h-3" />
                      Last scan: {new Date(scanner.lastScan.timestamp).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {/* Features Tab */}
              {activeTab === 'features' && (
                <div className="space-y-4">
                  {Object.entries(featuresByCategory).map(([category, features]) => (
                    <Collapsible
                      key={category}
                      open={expandedCategories.has(category)}
                      onOpenChange={() => toggleCategory(category)}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 transition-colors">
                        <div className="flex items-center gap-3">
                          {CATEGORY_ICONS[category]}
                          <span className="text-sm font-medium text-white capitalize">
                            {category.replace(/_/g, ' ')}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {features.length}
                          </Badge>
                        </div>
                        {expandedCategories.has(category) ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-2 space-y-2 pl-4">
                          {features.map((feature) => (
                            <FeatureCard key={feature.id} feature={feature} />
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}

              {/* Errors Tab */}
              {activeTab === 'errors' && (
                <div className="space-y-4">
                  {!scanner.lastScan?.errors.length ? (
                    <div className="text-center py-12">
                      <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-white">No issues detected</p>
                      <p className="text-sm text-gray-400">Your platform is running smoothly</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-end">
                        <Button
                          onClick={() => scanner.autoFix(scanner.lastScan?.errors || [])}
                          disabled={!scanner.lastScan?.errors.some(e => e.fixable)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-500"
                        >
                          <Wrench className="w-4 h-4 mr-2" />
                          Fix All ({scanner.lastScan?.errors.filter(e => e.fixable).length || 0})
                        </Button>
                      </div>
                      {scanner.lastScan?.errors.map((error) => (
                        <ErrorCard key={error.id} error={error} />
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Commands Tab */}
              {activeTab === 'commands' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400 mb-4">
                    Use these voice or text commands to control the scanner:
                  </p>
                  <div className="grid gap-3">
                    {SCANNER_VOICE_COMMANDS.map((cmd, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700/50"
                      >
                        <div className="flex items-center gap-3">
                          <Play className="w-4 h-4 text-cyan-400" />
                          <code className="text-sm text-cyan-300 font-mono">
                            "{cmd.pattern.source.replace(/\(\?:/g, '').replace(/\\/g, '').replace(/\|/g, ' or ').replace(/\)/g, '').replace(/\[i\]/g, '').slice(0, 40)}..."
                          </code>
                        </div>
                        <span className="text-xs text-gray-500">{cmd.description}</span>
                      </div>
                    ))}
                  </div>

                  {/* Example Commands */}
                  <div className="mt-6 p-4 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                    <h4 className="text-sm font-semibold text-cyan-400 mb-3">Example Voice Commands:</h4>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li>"Zoe, scan for system status"</li>
                      <li>"Run full scan"</li>
                      <li>"Zoe, fix errors"</li>
                      <li>"Security scan"</li>
                      <li>"Check memory status"</li>
                      <li>"Show new features"</li>
                      <li>"Zoe, deep scan"</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const SummaryCard: React.FC<{
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  variant?: 'default' | 'error' | 'success';
}> = ({ title, value, subtitle, icon, variant = 'default' }) => (
  <div className={cn(
    "p-4 rounded-lg border",
    variant === 'error' ? "bg-red-500/5 border-red-500/20" :
    variant === 'success' ? "bg-green-500/5 border-green-500/20" :
    "bg-gray-800/50 border-gray-700/50"
  )}>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-xs text-gray-400">{title}</span>
    </div>
    <div className="text-2xl font-bold text-white">{value}</div>
    <div className="text-xs text-gray-500">{subtitle}</div>
  </div>
);

const FeatureCard: React.FC<{ feature: FeatureCapability }> = ({ feature }) => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-700/30 hover:border-cyan-500/30 transition-colors">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-white truncate">{feature.name}</span>
        <Badge className={cn("text-[10px]", STATUS_COLORS[feature.status])}>
          {feature.status}
        </Badge>
      </div>
      <p className="text-xs text-gray-500 truncate">{feature.description}</p>
    </div>
    <div className="flex items-center gap-2 ml-4">
      {feature.testResult && (
        feature.testResult === 'passed' ? (
          <CheckCircle className="w-4 h-4 text-green-400" />
        ) : feature.testResult === 'failed' ? (
          <XCircle className="w-4 h-4 text-red-400" />
        ) : (
          <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" />
        )
      )}
      <span className="text-[10px] text-gray-500 font-mono">v{feature.version}</span>
    </div>
  </div>
);

const ErrorCard: React.FC<{ error: ScanError }> = ({ error }) => (
  <div className={cn(
    "p-4 rounded-lg border",
    ERROR_TYPE_COLORS[error.type] || "bg-gray-800/50 border-gray-700/50"
  )}>
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium capitalize">{error.type}</span>
          <Badge variant="outline" className="text-[10px]">{error.category}</Badge>
          {error.fixable && (
            <Badge className="text-[10px] bg-green-500/20 text-green-400">Fixable</Badge>
          )}
        </div>
        <p className="text-sm text-white mb-1">{error.message}</p>
        <p className="text-xs text-gray-500">{error.location}</p>
        {error.suggestedFix && (
          <p className="text-xs text-cyan-400 mt-2">💡 {error.suggestedFix}</p>
        )}
      </div>
      <span className="text-[10px] text-gray-500 whitespace-nowrap">
        {new Date(error.timestamp).toLocaleTimeString()}
      </span>
    </div>
  </div>
);

export default FeatureScannerPanel;
