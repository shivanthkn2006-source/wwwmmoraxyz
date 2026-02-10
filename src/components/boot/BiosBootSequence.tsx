import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BiosBootSequenceProps {
  onComplete: () => void;
  duration?: number;
}

// ULTRA-OPTIMIZED: Minimal boot for sub-500ms load on low-end devices
const BOOT_LINES = [
  { text: '> INITIALIZING...', delay: 0 },
  { text: '> SYSTEMS READY', delay: 100 },
];

const BiosBootSequence: React.FC<BiosBootSequenceProps> = memo(({ 
  onComplete, 
  duration = 400 // ULTRA-OPTIMIZED: 400ms total for low-end devices
}) => {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Check if boot was already shown this session - skip immediately
    const bootShown = sessionStorage.getItem('biosBootShown');
    if (bootShown) {
      onComplete();
      return;
    }

    // Detect low-end device and skip boot entirely
    const isLowEnd = navigator.hardwareConcurrency <= 2 || 
                     (navigator as any).deviceMemory <= 2 ||
                     /Android [4-6]/.test(navigator.userAgent);
    
    if (isLowEnd) {
      sessionStorage.setItem('biosBootShown', 'true');
      onComplete();
      return;
    }

    const timers: NodeJS.Timeout[] = [];
    
    BOOT_LINES.forEach((_, index) => {
      const timer = setTimeout(() => {
        setVisibleLines(index + 1);
      }, BOOT_LINES[index].delay);
      timers.push(timer);
    });

    // Complete animation quickly
    const completeTimer = setTimeout(() => {
      setIsComplete(true);
      sessionStorage.setItem('biosBootShown', 'true');
      setTimeout(onComplete, 200);
    }, duration);
    timers.push(completeTimer);

    return () => timers.forEach(clearTimeout);
  }, [onComplete, duration]);

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
        >
          <div className="w-full max-w-2xl p-8 font-mono text-sm">
            {/* Scanline effect */}
            <div className="absolute inset-0 pointer-events-none opacity-10">
              <div 
                className="w-full h-full"
                style={{
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)'
                }}
              />
            </div>

            {/* Boot header */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 text-primary font-bold text-lg"
            >
              M'MORA SYSTEM v1.0.0
              <div className="text-xs text-muted-foreground mt-1">
                Zero-Knowledge Architecture | AES-256 Encrypted
              </div>
            </motion.div>

            {/* Boot lines */}
            <div className="space-y-1">
              {BOOT_LINES.slice(0, visibleLines).map((line, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`${
                    line.text.includes('[OK]') 
                      ? 'text-green-400' 
                      : line.text.includes('WELCOME') 
                        ? 'text-primary font-bold' 
                        : line.text.includes('INTEGRITY')
                          ? 'text-accent'
                          : 'text-white/80'
                  }`}
                >
                  {line.text}
                  {index === visibleLines - 1 && (
                    <span className="ml-1 animate-gpu-cursor-blink will-change-[opacity]">█</span>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Progress bar */}
            <motion.div className="mt-8">
              <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: `${(visibleLines / BOOT_LINES.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-gradient-to-r from-primary to-accent"
                />
              </div>
              <div className="text-xs text-muted-foreground mt-2 text-center">
                System Initialization: {Math.round((visibleLines / BOOT_LINES.length) * 100)}%
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

BiosBootSequence.displayName = 'BiosBootSequence';

export default BiosBootSequence;