// ═══════════════════════════════════════════════════════════════════════════════
// LOW POWER CALL WARNING - Slide-down notification for call power optimization
// 5-second auto-hide from top header | Responsive 4.1" to 16K displays
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Battery, BatteryLow, BatteryWarning, Zap, X } from 'lucide-react';

interface LowPowerCallWarningProps {
  isLowDataMode: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  onDismiss?: () => void;
}

export const LowPowerCallWarning: React.FC<LowPowerCallWarningProps> = ({
  isLowDataMode,
  connectionQuality,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [lastMode, setLastMode] = useState(isLowDataMode);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  // Show warning when low data mode activates or connection quality drops
  useEffect(() => {
    const now = Date.now();
    const cooldownPassed = !dismissedAt || (now - dismissedAt > 30000); // 30 second cooldown
    
    // Trigger when switching to low data mode or quality becomes poor
    if (cooldownPassed) {
      if (isLowDataMode && !lastMode) {
        setIsVisible(true);
      } else if (connectionQuality === 'poor' && !isVisible) {
        setIsVisible(true);
      }
    }
    
    setLastMode(isLowDataMode);
  }, [isLowDataMode, connectionQuality, lastMode, dismissedAt, isVisible]);

  // Auto-hide after 5 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setDismissedAt(Date.now());
    onDismiss?.();
  }, [onDismiss]);

  const getWarningMessage = () => {
    if (isLowDataMode) {
      return {
        icon: BatteryLow,
        title: 'Low Data Mode Active',
        message: 'Video quality reduced to save bandwidth',
        color: 'amber',
      };
    }
    if (connectionQuality === 'poor') {
      return {
        icon: BatteryWarning,
        title: 'Weak Connection',
        message: 'Optimizing call for better stability',
        color: 'red',
      };
    }
    return {
      icon: Zap,
      title: 'Optimization Active',
      message: 'Adjusting visuals to save battery',
      color: 'cyan',
    };
  };

  const warning = getWarningMessage();
  const IconComponent = warning.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[100] pointer-events-none flex justify-center"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ 
            type: 'spring', 
            damping: 25, 
            stiffness: 300,
            duration: 0.4 
          }}
        >
          <motion.div
            className={`
              pointer-events-auto
              mx-2 mt-2 sm:mt-3 md:mt-4
              px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3
              rounded-lg sm:rounded-xl
              backdrop-blur-xl
              border
              shadow-lg
              ${warning.color === 'amber' 
                ? 'bg-amber-500/20 border-amber-500/40 shadow-amber-500/20' 
                : warning.color === 'red'
                  ? 'bg-red-500/20 border-red-500/40 shadow-red-500/20'
                  : 'bg-cyan-500/20 border-cyan-500/40 shadow-cyan-500/20'
              }
            `}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Icon with pulse animation - GPU Accelerated */}
              <div
                className={`
                  p-1.5 sm:p-2 rounded-full animate-gpu-icon-scale
                  ${warning.color === 'amber' 
                    ? 'bg-amber-500/30 text-amber-400' 
                    : warning.color === 'red'
                      ? 'bg-red-500/30 text-red-400'
                      : 'bg-cyan-500/30 text-cyan-400'
                  }
                `}
              >
                <IconComponent className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <p className={`
                  text-[10px] sm:text-xs md:text-sm font-semibold leading-tight
                  ${warning.color === 'amber' 
                    ? 'text-amber-300' 
                    : warning.color === 'red'
                      ? 'text-red-300'
                      : 'text-cyan-300'
                  }
                `}>
                  {warning.title}
                </p>
                <p className="text-[9px] sm:text-[10px] md:text-xs text-foreground/70 truncate">
                  {warning.message}
                </p>
              </div>

              {/* Dismiss button */}
              <motion.button
                onClick={handleDismiss}
                className={`
                  p-1 rounded-full transition-colors
                  ${warning.color === 'amber' 
                    ? 'hover:bg-amber-500/30 text-amber-400/60 hover:text-amber-400' 
                    : warning.color === 'red'
                      ? 'hover:bg-red-500/30 text-red-400/60 hover:text-red-400'
                      : 'hover:bg-cyan-500/30 text-cyan-400/60 hover:text-cyan-400'
                  }
                `}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </motion.button>
            </div>

            {/* Progress bar showing auto-dismiss timer */}
            <motion.div
              className={`
                absolute bottom-0 left-0 h-0.5 rounded-b-lg
                ${warning.color === 'amber' 
                  ? 'bg-amber-400/60' 
                  : warning.color === 'red'
                    ? 'bg-red-400/60'
                    : 'bg-cyan-400/60'
                }
              `}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5, ease: 'linear' }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LowPowerCallWarning;
