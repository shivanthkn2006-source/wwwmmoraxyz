/**
 * VOICE SIGNAL ICON - Browser Voice Status Indicator
 * Shows voice is active (green dot when speaking)
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2 } from 'lucide-react';
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
  const info = PROVIDER_INFO[activeEngine] || PROVIDER_INFO['native'];
  
  const colorMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    green: { bg: 'bg-green-500', border: 'border-green-500/50', text: 'text-green-400', glow: 'shadow-green-500/30' },
    yellow: { bg: 'bg-yellow-500', border: 'border-yellow-500/50', text: 'text-yellow-400', glow: 'shadow-yellow-500/30' },
    red: { bg: 'bg-red-500', border: 'border-red-500/50', text: 'text-red-400', glow: 'shadow-red-500/30' },
  };
  
  const colors = colorMap[info.color] || colorMap.green;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "fixed top-4 right-4 z-50 flex items-center gap-2",
        className
      )}
    >
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
        <motion.div
          className={cn(
            "w-2 h-2 rounded-full",
            colors.bg,
            isSpeaking && "animate-pulse"
          )}
          animate={isLoading ? { opacity: [1, 0.3, 1] } : {}}
          transition={{ duration: 0.5, repeat: isLoading ? Infinity : 0 }}
        />
        
        <Volume2 className={cn("w-3.5 h-3.5", colors.text)} />
        
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
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default VoiceSignalIcon;
