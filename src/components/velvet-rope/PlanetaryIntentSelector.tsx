// ═══════════════════════════════════════════════════════════════════════════════
// PLANETARY INTENT SELECTOR
// Lightweight post-login splash that determines which heavy modules to load
// Saves up to 80% RAM on low-end devices like Samsung M05
// ═══════════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVelvetRope, type PlanetaryIntent } from '@/contexts/VelvetRopeContext';

interface PlanetaryOption {
  id: Exclude<PlanetaryIntent, null>;
  icon: string;
  label: string;
  description: string;
  color: string;
  gradient: string;
}

const PLANETARY_OPTIONS: PlanetaryOption[] = [
  {
    id: 'mars',
    icon: '🔴',
    label: 'MARS',
    description: 'Career & Skills',
    color: 'text-red-400',
    gradient: 'from-red-500/20 to-orange-500/10',
  },
  {
    id: 'venus',
    icon: '🟢',
    label: 'VENUS',
    description: 'Love & Relationships',
    color: 'text-green-400',
    gradient: 'from-green-500/20 to-emerald-500/10',
  },
  {
    id: 'mercury',
    icon: '🔵',
    label: 'MERCURY',
    description: 'Education & Learning',
    color: 'text-blue-400',
    gradient: 'from-blue-500/20 to-cyan-500/10',
  },
  {
    id: 'jupiter',
    icon: '🟣',
    label: 'JUPITER',
    description: 'Life Goals & Purpose',
    color: 'text-purple-400',
    gradient: 'from-purple-500/20 to-violet-500/10',
  },
  {
    id: 'moon',
    icon: '⚪',
    label: 'MOON',
    description: 'Stress & Recovery',
    color: 'text-slate-300',
    gradient: 'from-slate-400/20 to-gray-500/10',
  },
];

const PlanetaryIntentSelector: React.FC = () => {
  const { showIntentSelector, setIntent, dismissIntentSelector, mvdScore } = useVelvetRope();

  const handleSelectIntent = useCallback((intentId: Exclude<PlanetaryIntent, null>) => {
    setIntent(intentId);
  }, [setIntent]);

  const handleDismiss = useCallback(() => {
    dismissIntentSelector();
  }, [dismissIntentSelector]);

  // Prevent critical app surfaces from being blocked by the optimization overlay.
  useEffect(() => {
    if (!showIntentSelector) return;
    if (typeof window === 'undefined') return;
    const path = window.location.pathname;
    if (!path.startsWith('/zoe-omega') && path !== '/home' && path !== '/voice-command-test') return;

    const timer = window.setTimeout(() => {
      dismissIntentSelector();
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [showIntentSelector, dismissIntentSelector]);

  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  if (!showIntentSelector || !mvdScore.isBasicComplete || path === '/home' || path === '/voice-command-test') {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-gradient-to-b from-background/95 to-background border border-primary/20 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 pointer-events-none opacity-30">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl" />
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Content */}
          <div className="relative p-6 pt-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-primary">PLANETARY ONBOARDING</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                What brings you to Mmora today?
              </h2>
              <p className="text-sm text-muted-foreground">
                Choose your focus to optimize your experience
              </p>
            </div>

            {/* Planetary Options */}
            <div className="space-y-3">
              {PLANETARY_OPTIONS.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 }}
                  onClick={() => handleSelectIntent(option.id)}
                  className={`
                    w-full p-4 rounded-xl border border-white/10 
                    bg-gradient-to-r ${option.gradient}
                    hover:border-primary/30 hover:scale-[1.02]
                    active:scale-[0.98]
                    transition-all duration-200
                    flex items-center gap-4 text-left
                  `}
                >
                  <span className="text-2xl" role="img" aria-label={option.label}>
                    {option.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold ${option.color}`}>
                      {option.label}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {option.description}
                    </div>
                  </div>
                  <div className="text-muted-foreground/50">
                    →
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Skip option */}
            <Button
              variant="ghost"
              onClick={handleDismiss}
              className="w-full mt-4 text-muted-foreground hover:text-foreground text-sm"
            >
              Load everything (for powerful devices)
            </Button>

            {/* Memory optimization note */}
            <p className="text-center text-[10px] text-muted-foreground/60 mt-4">
              Choosing a focus reduces initial RAM usage by up to 80%
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default memo(PlanetaryIntentSelector);
