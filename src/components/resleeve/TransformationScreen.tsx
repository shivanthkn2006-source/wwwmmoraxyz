/**
 * TRANSFORMATION SCREEN - Phase 3: "The Re-Sleeving"
 * Screen ripples, map filters, new buttons appear
 * Part of Zoe Infinity DHF Core - Standalone System
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Map, MessageCircle, Wand2, Palette, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SkillSleeve } from '@/hooks/useZoeReSleeve';

interface TransformationScreenProps {
  sleeve: SkillSleeve | null;
  isTransforming: boolean;
  onComplete: () => void;
}

const SLEEVE_THEMES: Record<string, { gradient: string; accent: string }> = {
  'zoe-painter': { gradient: 'from-orange-500 via-pink-500 to-purple-500', accent: 'orange' },
  'zoe-coder': { gradient: 'from-cyan-500 via-blue-500 to-indigo-500', accent: 'cyan' },
  'zoe-entrepreneur': { gradient: 'from-amber-500 via-orange-500 to-red-500', accent: 'amber' },
  'zoe-healer': { gradient: 'from-green-500 via-emerald-500 to-blue-500', accent: 'green' },
  'zoe-connector': { gradient: 'from-purple-500 via-violet-500 to-fuchsia-500', accent: 'purple' }
};

const SLEEVE_TOOLS: Record<string, Array<{ icon: any; name: string }>> = {
  'zoe-painter': [
    { icon: Palette, name: 'Color Palette' },
    { icon: Wand2, name: 'Art Generator' },
    { icon: Map, name: 'Gallery Finder' }
  ],
  'zoe-coder': [
    { icon: Wand2, name: 'Code Generator' },
    { icon: Map, name: 'Tech Hubs' },
    { icon: MessageCircle, name: 'Debug Assistant' }
  ],
  'zoe-entrepreneur': [
    { icon: Wand2, name: 'Pitch Deck AI' },
    { icon: Map, name: 'Investor Radar' },
    { icon: Users, name: 'Network Builder' }
  ],
  'zoe-healer': [
    { icon: Wand2, name: 'Wellness Plan' },
    { icon: Map, name: 'Zen Centers' },
    { icon: MessageCircle, name: 'Calm Guide' }
  ],
  'zoe-connector': [
    { icon: Users, name: 'Network Map' },
    { icon: Map, name: 'Event Finder' },
    { icon: MessageCircle, name: 'Intro Generator' }
  ]
};

export const TransformationScreen = ({
  sleeve,
  isTransforming,
  onComplete
}: TransformationScreenProps) => {
  const [phase, setPhase] = useState<'ripple' | 'transform' | 'tools' | 'complete'>('ripple');

  useEffect(() => {
    if (!isTransforming || !sleeve) return;

    // Dispatch transformation start to Zoe Core DHF
    window.dispatchEvent(new CustomEvent('zoe-transformation-start', {
      detail: { sleeveId: sleeve.id, timestamp: Date.now() }
    }));

    // Phase sequence
    const sequence = async () => {
      setPhase('ripple');
      await new Promise(r => setTimeout(r, 1200));
      setPhase('transform');
      await new Promise(r => setTimeout(r, 1500));
      setPhase('tools');
      await new Promise(r => setTimeout(r, 1200));
      setPhase('complete');
      
      // Dispatch transformation complete to Zoe Core DHF
      window.dispatchEvent(new CustomEvent('zoe-transformation-complete', {
        detail: { sleeveId: sleeve.id, timestamp: Date.now() }
      }));
      
      onComplete();
    };

    sequence();
  }, [isTransforming, sleeve, onComplete]);

  const theme = sleeve ? SLEEVE_THEMES[sleeve.id] || SLEEVE_THEMES['zoe-painter'] : SLEEVE_THEMES['zoe-painter'];
  const tools = sleeve ? SLEEVE_TOOLS[sleeve.id] || [] : [];

  return (
    <AnimatePresence>
      {isTransforming && sleeve && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-xl flex items-center justify-center"
        >
          {/* Ripple Effect */}
          <AnimatePresence>
            {phase === 'ripple' && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                exit={{ opacity: 0 }}
              >
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className={cn(
                      "absolute rounded-full border-2",
                      `border-${theme.accent}-500/50`
                    )}
                    style={{ 
                      width: 100 + i * 80, 
                      height: 100 + i * 80,
                      borderColor: `hsl(var(--primary) / ${0.5 - i * 0.1})`
                    }}
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ 
                      scale: [0, 2, 3], 
                      opacity: [1, 0.5, 0] 
                    }}
                    transition={{ 
                      duration: 1.5, 
                      delay: i * 0.2,
                      repeat: 0
                    }}
                  />
                ))}
                <div
                  className={cn(
                    "w-20 h-20 rounded-full bg-gradient-to-br flex items-center justify-center text-4xl animate-gpu-pulse-scale-fast",
                    theme.gradient
                  )}
                >
                  {sleeve.icon}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Transform Animation */}
          <AnimatePresence>
            {phase === 'transform' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.5 }}
                className="text-center"
              >
                <motion.div
                  className={cn(
                    "w-32 h-32 mx-auto rounded-full bg-gradient-to-br flex items-center justify-center text-6xl mb-6",
                    theme.gradient
                  )}
                  animate={{ 
                    rotate: [0, 360],
                    boxShadow: [
                      '0 0 20px rgba(var(--primary), 0.3)',
                      '0 0 60px rgba(var(--primary), 0.6)',
                      '0 0 20px rgba(var(--primary), 0.3)'
                    ]
                  }}
                  transition={{ duration: 1.5, repeat: 0 }}
                >
                  {sleeve.icon}
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-bold"
                >
                  Becoming {sleeve.name}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-muted-foreground mt-2"
                >
                  Transforming your interface...
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tools Reveal */}
          <AnimatePresence>
            {phase === 'tools' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-lg font-medium mb-6"
                >
                  <Zap className="inline w-5 h-5 text-yellow-500 mr-2" />
                  New God Tools Unlocked
                </motion.p>
                <div className="flex gap-4 justify-center">
                  {tools.map((tool, i) => {
                    const Icon = tool.icon;
                    return (
                      <motion.div
                        key={tool.name}
                        initial={{ opacity: 0, y: 30, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: i * 0.2 }}
                        className="flex flex-col items-center gap-2"
                      >
                        <motion.div
                          className={cn(
                            "w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center",
                            theme.gradient
                          )}
                          whileHover={{ scale: 1.1 }}
                        >
                          <Icon className="w-7 h-7 text-white" />
                        </motion.div>
                        <span className="text-xs font-medium">{tool.name}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TransformationScreen;
