/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY — OFFLINE STATUS DASHBOARD (Phase 5)
 * Unified dashboard widget showing complete offline architecture status
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi,
  WifiOff,
  Database,
  Brain,
  MessageCircle,
  Sparkles,
  ChevronRight,
  Settings,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useZoeOfflineCore, type OfflineCapability } from '@/hooks/useZoeOfflineCore';
import { useMobileOfflineOptimizations } from '@/hooks/useMobileOfflineOptimizations';
import { OfflineTestRunner } from './OfflineTestRunner';
import { InitiativeProtocolIndicator } from './InitiativeProtocolIndicator';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface StatusItem {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'error' | 'neutral';
  icon: React.ComponentType<any>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAPABILITY CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const CAPABILITY_CONFIG: Record<OfflineCapability, { label: string; color: string; icon: string }> = {
  full: { label: 'Full Offline', color: 'text-green-400', icon: '🚀' },
  limited: { label: 'Limited Offline', color: 'text-amber-400', icon: '⚡' },
  minimal: { label: 'Basic Offline', color: 'text-orange-400', icon: '📝' },
  none: { label: 'Online Only', color: 'text-red-400', icon: '🌐' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface StatusRowProps {
  item: StatusItem;
}

const StatusRow: React.FC<StatusRowProps> = ({ item }) => {
  const Icon = item.icon;
  
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Icon className={cn(
          'w-4 h-4',
          item.status === 'good' ? 'text-green-400' :
          item.status === 'warning' ? 'text-amber-400' :
          item.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
        )} />
        <span className="text-sm text-foreground/80">{item.label}</span>
      </div>
      <span className={cn(
        'text-xs font-medium',
        item.status === 'good' ? 'text-green-400' :
        item.status === 'warning' ? 'text-amber-400' :
        item.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
      )}>
        {item.value}
      </span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface OfflineStatusDashboardProps {
  className?: string;
  compact?: boolean;
}

export const OfflineStatusDashboard: React.FC<OfflineStatusDashboardProps> = ({ 
  className, 
  compact = false 
}) => {
  const { user } = useAuth();
  const [showTestRunner, setShowTestRunner] = useState(false);
  const [expanded, setExpanded] = useState(!compact);
  
  const offlineCore = useZoeOfflineCore(user?.id || null);
  const mobileOptimizations = useMobileOfflineOptimizations();

  // Destructure for stable useMemo dependencies
  const {
    isOnline,
    connectionQuality,
    storageAvailable,
    cachedMessageCount,
    localLLMReady,
    offlineCapability,
    pendingSyncCount,
    hasProactiveContent,
  } = offlineCore;

  // Build status items with specific dependencies
  const statusItems = useMemo((): StatusItem[] => [
    {
      label: 'Network',
      value: isOnline ? connectionQuality : 'Offline',
      status: isOnline 
        ? (connectionQuality === 'excellent' || connectionQuality === 'good' ? 'good' : 'warning')
        : 'error',
      icon: isOnline ? Wifi : WifiOff,
    },
    {
      label: 'Storage',
      value: storageAvailable ? `${cachedMessageCount} msgs` : 'Unavailable',
      status: storageAvailable ? 'good' : 'error',
      icon: Database,
    },
    {
      label: 'Local AI',
      value: localLLMReady ? 'Ready' : (offlineCapability === 'minimal' ? 'Scripted' : 'Loading'),
      status: localLLMReady ? 'good' : (offlineCapability === 'minimal' ? 'warning' : 'neutral'),
      icon: Brain,
    },
    {
      label: 'Sync Queue',
      value: pendingSyncCount > 0 ? `${pendingSyncCount} pending` : 'Synced',
      status: pendingSyncCount === 0 ? 'good' : 'warning',
      icon: RefreshCw,
    },
    {
      label: 'Initiative',
      value: hasProactiveContent ? 'Active' : 'Idle',
      status: hasProactiveContent ? 'good' : 'neutral',
      icon: Sparkles,
    },
  ], [isOnline, connectionQuality, storageAvailable, cachedMessageCount, localLLMReady, offlineCapability, pendingSyncCount, hasProactiveContent]);

  const capabilityConfig = CAPABILITY_CONFIG[offlineCore.offlineCapability];
  const overallHealth = useMemo(() => {
    const goodCount = statusItems.filter(s => s.status === 'good').length;
    if (goodCount >= 4) return 'healthy';
    if (goodCount >= 2) return 'degraded';
    return 'critical';
  }, [statusItems]);

  // Compact view for nav/header
  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors',
          'bg-muted/50 hover:bg-muted border border-border',
          className
        )}
      >
        {offlineCore.isOnline ? (
          <Wifi className="w-4 h-4 text-green-400" />
        ) : (
          <WifiOff className="w-4 h-4 text-amber-400" />
        )}
        <span className="text-xs font-medium">
          {capabilityConfig.icon} {capabilityConfig.label}
        </span>
      </button>
    );
  }

  return (
    <>
      <div className={cn(
        'bg-background border border-border rounded-2xl overflow-hidden',
        className
      )}>
        {/* Header */}
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                overallHealth === 'healthy' ? 'bg-green-500/10' :
                overallHealth === 'degraded' ? 'bg-amber-500/10' : 'bg-destructive/10'
              )}>
                {overallHealth === 'healthy' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : overallHealth === 'degraded' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Offline Status</h3>
                <p className={cn('text-xs', capabilityConfig.color)}>
                  {capabilityConfig.icon} {capabilityConfig.label}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Platform indicator */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                {mobileOptimizations.platform === 'web' ? (
                  <Monitor className="w-3 h-3" />
                ) : (
                  <Smartphone className="w-3 h-3" />
                )}
                <span className="capitalize">{mobileOptimizations.platform}</span>
              </div>
              
              {compact && (
                <button 
                  onClick={() => setExpanded(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Items */}
        <div className="p-4 border-b border-border">
          <div className="divide-y divide-border">
            {statusItems.map((item) => (
              <StatusRow key={item.label} item={item} />
            ))}
          </div>
        </div>

        {/* Life Pattern Progress */}
        {offlineCore.lifePatternProgress > 0 && offlineCore.lifePatternProgress < 100 && (
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Downloading Life Pattern</span>
              <span className="text-xs font-medium">{Math.round(offlineCore.lifePatternProgress)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${offlineCore.lifePatternProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-4">
          <button
            onClick={() => setShowTestRunner(true)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Run Diagnostics</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Last Sync */}
        {offlineCore.lastSyncAt && (
          <div className="px-4 pb-4">
            <p className="text-xs text-muted-foreground text-center">
              Last sync: {new Date(offlineCore.lastSyncAt).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>

      {/* Test Runner Modal */}
      <AnimatePresence>
        {showTestRunner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowTestRunner(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md max-h-[80vh] overflow-auto"
            >
              <OfflineTestRunner onClose={() => setShowTestRunner(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Initiative Protocol Indicator */}
      {offlineCore.initiative && (
        <InitiativeProtocolIndicator
          type={offlineCore.initiative.type}
          priority={offlineCore.initiative.priority}
          message={offlineCore.initiative.message}
          onDismiss={() => offlineCore.consumeInitiative()}
          onAction={() => {
            offlineCore.consumeInitiative();
            // Navigate to chat or trigger action
          }}
        />
      )}
    </>
  );
};

export default OfflineStatusDashboard;
