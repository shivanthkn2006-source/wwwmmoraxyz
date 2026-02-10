import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Volume2, Hand, Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { speakAsZoe } from '@/utils/zoeVoice';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

/**
 * First-time user tutorial for Universal Agentic Timeline
 * Provides immersive onboarding with voice guidance
 */

interface TutorialStep {
  title: string;
  description: string;
  voiceText: string;
  icon: React.ReactNode;
  highlight?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to the Cosmos',
    description: 'Experience 13.8 billion years of cosmic history from the Big Bang to the Post-Human Future. This is your journey through time itself.',
    voiceText: 'Welcome to the Universal Agentic Timeline. I\'m Zoe, your guide through 13.8 billion years of cosmic history.',
    icon: <Sparkles className="w-12 h-12" />,
  },
  {
    title: 'Navigate with Voice',
    description: 'Say "Hey Zoe, jump to Big Bang" or "Tell me about Life on Earth" to explore any threshold. Your voice is your navigation tool.',
    voiceText: 'You can navigate the timeline using voice commands. Just say Hey Zoe, followed by jump to any threshold name.',
    icon: <Volume2 className="w-12 h-12" />,
    highlight: 'voice',
  },
  {
    title: 'Explore Interactively',
    description: 'Click any threshold node to discover scientific facts, experiential narratives, and future impacts. Each moment connects to humanity\'s destiny.',
    voiceText: 'Click any cosmic node to reveal three narrative layers: scientific facts, immersive experiences, and connections to our future.',
    icon: <Hand className="w-12 h-12" />,
    highlight: 'nodes',
  },
  {
    title: 'Shape the Future',
    description: 'In Threshold 10, propose your vision of the future. I\'ll analyze its feasibility using advanced AI reasoning and provide critical insights.',
    voiceText: 'When you reach the future threshold, you can propose your own predictions. I will analyze them and provide a detailed feasibility assessment.',
    icon: <Zap className="w-12 h-12" />,
    highlight: 'future',
  },
];

export const TimelineTutorialOverlay: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    // Speak the current step
    if (isVisible && tutorialSteps[currentStep]) {
      speakAsZoe(tutorialSteps[currentStep].voiceText);
    }
  }, [currentStep, isVisible]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    setIsVisible(false);
    
    // Mark tutorial as completed
    if (user?.id) {
      await supabase
        .from('timeline_user_progress')
        .upsert({
          user_id: user.id,
          tutorial_completed: true,
          last_visit_at: new Date().toISOString(),
        });
    }
    
    speakAsZoe('Tutorial complete. Your cosmic journey begins now.');
    onComplete();
  };

  const currentTutorialStep = tutorialSteps[currentStep];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="w-full max-w-2xl"
          >
            <Card className="p-8 bg-gradient-to-br from-[hsl(260,30%,10%)] to-[hsl(260,30%,5%)] border-2 border-primary/30 shadow-2xl">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4"
                onClick={handleSkip}
              >
                <X className="w-5 h-5" />
              </Button>

              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  {currentTutorialStep.icon}
                </div>
              </div>

              {/* Content */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">{currentTutorialStep.title}</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {currentTutorialStep.description}
                </p>
              </div>

              {/* Progress */}
              <div className="flex justify-center gap-2 mb-8">
                {tutorialSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full transition-all ${
                      index === currentStep
                        ? 'w-8 bg-primary'
                        : index < currentStep
                        ? 'w-2 bg-primary/50'
                        : 'w-2 bg-muted'
                    }`}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-between gap-4">
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  className="flex-1"
                >
                  Skip Tutorial
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1"
                >
                  {currentStep < tutorialSteps.length - 1 ? 'Next' : 'Begin Journey'}
                </Button>
              </div>

              {/* Step counter */}
              <p className="text-center text-sm text-muted-foreground mt-4">
                Step {currentStep + 1} of {tutorialSteps.length}
              </p>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
