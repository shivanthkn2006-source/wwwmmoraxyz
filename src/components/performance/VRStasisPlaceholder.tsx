/**
 * VR STASIS PLACEHOLDER
 * Protocol: VR Stasis - Replaces heavy 3D rendering with lightweight static preview
 * Reduces GPU usage to 0% until user explicitly requests immersive mode
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Box, Glasses, Sparkles, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VRStasisPlaceholderProps {
  onEnterImmersive: () => void;
  title?: string;
  description?: string;
  className?: string;
  variant?: 'omega' | 'orbital' | 'evolution' | 'default';
}

const variantStyles = {
  omega: {
    gradient: 'from-purple-950/80 via-indigo-950/60 to-black',
    accent: 'purple',
    icon: Box,
    glowColor: 'purple-500/30',
  },
  orbital: {
    gradient: 'from-blue-950/80 via-cyan-950/60 to-black',
    accent: 'cyan',
    icon: Glasses,
    glowColor: 'cyan-500/30',
  },
  evolution: {
    gradient: 'from-emerald-950/80 via-blue-950/60 to-black',
    accent: 'emerald',
    icon: Sparkles,
    glowColor: 'emerald-500/30',
  },
  default: {
    gradient: 'from-slate-900/80 via-gray-950/60 to-black',
    accent: 'slate',
    icon: Cpu,
    glowColor: 'white/20',
  },
};

export const VRStasisPlaceholder: React.FC<VRStasisPlaceholderProps> = ({
  onEnterImmersive,
  title = 'VR World Available',
  description = 'Enter Immersive Mode to explore the 3D environment',
  className,
  variant = 'default',
}) => {
  const styles = variantStyles[variant];
  const IconComponent = styles.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'relative w-full h-full min-h-[300px] flex flex-col items-center justify-center',
        `bg-gradient-to-b ${styles.gradient}`,
        'border border-white/10 rounded-xl overflow-hidden',
        className
      )}
    >
      {/* Decorative grid overlay - static, GPU-free */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Central content */}
      <div className="relative z-10 flex flex-col items-center text-center p-6 max-w-md">
        {/* Icon with subtle pulse - CSS only, no GPU */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className={cn(
            'w-20 h-20 rounded-2xl flex items-center justify-center mb-6',
            'bg-gradient-to-br from-white/10 to-white/5',
            `border border-${styles.accent}-500/30`,
            `shadow-lg shadow-${styles.glowColor}`
          )}
        >
          <IconComponent className={`w-10 h-10 text-${styles.accent}-400`} />
        </motion.div>

        <h2 className="text-xl font-bold text-white/90 mb-2">{title}</h2>
        <p className="text-sm text-white/50 mb-6">{description}</p>

        {/* Performance note */}
        <p className="text-xs text-white/30 mb-4 flex items-center gap-2">
          <Cpu className="w-3 h-3" />
          GPU resources preserved until you enter
        </p>

        <Button
          onClick={onEnterImmersive}
          size="lg"
          className={cn(
            'gap-2 font-semibold',
            variant === 'omega' && 'bg-purple-600 hover:bg-purple-700 text-white',
            variant === 'orbital' && 'bg-cyan-600 hover:bg-cyan-700 text-white',
            variant === 'evolution' && 'bg-emerald-600 hover:bg-emerald-700 text-white',
            variant === 'default' && 'bg-slate-600 hover:bg-slate-700 text-white'
          )}
        >
          <Glasses className="w-5 h-5" />
          Enter Immersive Mode
        </Button>
      </div>

      {/* Corner accents - pure CSS */}
      <div className={`absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-${styles.accent}-500/40`} />
      <div className={`absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-${styles.accent}-500/40`} />
      <div className={`absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-${styles.accent}-500/40`} />
      <div className={`absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-${styles.accent}-500/40`} />
    </motion.div>
  );
};

export default VRStasisPlaceholder;
