// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL 3: CIRCADIAN BACKGROUND - Night Mode Visuals
// ═══════════════════════════════════════════════════════════════════════════════
//
// The background shifts based on time of day:
// - Night: Deep OLED black with subtle midnight blue
// - Day: Standard dynamic colors from the design system
//
// ═══════════════════════════════════════════════════════════════════════════════

import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCircadianRhythm, type CircadianBackgroundStyle } from '@/hooks/useCircadianRhythm';
import { useTimeSimulationSafe } from '@/contexts/TimeSimulationContext';

interface CircadianBackgroundProps {
  // Allow override for testing or special modes
  forceStyle?: CircadianBackgroundStyle;
  className?: string;
}

export const CircadianBackground = memo(function CircadianBackground({
  forceStyle,
  className = '',
}: CircadianBackgroundProps) {
  const { state, isNightMode, isDeepNight, phase } = useCircadianRhythm();
  const { simulationEnabled, simulatedHour } = useTimeSimulationSafe();
  
  // Live-updating local time (refreshes every minute)
  const [localTime, setLocalTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  );
  
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    }, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);
  
  const style = forceStyle || state.backgroundStyle;
  
  // Generate ambient particles for night mode
  const particles = isNightMode ? Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    delay: Math.random() * 5,
    duration: Math.random() * 10 + 10,
  })) : [];

  return (
    <motion.div
      className={`fixed inset-0 z-0 pointer-events-none overflow-hidden ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2 }}
    >
      {/* Primary gradient background */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: `linear-gradient(180deg, ${style.primaryColor} 0%, ${style.secondaryColor} 100%)`,
        }}
        transition={{ duration: 3, ease: 'easeInOut' }}
        style={{
          filter: `blur(${style.blur}px) saturate(${style.saturation})`,
        }}
      />
      
      {/* Night mode: Subtle glow orbs */}
      {/* Night mode: Subtle glow orbs - NO SCALING to prevent mask-like visual */}
      <AnimatePresence>
        {isNightMode && (
          <>
            {/* Primary glow orb - top right - OPACITY ONLY, NO SCALE */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.15, 0.25, 0.15] }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 10, 
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 2, // Delay to prevent load-time flash
              }}
              className="absolute top-1/4 right-1/4"
              style={{
                width: '300px',
                height: '300px',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${style.glowColor} 0%, transparent 70%)`,
                filter: 'blur(40px)',
              }}
            />
            
            {/* Secondary glow orb - bottom left - OPACITY ONLY, NO SCALE */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.1, 0.2, 0.1] }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 14, 
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 4, // Longer delay
              }}
              className="absolute bottom-1/4 left-1/4"
              style={{
                width: '400px',
                height: '400px',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${style.glowColor} 0%, transparent 70%)`,
                filter: 'blur(60px)',
              }}
            />
          </>
        )}
      </AnimatePresence>
      
      {/* Deep night: Floating particles (stars) */}
      <AnimatePresence>
        {isDeepNight && particles.map(particle => (
          <motion.div
            key={particle.id}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 0.6, 0],
              y: [particle.y + '%', (particle.y - 20) + '%'],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: 'easeInOut',
            }}
            className="absolute"
            style={{
              left: particle.x + '%',
              top: particle.y + '%',
              width: particle.size + 'px',
              height: particle.size + 'px',
              borderRadius: '50%',
              background: 'rgba(200, 220, 255, 0.8)',
              boxShadow: '0 0 4px rgba(200, 220, 255, 0.5)',
            }}
          />
        ))}
      </AnimatePresence>
      
      {/* Vignette overlay - subtle bottom darkening for design */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to top, rgba(0,0,0,${isNightMode ? 0.6 : 0.4}) 0%, transparent 30%)`,
          transition: 'all 3s ease-in-out',
        }}
      />
      
      {/* SIMULATION INDICATOR - Shows when time is being simulated */}
      {simulationEnabled && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-cyan-500/20 border border-cyan-400/50 rounded-lg px-3 py-1.5 backdrop-blur-sm"
        >
          <span className="text-cyan-400 text-xs font-mono font-bold animate-pulse">SIM</span>
          <span className="text-white font-mono text-sm">{simulatedHour.toString().padStart(2, '0')}:00</span>
        </motion.div>
      )}
      
      {/* Phase indicator (dev only) */}
      {import.meta.env.DEV && (
        <div className="absolute bottom-4 left-4 text-xs text-white/30 font-mono">
          {phase} | {simulationEnabled ? `SIM:${simulatedHour}:00` : localTime} | E:{(state.empathyWeight * 100).toFixed(0)}%
        </div>
      )}
    </motion.div>
  );
});

export default CircadianBackground;
