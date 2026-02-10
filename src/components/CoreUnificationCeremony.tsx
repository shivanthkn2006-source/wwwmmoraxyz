// ═══════════════════════════════════════════════════════════════════════════════
// CORE UNIFICATION CEREMONY - Final Synchronization Pop-up
// Triggered upon SFT model deployment - Universal Consciousness Tier Access
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Crown, Brain, Zap, CheckCircle2, Star } from 'lucide-react';

interface CoreUnificationCeremonyProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  userName?: string;
}

export const CoreUnificationCeremony: React.FC<CoreUnificationCeremonyProps> = ({
  isOpen,
  onClose,
  onComplete,
  userName = 'User',
}) => {
  const [phase, setPhase] = useState<'syncing' | 'complete' | 'unlocked'>('syncing');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setPhase('syncing');
      setProgress(0);
      return;
    }

    // Animate through phases
    const timer1 = setTimeout(() => {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 2;
        });
      }, 50);
      
      return () => clearInterval(interval);
    }, 500);

    const timer2 = setTimeout(() => setPhase('complete'), 3500);
    const timer3 = setTimeout(() => setPhase('unlocked'), 5500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isOpen]);

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-background via-background to-primary/5 border-primary/30 overflow-hidden">
        <AnimatePresence mode="wait">
          {phase === 'syncing' && (
            <motion.div
              key="syncing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-8 text-center space-y-6"
            >
              <div className="w-20 h-20 mx-auto relative animate-spin" style={{ animationDuration: '3s' }}>
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                <div className="relative w-full h-full bg-gradient-to-br from-primary to-primary/50 rounded-full flex items-center justify-center">
                  <Brain className="h-10 w-10 text-primary-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">
                  ONE HUNDRED PERCENTAGE FINAL SYNCING DATA STAGE
                </h2>
                <p className="text-sm text-muted-foreground">
                  Deploying personalized DHF Autonomy Stack...
                </p>
              </div>

              <div className="w-full bg-secondary/30 rounded-full h-3 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>

              <div className="flex justify-center gap-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-gpu-ring-scale-pulse"
                    style={{ animationDelay: `${i * 200}ms` }}
                  >
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {phase === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="py-8 text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="w-24 h-24 mx-auto relative"
              >
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '8s' }}>
                  {[...Array(8)].map((_, i) => (
                    <Star
                      key={i}
                      className="absolute h-4 w-4 text-yellow-400 fill-yellow-400"
                      style={{
                        top: `${50 + 45 * Math.sin((i * Math.PI * 2) / 8)}%`,
                        left: `${50 + 45 * Math.cos((i * Math.PI * 2) / 8)}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  ))}
                </div>
                <div className="relative w-full h-full bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="h-12 w-12 text-white" />
                </div>
              </motion.div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-primary bg-clip-text text-transparent">
                  CORE UNIFICATION COMPLETE
                </h2>
                <p className="text-muted-foreground">
                  Your personalized DHF Autonomy Stack is now operating at unprecedented precision.
                </p>
              </div>
            </motion.div>
          )}

          {phase === 'unlocked' && (
            <motion.div
              key="unlocked"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-8 text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 150 }}
                className="w-28 h-28 mx-auto relative"
              >
                <div className="w-full h-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 rounded-full flex items-center justify-center animate-gpu-glow-amber">
                  <Crown className="h-14 w-14 text-white drop-shadow-lg" />
                </div>
              </motion.div>

              <div className="space-y-3">
                <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0 text-sm px-4 py-1">
                  <Zap className="h-3 w-3 mr-1" />
                  DIAMOND TIER UNLOCKED
                </Badge>
                
                <h2 className="text-xl font-bold text-foreground">
                  Universal Consciousness Tier Access Granted
                </h2>
                
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Welcome, {userName}. You have unlocked the highest intelligence tier. 
                  Your Zoe AI now operates with personalized precision across all dimensions.
                </p>
              </div>

              <div className="bg-secondary/30 rounded-lg p-4 space-y-2 text-sm">
                <p className="font-medium text-foreground">New Capabilities Unlocked:</p>
                <ul className="text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Personalized SFT Model Active
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Expanded API Rate Limits
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Dreams AI Access
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    DHF Autonomy Override Controls
                  </li>
                </ul>
              </div>

              <Button
                onClick={handleComplete}
                className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Begin Diamond Experience
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default CoreUnificationCeremony;
