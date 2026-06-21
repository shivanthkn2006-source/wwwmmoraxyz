// ═══════════════════════════════════════════════════════════════════════════════
// VOICE STATUS INDICATOR - Minimal visual for always-on voice conversation
// No buttons, just shows current state: listening, speaking, or processing
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface VoiceStatusIndicatorProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  transcript?: string;
}

export const HandsFreeIndicator: React.FC<VoiceStatusIndicatorProps> = ({
  isListening,
  isSpeaking,
  isProcessing,
  transcript = '',
}) => {
  // Only show when actively processing or speaking (not just listening idle)
  const showIndicator = isSpeaking || isProcessing || (isListening && transcript.length > 0);
  
  if (!showIndicator) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      >
        {/* Minimal indicator pill */}
        <motion.div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl border shadow-lg",
            "bg-background/60 border-border/30",
            isListening && "border-green-500/40",
            isSpeaking && "border-purple-500/40",
            isProcessing && "border-amber-500/40"
          )}
        >
          {/* Small animated dot */}
          <div
            className={cn(
              "w-2 h-2 rounded-full animate-gpu-ring-scale-pulse",
              isListening && "bg-green-500",
              isSpeaking && "bg-purple-500",
              isProcessing && "bg-amber-500"
            )}
          />

          {/* Status text */}
          <span className={cn(
            "text-xs font-medium",
            isListening && "text-green-400",
            isSpeaking && "text-purple-400",
            isProcessing && "text-amber-400"
          )}>
            {isListening && "Listening"}
            {isSpeaking && "Zoe"}
            {isProcessing && "..."}
          </span>
          
          {/* Current transcript preview */}
          {transcript && isListening && (
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
              {transcript.slice(0, 25)}{transcript.length > 25 ? '...' : ''}
            </span>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default HandsFreeIndicator;
