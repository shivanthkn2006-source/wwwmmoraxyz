// ═══════════════════════════════════════════════════════════════════════════════
// ADVANCED LIFE CODEX BUTTON
// INVISIBLE until basic profile is 100% complete (Velvet Rope Protocol)
// This button gates access to the DHF "Life Codex" heavy analysis engines
// ═══════════════════════════════════════════════════════════════════════════════

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVelvetRope } from '@/contexts/VelvetRopeContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface AdvancedLifeCodexButtonProps {
  className?: string;
  variant?: 'default' | 'compact' | 'card';
}

const AdvancedLifeCodexButton: React.FC<AdvancedLifeCodexButtonProps> = ({
  className,
  variant = 'default',
}) => {
  const { mvdScore } = useVelvetRope();
  const navigate = useNavigate();

  // THE GATE: Button is INVISIBLE until basic profile is 100% complete
  if (!mvdScore.isBasicComplete) {
    return null;
  }

  // Check if Life Codex is fully accessible
  const isLifeCodexReady = mvdScore.canAccessLifeCodex;

  const handleClick = () => {
    if (isLifeCodexReady) {
      navigate('/soul-codex');
    } else {
      navigate('/profile');
    }
  };

  // Compact variant for menus
  if (variant === 'compact') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <Button
            variant={isLifeCodexReady ? 'default' : 'outline'}
            size="sm"
            onClick={handleClick}
            className={cn(
              'gap-2',
              isLifeCodexReady && 'bg-gradient-to-r from-primary to-purple-500',
              className
            )}
          >
            {isLifeCodexReady ? (
              <>
                <BookOpen className="h-4 w-4" />
                Life Codex
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Life Codex ({mvdScore.totalScore.toFixed(0)}%)
              </>
            )}
          </Button>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Card variant for dashboards
  if (variant === 'card') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleClick}
          className={cn(
            'relative p-6 rounded-xl border cursor-pointer overflow-hidden',
            isLifeCodexReady 
              ? 'border-primary/30 bg-gradient-to-br from-primary/10 to-purple-500/5' 
              : 'border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5',
            className
          )}
        >
          {/* Background glow */}
          {isLifeCodexReady && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 rounded-full blur-3xl gpu-pulse" />
            </div>
          )}

          <div className="relative flex items-start gap-4">
            <div className={cn(
              'p-3 rounded-xl',
              isLifeCodexReady ? 'bg-primary/20' : 'bg-amber-500/20'
            )}>
              {isLifeCodexReady ? (
                <BookOpen className="h-6 w-6 text-primary" />
              ) : (
                <Lock className="h-6 w-6 text-amber-500" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground">
                  Advanced Life Codex
                </h3>
                {isLifeCodexReady && (
                  <Sparkles className="h-4 w-4 text-primary animate-gpu-twinkle" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {isLifeCodexReady 
                  ? 'Your digital essence is ready for DHF analysis'
                  : `Complete ${(80 - mvdScore.totalScore).toFixed(0)}% more to unlock`
                }
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className={isLifeCodexReady ? 'text-primary' : 'text-amber-500'}>
                  {isLifeCodexReady ? 'Access Now' : 'Complete Profile'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Default full-width button
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={className}
      >
        <Button
          onClick={handleClick}
          className={cn(
            'w-full h-14 text-base font-medium relative overflow-hidden',
            isLifeCodexReady 
              ? 'bg-gradient-to-r from-primary via-purple-500 to-primary bg-[length:200%_100%] animate-gpu-gradient-x' 
              : 'bg-gradient-to-r from-amber-500 to-orange-500'
          )}
        >
          {isLifeCodexReady ? (
            <>
              <BookOpen className="h-5 w-5 mr-2" />
              Enter Advanced Life Codex
              <Sparkles className="h-4 w-4 ml-2 animate-gpu-twinkle" />
            </>
          ) : (
            <>
              <Lock className="h-5 w-5 mr-2" />
              Unlock Life Codex ({mvdScore.totalScore.toFixed(0)}% / 80%)
            </>
          )}
        </Button>
      </motion.div>
    </AnimatePresence>
  );
};

export default memo(AdvancedLifeCodexButton);
