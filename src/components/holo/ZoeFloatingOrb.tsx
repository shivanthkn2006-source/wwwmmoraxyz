// ═══════════════════════════════════════════════════════════════════════════════
// ZOE FLOATING ORB - PROJECT EXODUS 2120
// OPTIMIZED: CSS animations for stability, minimal framer-motion usage
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

export type ZoeState = 'idle' | 'thinking' | 'listening' | 'speaking' | 'alert' | 'success';

interface ZoeFloatingOrbProps {
  state?: ZoeState;
  onClick?: () => void;
  onDragEnd?: (x: number, y: number) => void;
  initialPosition?: { x: number; y: number };
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
  className?: string;
}

const stateColors: Record<ZoeState, { primary: string; glow: string; ring: string }> = {
  idle: { primary: 'from-omega-cyan/80 to-omega-purple/60', glow: 'hsla(185, 100%, 50%, 0.4)', ring: 'border-omega-cyan/30' },
  thinking: { primary: 'from-blue-400/80 to-indigo-500/60', glow: 'hsla(210, 100%, 60%, 0.5)', ring: 'border-blue-400/50' },
  listening: { primary: 'from-green-400/80 to-emerald-500/60', glow: 'hsla(145, 100%, 50%, 0.5)', ring: 'border-green-400/50' },
  speaking: { primary: 'from-omega-cyan/90 to-omega-pink/70', glow: 'hsla(185, 100%, 50%, 0.6)', ring: 'border-omega-cyan/60' },
  alert: { primary: 'from-amber-400/80 to-orange-500/60', glow: 'hsla(35, 100%, 55%, 0.6)', ring: 'border-amber-400/50' },
  success: { primary: 'from-emerald-400/80 to-green-500/60', glow: 'hsla(145, 100%, 50%, 0.5)', ring: 'border-emerald-400/50' },
};

const sizeClasses = { sm: 'w-12 h-12', md: 'w-16 h-16', lg: 'w-20 h-20' };

// Memoized pure CSS orb core - no framer-motion animations for stability
const OrbCore = memo(({ colors, state, showPulse }: { colors: typeof stateColors[ZoeState]; state: ZoeState; showPulse: boolean }) => (
  <>
    {/* Outer glow rings - pure CSS animation */}
    {showPulse && (
      <>
        <div className={cn('absolute inset-[-8px] rounded-full border-2 animate-[orbPulse_2s_ease-in-out_infinite]', colors.ring)} />
        <div 
          className={cn('absolute inset-[-16px] rounded-full border animate-[orbPulse_2.5s_ease-in-out_infinite]', colors.ring)} 
          style={{ animationDelay: '0.3s' }}
        />
      </>
    )}

    {/* Core orb - CSS-based pulse */}
    <div
      className={cn(
        'w-full h-full rounded-full relative overflow-hidden bg-gradient-to-br',
        colors.primary,
        state === 'thinking' && 'animate-[orbThink_1.5s_ease-in-out_infinite]',
        state === 'speaking' && 'animate-[orbSpeak_0.5s_ease-in-out_infinite]'
      )}
      style={{
        boxShadow: `0 0 30px ${colors.glow}, 0 0 60px ${colors.glow}, inset 0 0 20px hsla(0, 0%, 100%, 0.2)`,
        transform: 'translateZ(0)',
      }}
    >
      {/* Inner highlight */}
      <div className="absolute top-1 left-1 w-3 h-3 rounded-full bg-white/40 blur-sm" />
      
      {/* Prismatic sheen - CSS animation */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent animate-[spin_10s_linear_infinite]" />

      {/* State effects */}
      {state === 'listening' && (
        <div className="absolute inset-2 rounded-full border-2 border-green-400/50 animate-[orbPulse_1.5s_ease-in-out_infinite]" />
      )}
      {state === 'alert' && (
        <div className="absolute inset-0 bg-amber-500/30 animate-[alertFlash_0.5s_ease-in-out_infinite]" />
      )}
    </div>

    {/* State indicator dot - CSS pulse */}
    <div
      className={cn(
        'absolute -bottom-1 -right-1 w-3 h-3 rounded-full animate-[dotPulse_1s_ease-in-out_infinite]',
        state === 'idle' && 'bg-omega-cyan',
        state === 'thinking' && 'bg-blue-400',
        state === 'listening' && 'bg-green-400',
        state === 'speaking' && 'bg-omega-pink',
        state === 'alert' && 'bg-amber-400',
        state === 'success' && 'bg-emerald-400'
      )}
    />
  </>
));

OrbCore.displayName = 'OrbCore';

const ZoeFloatingOrbComponent: React.FC<ZoeFloatingOrbProps> = ({
  state = 'idle',
  onClick,
  onDragEnd,
  initialPosition = { x: typeof window !== 'undefined' ? (window.innerWidth / 2 - 32) : 200, y: 16 },
  size = 'md',
  showPulse = true,
  className,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);
  
  // Spring physics for drag only (not animation)
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springConfig = { stiffness: 150, damping: 25, mass: 0.5 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);
  const transform = useTransform([springX, springY], ([lx, ly]) => `translate3d(${lx}px, ${ly}px, 0)`);

  const colors = stateColors[state];

  // Throttled device orientation (optional gyroscope effect)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let lastUpdate = 0;
    const handleOrientation = (event: DeviceOrientationEvent) => {
      const now = Date.now();
      if (now - lastUpdate < 100 || isDragging) return; // 10fps max
      lastUpdate = now;
      if (event.gamma !== null && event.beta !== null) {
        x.set(event.gamma / 90 * 8);
        y.set((event.beta - 45) / 90 * 8);
      }
    };
    window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [isDragging, x, y]);

  const handleDragEnd = useCallback((_: any, info: any) => {
    setIsDragging(false);
    x.set(info.offset.x);
    y.set(info.offset.y);
    onDragEnd?.(initialPosition.x + info.offset.x, initialPosition.y + info.offset.y);
  }, [onDragEnd, initialPosition, x, y]);

  return (
    <>
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 9998 }} />
      
      <motion.div
        className={cn('fixed cursor-grab active:cursor-grabbing touch-none select-none', sizeClasses[size], className)}
        style={{ left: initialPosition.x, top: initialPosition.y, zIndex: 9999, transform, willChange: 'transform' }}
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.05}
        dragMomentum={true}
        dragTransition={{ bounceStiffness: 150, bounceDamping: 15 }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        onClick={onClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        whileDrag={{ scale: 1.15 }}
      >
        <OrbCore colors={colors} state={state} showPulse={showPulse} />
      </motion.div>
    </>
  );
};

export const ZoeFloatingOrb = memo(ZoeFloatingOrbComponent);
export default ZoeFloatingOrb;
