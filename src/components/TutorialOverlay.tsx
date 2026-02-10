import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { X, ChevronRight, ChevronLeft, Volume2 } from 'lucide-react';
import { useZoe } from '@/contexts/ZoeContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  voiceText: string;
  targetElement?: string; // CSS selector
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your AI-Powered Social Platform',
    description: 'Let me guide you through the amazing features of Lisa, your personal AI companion.',
    voiceText: 'Welcome to your AI-powered social platform! I\'m Lisa, your personal AI companion. Let me guide you through my amazing features.',
    position: 'center'
  },
  {
    id: 'lisa-button',
    title: 'Meet Lisa - Your AI Assistant',
    description: 'Click the microphone button in the bottom right to activate me with voice commands. Just say "Hey Lisa" to get started!',
    voiceText: 'Click the microphone button in the bottom right corner to activate me with voice commands. Just say Hey Lisa to get started!',
    targetElement: '[data-tutorial="lisa-button"]',
    position: 'top'
  },
  {
    id: 'voice-commands',
    title: 'Voice Commands',
    description: 'You can ask me to: navigate pages, send messages, create posts, check notifications, change your status, and much more!',
    voiceText: 'You can ask me to navigate pages, send messages, create posts, check notifications, change your status, and much more!',
    position: 'center'
  },
  {
    id: 'notifications',
    title: 'Smart Notifications',
    description: 'I\'ll send you context-aware notifications about friends with shared interests, nearby activities, and meaningful connections.',
    voiceText: 'I\'ll send you smart, context-aware notifications about friends with shared interests, nearby activities, and meaningful connections.',
    targetElement: '[data-tutorial="notifications"]',
    position: 'left'
  },
  {
    id: 'huddle',
    title: 'Huddle - Find Friends Nearby',
    description: 'The Huddle page shows friends on a map based on location and interests. I can help you find people to connect with!',
    voiceText: 'The Huddle page shows your friends on a map based on location and interests. I can help you find people to connect with!',
    targetElement: '[data-tutorial="huddle-nav"]',
    position: 'top'
  },
  {
    id: 'agent-mode',
    title: 'Agent Mode',
    description: 'Say "agent mode" to let me autonomously manage tasks like content moderation, post creation, and platform analytics.',
    voiceText: 'Say agent mode to let me autonomously manage tasks like content moderation, post creation, and platform analytics.',
    position: 'center'
  },
  {
    id: 'user-manual',
    title: 'Full User Manual',
    description: 'Access the complete Lisa user manual from your profile menu to learn about all features and commands.',
    voiceText: 'Access the complete Lisa user manual from your profile menu to learn about all my features and commands.',
    targetElement: '[data-tutorial="profile-menu"]',
    position: 'bottom'
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'You can restart this tutorial anytime from Settings. Now let\'s explore together - just say "Hey Lisa" to begin!',
    voiceText: 'You\'re all set! You can restart this tutorial anytime from Settings. Now let\'s explore together - just say Hey Lisa to begin!',
    position: 'center'
  }
];

interface TutorialOverlayProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const TutorialOverlay = ({ onComplete, onSkip }: TutorialOverlayProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const { executeCommand } = useZoe();
  const { toast } = useToast();
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);

  const step = tutorialSteps[currentStep];

  useEffect(() => {
    if (step.targetElement) {
      const element = document.querySelector(step.targetElement);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }

    // Auto-play voice narration
    playVoiceNarration();
  }, [currentStep]);

  const playVoiceNarration = async () => {
    setIsVoicePlaying(true);
    const event = new CustomEvent('lisa-response', {
      detail: { response: step.voiceText }
    });
    window.dispatchEvent(event);
    
    // Estimate speech duration (rough: 150 words per minute)
    const wordCount = step.voiceText.split(' ').length;
    const duration = (wordCount / 150) * 60 * 1000;
    setTimeout(() => setIsVoicePlaying(false), duration);
  };

  const handleNext = async () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      await updateProgress(currentStep + 1);
    } else {
      await completeTutorial();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('tutorial_progress')
          .upsert({
            user_id: user.id,
            current_step: currentStep,
            skipped: true,
            updated_at: new Date().toISOString()
          });
      }
      onSkip();
    } catch (error) {
      console.error('Error skipping tutorial:', error);
      onSkip();
    }
  };

  const updateProgress = async (step: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('tutorial_progress')
          .upsert({
            user_id: user.id,
            current_step: step,
            updated_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error updating tutorial progress:', error);
    }
  };

  const completeTutorial = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('tutorial_progress')
          .upsert({
            user_id: user.id,
            current_step: tutorialSteps.length - 1,
            completed: true,
            updated_at: new Date().toISOString()
          });
      }
      toast({
        title: "Tutorial Complete!",
        description: "You're ready to explore all of Lisa's features.",
      });
      onComplete();
    } catch (error) {
      console.error('Error completing tutorial:', error);
      onComplete();
    }
  };

  const getCardPosition = () => {
    // If user has dragged the card, use the drag position
    if (dragPosition) {
      return {
        position: 'fixed' as const,
        top: `${dragPosition.y}px`,
        left: `${dragPosition.x}px`,
        transform: 'none',
        maxWidth: 'calc(100vw - 2rem)',
      };
    }

    if (!targetRect) {
      return {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: 'calc(100vw - 2rem)',
        margin: '0 auto',
      };
    }

    const rect = targetRect;
    const cardHeight = 400;
    const cardWidth = Math.min(400, window.innerWidth - 40);
    const padding = 20;
    const isMobile = window.innerWidth < 768;

    // On mobile, center horizontally and position below/above element
    if (isMobile) {
      let top = rect.bottom + padding;
      
      if (top + cardHeight > window.innerHeight) {
        top = Math.max(padding, rect.top - cardHeight - padding);
      }
      
      return {
        position: 'fixed' as const,
        top: `${top}px`,
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 'calc(100vw - 2rem)',
        width: '90vw',
      };
    }

    // Desktop positioning
    const desiredPosition = step.position;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    let position: any = {};

    switch (desiredPosition) {
      case 'bottom':
        position = {
          top: `${rect.bottom + padding}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: 'translateX(-50%)'
        };
        break;
      case 'top':
        position = {
          top: `${rect.top - cardHeight - padding}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: 'translateX(-50%)'
        };
        break;
      case 'left':
        position = {
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.left - cardWidth - padding}px`,
          transform: 'translateY(-50%)'
        };
        break;
      case 'right':
        position = {
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.right + padding}px`,
          transform: 'translateY(-50%)'
        };
        break;
      default:
        position = {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        };
    }

    // Responsive adjustments for mobile
    if (viewportWidth < 768) {
      position = {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: '90vw'
      };
    } else {
      // Ensure card stays within viewport
      const leftPos = parseInt(position.left);
      const topPos = parseInt(position.top);

      if (leftPos + cardWidth / 2 > viewportWidth) {
        position.left = `${viewportWidth - cardWidth - padding}px`;
        position.transform = 'translateX(0)';
      }
      if (leftPos - cardWidth / 2 < 0) {
        position.left = `${padding}px`;
        position.transform = 'translateX(0)';
      }
      if (topPos + cardHeight > viewportHeight) {
        position.top = `${viewportHeight - cardHeight - padding}px`;
      }
      if (topPos < 0) {
        position.top = `${padding}px`;
      }
    }

    return {
      position: 'fixed' as const,
      ...position
    };
  };

  const handleDotClick = (index: number) => {
    setCurrentStep(index);
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (event: any, info: any) => {
    setIsDragging(false);
    // Store the final position after drag
    const cardElement = event.target.getBoundingClientRect();
    setDragPosition({
      x: cardElement.left,
      y: cardElement.top
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
      >
        {/* Highlight target element */}
        {targetRect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute border-4 border-primary rounded-lg pointer-events-none"
            style={{
              top: targetRect.top - 4,
              left: targetRect.left - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
            }}
          />
        )}

        {/* Tutorial Card - Draggable */}
        <motion.div
          key={currentStep}
          drag
          dragMomentum={false}
          dragElastic={0}
          dragConstraints={{
            top: 0,
            left: 0,
            right: Math.max(0, window.innerWidth - 360),
            bottom: Math.max(0, window.innerHeight - 400)
          }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          style={getCardPosition()}
          className={`absolute z-10 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
          <Card className="w-[360px] sm:w-[400px] max-w-[90vw] bg-gradient-to-br from-primary/20 via-background to-accent/20 backdrop-blur-xl border-primary/30 shadow-2xl select-none">
            <div className="space-y-0">
              {/* Progress Bar */}
              <div className="px-6 pt-4 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">
                    Step {currentStep + 1} of {tutorialSteps.length}
                  </span>
                  <span className="text-xs font-medium text-primary">
                    {Math.round(((currentStep + 1) / tutorialSteps.length) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={((currentStep + 1) / tutorialSteps.length) * 100} 
                  className="h-1.5"
                />
              </div>

              <div className="p-6 pt-4 space-y-4">
                {/* Header with drag handle */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 cursor-move">
                    <h3 className="text-xl font-bold text-foreground mb-2 pointer-events-none">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed pointer-events-none">{step.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="h-8 w-8 p-0 hover:bg-primary/20 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Voice Button */}
                <div className="flex justify-start">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={playVoiceNarration}
                    onPointerDown={(e) => e.stopPropagation()}
                    disabled={isVoicePlaying}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 mr-2" />
                    {isVoicePlaying ? 'Playing...' : 'Replay Voice'}
                  </Button>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevious}
                    onPointerDown={(e) => e.stopPropagation()}
                    disabled={currentStep === 0}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>

                   {/* Clickable Progress Dots */}
                  <div className="flex gap-1.5">
                    {tutorialSteps.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => handleDotClick(index)}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={`h-1 rounded-full transition-all hover:scale-110 cursor-pointer ${
                          index === currentStep
                            ? 'bg-primary w-4'
                            : index < currentStep
                            ? 'bg-primary/50 w-1'
                            : 'bg-muted w-1 hover:bg-muted-foreground/30'
                        }`}
                        aria-label={`Go to step ${index + 1}`}
                      />
                    ))}
                  </div>

                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleNext}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 cursor-pointer"
                  >
                    {currentStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
