// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTIVE SCREEN GLOW - PROJECT EXODUS 2120
// If Zoe is 'Thinking,' the entire screen border pulses Soft Blue
// If 'Security Alert,' pulse Amber
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export type GlowState = 'idle' | 'thinking' | 'alert' | 'success' | 'error' | 'security';

interface AdaptiveScreenGlowProps {
  state?: GlowState;
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

const glowConfigs: Record<GlowState, {
  color: string;
  shadowColor: string;
  pulseSpeed: number;
}> = {
  idle: {
    color: 'transparent',
    shadowColor: 'transparent',
    pulseSpeed: 0,
  },
  thinking: {
    color: 'hsla(210, 100%, 60%, 0.15)',
    shadowColor: 'hsla(210, 100%, 60%, 0.4)',
    pulseSpeed: 2,
  },
  alert: {
    color: 'hsla(35, 100%, 55%, 0.2)',
    shadowColor: 'hsla(35, 100%, 55%, 0.5)',
    pulseSpeed: 1,
  },
  success: {
    color: 'hsla(145, 100%, 50%, 0.15)',
    shadowColor: 'hsla(145, 100%, 50%, 0.4)',
    pulseSpeed: 1.5,
  },
  error: {
    color: 'hsla(0, 100%, 55%, 0.2)',
    shadowColor: 'hsla(0, 100%, 55%, 0.5)',
    pulseSpeed: 0.8,
  },
  security: {
    color: 'hsla(280, 100%, 60%, 0.2)',
    shadowColor: 'hsla(280, 100%, 60%, 0.5)',
    pulseSpeed: 0.6,
  },
};

const intensityMultipliers = {
  low: 0.5,
  medium: 1,
  high: 1.5,
};

export const AdaptiveScreenGlow: React.FC<AdaptiveScreenGlowProps> = ({
  state = 'idle',
  intensity = 'medium',
  className,
}) => {
  const config = glowConfigs[state];
  const multiplier = intensityMultipliers[intensity];

  if (state === 'idle') return null;

  return (
    <AnimatePresence>
      <motion.div
        key={state}
        className={cn(
          'screen-glow-border animate-gpu-pulse-opacity',
          className
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          boxShadow: `
            inset 0 0 ${60 * multiplier}px ${config.color},
            inset 0 0 ${120 * multiplier}px ${config.shadowColor}
          `,
          animationDuration: `${config.pulseSpeed}s`
        }}
        data-state={state}
      >
        {/* Corner accents for extra visual punch */}
        {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
          <div
            key={corner}
            className={cn(
              'absolute w-16 h-16 animate-gpu-pulse-opacity',
              corner === 'top-left' && 'top-0 left-0',
              corner === 'top-right' && 'top-0 right-0',
              corner === 'bottom-left' && 'bottom-0 left-0',
              corner === 'bottom-right' && 'bottom-0 right-0'
            )}
            style={{
              background: `radial-gradient(circle at ${
                corner.includes('left') ? '0%' : '100%'
              } ${
                corner.includes('top') ? '0%' : '100%'
              }, ${config.shadowColor}, transparent 70%)`,
              animationDuration: `${config.pulseSpeed * 0.8}s`,
              animationDelay: corner.includes('right') ? '0.1s' : '0s',
            }}
          />
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

// Hook to manage screen glow state globally
export const useScreenGlow = () => {
  const [glowState, setGlowState] = useState<GlowState>('idle');
  const [intensity, setIntensity] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    const handleZoeState = (event: CustomEvent<{ state: GlowState; intensity?: 'low' | 'medium' | 'high' }>) => {
      setGlowState(event.detail.state);
      if (event.detail.intensity) {
        setIntensity(event.detail.intensity);
      }
    };

    window.addEventListener('zoe-state-change', handleZoeState as EventListener);
    return () => window.removeEventListener('zoe-state-change', handleZoeState as EventListener);
  }, []);

  const triggerGlow = (state: GlowState, duration?: number) => {
    setGlowState(state);
    if (duration) {
      setTimeout(() => setGlowState('idle'), duration);
    }
  };

  return {
    glowState,
    intensity,
    setGlowState,
    setIntensity,
    triggerGlow,
  };
};

export default AdaptiveScreenGlow;
