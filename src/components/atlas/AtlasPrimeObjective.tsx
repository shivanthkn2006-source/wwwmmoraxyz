// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL ATLAS: PRIME OBJECTIVE CAPTURE (SMITH AI ONLY)
// Purpose: Mandatory "What is your Prime Objective?" question for Smith Wisdom Filter
// NOTE: This is for ATLAS HUD ONLY - NO integration with Zoe Infinity
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Sparkles, Heart, DollarSign, Brain, Shield, Zap, Check, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useProtocolWisdom } from '@/hooks/useProtocolWisdom';
import { useSmithVoice } from './AtlasVoice';
import { HardLightContainer } from './HardLightContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { GoalDomain } from '@/core/wisdom/ProtocolWisdom';

interface AtlasPrimeObjectiveProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip?: () => void;
}

// Predefined Prime Objectives (common North Stars)
const PRIME_OBJECTIVES = [
  { 
    id: 'peace', 
    label: 'Inner Peace', 
    icon: Heart, 
    color: 'text-pink-400',
    domain: 'spiritual' as GoalDomain,
    description: 'Calmness, mindfulness, emotional balance'
  },
  { 
    id: 'wealth', 
    label: 'Financial Freedom', 
    icon: DollarSign, 
    color: 'text-yellow-400',
    domain: 'financial' as GoalDomain,
    description: 'Wealth creation, independence, security'
  },
  { 
    id: 'love', 
    label: 'Deep Connection', 
    icon: Heart, 
    color: 'text-red-400',
    domain: 'relationship' as GoalDomain,
    description: 'Meaningful relationships, love, family'
  },
  { 
    id: 'health', 
    label: 'Peak Vitality', 
    icon: Shield, 
    color: 'text-green-400',
    domain: 'health' as GoalDomain,
    description: 'Physical health, energy, longevity'
  },
  { 
    id: 'mastery', 
    label: 'Skill Mastery', 
    icon: Brain, 
    color: 'text-purple-400',
    domain: 'career' as GoalDomain,
    description: 'Excellence, expertise, career growth'
  },
  { 
    id: 'impact', 
    label: 'World Impact', 
    icon: Zap, 
    color: 'text-atlas-cyan',
    domain: 'career' as GoalDomain,
    description: 'Legacy, contribution, making a difference'
  },
];

const STORAGE_KEY = 'atlas_prime_objective_captured';

export const AtlasPrimeObjective: React.FC<AtlasPrimeObjectiveProps> = ({
  isOpen,
  onComplete,
  onSkip,
}) => {
  const { user } = useAuth();
  const { addMacroGoal, isInitialized } = useProtocolWisdom();
  const { speakLine } = useSmithVoice();
  
  const [selectedObjective, setSelectedObjective] = useState<string | null>(null);
  const [customObjective, setCustomObjective] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  // Check if already captured
  const hasAlreadyCaptured = useCallback(() => {
    if (!user) return false;
    return localStorage.getItem(`${STORAGE_KEY}_${user.id}`) === 'true';
  }, [user]);

  // Save Prime Objective to Protocol Wisdom
  const handleSubmit = useCallback(async () => {
    if (!user || (!selectedObjective && !customObjective.trim())) {
      toast.error('Please select or enter your Prime Objective');
      return;
    }

    setIsSubmitting(true);

    try {
      // Determine the objective details
      const selected = PRIME_OBJECTIVES.find(o => o.id === selectedObjective);
      const title = selected ? selected.label : customObjective.trim();
      const domain = selected?.domain || 'personal' as GoalDomain;
      const purpose = selected?.description || 'My guiding North Star for all decisions';

      // Add to Protocol Wisdom as the PRIMARY macro goal
      const result = await addMacroGoal({
        title,
        purpose,
        domain,
        priority: 'critical', // Prime Objective is always critical
        emotionalAnchors: ['purpose', 'meaning', 'direction'],
      });

      if (result) {
        // Mark as captured
        localStorage.setItem(`${STORAGE_KEY}_${user.id}`, 'true');
        
        // Speak confirmation
        speakLine('DHF_ACTIVATED');
        
        toast.success(`🌟 Prime Objective Set: "${title}"`, {
          description: 'All Smith AI responses will now align with this North Star'
        });

        onComplete();
      } else {
        throw new Error('Failed to save goal');
      }
    } catch (error) {
      console.error('[AtlasPrimeObjective] Save error:', error);
      toast.error('Failed to save Prime Objective. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [user, selectedObjective, customObjective, addMacroGoal, speakLine, onComplete]);

  // Skip and complete (for users who want to set later)
  const handleSkip = useCallback(() => {
    if (user) {
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, 'skipped');
    }
    onSkip?.();
    onComplete();
  }, [user, onSkip, onComplete]);

  // Don't render if already captured or not open
  if (!isOpen || hasAlreadyCaptured()) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10001] bg-atlas-void/95 backdrop-blur-md flex items-center justify-center p-4"
      >
        {/* Background effects */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, hsl(210 100% 8%) 0%, hsl(220 100% 2%) 100%)',
          }}
        />
        
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-atlas-cyan/30"
              initial={{ 
                x: Math.random() * window.innerWidth, 
                y: window.innerHeight + 10 
              }}
              animate={{ 
                y: -10,
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 4 + Math.random() * 4,
                repeat: Infinity,
                delay: Math.random() * 4,
                ease: 'linear'
              }}
            />
          ))}
        </div>

        {/* Main Content */}
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', damping: 20 }}
          className="relative w-full max-w-lg"
        >
          <HardLightContainer
            variant="panel"
            glowIntensity="high"
            showHexGrid
            className="p-6"
          >
            {/* Header */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-atlas-cyan/30 to-atlas-cyan/10 border border-atlas-cyan/50 mb-4"
              >
                <Target className="w-8 h-8 text-atlas-cyan" />
              </motion.div>
              
              <h2 className="text-xl font-share-tech text-atlas-cyan tracking-wider mb-2">
                DEFINE YOUR PRIME OBJECTIVE
              </h2>
              <p className="text-sm text-atlas-cyan/60 font-share-tech">
                What is your ultimate North Star? This will guide Smith AI responses.
              </p>
            </div>

            {step === 'select' && (
              <>
                {/* Predefined Options */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {PRIME_OBJECTIVES.map((objective, index) => (
                    <motion.button
                      key={objective.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                      onClick={() => {
                        setSelectedObjective(objective.id);
                        setCustomObjective('');
                      }}
                      className={cn(
                        "relative p-3 rounded-lg border transition-all text-left",
                        selectedObjective === objective.id
                          ? "border-atlas-cyan bg-atlas-cyan/10"
                          : "border-atlas-cyan/20 bg-atlas-void/50 hover:border-atlas-cyan/40"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <objective.icon className={cn("w-4 h-4", objective.color)} />
                        <span className="text-sm font-share-tech text-atlas-cyan">
                          {objective.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-atlas-cyan/50">
                        {objective.description}
                      </p>
                      
                      {selectedObjective === objective.id && (
                        <motion.div
                          layoutId="selected"
                          className="absolute top-2 right-2"
                        >
                          <Check className="w-4 h-4 text-atlas-cyan" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>

                {/* Custom Input */}
                <div className="mb-6">
                  <p className="text-xs text-atlas-cyan/50 mb-2 font-share-tech">
                    Or define your own:
                  </p>
                  <Input
                    value={customObjective}
                    onChange={(e) => {
                      setCustomObjective(e.target.value);
                      setSelectedObjective(null);
                    }}
                    placeholder="e.g., 'Retire by 45' or 'Build a successful startup'"
                    className="bg-atlas-void/50 border-atlas-cyan/30 text-atlas-cyan placeholder:text-atlas-cyan/30 font-share-tech"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    className="flex-1 border border-atlas-cyan/20 text-atlas-cyan/60 hover:text-atlas-cyan hover:bg-atlas-cyan/5"
                  >
                    Skip for now
                  </Button>
                  <Button
                    onClick={() => setStep('confirm')}
                    disabled={!selectedObjective && !customObjective.trim()}
                    className="flex-1 bg-atlas-cyan/20 text-atlas-cyan border border-atlas-cyan/50 hover:bg-atlas-cyan/30 disabled:opacity-50"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </>
            )}

            {step === 'confirm' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                {/* Confirmation */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-atlas-cyan/10 border border-atlas-cyan/30 mb-4">
                    <Sparkles className="w-4 h-4 text-atlas-cyan" />
                    <span className="text-sm font-share-tech text-atlas-cyan">
                      {selectedObjective 
                        ? PRIME_OBJECTIVES.find(o => o.id === selectedObjective)?.label 
                        : customObjective.trim()}
                    </span>
                  </div>
                  
                  <p className="text-sm text-atlas-cyan/70 font-share-tech">
                    This Prime Objective will become your <strong className="text-atlas-cyan">Wisdom Filter</strong>. 
                    Every Smith AI response will be checked against this North Star.
                  </p>
                </div>

                {/* Final Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setStep('select')}
                    className="flex-1 border border-atlas-cyan/20 text-atlas-cyan/60 hover:text-atlas-cyan hover:bg-atlas-cyan/5"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !isInitialized}
                    className="flex-1 bg-gradient-to-r from-atlas-cyan/30 to-atlas-cyan/20 text-atlas-cyan border border-atlas-cyan/50 hover:from-atlas-cyan/40 hover:to-atlas-cyan/30 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-atlas-cyan/30 border-t-atlas-cyan rounded-full mr-2"
                        />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Target className="w-4 h-4 mr-2" />
                        Set Prime Objective
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </HardLightContainer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AtlasPrimeObjective;
