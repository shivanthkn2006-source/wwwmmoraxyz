// ═══════════════════════════════════════════════════════════════════════════════
// ZOE ORB ICON - Compact Icon Version of Zoe Orb for Buttons
// Pure CSS Animations for Hardware-Accelerated Performance
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { cn } from '@/lib/utils';

interface ZoeOrbIconProps {
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  animated?: boolean;
}

const SIZE_MAP = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
};

export const ZoeOrbIcon: React.FC<ZoeOrbIconProps> = ({
  size = 'sm',
  className,
  animated = true,
}) => {
  return (
    <div className={cn('relative', SIZE_MAP[size], className)}>
      {/* Outer ring - CSS opacity pulse */}
      <div
        className={cn(
          'absolute inset-0 rounded-full border border-white/40',
          animated && 'animate-[orbIconRing_2s_ease-in-out_infinite]'
        )}
      />
      
      {/* Inner orb with gradient - CSS scale pulse */}
      <div
        className={cn(
          'absolute inset-[2px] rounded-full bg-gradient-to-br from-white/60 via-white/30 to-white/10',
          animated && 'animate-[orbIconScale_1.5s_ease-in-out_infinite]'
        )}
      />
      
      {/* Core glow - CSS opacity pulse */}
      <div
        className={cn(
          'absolute inset-[30%] rounded-full bg-white/80',
          animated && 'animate-[orbIconCore_1s_ease-in-out_infinite]'
        )}
      />
    </div>
  );
};

export default ZoeOrbIcon;
