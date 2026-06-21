// ═══════════════════════════════════════════════════════════════════════════════
// HOLOGRAPHIC QUANTUM CARD COMPONENT
// Enhanced glassmorphism with floating holographic effects
// Module 7000.3 - UI/UX Quantum Aesthetic
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface HolographicCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'purple' | 'cyan' | 'red' | 'pink' | 'indigo' | 'amber';
  glow?: boolean;
  float?: boolean;
  scanLines?: boolean;
}

const variantStyles = {
  default: {
    border: 'border-cyan-500/30',
    glow: 'shadow-[0_0_60px_rgba(0,255,255,0.15)]',
    gradient: 'from-cyan-500/10 via-transparent to-purple-500/10',
    scanColor: 'bg-cyan-500/10'
  },
  purple: {
    border: 'border-purple-500/30',
    glow: 'shadow-[0_0_60px_rgba(147,51,234,0.2)]',
    gradient: 'from-purple-500/10 via-transparent to-pink-500/10',
    scanColor: 'bg-purple-500/10'
  },
  cyan: {
    border: 'border-cyan-400/40',
    glow: 'shadow-[0_0_80px_rgba(34,211,238,0.2)]',
    gradient: 'from-cyan-400/15 via-transparent to-blue-500/10',
    scanColor: 'bg-cyan-400/10'
  },
  red: {
    border: 'border-red-500/30',
    glow: 'shadow-[0_0_60px_rgba(239,68,68,0.15)]',
    gradient: 'from-red-500/10 via-transparent to-orange-500/10',
    scanColor: 'bg-red-500/10'
  },
  pink: {
    border: 'border-pink-500/30',
    glow: 'shadow-[0_0_60px_rgba(236,72,153,0.15)]',
    gradient: 'from-pink-500/10 via-transparent to-rose-500/10',
    scanColor: 'bg-pink-500/10'
  },
  indigo: {
    border: 'border-indigo-500/30',
    glow: 'shadow-[0_0_60px_rgba(99,102,241,0.15)]',
    gradient: 'from-indigo-500/10 via-transparent to-blue-500/10',
    scanColor: 'bg-indigo-500/10'
  },
  amber: {
    border: 'border-amber-500/30',
    glow: 'shadow-[0_0_60px_rgba(245,158,11,0.15)]',
    gradient: 'from-amber-500/10 via-transparent to-orange-500/10',
    scanColor: 'bg-amber-500/10'
  }
};

export const HolographicCard: React.FC<HolographicCardProps> = ({
  children,
  className,
  variant = 'default',
  glow = true,
  float = false,
  scanLines = true
}) => {
  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={float ? { y: -4, scale: 1.01 } : undefined}
      transition={{ duration: 0.3 }}
      className={cn(
        'relative rounded-2xl overflow-hidden',
        'bg-black/60 backdrop-blur-2xl',
        'border',
        styles.border,
        glow && styles.glow,
        className
      )}
    >
      {/* Holographic gradient overlay */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br pointer-events-none',
        styles.gradient
      )} />
      
      {/* Animated scan lines effect */}
      {scanLines && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={cn('absolute inset-x-0 h-px animate-gpu-scan-line', styles.scanColor)} />
        </div>
      )}
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-current opacity-30 rounded-tl-2xl" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-current opacity-30 rounded-tr-2xl" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-current opacity-30 rounded-bl-2xl" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-current opacity-30 rounded-br-2xl" />
      
      {/* Content */}
      <div className="relative z-10 p-6">
        {children}
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOLOGRAPHIC BUTTON COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface HolographicButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

const buttonVariants = {
  primary: 'from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 shadow-purple-500/30',
  secondary: 'from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 shadow-slate-500/20',
  danger: 'from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 shadow-red-500/30',
  success: 'from-emerald-600 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 shadow-emerald-500/30'
};

const buttonSizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg'
};

export const HolographicButton: React.FC<HolographicButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  disabled,
  onClick
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={cn(
          'relative overflow-hidden rounded-xl font-bold text-white',
          'bg-gradient-to-r transition-all duration-300',
          'shadow-lg hover:shadow-xl',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          buttonVariants[variant],
          buttonSizes[size],
          className
        )}
      >
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 animate-gpu-bg-slide" />
        
        {/* Content */}
        <span className="relative z-10 flex items-center justify-center gap-2">
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : icon}
          {children}
        </span>
      </button>
    </motion.div>
  );
};
// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING ORB INDICATOR
// ═══════════════════════════════════════════════════════════════════════════════

interface FloatingOrbProps {
  color?: 'cyan' | 'purple' | 'red' | 'green' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  label?: string;
}

const orbColors = {
  cyan: 'bg-cyan-500 shadow-cyan-500/50',
  purple: 'bg-purple-500 shadow-purple-500/50',
  red: 'bg-red-500 shadow-red-500/50',
  green: 'bg-emerald-500 shadow-emerald-500/50',
  amber: 'bg-amber-500 shadow-amber-500/50'
};

const orbSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-6 h-6'
};

export const FloatingOrb: React.FC<FloatingOrbProps> = ({
  color = 'cyan',
  size = 'md',
  pulse = true,
  label
}) => {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'rounded-full shadow-lg',
          pulse && 'animate-gpu-ring-scale-pulse',
          orbColors[color],
          orbSizes[size]
        )}
      />
      {label && <span className="text-sm text-slate-400">{label}</span>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUANTUM PROGRESS BAR
// ═══════════════════════════════════════════════════════════════════════════════

interface QuantumProgressProps {
  value: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
}

const progressVariants = {
  default: 'from-cyan-500 to-purple-500',
  success: 'from-emerald-500 to-cyan-500',
  warning: 'from-amber-500 to-orange-500',
  danger: 'from-red-500 to-orange-500'
};

export const QuantumProgress: React.FC<QuantumProgressProps> = ({
  value,
  max = 100,
  variant = 'default',
  showLabel = true,
  label,
  animated = true
}) => {
  const percentage = Math.min(100, (value / max) * 100);

  return (
    <div className="space-y-2">
      {(showLabel || label) && (
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">{label || 'Progress'}</span>
          <span className="text-slate-300 font-mono">{percentage.toFixed(1)}%</span>
        </div>
      )}
      <div className="relative h-3 bg-black/60 rounded-full overflow-hidden border border-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className={cn(
            'absolute inset-y-0 left-0 bg-gradient-to-r rounded-full',
            progressVariants[variant]
          )}
        />
        {animated && (
          <div className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-gpu-bg-slide" />
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOLOGRAPHIC BADGE
// ═══════════════════════════════════════════════════════════════════════════════

interface HolographicBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

const badgeVariants = {
  default: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  danger: 'bg-red-500/20 text-red-300 border-red-500/30',
  info: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
};

const badgeSizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base'
};

export const HolographicBadge: React.FC<HolographicBadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  pulse = false
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        pulse && 'animate-gpu-status-primary',
        badgeVariants[variant],
        badgeSizes[size]
      )}
    >
      {children}
    </span>
  );
};

export default HolographicCard;
