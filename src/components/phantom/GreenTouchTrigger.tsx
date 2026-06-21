// ═══════════════════════════════════════════════════════════════════════════════
// THE GREEN TOUCH TRIGGER - Protocol Phantom
// Touch Devices: Single Tap = Show Orb (with loading), Double Tap = Hide Orb
// Non-Touch (Desktop): Single Click = Show Orb, Double Click = Hide Orb
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ghost, Zap, BatteryCharging, Eye, EyeOff, Loader2 } from 'lucide-react';
import { usePhantomStore, usePhantomVisible } from '@/stores/usePhantomStore';
import { useDeviceTierContext } from '@/contexts/DeviceTierContext';
import { cn } from '@/lib/utils';

interface GreenTouchTriggerProps {
  position?: 'bottom-center' | 'bottom-left' | 'bottom-right';
  className?: string;
  showOnlyOnLowPower?: boolean;
}

const GreenTouchTrigger: React.FC<GreenTouchTriggerProps> = ({
  position = 'bottom-center',
  className,
  showOnlyOnLowPower = false,
}) => {
  const isVisible = usePhantomVisible();
  const { show, hide } = usePhantomStore();
  
  const stats = usePhantomStore(state => ({
    sessions: state.totalGhostModeSessions,
    minutesSaved: state.batteryPreservedMinutes,
  }));
  
  let tierContext: ReturnType<typeof useDeviceTierContext> | null = null;
  try {
    tierContext = useDeviceTierContext();
  } catch {
    // Context not available
  }
  
  const [showTooltip, setShowTooltip] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  
  // Detect touch device
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 ||
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
      );
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);
  
  // Refs for tap/click detection
  const lastInteractionRef = useRef<number>(0);
  const singleActionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  
  // Only show on low-power devices if configured
  if (showOnlyOnLowPower && tierContext && !tierContext.capabilities?.isLowPowerDevice) {
    return null;
  }
  
  // Position classes
  const positionClasses = {
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
    'bottom-left': 'bottom-6 left-6',
    'bottom-right': 'bottom-6 right-6',
  };
  
  // Show orb with loading state
  const showOrbWithLoading = useCallback(() => {
    if (isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setIsLoading(true);
    
    // Brief loading state before showing
    setTimeout(() => {
      show();
      setIsLoading(false);
      isProcessingRef.current = false;
      console.log('[GreenTouch] 👁️ Orb VISIBLE (single tap/click)');
    }, 300);
  }, [show]);
  
  // Hide orb immediately
  const hideOrb = useCallback(() => {
    if (isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    hide();
    isProcessingRef.current = false;
    console.log('[GreenTouch] 👻 Orb HIDDEN (double tap/click)');
  }, [hide]);
  
  // ═══ TOUCH HANDLER (for touch devices) ═══
  const handleTouch = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    const now = Date.now();
    const timeSinceLastTouch = now - lastInteractionRef.current;
    
    if (timeSinceLastTouch < 350) {
      // Double tap detected - TOGGLE orb (hide if visible)
      if (singleActionTimeoutRef.current) {
        clearTimeout(singleActionTimeoutRef.current);
        singleActionTimeoutRef.current = null;
      }
      if (isVisible) {
        hideOrb();
      }
      lastInteractionRef.current = 0;
    } else {
      // First tap - wait to see if second tap comes
      lastInteractionRef.current = now;
      
      if (singleActionTimeoutRef.current) {
        clearTimeout(singleActionTimeoutRef.current);
      }
      
      singleActionTimeoutRef.current = setTimeout(() => {
        // Single tap - SHOW orb if hidden
        if (!isVisible) {
          showOrbWithLoading();
        }
        lastInteractionRef.current = 0;
      }, 350);
    }
  }, [isVisible, showOrbWithLoading, hideOrb]);
  
  // ═══ CLICK HANDLER (for non-touch devices) ═══
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Skip if touch device - let touch handler manage
    if (isTouchDevice) return;
    
    const now = Date.now();
    const timeSinceLastClick = now - lastInteractionRef.current;
    
    if (timeSinceLastClick < 350) {
      // Double click detected - HIDE orb if visible
      if (singleActionTimeoutRef.current) {
        clearTimeout(singleActionTimeoutRef.current);
        singleActionTimeoutRef.current = null;
      }
      if (isVisible) {
        hideOrb();
      }
      lastInteractionRef.current = 0;
    } else {
      // First click - wait to see if second click comes
      lastInteractionRef.current = now;
      
      if (singleActionTimeoutRef.current) {
        clearTimeout(singleActionTimeoutRef.current);
      }
      
      singleActionTimeoutRef.current = setTimeout(() => {
        // Single click - SHOW orb if hidden
        if (!isVisible) {
          showOrbWithLoading();
        }
        lastInteractionRef.current = 0;
      }, 350);
    }
  }, [isTouchDevice, isVisible, showOrbWithLoading, hideOrb]);
  
  // Long press shows stats tooltip
  const handlePressStart = useCallback(() => {
    longPressTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 600);
  }, []);
  
  const handlePressEnd = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
    setTimeout(() => setShowTooltip(false), 2000);
  }, []);
  
  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (singleActionTimeoutRef.current) clearTimeout(singleActionTimeoutRef.current);
      if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    };
  }, []);
  
  return (
    <div 
      className={cn(
        'fixed z-[9998] pointer-events-auto',
        positionClasses[position],
        className
      )}
    >
      {/* Main Trigger Button */}
      <motion.button
        onClick={handleClick}
        onTouchEnd={handleTouch}
        onMouseDown={!isTouchDevice ? handlePressStart : undefined}
        onMouseUp={!isTouchDevice ? handlePressEnd : undefined}
        onTouchStart={isTouchDevice ? handlePressStart : undefined}
        className={cn(
          'relative w-14 h-14 rounded-full flex items-center justify-center',
          'transition-all duration-300 touch-manipulation select-none',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background',
          isVisible
            ? 'bg-emerald-500/20 border-2 border-emerald-400/60 focus:ring-emerald-400'
            : 'bg-slate-800/80 border-2 border-slate-600/60 focus:ring-slate-400'
        )}
        style={{
          boxShadow: isVisible 
            ? '0 0 25px rgba(16, 185, 129, 0.5), inset 0 0 15px rgba(16, 185, 129, 0.3)'
            : '0 0 15px rgba(100, 116, 139, 0.4)',
        }}
        whileTap={{ scale: 0.92 }}
        aria-label={isVisible ? 'Double-tap to hide Orb' : 'Tap to show Orb'}
      >
        {/* Loading Ring */}
        {isLoading && (
          <motion.div
            className="absolute inset-0 rounded-full border-3 border-emerald-400/60 border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
        )}
        
        {/* Pulsing Ring (only when visible/active) */}
        {isVisible && !isLoading && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-emerald-400/40"
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.7, 0, 0.7],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
        
        {/* Icon */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            </motion.div>
          ) : isVisible ? (
            <motion.div
              key="visible"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ duration: 0.25 }}
            >
              <Eye className="w-6 h-6 text-emerald-400" />
            </motion.div>
          ) : (
            <motion.div
              key="ghost"
              initial={{ scale: 0, rotate: 180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: -180 }}
              transition={{ duration: 0.25 }}
            >
              <Ghost className="w-6 h-6 text-slate-400" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Interaction Hint (shows briefly on first render) */}
        <motion.div 
          className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1, duration: 0.3 }}
        >
          <span className="text-[8px] font-bold text-white">
            {isVisible ? '2x' : '1x'}
          </span>
        </motion.div>
      </motion.button>
      
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className={cn(
              'absolute bottom-full mb-3 left-1/2 -translate-x-1/2',
              'px-4 py-2 rounded-lg text-xs whitespace-nowrap',
              'bg-background/95 border border-border shadow-xl backdrop-blur-sm'
            )}
          >
            <div className="flex flex-col items-center gap-1">
              {isVisible ? (
                <>
                  <div className="flex items-center gap-2">
                    <Eye className="w-3 h-3 text-emerald-400" />
                    <span className="text-foreground font-medium">Orb Visible</span>
                  </div>
                  <span className="text-muted-foreground text-[10px]">Double-{isTouchDevice ? 'tap' : 'click'} to hide</span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <BatteryCharging className="w-3 h-3 text-amber-400" />
                    <span className="text-foreground font-medium">Ghost Mode</span>
                  </div>
                  <span className="text-muted-foreground text-[10px]">
                    {stats.sessions} sessions • {stats.minutesSaved}m saved
                  </span>
                  <span className="text-muted-foreground text-[10px]">{isTouchDevice ? 'Tap' : 'Click'} to wake</span>
                </>
              )}
            </div>
            
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div className="w-2 h-2 bg-background border-r border-b border-border rotate-45 -translate-y-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Ghost Mode Overlay Indicator */}
      <AnimatePresence>
        {!isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-[9997]"
            style={{
              background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.08) 100%)',
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default memo(GreenTouchTrigger);
