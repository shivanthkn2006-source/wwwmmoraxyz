/**
 * VOICE SIGNAL ICON - Engine Status Indicator
 * ============================================
 * Small visual indicator showing current voice engine:
 * 🟢 Green = Cloud (Azure Neural)
 * 🟡 Yellow = Deepgram (Premium)
 * 🔴 Red = Native (System Backup)
 * 
 * Positioned in top right corner of Zoe Infinity
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoiceProvider, PROVIDER_INFO } from '@/hooks/useVoiceOrchestrator';

interface VoiceSignalIconProps {
  activeEngine: VoiceProvider;
  isSpeaking: boolean;
  isLoading: boolean;
  latencyMs?: number;
  className?: string;
}

export const VoiceSignalIcon: React.FC<VoiceSignalIconProps> = ({
  activeEngine,
  isSpeaking,
  isLoading,
  latencyMs = 0,
  className,
}) => {
  const info = PROVIDER_INFO[activeEngine];
  
  const colorClasses = {
    green: {
      bg: 'bg-green-500',
      border: 'border-green-500/50',
      text: 'text-green-400',
      glow: 'shadow-green-500/30',
    },
    yellow: {
      bg: 'bg-yellow-500',
      border: 'border-yellow-500/50',
      text: 'text-yellow-400',
      glow: 'shadow-yellow-500/30',
    },
    red: {
      bg: 'bg-red-500',
      border: 'border-red-500/50',
      text: 'text-red-400',
      glow: 'shadow-red-500/30',
    },
  };
  
  const colors = colorClasses[info.color];
  
  const IconComponent = activeEngine === 'native' ? WifiOff : 
                        activeEngine === 'deepgram' ? Radio : Wifi;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "fixed top-4 right-4 z-50 flex items-center gap-2",
        className
      )}
    >
      {/* Signal indicator */}
      <motion.div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-full",
          "backdrop-blur-xl bg-background/60 border",
          colors.border,
          isSpeaking && `shadow-lg ${colors.glow}`
        )}
        animate={isSpeaking ? { scale: [1, 1.02, 1] } : {}}
        transition={{ duration: 0.5, repeat: isSpeaking ? Infinity : 0 }}
      >
        {/* Animated dot */}
        <motion.div
          className={cn(
            "w-2 h-2 rounded-full",
            colors.bg,
            isSpeaking && "animate-pulse"
          )}
          animate={isLoading ? { opacity: [1, 0.3, 1] } : {}}
          transition={{ duration: 0.5, repeat: isLoading ? Infinity : 0 }}
        />
        
        {/* Icon */}
        <IconComponent 
          className={cn("w-3.5 h-3.5", colors.text)} 
        />
        
        {/* Provider name on hover/tap */}
        <AnimatePresence>
          {(isSpeaking || isLoading) && (
            <motion.span
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className={cn(
                "text-[10px] font-medium whitespace-nowrap overflow-hidden",
                colors.text
              )}
            >
              {info.name}
              {latencyMs > 0 && ` ${latencyMs}ms`}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default VoiceSignalIcon;
