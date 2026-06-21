// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL ATLAS: SYNAPTIC DOWNLOAD INTERACTION
// Purpose: Neural link animation when user taps menu items
// Animation: Flash → Beam → Orb Pulse → Data Chirp sound
// ═══════════════════════════════════════════════════════════════════════════════

import React, { memo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SynapticDownloadProps {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
  orbPosition?: { x: number; y: number }; // Center of screen orb
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}

// Data chirp sound
const playDataChirp = () => {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    
    const ctx = new Ctx();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    
    // High-pitch data chirp sequence
    const frequencies = [2400, 2800, 3200, 2600];
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.03);
      
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.03);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + i * 0.03 + 0.01);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.03 + 0.06);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + i * 0.03);
      osc.stop(ctx.currentTime + i * 0.03 + 0.08);
    });
  } catch (err) {
    console.warn('[SynapticDownload] Sound failed:', err);
  }
};

// Beam animation component
const BeamAnimation = memo(({ 
  start, 
  end, 
  onComplete 
}: { 
  start: { x: number; y: number }; 
  end: { x: number; y: number };
  onComplete: () => void;
}) => {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  
  return (
    <motion.div
      className="fixed pointer-events-none z-[9999]"
      style={{
        left: start.x,
        top: start.y,
        width: 0,
        height: 3,
        transform: `rotate(${angle}rad)`,
        transformOrigin: 'left center',
        background: 'linear-gradient(90deg, rgba(0, 255, 255, 0.8) 0%, rgba(0, 255, 255, 0.4) 50%, transparent 100%)',
        boxShadow: '0 0 10px rgba(0, 255, 255, 0.8), 0 0 20px rgba(0, 255, 255, 0.4)',
      }}
      animate={{
        width: [0, distance, distance],
        opacity: [1, 1, 0],
      }}
      transition={{
        duration: 0.4,
        times: [0, 0.6, 1],
        ease: 'easeOut',
      }}
      onAnimationComplete={onComplete}
    />
  );
});
BeamAnimation.displayName = 'BeamAnimation';

// Orb pulse effect
const OrbPulseEffect = memo(({ 
  position, 
  onComplete 
}: { 
  position: { x: number; y: number };
  onComplete: () => void;
}) => (
  <motion.div
    className="fixed pointer-events-none z-[9998]"
    style={{
      left: position.x - 40,
      top: position.y - 40,
      width: 80,
      height: 80,
    }}
    initial={{ scale: 0.5, opacity: 0 }}
    animate={{ 
      scale: [0.5, 1.5, 1.2], 
      opacity: [0, 0.8, 0] 
    }}
    transition={{ duration: 0.5, ease: 'easeOut' }}
    onAnimationComplete={onComplete}
  >
    <div className="w-full h-full rounded-full bg-atlas-cyan/30 blur-md" />
    <div className="absolute inset-2 rounded-full bg-atlas-cyan/50 blur-sm" />
    <div className="absolute inset-4 rounded-full bg-white/60" />
  </motion.div>
));
OrbPulseEffect.displayName = 'OrbPulseEffect';

export const SynapticDownload: React.FC<SynapticDownloadProps> = memo(({
  children,
  label,
  onClick,
  className,
  orbPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 },
  disabled = false,
  variant = 'primary',
}) => {
  const [isFlashing, setIsFlashing] = useState(false);
  const [showBeam, setShowBeam] = useState(false);
  const [showOrbPulse, setShowOrbPulse] = useState(false);
  const [buttonCenter, setButtonCenter] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const handleClick = useCallback(() => {
    if (disabled) return;
    
    // Get button center position
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonCenter({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }
    
    // Phase 1: Flash
    setIsFlashing(true);
    
    setTimeout(() => {
      setIsFlashing(false);
      // Phase 2: Beam
      setShowBeam(true);
      playDataChirp();
    }, 100);
  }, [disabled]);
  
  const handleBeamComplete = useCallback(() => {
    setShowBeam(false);
    // Phase 3: Orb Pulse
    setShowOrbPulse(true);
  }, []);
  
  const handleOrbPulseComplete = useCallback(() => {
    setShowOrbPulse(false);
    // Execute the actual action
    onClick?.();
  }, [onClick]);
  
  // Variant styles
  const variantStyles = {
    primary: 'bg-atlas-cyan/20 hover:bg-atlas-cyan/30 border-atlas-cyan/50 text-atlas-cyan',
    secondary: 'bg-atlas-purple/20 hover:bg-atlas-purple/30 border-atlas-purple/50 text-atlas-purple',
    ghost: 'bg-transparent hover:bg-atlas-cyan/10 border-transparent text-atlas-cyan/80',
  };
  
  return (
    <>
      <motion.button
        ref={buttonRef}
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          'relative px-6 py-3 font-rajdhani font-semibold tracking-wider uppercase',
          'border transition-all duration-200',
          'atlas-cut-corners-sm',
          variantStyles[variant],
          isFlashing && 'bg-white text-black',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        aria-label={label}
      >
        {/* Glow effect on hover */}
        <motion.div
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100"
          style={{
            boxShadow: '0 0 15px rgba(0, 255, 255, 0.3), inset 0 0 10px rgba(0, 255, 255, 0.1)',
          }}
        />
        
        {children}
      </motion.button>
      
      {/* Beam Animation Portal */}
      <AnimatePresence>
        {showBeam && (
          <BeamAnimation
            start={buttonCenter}
            end={orbPosition}
            onComplete={handleBeamComplete}
          />
        )}
      </AnimatePresence>
      
      {/* Orb Pulse Portal */}
      <AnimatePresence>
        {showOrbPulse && (
          <OrbPulseEffect
            position={orbPosition}
            onComplete={handleOrbPulseComplete}
          />
        )}
      </AnimatePresence>
    </>
  );
});

SynapticDownload.displayName = 'SynapticDownload';

export default SynapticDownload;
