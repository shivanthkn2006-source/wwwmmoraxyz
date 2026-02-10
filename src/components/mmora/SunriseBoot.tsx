import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMmoraAudio } from '@/hooks/useMmoraAudio';

interface SunriseBootProps {
  onComplete: () => void;
  assistantName?: string;
}

export default function SunriseBoot({ onComplete, assistantName = 'ZOE' }: SunriseBootProps) {
  const [phase, setPhase] = useState<'dark' | 'rising' | 'flare' | 'complete'>('dark');
  const { playBootChime } = useMmoraAudio();

  useEffect(() => {
    // Phase 1: Dark (0-500ms)
    const timer1 = setTimeout(() => {
      setPhase('rising');
      playBootChime();
    }, 500);

    // Phase 2: Rising (500-2500ms)
    const timer2 = setTimeout(() => {
      setPhase('flare');
    }, 2500);

    // Phase 3: Flare (2500-3500ms)
    const timer3 = setTimeout(() => {
      setPhase('complete');
      onComplete();
    }, 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete, playBootChime]);

  return (
    <AnimatePresence>
      {phase !== 'complete' && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] bg-background flex items-center justify-center overflow-hidden"
        >
          {/* Scan Lines */}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,240,255,0.02)_2px,rgba(0,240,255,0.02)_4px)] pointer-events-none" />

          {/* Rising Orb (Sun) */}
          <motion.div
            initial={{ y: 300, scale: 0.5, opacity: 0 }}
            animate={{
              y: phase === 'dark' ? 300 : phase === 'rising' ? 0 : -50,
              scale: phase === 'flare' ? 1.5 : 1,
              opacity: phase === 'dark' ? 0 : 1
            }}
            transition={{ 
              duration: phase === 'rising' ? 2 : 0.5,
              ease: 'easeOut'
            }}
            className="relative"
          >
            {/* Core Orb */}
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-400 via-cyan-500 to-cyan-600 shadow-[0_0_60px_rgba(0,240,255,0.8)]" />
            
            {/* Flare Effect */}
            <motion.div
              animate={{
                scale: phase === 'flare' ? [1, 2, 1.5] : 1,
                opacity: phase === 'flare' ? [0.8, 1, 0] : 0
              }}
              transition={{ duration: 1 }}
              className="absolute inset-0 rounded-full bg-cyan-400 blur-xl"
            />

            {/* Particle Ring - CSS animation */}
            <div className="absolute inset-[-20px] rounded-full border border-cyan-500/30 animate-spin-slow" />
          </motion.div>

          {/* Boot Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: phase !== 'dark' ? 1 : 0 }}
            className="absolute bottom-20 text-center"
          >
            <p className="font-mono text-xs text-cyan-400/70 tracking-[0.3em] animate-gpu-pulse-opacity">
              {phase === 'rising' && 'INITIALIZING CORTICAL STACK...'}
              {phase === 'flare' && `${assistantName.toUpperCase()} DHF ONLINE`}
            </p>
          </motion.div>

          {/* Corner Brackets */}
          <div className="absolute top-8 left-8 w-12 h-12 border-l-2 border-t-2 border-cyan-500/40" />
          <div className="absolute top-8 right-8 w-12 h-12 border-r-2 border-t-2 border-cyan-500/40" />
          <div className="absolute bottom-8 left-8 w-12 h-12 border-l-2 border-b-2 border-cyan-500/40" />
          <div className="absolute bottom-8 right-8 w-12 h-12 border-r-2 border-b-2 border-cyan-500/40" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
