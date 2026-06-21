/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY — LIFE PATTERN DOWNLOAD STATUS
 * Visual indicator for the 50MB background data sync
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { useIsOnline } from '@/hooks/useNetworkStatus';

interface LifePatternStatusProps {
  userId: string | null;
  compact?: boolean;
}

export const LifePatternStatus: React.FC<LifePatternStatusProps> = ({ userId, compact = false }) => {
  const { isActive, downloadProgress, queueSize, lastSyncAt, errors } = useBackgroundSync(userId);
  const isOnline = useIsOnline();

  // Don't render if nothing to show
  if (!isActive && queueSize === 0 && downloadProgress === 0) {
    return null;
  }

  if (compact) {
    return (
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-20 right-4 z-50"
          >
            <div className="bg-background/80 backdrop-blur-lg border border-border/50 rounded-full p-2 shadow-lg">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Download className="w-4 h-4 text-primary" />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-20 right-4 z-50 max-w-xs"
      >
        <div className="bg-background/90 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-full ${isOnline ? 'bg-primary/10' : 'bg-muted'}`}>
              {isActive ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Download className={`w-4 h-4 ${isOnline ? 'text-primary' : 'text-muted-foreground'}`} />
                </motion.div>
              ) : downloadProgress === 100 ? (
                <CheckCircle className="w-4 h-4 text-primary" />
              ) : (
                isOnline ? <Wifi className="w-4 h-4 text-primary" /> : <WifiOff className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {isActive
                  ? 'Syncing Life Pattern'
                  : downloadProgress === 100
                  ? 'Life Pattern Ready'
                  : 'Background Sync'}
              </p>
              <p className="text-xs text-muted-foreground">
                {!isOnline
                  ? 'Waiting for connection...'
                  : isActive
                  ? `${queueSize} item${queueSize !== 1 ? 's' : ''} in queue`
                  : lastSyncAt
                  ? `Last sync: ${formatTimeAgo(lastSyncAt)}`
                  : 'Ready to sync'}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          {downloadProgress > 0 && downloadProgress < 100 && (
            <div className="mb-3">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-primary/60"
                  initial={{ width: 0 }}
                  animate={{ width: `${downloadProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {downloadProgress.toFixed(0)}% • Up to 50MB offline data
              </p>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded-lg">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{errors[errors.length - 1]}</p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

function formatTimeAgo(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  
  if (isNaN(seconds) || seconds < 0) return 'just now';
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default LifePatternStatus;
