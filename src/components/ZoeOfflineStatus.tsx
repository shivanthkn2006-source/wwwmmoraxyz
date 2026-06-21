/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY — OFFLINE STATUS PANEL
 * Unified view of all offline capabilities and sync status
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi,
  WifiOff,
  Signal,
  Brain,
  HardDrive,
  Download,
  CheckCircle,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useZoeOfflineCore } from '@/hooks/useZoeOfflineCore';
import { cn } from '@/lib/utils';

interface ZoeOfflineStatusProps {
  userId: string | null;
  minimal?: boolean;
  className?: string;
}

export const ZoeOfflineStatus: React.FC<ZoeOfflineStatusProps> = ({
  userId,
  minimal = true,
  className,
}) => {
  const {
    isOnline,
    isSlowConnection,
    connectionQuality,
    offlineCapability,
    localLLMReady,
    cachedMessageCount,
    pendingSyncCount,
    lifePatternProgress,
    lastSyncAt,
    hasProactiveContent,
  } = useZoeOfflineCore(userId);

  const [expanded, setExpanded] = useState(false);

  // Auto-expand when offline or has proactive content
  useEffect(() => {
    if (!isOnline || hasProactiveContent) {
      setExpanded(true);
    }
  }, [isOnline, hasProactiveContent]);

  // Minimal indicator
  if (minimal && isOnline && !isSlowConnection && offlineCapability === 'full') {
    return null;
  }

  const getConnectionIcon = () => {
    if (!isOnline) return WifiOff;
    if (isSlowConnection) return Signal;
    return Wifi;
  };

  const getConnectionColor = () => {
    if (!isOnline) return 'text-warning';
    if (isSlowConnection) return 'text-muted-foreground';
    if (connectionQuality === 'excellent') return 'text-primary';
    return 'text-foreground';
  };

  const getCapabilityBadge = () => {
    switch (offlineCapability) {
      case 'full':
        return { label: 'Full Offline', color: 'bg-primary/20 text-primary' };
      case 'limited':
        return { label: 'Limited Offline', color: 'bg-muted text-muted-foreground' };
      case 'minimal':
        return { label: 'Basic Offline', color: 'bg-warning/20 text-warning' };
      default:
        return { label: 'Online Only', color: 'bg-destructive/20 text-destructive' };
    }
  };

  const ConnectionIcon = getConnectionIcon();
  const capabilityBadge = getCapabilityBadge();

  return (
    <motion.div
      className={cn(
        'fixed bottom-4 right-4 z-40 max-w-xs',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="bg-background/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-xl overflow-hidden">
        {/* Header - Always visible */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-full bg-muted/50', getConnectionColor())}>
              <ConnectionIcon className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">
                {isOnline ? (isSlowConnection ? 'Slow Connection' : 'Connected') : 'Offline Mode'}
              </p>
              <p className="text-xs text-muted-foreground">
                {capabilityBadge.label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasProactiveContent && (
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            )}
            {pendingSyncCount > 0 && (
              <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full">
                {pendingSyncCount}
              </span>
            )}
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Expanded Details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-border/50"
            >
              <div className="p-4 space-y-3">
                {/* Local LLM Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className={cn('w-4 h-4', localLLMReady ? 'text-primary' : 'text-muted-foreground')} />
                    <span className="text-sm text-foreground">Local AI Brain</span>
                  </div>
                  {localLLMReady ? (
                    <CheckCircle className="w-4 h-4 text-primary" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Loading...</span>
                  )}
                </div>

                {/* Cached Messages */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Cached Messages</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{cachedMessageCount}</span>
                </div>

                {/* Life Pattern Progress */}
                {lifePatternProgress > 0 && lifePatternProgress < 100 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-primary animate-pulse" />
                        <span className="text-sm text-foreground">Downloading Life Pattern</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{lifePatternProgress.toFixed(0)}%</span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${lifePatternProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Pending Sync */}
                {pendingSyncCount > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-warning" />
                      <span className="text-sm text-foreground">Pending Sync</span>
                    </div>
                    <span className="text-sm text-warning">{pendingSyncCount} items</span>
                  </div>
                )}

                {/* Last Sync */}
                {lastSyncAt && (
                  <p className="text-xs text-muted-foreground">
                    Last synced: {formatTimeAgo(lastSyncAt instanceof Date ? lastSyncAt : new Date(lastSyncAt))}
                  </p>
                )}

                {/* Offline Warning */}
                {!isOnline && (
                  <div className="flex items-start gap-2 p-2 bg-warning/10 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <p className="text-xs text-warning">
                      You're offline. Zoe will continue working with local data and sync when back online.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default ZoeOfflineStatus;
