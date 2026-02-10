// ═══════════════════════════════════════════════════════════════════════════════
// ZOE VOICE ORB - Living Biometric Waveform Visualizer
// Reacts to audio frequency: High pitch = fast ripples, Low pitch = deep waves
// ═══════════════════════════════════════════════════════════════════════════════

import React, { memo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

type OrbState = 'idle' | 'listening' | 'processing' | 'success' | 'error';

interface VoiceOrbProps {
  state: OrbState;
  audioData?: Float32Array | null;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  sm: { container: 'w-24 h-24', ring: 'w-32 h-32', wave: 8, barHeight: 30 },
  md: { container: 'w-32 h-32', ring: 'w-44 h-44', wave: 12, barHeight: 40 },
  lg: { container: 'w-40 h-40', ring: 'w-52 h-52', wave: 16, barHeight: 50 },
  xl: { container: 'w-56 h-56', ring: 'w-72 h-72', wave: 20, barHeight: 65 },
};

const STATE_COLORS = {
  idle: { primary: '180, 100%, 50%', secondary: '45, 100%, 50%' },
  listening: { primary: '180, 100%, 60%', secondary: '280, 100%, 60%' },
  processing: { primary: '45, 100%, 55%', secondary: '30, 100%, 50%' },
  success: { primary: '145, 100%, 50%', secondary: '160, 100%, 40%' },
  error: { primary: '0, 80%, 55%', secondary: '15, 90%, 50%' },
};

// Audio-reactive waveform bars - Living Waveform Effect
const WaveformBars = memo<{ audioData: Float32Array | null; count: number; state: OrbState; maxHeight: number }>(
  ({ audioData, count, state, maxHeight }) => {
    const bars = Array.from({ length: count }, (_, i) => {
      const dataIndex = Math.floor((i / count) * (audioData?.length || 1));
      const amplitude = audioData ? Math.abs(audioData[dataIndex] || 0) : 0;
      
      // Create wave-like pattern: center bars are taller
      const centerDistance = Math.abs(i - count / 2) / (count / 2);
      const centerBoost = 1 - centerDistance * 0.5;
      
      // High pitch = fast ripples, Low pitch = deep waves
      const frequencyFactor = state === 'listening' 
        ? Math.max(0.2, Math.min(1, amplitude * 4 + 0.2)) * centerBoost
        : 0.15 + Math.sin(Date.now() / 2000 + i * 0.3) * 0.1 * centerBoost; // Slower idle breathing
      
      return (
        <motion.div
          key={i}
          className="rounded-full"
          style={{
            width: state === 'listening' ? '4px' : '3px',
            originY: 1,
            background: `linear-gradient(to top, 
              rgba(6, 182, 212, ${state === 'listening' ? 0.9 : 0.6}), 
              rgba(251, 191, 36, ${state === 'listening' ? 0.8 : 0.5})
            )`,
            boxShadow: state === 'listening' 
              ? `0 0 8px rgba(6, 182, 212, 0.5), 0 0 16px rgba(251, 191, 36, 0.3)`
              : 'none',
          }}
          animate={{
            height: `${frequencyFactor * maxHeight}px`,
            opacity: state === 'listening' ? 0.95 : 0.6,
          }}
          transition={{
            duration: state === 'listening' ? 0.04 : 1.2, // Even faster for listening
            ease: state === 'listening' ? 'linear' : 'easeInOut',
          }}
        />
      );
    });

    return (
      <div className="absolute inset-0 flex items-end justify-center gap-[2px] pb-[20%]">
        {bars}
      </div>
    );
  }
);

WaveformBars.displayName = 'WaveformBars';

// Ripple effect for audio response - GPU accelerated CSS
const AudioRipples = memo<{ state: OrbState; intensity: number }>(({ state }) => {
  if (state !== 'listening') return null;

  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute inset-0 rounded-full border border-cyan-400/30 animate-gpu-ripple-expand"
          style={{
            '--ripple-delay': `${i * 0.4}s`,
            animationDelay: `${i * 0.4}s`,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
});

AudioRipples.displayName = 'AudioRipples';

const VoiceOrbComponent: React.FC<VoiceOrbProps> = ({
  state = 'idle',
  audioData = null,
  onClick,
  size = 'lg',
  className,
}) => {
  const [intensity, setIntensity] = useState(0);
  const [breathPhase, setBreathPhase] = useState(0);
  const sizeConfig = SIZE_MAP[size];
  const colors = STATE_COLORS[state];
  
  // Breathing animation for idle state - slow organic pulse
  useEffect(() => {
    if (state === 'idle') {
      const interval = setInterval(() => {
        setBreathPhase(prev => (prev + 1) % 360);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [state]);

  // Calculate audio intensity
  useEffect(() => {
    if (audioData && state === 'listening') {
      const sum = audioData.reduce((acc, val) => acc + Math.abs(val), 0);
      setIntensity(Math.min(1, sum / audioData.length * 5));
    } else {
      setIntensity(0);
    }
  }, [audioData, state]);

  return (
    <div
      className={cn(
        'relative cursor-pointer select-none',
        sizeConfig.container,
        className
      )}
      onClick={onClick}
    >
      {/* Ambient glow - GPU accelerated */}
      <div
        className={cn(
          "absolute inset-[-50%] rounded-full blur-3xl",
          state === 'listening' ? 'animate-gpu-glow-pulse-fast' : 'animate-gpu-glow-pulse-slow'
        )}
        style={{
          background: `radial-gradient(circle, hsla(${colors.primary}, 0.3) 0%, transparent 70%)`,
        }}
      />

      {/* Outer rotating rings - GPU accelerated */}
      <div
        className={cn(
          'absolute rounded-full border animate-gpu-spin-20s',
          sizeConfig.ring,
          state === 'listening' ? 'border-cyan-500/30' : 'border-cyan-500/20'
        )}
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Audio ripples */}
      <AudioRipples state={state} intensity={intensity} />

      {/* Main orb body - Enhanced with breathing animation */}
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{
          background: `
            radial-gradient(circle at 30% 30%, 
              hsla(${colors.primary}, 0.5) 0%, 
              hsla(${colors.secondary}, 0.25) 50%, 
              transparent 100%
            )
          `,
          boxShadow: `
            0 0 80px hsla(${colors.primary}, 0.5),
            0 0 120px hsla(${colors.secondary}, 0.3),
            inset 0 0 50px hsla(${colors.primary}, 0.25),
            inset 0 0 100px hsla(${colors.secondary}, 0.15)
          `,
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
        animate={{
          scale: state === 'idle' 
            ? 1 + Math.sin(breathPhase * Math.PI / 180) * 0.03 // Organic breathing
            : state === 'listening' 
              ? 1 + intensity * 0.05 
              : 1,
        }}
        transition={{
          duration: state === 'idle' ? 0.1 : 0.15,
          ease: 'easeOut',
        }}
      >
        {/* Inner glass layer */}
        <div
          className="absolute inset-2 rounded-full"
          style={{
            background: `
              radial-gradient(circle at 40% 40%, 
                rgba(255, 255, 255, 0.15) 0%, 
                transparent 60%
              )
            `,
          }}
        />

        {/* Waveform visualization - Living Waveform */}
        <WaveformBars 
          audioData={audioData} 
          count={sizeConfig.wave} 
          state={state}
          maxHeight={sizeConfig.barHeight}
        />

        {/* Center core - GPU accelerated */}
        <div
          className={cn(
            "absolute inset-[30%] rounded-full",
            state === 'listening' ? 'animate-gpu-core-pulse-fast' : 'animate-gpu-core-pulse-slow'
          )}
          style={{
            background: `radial-gradient(circle, hsla(${colors.primary}, 0.6) 0%, transparent 70%)`,
          }}
        />
      </motion.div>

      {/* Processing spinner */}
      <AnimatePresence>
        {state === 'processing' && (
          <div
            className="absolute inset-[-4px] rounded-full animate-gpu-spin"
            style={{
              border: '2px solid transparent',
              borderTopColor: `hsla(${colors.primary}, 0.8)`,
              borderRightColor: `hsla(${colors.secondary}, 0.6)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Success/Error state indicators */}
      <AnimatePresence>
        {(state === 'success' || state === 'error') && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div
              className={cn(
                'text-4xl font-bold',
                state === 'success' ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              {state === 'success' ? '✓' : '✗'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const VoiceOrb = memo(VoiceOrbComponent);
export default VoiceOrb;
