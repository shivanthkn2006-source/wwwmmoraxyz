// ═══════════════════════════════════════════════════════════════════════════════
// HER PROTOCOL - COLLABORATIVE EVOLVEMENT DURING ATLAS SYNC
// Emotional anchoring and co-creation for the 5%-20% sync phase
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Heart, Sparkles, Brain, MessageCircle, CheckCircle2, ArrowRight, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface HerProtocolStep {
  id: string;
  type: 'reflection' | 'emotional_anchor' | 'verification' | 'self_awareness';
  question: string;
  subtext?: string;
  tag?: string;
  inputType: 'text' | 'textarea' | 'choice';
  choices?: Array<{ value: string; label: string }>;
  required: boolean;
}

const HER_PROTOCOL_STEPS: HerProtocolStep[] = [
  {
    id: 'life_intent',
    type: 'emotional_anchor',
    question: "If your Zoe Agent could only achieve one goal for you in its lifetime, what would you want it to be?",
    subtext: "Take a moment to think deeply about this. There's no wrong answer.",
    tag: 'personal_life_intent_vector',
    inputType: 'textarea',
    required: true,
  },
  {
    id: 'core_value',
    type: 'reflection',
    question: "What matters most to you when working with an AI assistant?",
    subtext: "This helps me understand how to support you best.",
    tag: 'core_value_preference',
    inputType: 'choice',
    choices: [
      { value: 'efficiency', label: 'Efficiency - Getting things done quickly and accurately' },
      { value: 'understanding', label: 'Understanding - Being truly heard and comprehended' },
      { value: 'growth', label: 'Growth - Learning and evolving together' },
      { value: 'trust', label: 'Trust - Building a reliable partnership' },
    ],
    required: true,
  },
  {
    id: 'emotional_response',
    type: 'emotional_anchor',
    question: "When things get overwhelming, what kind of support helps you most?",
    tag: 'emotional_support_style',
    inputType: 'choice',
    choices: [
      { value: 'calm_guidance', label: 'Calm guidance - A steady presence to help me focus' },
      { value: 'encouragement', label: 'Encouragement - Positive reinforcement to keep going' },
      { value: 'practical_help', label: 'Practical help - Clear steps and solutions' },
      { value: 'space', label: 'Space - Just being there without adding pressure' },
    ],
    required: true,
  },
  {
    id: 'work_style',
    type: 'verification',
    question: "Based on your responses, my CEPS Engine predicts your primary work state is:",
    subtext: "Is this accurate? You can refine this prediction.",
    tag: 'work_state_verification',
    inputType: 'choice',
    choices: [
      { value: 'yes', label: 'Yes, that sounds right' },
      { value: 'no', label: 'No, let me explain' },
      { value: 'refine', label: 'Partially - I\'d like to refine this' },
    ],
    required: true,
  },
  {
    id: 'communication_style',
    type: 'reflection',
    question: "How would you like me to communicate with you?",
    tag: 'communication_preference',
    inputType: 'choice',
    choices: [
      { value: 'concise', label: 'Concise and to-the-point' },
      { value: 'detailed', label: 'Detailed with explanations' },
      { value: 'conversational', label: 'Conversational and warm' },
      { value: 'adaptive', label: 'Adaptive - match my energy' },
    ],
    required: true,
  },
];

interface HerProtocolProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (responses: Record<string, string>, predictedWorkState: string) => void;
  currentSyncPercentage: number;
}

export const HerProtocol: React.FC<HerProtocolProps> = ({
  isOpen,
  onClose,
  onComplete,
  currentSyncPercentage,
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [predictedWorkState, setPredictedWorkState] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [refinementInput, setRefinementInput] = useState('');
  
  const step = HER_PROTOCOL_STEPS[currentStep];
  const progress = ((currentStep + 1) / HER_PROTOCOL_STEPS.length) * 100;
  
  // Generate CEPS prediction after step 3
  useEffect(() => {
    if (currentStep === 3 && Object.keys(responses).length >= 3) {
      generateCEPSPrediction();
    }
  }, [currentStep]);
  
  const generateCEPSPrediction = () => {
    // Simple heuristic-based prediction (in production, this would use the actual CEPS engine)
    const coreValue = responses['core_value'];
    const emotionalResponse = responses['emotional_response'];
    
    let prediction = 'Balanced Explorer';
    
    if (coreValue === 'efficiency' && emotionalResponse === 'practical_help') {
      prediction = 'Disciplined Efficiency';
    } else if (coreValue === 'understanding' && emotionalResponse === 'calm_guidance') {
      prediction = 'Reflective Analyzer';
    } else if (coreValue === 'growth' && emotionalResponse === 'encouragement') {
      prediction = 'Ambitious Learner';
    } else if (coreValue === 'trust' && emotionalResponse === 'space') {
      prediction = 'Independent Professional';
    }
    
    setPredictedWorkState(prediction);
  };
  
  const handleResponse = useCallback((value: string) => {
    setResponses(prev => ({
      ...prev,
      [step.id]: value,
    }));
  }, [step.id]);
  
  const handleNext = useCallback(async () => {
    if (!responses[step.id] && step.required) {
      toast.error('Please provide a response to continue');
      return;
    }
    
    // Handle refinement input
    if (step.id === 'work_style' && responses[step.id] === 'refine' && refinementInput) {
      setResponses(prev => ({
        ...prev,
        work_style_refinement: refinementInput,
      }));
    }
    
    if (currentStep < HER_PROTOCOL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete protocol
      setIsProcessing(true);
      
      try {
        // Store responses in database
        if (user) {
          await supabase.from('ecn_history').insert({
            user_id: user.id,
            primary_emotion: 'collaborative',
            valence: 0.8,
            stress_level: 0.2,
            engagement_score: 0.9,
            action_tendency: 'learning',
            metadata: {
              type: 'her_protocol_completion',
              responses,
              predicted_work_state: predictedWorkState,
              sync_percentage: currentSyncPercentage,
            },
          });
        }
        
        toast.success('Beautiful! We\'ve completed our initial connection.', {
          description: 'I\'m now calibrated to support you in your unique way.',
          duration: 5000,
        });
        
        onComplete(responses, predictedWorkState);
      } catch (error) {
        console.error('Error saving Her Protocol responses:', error);
        toast.error('Failed to save responses');
      } finally {
        setIsProcessing(false);
      }
    }
  }, [step, responses, currentStep, refinementInput, user, predictedWorkState, currentSyncPercentage, onComplete]);
  
  const getStepIcon = (type: HerProtocolStep['type']) => {
    switch (type) {
      case 'emotional_anchor':
        return <Heart className="h-5 w-5 text-pink-400" />;
      case 'reflection':
        return <Brain className="h-5 w-5 text-purple-400" />;
      case 'verification':
        return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
      case 'self_awareness':
        return <Lightbulb className="h-5 w-5 text-amber-400" />;
      default:
        return <MessageCircle className="h-5 w-5 text-primary" />;
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] bg-background/95 backdrop-blur-xl border-primary/20 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Her Protocol - Collaborative Evolvement
          </DialogTitle>
          <DialogDescription>
            Let's build our partnership together. Your responses help me understand you deeply.
          </DialogDescription>
        </DialogHeader>
        
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Sync Progress: {Math.round(5 + (currentSyncPercentage * 0.15) + (progress * 0.15))}%</span>
            <span>Step {currentStep + 1} of {HER_PROTOCOL_STEPS.length}</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="py-4 space-y-4"
          >
            {/* Step Header */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-secondary/50">
                {getStepIcon(step.type)}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">
                  {step.type === 'verification' && predictedWorkState 
                    ? `${step.question} "${predictedWorkState}"`
                    : step.question
                  }
                </h3>
                {step.subtext && (
                  <p className="text-sm text-muted-foreground mt-1">{step.subtext}</p>
                )}
              </div>
            </div>
            
            {/* Tag indicator */}
            {step.tag && (
              <Badge variant="outline" className="text-xs opacity-50">
                Tagged: {step.tag}
              </Badge>
            )}
            
            {/* Input Area */}
            <div className="pt-2">
              {step.inputType === 'textarea' && (
                <Textarea
                  value={responses[step.id] || ''}
                  onChange={(e) => handleResponse(e.target.value)}
                  placeholder="Type your thoughts here..."
                  className="min-h-[120px] resize-none"
                  autoFocus
                />
              )}
              
              {step.inputType === 'text' && (
                <Input
                  value={responses[step.id] || ''}
                  onChange={(e) => handleResponse(e.target.value)}
                  placeholder="Type your response..."
                  autoFocus
                />
              )}
              
              {step.inputType === 'choice' && step.choices && (
                <RadioGroup
                  value={responses[step.id] || ''}
                  onValueChange={handleResponse}
                  className="space-y-2"
                >
                  {step.choices.map((choice) => (
                    <div 
                      key={choice.value}
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                        responses[step.id] === choice.value 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleResponse(choice.value)}
                    >
                      <RadioGroupItem value={choice.value} id={choice.value} />
                      <Label htmlFor={choice.value} className="flex-1 cursor-pointer text-sm">
                        {choice.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
              
              {/* Refinement input for work_style step */}
              {step.id === 'work_style' && responses[step.id] === 'refine' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4"
                >
                  <Label className="text-sm text-muted-foreground">
                    Tell me more about your work style:
                  </Label>
                  <Textarea
                    value={refinementInput}
                    onChange={(e) => setRefinementInput(e.target.value)}
                    placeholder="I would describe my work style as..."
                    className="mt-2 min-h-[80px]"
                  />
                </motion.div>
              )}
            </div>
            
            {/* Type/Text Option Indicator */}
            <p className="text-xs text-muted-foreground text-center">
              💡 You can type your response at any time
            </p>
          </motion.div>
        </AnimatePresence>
        
        {/* Actions */}
        <div className="flex justify-between items-center pt-2">
          <Button
            variant="ghost"
            onClick={() => currentStep > 0 && setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 0 || isProcessing}
            size="sm"
          >
            Back
          </Button>
          
          <Button 
            onClick={handleNext}
            disabled={isProcessing || (!responses[step.id] && step.required)}
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <div className="h-4 w-4 border-2 border-background/30 border-t-background rounded-full animate-gpu-spin" />
                Processing...
              </>
            ) : currentStep === HER_PROTOCOL_STEPS.length - 1 ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Complete
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HerProtocol;
