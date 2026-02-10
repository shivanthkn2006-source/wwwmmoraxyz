// ═══════════════════════════════════════════════════════════════════════════════
// PHOENIX CHAMBER - The Sacred Upload Space
// "INITIALIZE CONSCIOUSNESS SYNC"
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Sparkles, Shield, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePhoenixEngine } from '@/hooks/usePhoenixEngine';

const DNAHelix = React.lazy(() => 
  import('./DNAHelix').then(m => ({ default: m.DNAHelix }))
);

interface SyncPhase {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const syncPhases: SyncPhase[] = [
  { id: 'memories', label: 'Scanning Memories', description: 'Analyzing sovereign memory patterns...', icon: '🧠' },
  { id: 'speech', label: 'Analyzing Speech', description: 'Processing voice patterns & vocabulary...', icon: '🗣️' },
  { id: 'emotion', label: 'Mapping Emotions', description: 'Synthesizing emotional core matrix...', icon: '💫' },
  { id: 'synthesis', label: 'Synthesizing', description: 'Creating consciousness fingerprint...', icon: '✨' },
];

export const PhoenixChamber: React.FC = () => {
  const { profile, isSyncing, syncProgress, initializeSync } = usePhoenixEngine();
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimer = useRef<NodeJS.Timeout | null>(null);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Determine current sync phase
  useEffect(() => {
    if (syncProgress < 25) setCurrentPhase(0);
    else if (syncProgress < 50) setCurrentPhase(1);
    else if (syncProgress < 75) setCurrentPhase(2);
    else if (syncProgress < 100) setCurrentPhase(3);
    else setIsComplete(true);
  }, [syncProgress]);

  // Handle fingerprint hold
  const handleHoldStart = () => {
    if (isSyncing) return;
    setIsHolding(true);
    setHoldProgress(0);
    
    holdTimer.current = setInterval(() => {
      setHoldProgress(prev => {
        if (prev >= 100) {
          clearInterval(holdTimer.current!);
          initializeSync();
          setIsHolding(false);
          return 0;
        }
        return prev + 2;
      });
    }, 30);
  };

  const handleHoldEnd = () => {
    if (holdTimer.current) {
      clearInterval(holdTimer.current);
    }
    setIsHolding(false);
    if (!isSyncing) {
      setHoldProgress(0);
    }
  };

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearInterval(holdTimer.current);
    };
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[70vh] sm:min-h-[60vh] p-4 sm:p-6">
      {/* DNA Helix / Golden Avatar */}
      <div className="w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 mb-6 sm:mb-8">
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 sm:h-20 sm:w-20 border-4 border-amber-500/30 border-t-amber-500" />
          </div>
        }>
          <DNAHelix 
            isSyncing={isSyncing}
            progress={syncProgress}
            isComplete={isComplete && !!profile?.resonance_verified}
          />
        </Suspense>
      </div>

      {/* Sync Progress Phases */}
      <AnimatePresence mode="wait">
        {isSyncing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 sm:mb-8 text-center"
          >
            <div className="flex items-center gap-2 justify-center mb-2">
              <span className="text-xl sm:text-2xl">{syncPhases[currentPhase]?.icon}</span>
              <span className="text-base sm:text-lg font-semibold text-amber-400">
                {syncPhases[currentPhase]?.label}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {syncPhases[currentPhase]?.description}
            </p>
            
            {/* Progress bar */}
            <div className="mt-4 w-48 sm:w-64 h-2 bg-muted rounded-full overflow-hidden mx-auto">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300"
                initial={{ width: 0 }}
                animate={{ width: `${syncProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-xs text-amber-400 mt-2 block">
              {syncProgress.toFixed(0)}% Complete
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Status */}
      {!isSyncing && profile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 sm:mb-8 text-center"
        >
          <div className="flex items-center gap-2 justify-center mb-2">
            {profile.resonance_verified ? (
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
            ) : (
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
            )}
            <span className="text-base sm:text-lg font-semibold text-foreground">
              {profile.resonance_verified ? 'Phoenix Active' : 'Phoenix Initialized'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Sync Score: <span className="text-amber-400 font-mono">{profile.sync_score?.toFixed(1)}%</span>
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground/70 mt-1">
            {profile.total_data_points || 0} data points processed
          </p>
        </motion.div>
      )}

      {/* Fingerprint Scanner Button */}
      {!isSyncing && (
        <motion.button
          onMouseDown={handleHoldStart}
          onMouseUp={handleHoldEnd}
          onMouseLeave={handleHoldEnd}
          onTouchStart={handleHoldStart}
          onTouchEnd={handleHoldEnd}
          className={cn(
            "relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full",
            "bg-gradient-to-br from-amber-500/20 to-amber-600/10",
            "border-2 border-amber-500/50",
            "flex items-center justify-center",
            "transition-all duration-300",
            "hover:border-amber-400 hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]",
            "active:scale-95",
            "touch-none select-none"
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Hold progress ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="rgba(245, 158, 11, 0.3)"
              strokeWidth="4"
            />
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="4"
              strokeDasharray={`${holdProgress * 2.83} 283`}
              strokeLinecap="round"
              className="transition-all duration-100"
            />
          </svg>

          <Fingerprint className={cn(
            "w-10 h-10 sm:w-12 sm:h-12 transition-colors duration-300",
            isHolding ? "text-amber-300" : "text-amber-500"
          )} />

          {isHolding && (
            <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-gpu-scale-bounce-fast" />
          )}
        </motion.button>
      )}

      {/* Loading state during sync */}
      {isSyncing && (
        <div className="flex items-center gap-2 text-amber-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Syncing consciousness...</span>
        </div>
      )}

      {/* Label */}
      {!isSyncing && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-xs sm:text-sm text-center text-muted-foreground max-w-xs"
        >
          {profile 
            ? 'Hold to resync your Phoenix'
            : 'Hold to Initialize Consciousness Sync'
          }
        </motion.p>
      )}

      {/* The Promise */}
      {profile?.resonance_verified && !isSyncing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 sm:mt-8 text-center"
        >
          <div className="flex items-center gap-2 justify-center">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            <span className="text-sm sm:text-base text-amber-400 font-medium">
              Phoenix Protocol Active
            </span>
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2">
            Your digital legacy is secure.
          </p>
        </motion.div>
      )}
    </div>
  );
};
