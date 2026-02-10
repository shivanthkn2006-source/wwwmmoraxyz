/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OFFLINE MODE OVERLAY - 500 SPARTANS PROTOCOL
 * 
 * CHECK 3: THE "CHAOS" CONFIRMATION
 * 
 * When WiFi is turned off, the app should gracefully freeze with:
 * "Offline Mode - Using Neural Cache"
 * 
 * Instead of crashing to white screen, users see cached data with this overlay.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Database, Zap, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OfflineModeOverlayProps {
  showBanner?: boolean; // Show minimal banner instead of full overlay
}

const OfflineModeOverlay: React.FC<OfflineModeOverlayProps> = ({ showBanner = false }) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showDetails, setShowDetails] = useState(false);
  const [cachedDataStats, setCachedDataStats] = useState({
    posts: 0,
    messages: 0,
    users: 0,
  });

  // Calculate cached data stats
  const calculateCacheStats = useCallback(() => {
    try {
      const posts = JSON.parse(localStorage.getItem('zoe_offline_posts') || '[]');
      const messages = JSON.parse(localStorage.getItem('zoe_offline_messages') || '[]');
      const users = JSON.parse(localStorage.getItem('zoe_offline_users') || '[]');
      
      setCachedDataStats({
        posts: posts.length,
        messages: messages.length,
        users: users.length,
      });
    } catch {
      setCachedDataStats({ posts: 0, messages: 0, users: 0 });
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      console.log('[OfflineOverlay] Connection restored');
    };

    const handleOffline = () => {
      setIsOffline(true);
      calculateCacheStats();
      console.log('[OfflineOverlay] Connection lost - Neural Cache active');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      calculateCacheStats();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [calculateCacheStats]);

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  if (!isOffline) return null;

  // Banner mode - minimal notification
  if (showBanner) {
    return (
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        exit={{ y: -100 }}
        className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500/90 text-black py-2 px-4"
      >
        <div className="flex items-center justify-center gap-2 text-sm font-medium">
          <WifiOff className="w-4 h-4" />
          <span>Offline Mode - Using Neural Cache</span>
          <Database className="w-4 h-4 ml-2" />
        </div>
      </motion.div>
    );
  }

  // Full overlay mode
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] pointer-events-none"
      >
        {/* Top Banner */}
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-black py-3 px-4 pointer-events-auto"
        >
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="relative">
                <WifiOff className="w-5 h-5" />
                {/* CSS animation instead of framer-motion */}
                <div className="absolute -inset-1 rounded-full bg-black/20 animate-gpu-pulse-scale-lg" />
              </div>
              <div>
                <span className="font-bold text-sm">Offline Mode</span>
                <span className="text-xs ml-2 opacity-80">Using Neural Cache</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs underline hover:no-underline"
              >
                {showDetails ? 'Hide' : 'Details'}
              </button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleRetry}
                className="h-7 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </div>
          </div>
          
          {/* Details Panel */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 mt-3 border-t border-black/20">
                  <div className="flex items-center justify-center gap-6 text-xs">
                    <div className="flex items-center gap-1">
                      <Database className="w-3 h-3" />
                      <span>{cachedDataStats.posts} cached posts</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>{cachedDataStats.messages} cached messages</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>{cachedDataStats.users} cached users</span>
                    </div>
                  </div>
                  <p className="text-center text-xs mt-2 opacity-70">
                    Zoe is running locally with cached data. Online features will sync when connected.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Neural Cache Indicator (bottom right) */}
        <motion.div
          initial={{ x: 100 }}
          animate={{ x: 0 }}
          className="absolute bottom-20 right-4 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg pointer-events-auto border border-border"
        >
          <div className="flex items-center gap-2 text-xs">
            <div className="relative">
              <Database className="w-4 h-4 text-primary" />
              {/* CSS animation instead of framer-motion */}
              <div className="absolute -inset-1 rounded-full bg-primary/20 animate-gpu-pulse-opacity" />
            </div>
            <span className="text-muted-foreground">Neural Cache Active</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OfflineModeOverlay;
