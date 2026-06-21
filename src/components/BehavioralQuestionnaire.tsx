// ═══════════════════════════════════════════════════════════════════════════════
// BEHAVIORAL QUESTIONNAIRE - DHF Data Collection Questions
// Collects user preferences and behaviors to enhance Zoe AI personalization
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Sparkles, ChevronRight, Check, 
  MessageCircle, Palette, Clock, Heart, 
  Zap, Target, Users, Music
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useAdaptiveLearning } from '@/hooks/useAdaptiveLearning';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface BehavioralQuestion {
  id: string;
  category: 'communication' | 'creativity' | 'productivity' | 'social' | 'wellness';
  icon: React.ElementType;
  question: string;
  options: {
    value: string;
    label: string;
    description?: string;
  }[];
  syncBoost: number; // How much this question boosts sync percentage
}

interface QuestionnaireState {
  currentIndex: number;
  answers: Record<string, string>;
  isComplete: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUESTIONS DATA
// ═══════════════════════════════════════════════════════════════════════════════

const behavioralQuestions: BehavioralQuestion[] = [
  {
    id: 'communication_style',
    category: 'communication',
    icon: MessageCircle,
    question: 'How do you prefer Zoe to communicate with you?',
    options: [
      { value: 'concise', label: 'Brief & Direct', description: 'Short, actionable responses' },
      { value: 'detailed', label: 'Detailed & Thorough', description: 'Comprehensive explanations' },
      { value: 'conversational', label: 'Conversational', description: 'Natural, friendly dialogue' },
      { value: 'professional', label: 'Professional', description: 'Formal, business-like tone' },
    ],
    syncBoost: 5,
  },
  {
    id: 'creative_preference',
    category: 'creativity',
    icon: Palette,
    question: 'What type of creative content interests you most?',
    options: [
      { value: 'visual', label: 'Visual Arts', description: 'Images, designs, photography' },
      { value: 'writing', label: 'Writing & Stories', description: 'Narratives, poetry, scripts' },
      { value: 'music', label: 'Music & Audio', description: 'Compositions, sound design' },
      { value: 'mixed', label: 'Multimedia', description: 'Combination of all forms' },
    ],
    syncBoost: 5,
  },
  {
    id: 'productivity_peak',
    category: 'productivity',
    icon: Clock,
    question: 'When are you most productive?',
    options: [
      { value: 'morning', label: 'Early Morning', description: '5 AM - 9 AM' },
      { value: 'midday', label: 'Midday', description: '10 AM - 2 PM' },
      { value: 'afternoon', label: 'Afternoon', description: '2 PM - 6 PM' },
      { value: 'night', label: 'Night Owl', description: '8 PM - 2 AM' },
    ],
    syncBoost: 4,
  },
  {
    id: 'social_engagement',
    category: 'social',
    icon: Users,
    question: 'How do you prefer to engage with content?',
    options: [
      { value: 'creator', label: 'Content Creator', description: 'I love making and sharing' },
      { value: 'curator', label: 'Curator', description: 'I collect and organize favorites' },
      { value: 'consumer', label: 'Consumer', description: 'I enjoy browsing and reading' },
      { value: 'collaborator', label: 'Collaborator', description: 'I work with others on projects' },
    ],
    syncBoost: 5,
  },
  {
    id: 'emotional_support',
    category: 'wellness',
    icon: Heart,
    question: 'How should Zoe respond when you seem stressed?',
    options: [
      { value: 'supportive', label: 'Offer Support', description: 'Acknowledge and comfort me' },
      { value: 'practical', label: 'Be Practical', description: 'Focus on solutions' },
      { value: 'distraction', label: 'Provide Distraction', description: 'Help me take a break' },
      { value: 'space', label: 'Give Space', description: 'Stay focused on the task' },
    ],
    syncBoost: 6,
  },
  {
    id: 'learning_style',
    category: 'productivity',
    icon: Zap,
    question: 'How do you prefer to learn new things?',
    options: [
      { value: 'visual', label: 'Visual Learning', description: 'Diagrams, videos, images' },
      { value: 'reading', label: 'Reading', description: 'Articles, documentation' },
      { value: 'hands_on', label: 'Hands-On', description: 'Trial and error, experiments' },
      { value: 'discussion', label: 'Discussion', description: 'Talking through concepts' },
    ],
    syncBoost: 4,
  },
  {
    id: 'goal_approach',
    category: 'productivity',
    icon: Target,
    question: 'How do you approach your goals?',
    options: [
      { value: 'structured', label: 'Structured', description: 'Detailed plans and milestones' },
      { value: 'flexible', label: 'Flexible', description: 'Adapt as I go' },
      { value: 'inspired', label: 'Inspiration-Driven', description: 'Follow creative bursts' },
      { value: 'steady', label: 'Steady Progress', description: 'Small steps daily' },
    ],
    syncBoost: 5,
  },
  {
    id: 'music_preference',
    category: 'creativity',
    icon: Music,
    question: 'What ambient mood helps you focus?',
    options: [
      { value: 'silence', label: 'Silence', description: 'No background sounds' },
      { value: 'nature', label: 'Nature Sounds', description: 'Rain, forest, ocean' },
      { value: 'music', label: 'Background Music', description: 'Lo-fi, classical, ambient' },
      { value: 'energetic', label: 'Energetic', description: 'Upbeat, motivating music' },
    ],
    syncBoost: 3,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const BehavioralQuestionnaire: React.FC<{
  onComplete?: (answers: Record<string, string>) => void;
  compact?: boolean;
}> = ({ onComplete, compact = false }) => {
  const { user } = useAuth();
  const { trackEvent, syncStatus } = useAdaptiveLearning();
  
  const [state, setState] = useState<QuestionnaireState>({
    currentIndex: 0,
    answers: {},
    isComplete: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());

  // Load previously answered questions
  useEffect(() => {
    if (!user) return;
    
    const loadAnswers = async () => {
      const { data } = await supabase
        .from('behavioral_events')
        .select('metadata')
        .eq('user_id', user.id)
        .eq('event_type', 'questionnaire_answer')
        .order('created_at', { ascending: false });
      
      if (data) {
        const answered = new Set<string>();
        const existingAnswers: Record<string, string> = {};
        
        data.forEach((row: any) => {
          if (row.metadata?.question_id) {
            answered.add(row.metadata.question_id);
            existingAnswers[row.metadata.question_id] = row.metadata.answer;
          }
        });
        
        setAnsweredQuestions(answered);
        setState(prev => ({ ...prev, answers: existingAnswers }));
      }
    };
    
    loadAnswers();
  }, [user]);

  const currentQuestion = behavioralQuestions[state.currentIndex];
  const progress = ((state.currentIndex + 1) / behavioralQuestions.length) * 100;
  const unansweredQuestions = behavioralQuestions.filter(q => !answeredQuestions.has(q.id));

  const handleAnswer = async (value: string) => {
    if (!user || !currentQuestion) return;
    
    // Update local state
    setState(prev => ({
      ...prev,
      answers: { ...prev.answers, [currentQuestion.id]: value },
    }));
    
    setIsSubmitting(true);
    
    try {
      // Save to behavioral events
      const { error } = await supabase
        .from('behavioral_events')
        .insert({
          user_id: user.id,
          event_type: 'questionnaire_answer',
          event_category: currentQuestion.category,
          context_snippet: `${currentQuestion.question}: ${value}`,
          metadata: {
            question_id: currentQuestion.id,
            question: currentQuestion.question,
            answer: value,
            category: currentQuestion.category,
            sync_boost: currentQuestion.syncBoost,
          },
          sentiment_score: 0.8,
        });

      if (error) throw error;

      // Update sync percentage
      await supabase
        .from('zoe_settings')
        .update({
          sync_percentage: Math.min(100, (syncStatus.sync_percentage || 0) + currentQuestion.syncBoost),
          event_count: (syncStatus.event_count || 0) + 1,
          last_event_sync_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      // Track event for adaptive learning
      trackEvent({
        event_type: 'questionnaire_answer',
        event_category: currentQuestion.category,
        context_snippet: value,
        metadata: { question_id: currentQuestion.id },
      });

      setAnsweredQuestions(prev => new Set([...prev, currentQuestion.id]));
      
      toast.success(`+${currentQuestion.syncBoost}% Sync Boost!`, {
        description: 'Your response helps Zoe understand you better.',
        duration: 2000,
      });

      // Move to next unanswered question or complete
      const nextUnanswered = behavioralQuestions.findIndex(
        (q, idx) => idx > state.currentIndex && !answeredQuestions.has(q.id)
      );
      
      if (nextUnanswered !== -1) {
        setState(prev => ({ ...prev, currentIndex: nextUnanswered }));
      } else {
        setState(prev => ({ ...prev, isComplete: true }));
        onComplete?.(state.answers);
      }
    } catch (err) {
      console.error('[BehavioralQuestionnaire] Save error:', err);
      toast.error('Failed to save response');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'communication': return 'text-blue-500 bg-blue-500/10';
      case 'creativity': return 'text-purple-500 bg-purple-500/10';
      case 'productivity': return 'text-amber-500 bg-amber-500/10';
      case 'social': return 'text-emerald-500 bg-emerald-500/10';
      case 'wellness': return 'text-rose-500 bg-rose-500/10';
      default: return 'text-primary bg-primary/10';
    }
  };

  if (state.isComplete || unansweredQuestions.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-emerald-500/5 to-primary/5 border-emerald-500/20">
        <CardContent className="py-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-emerald-500" />
            </div>
          </motion.div>
          <h3 className="text-lg font-semibold text-emerald-500 mb-2">
            Questionnaire Complete!
          </h3>
          <p className="text-sm text-muted-foreground">
            Zoe now has a deeper understanding of your preferences. 
            Your responses contribute to more personalized AI interactions.
          </p>
          <Badge variant="outline" className="mt-4 bg-emerald-500/10 text-emerald-500">
            +{behavioralQuestions.reduce((sum, q) => sum + q.syncBoost, 0)}% Total Sync Boost
          </Badge>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              Quick Sync Question
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              +{currentQuestion?.syncBoost || 0}% boost
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">{currentQuestion?.question}</p>
          <div className="grid grid-cols-2 gap-2">
            {currentQuestion?.options.map((option) => (
              <Button
                key={option.value}
                variant="outline"
                size="sm"
                className="justify-start text-xs h-auto py-2"
                onClick={() => handleAnswer(option.value)}
                disabled={isSubmitting}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const QuestionIcon = currentQuestion?.icon || Brain;

  return (
    <Card className="bg-gradient-to-br from-background to-secondary/20 border-primary/20 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Behavioral Sync Questions
          </CardTitle>
          <Badge variant="outline" className={getCategoryColor(currentQuestion?.category || '')}>
            {currentQuestion?.category}
          </Badge>
        </div>
        <CardDescription>
          Help Zoe understand you better. Each answer boosts your sync.
        </CardDescription>
        <Progress value={progress} className="h-1.5 mt-2" />
        <p className="text-xs text-muted-foreground mt-1">
          Question {state.currentIndex + 1} of {behavioralQuestions.length}
          {answeredQuestions.size > 0 && ` (${answeredQuestions.size} answered)`}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion?.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className={`p-2 rounded-lg ${getCategoryColor(currentQuestion?.category || '')}`}>
                <QuestionIcon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-lg">{currentQuestion?.question}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  +{currentQuestion?.syncBoost}% sync boost for answering
                </p>
              </div>
            </div>

            <RadioGroup
              value={state.answers[currentQuestion?.id || ''] || ''}
              onValueChange={handleAnswer}
              className="space-y-2"
              disabled={isSubmitting}
            >
              {currentQuestion?.options.map((option) => (
                <motion.div
                  key={option.value}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Label
                    htmlFor={option.value}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 
                             hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all"
                  >
                    <RadioGroupItem value={option.value} id={option.value} />
                    <div className="flex-1">
                      <span className="font-medium">{option.label}</span>
                      {option.description && (
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Label>
                </motion.div>
              ))}
            </RadioGroup>
          </motion.div>
        </AnimatePresence>

        {/* Skip button */}
        <div className="flex justify-between items-center pt-2 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const nextIndex = state.currentIndex + 1;
              if (nextIndex < behavioralQuestions.length) {
                setState(prev => ({ ...prev, currentIndex: nextIndex }));
              }
            }}
            disabled={state.currentIndex >= behavioralQuestions.length - 1}
          >
            Skip for now
          </Button>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            {unansweredQuestions.length} questions remaining
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BehavioralQuestionnaire;
