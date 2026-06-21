// ═══════════════════════════════════════════════════════════════════════════════
// CSS-ONLY ORB - Zero CPU/GPU Overhead
// Designed for Samsung M05, iPhone 11, and other low-end devices
// Looks identical to WebGL orb but uses pure CSS animations
// ═══════════════════════════════════════════════════════════════════════════════

import React, { memo, useState } from 'react';
import { cn } from '@/lib/utils';

export type ZoeState = 'idle' | 'thinking' | 'listening' | 'speaking' | 'alert' | 'success';

const stateColors: Record<ZoeState, { primary: string; glow: string; ring: string }> = {
  idle: { primary: 'from-omega-cyan to-omega-purple', glow: 'hsl(180, 100%, 50%)', ring: 'border-omega-cyan/30' },
  thinking: { primary: 'from-amber-400 to-orange-500', glow: 'hsl(38, 100%, 50%)', ring: 'border-amber-400/50' },
  listening: { primary: 'from-green-400 to-emerald-500', glow: 'hsl(142, 70%, 50%)', ring: 'border-green-400/50' },
  speaking: { primary: 'from-omega-pink to-rose-500', glow: 'hsl(330, 100%, 60%)', ring: 'border-omega-pink/50' },
  alert: { primary: 'from-red-500 to-rose-600', glow: 'hsl(0, 100%, 50%)', ring: 'border-red-500/60' },
  success: { primary: 'from-green-500 to-emerald-400', glow: 'hsl(142, 76%, 45%)', ring: 'border-green-500/50' },
};

interface CSSOnlyOrbProps {
  state?: ZoeState;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

/**
 * CSS-Only Orb - Zero CPU overhead alternative to WebGL orb
 * Uses pure CSS animations optimized for will-change and GPU compositing
 * Perfect for low-end devices like Samsung M05, iPhone 11
 */
export const CSSOnlyOrb = memo(({ 
  state = 'idle', 
  size = 'md',
  onClick,
  className 
}: CSSOnlyOrbProps) => {
  const [isPressed, setIsPressed] = useState(false);
  const colors = stateColors[state];
  
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  return (
    <div 
      className={cn(
        "relative cursor-pointer select-none",
        sizeClasses[size],
        className
      )}
      onClick={onClick}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerLeave={() => setIsPressed(false)}
      role="button"
      aria-label={`Zoe is ${state}`}
    >
      {/* Outer glow ring - subtle pulse animation */}
      <div 
        className={cn(
          "absolute inset-[-4px] rounded-full border-2 opacity-60",
          colors.ring,
          state === 'thinking' && "animate-pulse",
          state === 'listening' && "animate-ping",
          state === 'speaking' && "css-orb-wave"
        )}
        style={{
          boxShadow: `0 0 20px ${colors.glow}40`,
          willChange: 'transform, opacity',
        }}
      />
      
      {/* Middle glow layer */}
      <div 
        className={cn(
          "absolute inset-[-2px] rounded-full opacity-40",
          state !== 'idle' && "css-orb-pulse"
        )}
        style={{
          background: `radial-gradient(circle, ${colors.glow}60 0%, transparent 70%)`,
          willChange: 'opacity',
        }}
      />
      
      {/* Main orb body */}
      <div 
        className={cn(
          "absolute inset-0 rounded-full bg-gradient-to-br shadow-lg transition-transform duration-150",
          colors.primary,
          isPressed ? "scale-95" : "scale-100",
          state === 'idle' && "css-orb-breathe",
          state === 'thinking' && "css-orb-spin",
          state === 'speaking' && "css-orb-pulse-fast"
        )}
        style={{
          boxShadow: `
            0 0 30px ${colors.glow}50,
            inset 0 -4px 8px rgba(0, 0, 0, 0.3),
            inset 0 4px 8px rgba(255, 255, 255, 0.2)
          `,
          willChange: 'transform',
        }}
      />
      
      {/* Inner core - the "eye" */}
      <div 
        className={cn(
          "absolute inset-[25%] rounded-full",
          state === 'listening' && "css-orb-pulse"
        )}
        style={{
          background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6) 0%, transparent 50%)`,
          willChange: 'opacity',
        }}
      />
      
      {/* Prismatic sheen overlay */}
      <div 
        className="absolute inset-0 rounded-full overflow-hidden css-orb-sheen"
        style={{
          background: `linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)`,
          willChange: 'background-position',
        }}
      />
      
      {/* State indicator dot */}
      {state !== 'idle' && (
        <div 
          className={cn(
            "absolute bottom-0 right-0 w-3 h-3 rounded-full border border-black/20",
            state === 'thinking' && "bg-amber-400",
            state === 'listening' && "bg-green-400 animate-ping",
            state === 'speaking' && "bg-omega-pink css-orb-pulse-fast",
            state === 'alert' && "bg-red-500 animate-pulse",
            state === 'success' && "bg-green-500"
          )}
          style={{
            boxShadow: `0 0 8px ${colors.glow}`,
          }}
        />
      )}
    </div>
  );
});

CSSOnlyOrb.displayName = 'CSSOnlyOrb';

export default CSSOnlyOrb;
