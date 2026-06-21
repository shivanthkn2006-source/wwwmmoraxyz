// ═══════════════════════════════════════════════════════════════════════════════
// WHILE YOU SLEPT MODAL - Shows earnings accumulated while user was offline
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Star, Moon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnnotifiedEarning } from '@/hooks/useAgenticWorkforce';
import { cn } from '@/lib/utils';

interface WhileYouSleptModalProps {
  earnings: UnnotifiedEarning[];
  onAcknowledge: () => void;
}

export const WhileYouSleptModal: React.FC<WhileYouSleptModalProps> = ({
  earnings,
  onAcknowledge
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayedCredits, setDisplayedCredits] = useState(0);
  const [displayedKarma, setDisplayedKarma] = useState(0);

  const totalCredits = earnings.reduce((sum, e) => sum + e.credits_amount, 0);
  const totalKarma = earnings.reduce((sum, e) => sum + e.karma_amount, 0);

  useEffect(() => {
    if (earnings.length > 0) {
      setIsOpen(true);
    }
  }, [earnings]);

  // Animate counter
  useEffect(() => {
    if (isOpen && totalCredits > 0) {
      const duration = 2000;
      const steps = 60;
      const interval = duration / steps;
      const creditStep = totalCredits / steps;
      const karmaStep = totalKarma / steps;
      let current = 0;

      const timer = setInterval(() => {
        current++;
        setDisplayedCredits(Math.min(Math.round(creditStep * current), totalCredits));
        setDisplayedKarma(Math.min(Math.round(karmaStep * current), totalKarma));
        
        if (current >= steps) {
          clearInterval(timer);
        }
      }, interval);

      return () => clearInterval(timer);
    }
  }, [isOpen, totalCredits, totalKarma]);

  const handleClose = () => {
    setIsOpen(false);
    onAcknowledge();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 20 }}
            className={cn(
              "relative w-full max-w-md p-6 rounded-2xl",
              "bg-gradient-to-br from-card via-card to-primary/5",
              "border border-primary/30",
              "shadow-[0_0_60px_-10px_hsl(var(--omega-cyan)/0.3)]"
            )}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4"
              >
                <Moon className="w-8 h-8 text-primary" />
              </motion.div>
              
              <h2 className="text-2xl font-bold text-foreground font-orbitron mb-1">
                While You Slept...
              </h2>
              <p className="text-sm text-muted-foreground">
                Zoe worked tirelessly for you
              </p>
            </div>

            {/* Earnings display */}
            <div className="space-y-4 mb-6">
              {/* Credits */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-between p-4 rounded-xl bg-green-500/10 border border-green-500/20"
              >
                <div className="flex items-center gap-3">
                  <Zap className="w-6 h-6 text-green-400" />
                  <span className="text-sm text-green-300">Credits Earned</span>
                </div>
                <span className="text-2xl font-bold font-mono text-green-400">
                  +{displayedCredits}
                </span>
              </motion.div>

              {/* Karma */}
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-between p-4 rounded-xl bg-purple-500/10 border border-purple-500/20"
              >
                <div className="flex items-center gap-3">
                  <Star className="w-6 h-6 text-purple-400" />
                  <span className="text-sm text-purple-300">Karma Earned</span>
                </div>
                <span className="text-2xl font-bold font-mono text-purple-400">
                  +{displayedKarma}
                </span>
              </motion.div>
            </div>

            {/* Job details */}
            <div className="mb-6">
              <h4 className="text-xs text-muted-foreground uppercase mb-2">Completed Tasks</h4>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {earnings.map((earning, i) => (
                  <motion.div
                    key={earning.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="text-xs text-foreground/80 flex items-center gap-2"
                  >
                    <Sparkles className="w-3 h-3 text-primary" />
                    {earning.source_description}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Collect button */}
            <Button
              onClick={handleClose}
              className={cn(
                "w-full h-12 text-lg font-semibold",
                "bg-gradient-to-r from-primary to-accent",
                "hover:from-primary/90 hover:to-accent/90",
                "text-primary-foreground",
                "shadow-lg shadow-primary/20"
              )}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Collect Rewards
            </Button>

            {/* Floating particles */}
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-primary/40 animate-gpu-y-float"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${10 + (i % 3) * 30}%`,
                  animationDelay: `${i * 300}ms`
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WhileYouSleptModal;
