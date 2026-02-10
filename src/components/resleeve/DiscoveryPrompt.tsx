/**
 * DISCOVERY PROMPT - Phase 3: "Life You Want" Journey
 * Zoe asks: "I see you love colors. Do you want to be a Painter today?"
 * Part of Zoe Infinity DHF Core - Standalone System
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Heart, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DiscoveryPromptProps {
  talentName: string;
  sleeveId: string;
  sleeveEmoji: string;
  confidence: number;
  onAccept: () => void;
  onDismiss: () => void;
  isVisible: boolean;
}

export const DiscoveryPrompt = ({
  talentName,
  sleeveId,
  sleeveEmoji,
  confidence,
  onAccept,
  onDismiss,
  isVisible
}: DiscoveryPromptProps) => {
  const [pulseActive, setPulseActive] = useState(true);

  useEffect(() => {
    // Dispatch discovery event to Zoe Core DHF
    if (isVisible) {
      window.dispatchEvent(new CustomEvent('zoe-discovery-prompt', {
        detail: { talentName, sleeveId, confidence, timestamp: Date.now() }
      }));
    }
  }, [isVisible, talentName, sleeveId, confidence]);

  const sleeveDisplayName = sleeveId.replace('zoe-', 'Zoe-').replace('-', ' ');

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:max-w-md z-50"
        >
          <div className="relative bg-background/95 backdrop-blur-xl rounded-2xl border border-primary/30 shadow-2xl shadow-primary/10 overflow-hidden">
            {/* Animated gradient border - CSS */}
            <div className="absolute inset-0 opacity-30 animate-gpu-gradient-rotate" />

            {/* Close button */}
            <button
              onClick={onDismiss}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors z-10"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="relative p-5">
              {/* Zoe Avatar with pulse - CSS */}
              <div className="flex items-start gap-4">
                <div className="relative">
                  {pulseActive && (
                    <div className="absolute inset-0 rounded-full bg-primary/30 animate-gpu-ring-expand" />
                  )}
                  <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl animate-gpu-wiggle">
                    {sleeveEmoji}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  {/* Discovery Message */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      <span className="text-xs font-medium text-yellow-600">Destiny Detected</span>
                      <span className="text-xs text-muted-foreground">• {confidence}% match</span>
                    </div>
                    
                    <p className="text-sm leading-relaxed">
                      <span className="text-muted-foreground">I see you love </span>
                      <span className="font-semibold text-primary">{talentName}</span>
                      <span className="text-muted-foreground">.</span>
                      <br />
                      <span className="text-foreground">Do you want to be a </span>
                      <span className="font-bold">{sleeveDisplayName.split(' ')[1]}</span>
                      <span className="text-foreground"> today?</span>
                    </p>
                  </motion.div>

                  {/* Action Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex gap-2 mt-4"
                  >
                    <Button
                      onClick={onAccept}
                      size="sm"
                      className="flex-1 group"
                    >
                      <Heart className="w-4 h-4 mr-1 group-hover:scale-110 transition-transform" />
                      Yes, Transform Me
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button
                      onClick={onDismiss}
                      size="sm"
                      variant="outline"
                    >
                      Maybe Later
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DiscoveryPrompt;
