import React from 'react';
import { cn } from '@/lib/utils';

interface FuturisticCounterProps {
  count: number;
  className?: string;
  variant?: 'default' | 'glow' | 'pulse';
}

const FuturisticCounter: React.FC<FuturisticCounterProps> = ({ 
  count, 
  className,
  variant = 'default'
}) => {
  if (count <= 0) return null;

  return (
    <span 
      className={cn(
        "inline-flex items-center justify-center",
        "min-w-[14px] h-[14px] px-[3px]",
        "text-[8px] font-bold",
        "rounded-sm",
        "bg-gradient-to-r from-purple-500/80 to-cyan-400/80",
        "text-white",
        "backdrop-blur-sm",
        "border border-white/20",
        "shadow-[0_0_6px_rgba(139,92,246,0.5)]",
        variant === 'glow' && "animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.7)]",
        variant === 'pulse' && "animate-[pulse_1.5s_ease-in-out_infinite]",
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
};

export default FuturisticCounter;
