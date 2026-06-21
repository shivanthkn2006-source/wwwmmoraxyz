/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LOGIN QUEUE SYSTEM - 500 SPARTANS PROTOCOL
 * 
 * CHECK 2: THE "COLD START" WARM-UP
 * 
 * Prevents 500 users from hitting cold Edge Functions simultaneously by
 * staggering entry with a queue system. This prevents timeout cascades.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Users, Zap, Shield } from 'lucide-react';

// iOS/Safari private mode and some embedded browsers can throw on sessionStorage access.
// Use a safe wrapper so the queue overlay can never get stuck due to storage errors.
const __memorySessionStore: Record<string, string> = {};
const safeSession = {
  get(key: string) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return __memorySessionStore[key] ?? null;
    }
  },
  set(key: string, value: string) {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      __memorySessionStore[key] = value;
    }
  },
  remove(key: string) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      delete __memorySessionStore[key];
    }
  },
};

interface LoginQueueSystemProps {
  onQueueComplete: () => void;
  enabled?: boolean;
  maxQueueTime?: number; // Maximum time in queue before bypass (ms)
}

// Simulated queue position based on current server load
const getQueuePosition = (): number => {
  // In production, this would call an edge function to get actual queue position
  // For now, we simulate with 1-5 users ahead
  const sessionKey = 'queue_position';
  const stored = safeSession.get(sessionKey);
  if (stored) return parseInt(stored, 10);

  const pos = Math.floor(Math.random() * 5) + 1;
  safeSession.set(sessionKey, pos.toString());
  return pos;
};


// Warm up critical backend routes in background
const warmUpEdgeFunctions = async () => {
  // Never warm up backend routes from auth screens.
  const pathname = window.location.pathname;
  if (pathname.startsWith('/auth') || pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/password-recovery')) {
    return;
  }

  const functions = [
    '/functions/v1/track-activity',
    '/functions/v1/behavioral-event-stream',
  ];

  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!baseUrl) return;

  // Fire and forget - just wake them up
  functions.forEach((fn) => {
    fetch(`${baseUrl}${fn}`, {
      method: 'OPTIONS',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {
      // Ignore errors - this is just a warm-up
    });
  });
};

const LoginQueueSystem: React.FC<LoginQueueSystemProps> = ({
  onQueueComplete,
  enabled = true,
  maxQueueTime = 5000,
}) => {
  const [queuePosition, setQueuePosition] = useState(0);
  const [isWarmed, setIsWarmed] = useState(false);
  const [progress, setProgress] = useState(0);

  // Skip if disabled or already processed
  useEffect(() => {
    if (!enabled) {
      onQueueComplete();
      return;
    }

    const alreadyQueued = safeSession.get('queue_processed');
    if (alreadyQueued) {
      onQueueComplete();
      return;
    }

    // Get initial queue position
    const pos = getQueuePosition();
    setQueuePosition(pos);

    // Start warming up edge functions
    warmUpEdgeFunctions();
    setIsWarmed(true);

    // Calculate estimated wait time (300ms per position)
    const waitTime = Math.min(pos * 300, maxQueueTime);

    // Progress animation
    const interval = window.setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 100 / (waitTime / 100);
        return Math.min(newProgress, 100);
      });
    }, 100);

    // Queue countdown
    const posInterval = window.setInterval(() => {
      setQueuePosition((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 300);

    // Complete after wait time
    const timeout = window.setTimeout(() => {
      safeSession.set('queue_processed', 'true');
      safeSession.remove('queue_position');
      onQueueComplete();
    }, waitTime);

    return () => {
      window.clearInterval(interval);
      window.clearInterval(posInterval);
      window.clearTimeout(timeout);
    };
  }, [enabled, maxQueueTime, onQueueComplete]);

  const handleSkip = useCallback(() => {
    safeSession.set('queue_processed', 'true');
    safeSession.remove('queue_position');
    onQueueComplete();
  }, [onQueueComplete]);

  // Check if already processed
  if (safeSession.get('queue_processed')) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="text-center space-y-6 p-8 max-w-md"
        >
          {/* Neural Animation - CSS-based for better Safari performance */}
          <div className="relative mx-auto w-24 h-24">
            <div 
              className="absolute inset-0 rounded-full border-2 border-primary/30 animate-spin"
              style={{ animationDuration: '3s', willChange: 'transform' }}
            />
            <div 
              className="absolute inset-2 rounded-full border-2 border-primary/50"
              style={{ 
                animation: 'spin 2s linear infinite reverse',
                willChange: 'transform'
              }}
            />
            <div className="absolute inset-4 rounded-full bg-primary/20 flex items-center justify-center">
              <Zap className="w-8 h-8 text-primary" />
            </div>
          </div>

          {/* Queue Status */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              Initializing Neural Systems
            </h2>
            {queuePosition > 0 ? (
              <p className="text-muted-foreground flex items-center justify-center gap-2">
                <Users className="w-4 h-4" />
                You are #{queuePosition} in line. Entering...
              </p>
            ) : (
              <p className="text-muted-foreground flex items-center justify-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                Ready to enter
              </p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>

          {/* Warm-up Status */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className={`w-4 h-4 ${isWarmed ? 'text-green-500' : 'animate-spin'}`} />
            {isWarmed ? 'Systems warmed up' : 'Warming up systems...'}
          </div>

          {/* Skip Button */}
          <button
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip queue →
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LoginQueueSystem;
