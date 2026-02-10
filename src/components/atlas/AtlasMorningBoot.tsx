// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL ATLAS: MORNING BOOT SEQUENCE
// Purpose: Smith-style neural link activation on first visit of the day
// Reference: Atlas movie (2024) - Smith AI boot/sync sequence
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Orbit, Brain, Shield, Zap } from 'lucide-react';
import { useSmithVoice } from './AtlasVoice';
import { useAuth } from '@/lib/auth';

interface AtlasMorningBootProps {
  onComplete: () => void;
  skipIfAlreadyBooted?: boolean;
}

type BootPhase = 'dark' | 'neural-link' | 'systems-check' | 'smith-online' | 'complete';

const BOOT_STORAGE_KEY = 'atlas_last_boot_date';

export default function AtlasMorningBoot({ 
  onComplete, 
  skipIfAlreadyBooted = true 
}: AtlasMorningBootProps) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<BootPhase>('dark');
  const [systemsChecked, setSystemsChecked] = useState(0);
  const { speakLine, playActivationSound } = useSmithVoice();
  
  // Check if already booted today
  const hasBootedToday = useCallback(() => {
    if (!skipIfAlreadyBooted || !user) return false;
    
    const lastBoot = localStorage.getItem(`${BOOT_STORAGE_KEY}_${user.id}`);
    if (!lastBoot) return false;
    
    const today = new Date().toDateString();
    return lastBoot === today;
  }, [skipIfAlreadyBooted, user]);
  
  // Mark as booted today
  const markBootComplete = useCallback(() => {
    if (user) {
      localStorage.setItem(`${BOOT_STORAGE_KEY}_${user.id}`, new Date().toDateString());
    }
  }, [user]);
  
  useEffect(() => {
    // Skip if already booted today
    if (hasBootedToday()) {
      onComplete();
      return;
    }
    
    // Phase 1: Dark -> Neural Link (0-800ms)
    const timer1 = setTimeout(() => {
      setPhase('neural-link');
      playActivationSound();
    }, 800);
    
    // Phase 2: Neural Link -> Systems Check (800-2000ms)
    const timer2 = setTimeout(() => {
      setPhase('systems-check');
    }, 2000);
    
    // Systems check animation (increment counter)
    const systemTimers: NodeJS.Timeout[] = [];
    for (let i = 1; i <= 4; i++) {
      systemTimers.push(
        setTimeout(() => setSystemsChecked(i), 2000 + i * 400)
      );
    }
    
    // Phase 3: Systems Check -> Smith Online (3600-4200ms)
    const timer3 = setTimeout(() => {
      setPhase('smith-online');
      speakLine('SYSTEM_ONLINE');
    }, 4200);
    
    // Phase 4: Complete (5000ms)
    const timer4 = setTimeout(() => {
      setPhase('complete');
      markBootComplete();
      onComplete();
    }, 5500);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      systemTimers.forEach(clearTimeout);
    };
  }, [onComplete, hasBootedToday, markBootComplete, playActivationSound, speakLine]);
  
  // Skip boot if already completed
  if (hasBootedToday()) {
    return null;
  }
  
  const SYSTEMS = [
    { icon: Brain, label: 'NEURAL LINK', status: systemsChecked >= 1 },
    { icon: Shield, label: 'DHF CORE', status: systemsChecked >= 2 },
    { icon: Zap, label: 'QUANTUM SYNC', status: systemsChecked >= 3 },
    { icon: Orbit, label: 'SMITH AI', status: systemsChecked >= 4 },
  ];

  return (
    <AnimatePresence>
      {phase !== 'complete' && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[10000] bg-atlas-void flex items-center justify-center overflow-hidden"
        >
          {/* Deep void background with radial gradient */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center, hsl(210 100% 6%) 0%, hsl(220 100% 2%) 70%)',
            }}
          />
          
          {/* Hex Grid - subtle */}
          <div className="absolute inset-0 opacity-[0.03]">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="boot-hex" width="60" height="52" patternUnits="userSpaceOnUse">
                  <path
                    d="M30 0L60 15L60 37L30 52L0 37L0 15Z"
                    fill="none"
                    stroke="rgba(0, 255, 255, 0.8)"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#boot-hex)" />
            </svg>
          </div>
          
          {/* Scan lines */}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,240,255,0.015)_2px,rgba(0,240,255,0.015)_4px)] pointer-events-none" />
          
          {/* Central Orb */}
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{
              scale: phase === 'dark' ? 0.3 : phase === 'smith-online' ? 1.2 : 1,
              opacity: phase === 'dark' ? 0 : 1,
            }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative"
          >
            {/* Outer ring */}
            <motion.div
              className="absolute -inset-8 rounded-full border border-atlas-cyan/30"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            />
            
            {/* Middle ring */}
            <motion.div
              className="absolute -inset-4 rounded-full border-2 border-atlas-cyan/40"
              animate={{ rotate: -360 }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            />
            
            {/* Core */}
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-atlas-cyan/30 via-atlas-cyan/20 to-transparent backdrop-blur-sm border border-atlas-cyan/50 flex items-center justify-center">
              <motion.div
                animate={phase === 'smith-online' ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.5 }}
              >
                <Orbit className="w-12 h-12 text-atlas-cyan" />
              </motion.div>
            </div>
            
            {/* Glow */}
            <div className="absolute inset-0 rounded-full shadow-[0_0_60px_rgba(0,255,255,0.5),0_0_120px_rgba(0,255,255,0.2)]" />
          </motion.div>
          
          {/* Boot Status Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-32 text-center"
          >
            <p className="font-share-tech text-sm text-atlas-cyan tracking-[0.3em] uppercase mb-4">
              {phase === 'dark' && 'INITIALIZING...'}
              {phase === 'neural-link' && 'ESTABLISHING NEURAL LINK...'}
              {phase === 'systems-check' && 'RUNNING SYSTEMS CHECK...'}
              {phase === 'smith-online' && 'SMITH AI ONLINE'}
            </p>
            
            {/* Systems status indicators */}
            {(phase === 'systems-check' || phase === 'smith-online') && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center gap-6 mt-4"
              >
                {SYSTEMS.map((sys, i) => (
                  <motion.div
                    key={sys.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <sys.icon 
                      className={`w-5 h-5 transition-colors duration-300 ${
                        sys.status ? 'text-green-400' : 'text-atlas-cyan/30'
                      }`} 
                    />
                    <span className={`text-[10px] font-share-tech tracking-wider ${
                      sys.status ? 'text-green-400' : 'text-atlas-cyan/30'
                    }`}>
                      {sys.status ? '✓' : '○'}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
          
          {/* Corner Brackets */}
          <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-atlas-cyan/40" />
          <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-atlas-cyan/40" />
          <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-atlas-cyan/40" />
          <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-atlas-cyan/40" />
          
          {/* Bottom signature */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <p className="text-[10px] font-share-tech text-atlas-cyan/30 tracking-[0.2em]">
              M'MORA PROTOCOL ATLAS // SMITH NEURAL INTERFACE
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
