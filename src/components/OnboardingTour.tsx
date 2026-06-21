import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, ArrowRight, ArrowLeft, Sparkles, User, MessageSquare, MapPin, Zap, Calendar } from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useFeatureAnalytics } from '@/hooks/useFeatureAnalytics';
import { useNavigate } from 'react-router-dom';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  route?: string;
  position: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  highlightSelector?: string;
  featureId?: string;
  featureName?: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 0,
    title: 'Welcome to the Platform! 👋',
    description: 'Let\'s take a quick tour of the key features that make this app awesome. You can skip this anytime!',
    icon: <Sparkles className="w-8 h-8 text-primary" />,
    position: { top: '50%', left: '50%' }
  },
  {
    id: 1,
    title: 'Activity Status',
    description: 'Set your current status so friends know what you\'re up to. Find it in your profile settings!',
    icon: <User className="w-8 h-8 text-primary" />,
    route: '/profile',
    position: { top: '20%', right: '5%' },
    featureId: 'activity-status',
    featureName: 'Activity Status'
  },
  {
    id: 2,
    title: 'Voice Macros',
    description: 'Automate tasks with voice commands! Create routines, schedule them, and let Lisa handle the rest.',
    icon: <Zap className="w-8 h-8 text-primary" />,
    route: '/ai-companion',
    position: { top: '30%', left: '5%' },
    featureId: 'voice-macros',
    featureName: 'Voice Macros'
  },
  {
    id: 3,
    title: 'Lisa AI Assistant',
    description: 'Your voice-powered assistant. Just say "Hi Lisa" to get started with hands-free control!',
    icon: <MessageSquare className="w-8 h-8 text-primary" />,
    route: '/ai-companion',
    position: { bottom: '25%', right: '5%' },
    featureId: 'lisa-assistant',
    featureName: 'Lisa AI Assistant'
  },
  {
    id: 4,
    title: 'Huddle - Find Friends Nearby',
    description: 'See who\'s around you in real-time! Perfect for spontaneous meetups and connecting with local friends.',
    icon: <MapPin className="w-8 h-8 text-primary" />,
    route: '/huddle',
    position: { bottom: '20%', left: '5%' },
    featureId: 'huddle',
    featureName: 'Huddle'
  },
  {
    id: 5,
    title: 'Event Setup',
    description: 'Never miss important dates! Set up birthdays, anniversaries, and special events with custom reminders.',
    icon: <Calendar className="w-8 h-8 text-primary" />,
    route: '/profile',
    position: { top: '40%', right: '10%' },
    featureId: 'event-setup',
    featureName: 'Event Setup'
  },
  {
    id: 6,
    title: 'You\'re All Set! 🎉',
    description: 'You can always ask Lisa "where is [feature name]" to navigate to any feature. Enjoy exploring!',
    icon: <Sparkles className="w-8 h-8 text-primary" />,
    position: { top: '50%', left: '50%' }
  }
];

export const OnboardingTour = () => {
  const { 
    showOnboarding, 
    currentStep, 
    loading,
    completeStep, 
    nextStep, 
    previousStep,
    skipOnboarding, 
    completeOnboarding 
  } = useOnboarding();
  const { trackFeatureAccess } = useFeatureAnalytics();
  const navigate = useNavigate();
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);

  const currentStepData = onboardingSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === onboardingSteps.length - 1;

  useEffect(() => {
    if (!showOnboarding || !currentStepData?.highlightSelector) {
      setHighlightedElement(null);
      return;
    }

    // Find and highlight element
    const element = document.querySelector(currentStepData.highlightSelector) as HTMLElement;
    if (element) {
      setHighlightedElement(element);
      element.classList.add('onboarding-highlight');
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return () => {
      if (highlightedElement) {
        highlightedElement.classList.remove('onboarding-highlight');
      }
    };
  }, [currentStep, showOnboarding, currentStepData]);

  const handleNext = async () => {
    await completeStep(currentStep);
    
    // Track feature view if this step has a feature
    if (currentStepData.featureId && currentStepData.featureName) {
      await trackFeatureAccess(
        currentStepData.featureId,
        currentStepData.featureName,
        'onboarding'
      );
    }

    if (isLastStep) {
      await completeOnboarding();
    } else {
      nextStep();
      
      // Navigate to the next step's route if it has one
      const nextStepData = onboardingSteps[currentStep + 1];
      if (nextStepData?.route) {
        navigate(nextStepData.route);
      }
    }
  };

  const handlePrevious = () => {
    previousStep();
    
    // Navigate to previous step's route if it has one
    if (currentStep > 0) {
      const prevStepData = onboardingSteps[currentStep - 1];
      if (prevStepData?.route) {
        navigate(prevStepData.route);
      }
    }
  };

  const handleSkip = async () => {
    await skipOnboarding();
  };

  // TEMPORARILY HIDDEN - uncomment below to re-enable
  return null;
  
  if (loading || !showOnboarding || !currentStepData) {
    return null;
  }

  // Calculate position styles with responsive centering - smaller card
  const isCentered = currentStepData.position.top === '50%' && currentStepData.position.left === '50%';
  const cardMaxWidth = window.innerWidth < 640 ? 'calc(100vw - 2rem)' : window.innerWidth < 768 ? '320px' : '360px';
  const positionStyles: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    ...(isCentered ? {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      maxWidth: cardMaxWidth,
      width: window.innerWidth < 640 ? 'calc(100vw - 2rem)' : 'auto',
    } : {
      ...currentStepData.position,
      maxWidth: cardMaxWidth,
    })
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" />
      
      {/* Tour Card - Compact */}
      <Card 
        className="w-full p-3 sm:p-4 shadow-2xl border-2 border-primary/20 animate-in fade-in slide-in-from-bottom-4"
        style={positionStyles}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSkip}
          className="absolute top-1.5 right-1.5 h-7 w-7"
        >
          <X className="h-3.5 w-3.5" />
        </Button>

        {/* Icon */}
        <div className="flex justify-center mb-2">
          <div className="scale-[0.65] sm:scale-75">
            {currentStepData.icon}
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-3">
          <h3 className="text-base sm:text-lg font-bold mb-1.5">{currentStepData.title}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-snug">{currentStepData.description}</p>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-center gap-1 mb-1.5">
            {onboardingSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (index < currentStep) {
                    for (let i = currentStep; i > index; i--) {
                      previousStep();
                    }
                  }
                }}
                disabled={index > currentStep}
                className={`h-0.5 rounded-full transition-all cursor-pointer disabled:cursor-not-allowed ${
                  index === currentStep 
                    ? 'w-5 bg-primary' 
                    : index < currentStep
                    ? 'w-0.5 bg-primary/50 hover:bg-primary/70'
                    : 'w-0.5 bg-muted'
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
          <p className="text-[10px] text-center text-muted-foreground">
            {currentStep + 1}/{onboardingSteps.length}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep}
            className="flex-1 text-[11px] h-8"
            size="sm"
          >
            <ArrowLeft className="w-3 h-3 mr-1" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            className="flex-1 text-[11px] h-8"
            size="sm"
          >
            {isLastStep ? 'Finish' : 'Next'}
            {!isLastStep && <ArrowRight className="w-3 h-3 ml-1" />}
          </Button>
        </div>

        {/* Skip option */}
        <Button
          variant="link"
          onClick={handleSkip}
          className="w-full mt-0.5 text-[10px] h-6 text-muted-foreground"
          size="sm"
        >
          Skip tour
        </Button>
      </Card>

      {/* Global styles for highlight */}
      <style>{`
        .onboarding-highlight {
          position: relative;
          z-index: 9999 !important;
          box-shadow: 0 0 0 4px rgba(var(--primary), 0.5);
          border-radius: 8px;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(var(--primary), 0.5);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(var(--primary), 0.3);
          }
        }
      `}</style>
    </>
  );
};
