// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL GLASS VAULT: HOLO-LOCK OVERLAY
// Purpose: Visual lock for locked HUD modules - makes competitors see "magic" not logic
// Design: CRT glitch effect, padlock icon, access denied UX
// ═══════════════════════════════════════════════════════════════════════════════

import React, { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Lock, AlertTriangle, ChevronRight } from 'lucide-react';
import { useSmithVoice } from './AtlasVoice';
import { getPillarVoiceLine } from '@/hooks/useAtlasAccess';

interface HoloLockProps {
  pillarId: string;
  isLocked: boolean;
  completionPercent: number;
  onUnlockClick: () => void;
  children: React.ReactNode;
  className?: string;
}

// CRT Static Noise component
const CRTNoise = memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
    <div 
      className="absolute inset-0 animate-crt-flicker"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        backgroundSize: '100px 100px',
      }}
    />
    {/* Scan line effect */}
    <motion.div
      className="absolute w-full h-1 bg-red-500/20"
      animate={{ top: ['0%', '100%'] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
    />
  </div>
));
CRTNoise.displayName = 'CRTNoise';

// Access Denied Toast
const AccessDeniedToast = memo(({ 
  isVisible, 
  message,
  pillarId,
  onGoToUnlock,
}: { 
  isVisible: boolean; 
  message: string;
  pillarId: string;
  onGoToUnlock: () => void;
}) => (
  <AnimatePresence>
    {isVisible && (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        className="absolute -bottom-24 left-1/2 -translate-x-1/2 z-50 min-w-[280px]"
      >
        <div className="bg-red-950/90 border border-red-500/50 rounded-lg p-3 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-200 text-sm font-share-tech">{message}</p>
              <button 
                onClick={onGoToUnlock}
                className="mt-2 flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                <span>Complete calibration</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
));
AccessDeniedToast.displayName = 'AccessDeniedToast';

// Padlock Overlay
const PadlockOverlay = memo(({ completionPercent }: { completionPercent: number }) => (
  <motion.div
    className="absolute top-1 right-1 z-20"
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ delay: 0.2, type: 'spring' }}
  >
    <div className="relative">
      <Lock className="w-4 h-4 text-red-400 animate-pulse" />
      {/* Progress ring around lock */}
      <svg className="absolute -inset-1 w-6 h-6" viewBox="0 0 24 24">
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="rgba(239, 68, 68, 0.2)"
          strokeWidth="2"
        />
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="rgba(239, 68, 68, 0.8)"
          strokeWidth="2"
          strokeDasharray={`${completionPercent * 0.628} 62.8`}
          strokeLinecap="round"
          transform="rotate(-90 12 12)"
        />
      </svg>
    </div>
  </motion.div>
));
PadlockOverlay.displayName = 'PadlockOverlay';

export const HoloLock: React.FC<HoloLockProps> = memo(({
  pillarId,
  isLocked,
  completionPercent,
  onUnlockClick,
  children,
  className,
}) => {
  const { speak } = useSmithVoice();
  const [showDenied, setShowDenied] = useState(false);
  
  // Handle click on locked module
  const handleLockedClick = useCallback(async () => {
    // Play access denied sound (low thud)
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(80, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.3);
    
    // Show toast
    setShowDenied(true);
    
    // Speak the voice line
    const voiceLine = getPillarVoiceLine(pillarId);
    await speak(voiceLine);
    
    // Hide toast after voice
    setTimeout(() => setShowDenied(false), 5000);
  }, [pillarId, speak]);
  
  // If not locked, render children normally
  if (!isLocked) {
    return <>{children}</>;
  }
  
  return (
    <div className={cn('relative', className)}>
      {/* Original content with locked styling */}
      <div 
        className={cn(
          'relative cursor-pointer transition-all duration-300',
          'opacity-40 grayscale hover:opacity-60 hover:grayscale-[50%]',
        )}
        onClick={handleLockedClick}
      >
        {children}
        
        {/* CRT Noise overlay */}
        <CRTNoise />
        
        {/* Padlock icon */}
        <PadlockOverlay completionPercent={completionPercent} />
        
        {/* Red border glow on hover */}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-lg"
          initial={{ boxShadow: 'inset 0 0 0 1px rgba(239, 68, 68, 0.2)' }}
          whileHover={{ boxShadow: 'inset 0 0 0 1px rgba(239, 68, 68, 0.6), 0 0 20px rgba(239, 68, 68, 0.2)' }}
        />
      </div>
      
      {/* Access Denied Toast */}
      <AccessDeniedToast
        isVisible={showDenied}
        message={getPillarVoiceLine(pillarId)}
        pillarId={pillarId}
        onGoToUnlock={onUnlockClick}
      />
    </div>
  );
});

HoloLock.displayName = 'HoloLock';

// ═══════════════════════════════════════════════════════════════════════════════
// CSS ANIMATION (Add to index.css)
// ═══════════════════════════════════════════════════════════════════════════════

/*
Add this to index.css:

@keyframes crt-flicker {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.5; }
  75% { opacity: 0.2; }
}

.animate-crt-flicker {
  animation: crt-flicker 0.15s infinite;
}
*/

export default HoloLock;
