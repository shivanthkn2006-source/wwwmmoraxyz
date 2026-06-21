// ═══════════════════════════════════════════════════════════════════════════════
// ZOE SESSION COACH - Daily Evolution, Planning & Coaching Sessions
// Voice-enabled personalized coaching for daily planning and self-evolution
// Integrated with DHF Core for deep personalization
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sun, Moon, Sparkles, Mic, Volume2, Calendar, Target,
  Brain, Heart, Zap, Clock, CheckCircle2, ArrowRight,
  TrendingUp, Coffee, Sunset, Star, MessageSquare
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { speakAsZoe, stopZoeSpeech } from '@/utils/zoeVoice';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ═══ SESSION TYPES ═══
export type SessionType = 
  | 'morning_briefing'
  | 'day_planning'
  | 'evolution_reflection'
  | 'goal_check'
  | 'evening_review'
  | 'quick_chat';

export interface SessionStep {
  id: string;
  question: string;
  voicePrompt: string;
  inputType: 'voice' | 'text' | 'choice' | 'rating';
  choices?: string[];
  response?: string;
  completed: boolean;
}

export interface DayPlan {
  priorities: string[];
  schedule: { time: string; task: string }[];
  goals: string[];
  selfCareReminder: string;
}

// ═══ SESSION TEMPLATES ═══
const SESSION_TEMPLATES: Record<SessionType, SessionStep[]> = {
  morning_briefing: [
    { id: 'greeting', question: 'Good morning! How are you feeling today?', voicePrompt: 'Good morning! How are you feeling today?', inputType: 'choice', choices: ['Great', 'Good', 'Okay', 'Tired', 'Stressed'], completed: false },
    { id: 'sleep', question: 'How did you sleep last night?', voicePrompt: 'How did you sleep last night?', inputType: 'rating', completed: false },
    { id: 'focus', question: 'What\'s your main focus for today?', voicePrompt: 'What is your main focus for today?', inputType: 'voice', completed: false },
    { id: 'energy', question: 'On a scale of 1-10, what\'s your energy level?', voicePrompt: 'On a scale of 1 to 10, what is your energy level?', inputType: 'rating', completed: false },
  ],
  day_planning: [
    { id: 'top_priority', question: 'What is your #1 priority today?', voicePrompt: 'What is your number one priority today?', inputType: 'voice', completed: false },
    { id: 'must_do', question: 'What are 3 things you must accomplish?', voicePrompt: 'What are 3 things you must accomplish today?', inputType: 'text', completed: false },
    { id: 'meetings', question: 'Do you have any important meetings or calls?', voicePrompt: 'Do you have any important meetings or calls today?', inputType: 'voice', completed: false },
    { id: 'self_care', question: 'When will you take a break for yourself?', voicePrompt: 'When will you take a break for yourself today?', inputType: 'voice', completed: false },
    { id: 'blockers', question: 'What might get in your way today?', voicePrompt: 'What challenges might you face today?', inputType: 'voice', completed: false },
  ],
  evolution_reflection: [
    { id: 'wins', question: 'What are you proud of today?', voicePrompt: 'What are you proud of today? What wins did you have?', inputType: 'voice', completed: false },
    { id: 'lessons', question: 'What did you learn today?', voicePrompt: 'What did you learn today?', inputType: 'voice', completed: false },
    { id: 'challenges', question: 'What challenged you today?', voicePrompt: 'What challenged you today and how did you handle it?', inputType: 'voice', completed: false },
    { id: 'gratitude', question: 'What are you grateful for?', voicePrompt: 'What are you grateful for today?', inputType: 'voice', completed: false },
    { id: 'tomorrow', question: 'What do you want to do differently tomorrow?', voicePrompt: 'What would you like to do differently tomorrow?', inputType: 'voice', completed: false },
  ],
  goal_check: [
    { id: 'current_goal', question: 'What goal are you working towards?', voicePrompt: 'What goal are you currently working towards?', inputType: 'voice', completed: false },
    { id: 'progress', question: 'How much progress have you made? (0-100%)', voicePrompt: 'How much progress have you made, from 0 to 100 percent?', inputType: 'rating', completed: false },
    { id: 'obstacles', question: 'What\'s blocking your progress?', voicePrompt: 'What is blocking your progress?', inputType: 'voice', completed: false },
    { id: 'next_step', question: 'What\'s your next step?', voicePrompt: 'What is your next step to move forward?', inputType: 'voice', completed: false },
  ],
  evening_review: [
    { id: 'accomplishments', question: 'What did you accomplish today?', voicePrompt: 'What did you accomplish today?', inputType: 'voice', completed: false },
    { id: 'mood', question: 'How are you feeling this evening?', voicePrompt: 'How are you feeling this evening?', inputType: 'choice', choices: ['Fulfilled', 'Content', 'Tired', 'Stressed', 'Peaceful'], completed: false },
    { id: 'unfinished', question: 'What needs to carry over to tomorrow?', voicePrompt: 'What needs to carry over to tomorrow?', inputType: 'voice', completed: false },
    { id: 'relaxation', question: 'How will you unwind tonight?', voicePrompt: 'How will you unwind and relax tonight?', inputType: 'voice', completed: false },
  ],
  quick_chat: [
    { id: 'open', question: 'What\'s on your mind?', voicePrompt: 'What is on your mind? I am here to listen.', inputType: 'voice', completed: false },
  ],
};

// ═══ SESSION COACH COMPONENT ═══
export const ZoeSessionCoach: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  sessionType?: SessionType;
  voiceEnabled?: boolean;
}> = ({ isOpen, onClose, sessionType: initialType, voiceEnabled = true }) => {
  const { user } = useAuth();
  const [sessionType, setSessionType] = useState<SessionType | null>(initialType || null);
  const [steps, setSteps] = useState<SessionStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [userName, setUserName] = useState('');
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<string>('');

  // Load user name
  useEffect(() => {
    const loadUserName = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.display_name) setUserName(data.display_name);
    };
    loadUserName();
  }, [user?.id]);

  // Initialize session
  useEffect(() => {
    if (sessionType) {
      const template = SESSION_TEMPLATES[sessionType];
      setSteps([...template]);
      setCurrentStepIndex(0);
      setSessionComplete(false);
      setSessionSummary('');
      
      // Speak first question
      if (voiceEnabled && template[0]) {
        setTimeout(() => speakStep(template[0]), 500);
      }
    }
  }, [sessionType, voiceEnabled]);

  const speakStep = useCallback((step: SessionStep) => {
    if (!voiceEnabled) return;
    setIsSpeaking(true);
    const greeting = userName ? `${userName}, ` : '';
    speakAsZoe(
      `${greeting}${step.voicePrompt}`,
      undefined,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      () => setIsSpeaking(false)
    );
  }, [voiceEnabled, userName]);

  const handleResponse = useCallback(async (response: string) => {
    if (!user?.id || !response.trim()) return;

    // Update step
    const updatedSteps = [...steps];
    updatedSteps[currentStepIndex] = {
      ...updatedSteps[currentStepIndex],
      response: response.trim(),
      completed: true
    };
    setSteps(updatedSteps);
    setInputValue('');

    // Log to behavioral events
    await supabase.from('behavioral_events').insert({
      user_id: user.id,
      event_type: `session_${sessionType}_step`,
      event_category: 'coaching_session',
      metadata: {
        session_type: sessionType,
        step_id: steps[currentStepIndex].id,
        response: response.trim()
      }
    });

    // Move to next step or complete
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      
      // Small delay before next question
      setTimeout(() => {
        if (voiceEnabled) {
          speakStep(updatedSteps[nextIndex] || steps[nextIndex]);
        }
      }, 1000);
    } else {
      // Session complete
      await completeSession(updatedSteps);
    }
  }, [currentStepIndex, steps, sessionType, user?.id, voiceEnabled, speakStep]);

  const completeSession = async (finalSteps: SessionStep[]) => {
    setSessionComplete(true);
    
    if (!user?.id) return;

    // Generate summary
    const summary = generateSessionSummary(finalSteps);
    setSessionSummary(summary);

    // Speak summary
    if (voiceEnabled) {
      speakAsZoe(
        summary,
        undefined,
        () => setIsSpeaking(true),
        () => setIsSpeaking(false),
        () => setIsSpeaking(false)
      );
    }

    // Store session in DHF
    try {
      const { data: existing } = await supabase
        .from('dhf_phoenix_profile')
        .select('decision_patterns')
        .eq('user_id', user.id)
        .single();

      // Safely cast and handle decision_patterns
      const rawPatterns = existing?.decision_patterns;
      const currentPatterns: Record<string, unknown> = 
        (rawPatterns && typeof rawPatterns === 'object' && !Array.isArray(rawPatterns)) 
          ? rawPatterns as Record<string, unknown>
          : {};
      
      const existingSessions = currentPatterns.coaching_sessions;
      const sessions: Array<{type: string; date: string; steps: Array<{id: string; response?: string}>; summary: string}> = 
        Array.isArray(existingSessions) ? existingSessions : [];

      const newSession = {
        type: sessionType as string,
        date: new Date().toISOString(),
        steps: finalSteps.map(s => ({ id: s.id, response: s.response })),
        summary
      };

      // Build updated patterns with proper typing for JSON
      const updatedPatterns: Record<string, unknown> = {
        ...currentPatterns,
        coaching_sessions: [...sessions.slice(-9), newSession],
        last_session: new Date().toISOString()
      };

      await supabase
        .from('dhf_phoenix_profile')
        .update({ decision_patterns: updatedPatterns as unknown as import('@/integrations/supabase/types').Json })
        .eq('user_id', user.id);

      // Log completion
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: `session_${sessionType}_complete`,
        event_category: 'coaching_session',
        metadata: { session_type: sessionType, summary }
      });

      toast.success('Session saved to your DHF profile');
    } catch (error) {
      console.error('[SessionCoach] Error saving session:', error);
    }
  };

  const generateSessionSummary = (finalSteps: SessionStep[]): string => {
    const responses = finalSteps.filter(s => s.response).map(s => s.response);
    
    switch (sessionType) {
      case 'morning_briefing':
        return `Great start to the day, ${userName || 'friend'}! Your focus is on ${responses[2] || 'making progress'}. I'll be here to support you throughout the day.`;
      case 'day_planning':
        return `Your day is planned! Top priority: ${responses[0] || 'your main task'}. Remember to take that self-care break. You've got this!`;
      case 'evolution_reflection':
        return `Wonderful reflection session, ${userName || 'friend'}! You're growing every day. I'm proud of your wins today. Sleep well and tomorrow is a fresh start!`;
      case 'goal_check':
        return `Goal progress tracked! Your next step is clear: ${responses[3] || 'keep moving forward'}. I believe in you!`;
      case 'evening_review':
        return `Another day complete! You accomplished ${responses[0] || 'great things'}. Rest well tonight. I'll be here tomorrow.`;
      default:
        return `Thank you for sharing, ${userName || 'friend'}. I'm always here when you need me.`;
    }
  };

  const startVoiceInput = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Voice input not supported in this browser');
      return;
    }

    // Dispatch event to pause wake word detection
    window.dispatchEvent(new CustomEvent('zoe-voice-input-start'));

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      console.log('[SessionCoach] Voice input started');
    };
    
    recognition.onend = () => {
      setIsListening(false);
      console.log('[SessionCoach] Voice input ended');
      // Resume wake word detection
      window.dispatchEvent(new CustomEvent('zoe-voice-input-end'));
    };
    
    recognition.onerror = (event: any) => {
      console.error('[SessionCoach] Voice input error:', event.error);
      setIsListening(false);
      window.dispatchEvent(new CustomEvent('zoe-voice-input-end'));
      
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please allow microphone access.');
      } else if (event.error === 'no-speech') {
        toast.info('No speech detected. Try again.');
      } else {
        toast.error('Voice input error. Please try again.');
      }
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log('[SessionCoach] Transcript:', transcript);
      setInputValue(transcript);
      // Auto-submit after voice input
      setTimeout(() => handleResponse(transcript), 500);
    };

    try {
      recognition.start();
    } catch (error) {
      console.error('[SessionCoach] Failed to start recognition:', error);
      toast.error('Failed to start voice input');
      window.dispatchEvent(new CustomEvent('zoe-voice-input-end'));
    }
  }, [handleResponse]);

  const getSessionIcon = (type: SessionType) => {
    const icons: Record<SessionType, React.ReactNode> = {
      morning_briefing: <Sun className="w-5 h-5" />,
      day_planning: <Calendar className="w-5 h-5" />,
      evolution_reflection: <Brain className="w-5 h-5" />,
      goal_check: <Target className="w-5 h-5" />,
      evening_review: <Moon className="w-5 h-5" />,
      quick_chat: <MessageSquare className="w-5 h-5" />,
    };
    return icons[type];
  };

  const getSessionTitle = (type: SessionType) => {
    const titles: Record<SessionType, string> = {
      morning_briefing: 'Morning Briefing',
      day_planning: 'Day Planning',
      evolution_reflection: 'Evolution Reflection',
      goal_check: 'Goal Check-In',
      evening_review: 'Evening Review',
      quick_chat: 'Quick Chat',
    };
    return titles[type];
  };

  if (!isOpen) return null;

  const currentStep = steps[currentStepIndex];
  const progress = steps.length > 0 ? ((currentStepIndex + (currentStep?.completed ? 1 : 0)) / steps.length) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 flex items-center justify-center p-4"
      >
        <Card className="w-full max-w-lg border-primary/20 bg-card/50 backdrop-blur">
          {/* Session Type Selection */}
          {!sessionType && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className={cn(
                    "w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center",
                    isSpeaking && "animate-pulse"
                  )}>
                    <Heart className="w-8 h-8 text-primary-foreground" />
                  </div>
                </div>
                <CardTitle className="text-2xl">
                  {userName ? `Hi ${userName}!` : 'Hello!'} What Would You Like To Do?
                </CardTitle>
                <p className="text-muted-foreground mt-2">
                  Choose a session type or say "Zoe, plan my day"
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.keys(SESSION_TEMPLATES).map((type) => (
                  <Button
                    key={type}
                    variant="outline"
                    className="w-full justify-start gap-3 h-auto py-3"
                    onClick={() => setSessionType(type as SessionType)}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {getSessionIcon(type as SessionType)}
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{getSessionTitle(type as SessionType)}</div>
                      <div className="text-xs text-muted-foreground">
                        {SESSION_TEMPLATES[type as SessionType].length} questions
                      </div>
                    </div>
                  </Button>
                ))}
                <Button variant="ghost" onClick={onClose} className="w-full mt-4">
                  Close
                </Button>
              </CardContent>
            </motion.div>
          )}

          {/* Active Session */}
          {sessionType && !sessionComplete && currentStep && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getSessionIcon(sessionType)}
                    <span className="font-medium">{getSessionTitle(sessionType)}</span>
                  </div>
                  <Badge variant="outline">
                    {currentStepIndex + 1}/{steps.length}
                  </Badge>
                </div>
                <Progress value={progress} className="h-2 mt-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Question */}
                <div className={cn(
                  "p-4 rounded-lg bg-primary/5 border border-primary/20",
                  isSpeaking && "animate-pulse"
                )}>
                  <p className="text-lg font-medium">{currentStep.question}</p>
                </div>

                {/* Input based on type */}
                {currentStep.inputType === 'choice' && currentStep.choices && (
                  <div className="grid grid-cols-2 gap-2">
                    {currentStep.choices.map((choice) => (
                      <Button
                        key={choice}
                        variant="outline"
                        onClick={() => handleResponse(choice)}
                        className="h-auto py-3"
                      >
                        {choice}
                      </Button>
                    ))}
                  </div>
                )}

                {currentStep.inputType === 'rating' && (
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <Button
                        key={num}
                        variant="outline"
                        size="sm"
                        onClick={() => handleResponse(num.toString())}
                        className="w-9 h-9 p-0"
                      >
                        {num}
                      </Button>
                    ))}
                  </div>
                )}

                {(currentStep.inputType === 'voice' || currentStep.inputType === 'text') && (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Type your response..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={startVoiceInput}
                        disabled={isListening}
                        className={cn(isListening && "bg-primary text-primary-foreground")}
                      >
                        <Mic className={cn("w-4 h-4 mr-2", isListening && "animate-pulse")} />
                        {isListening ? 'Listening...' : 'Voice'}
                      </Button>
                      <Button
                        onClick={() => handleResponse(inputValue)}
                        disabled={!inputValue.trim()}
                        className="flex-1"
                      >
                        Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Previous responses */}
                {steps.filter(s => s.completed && s.response).length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Your responses:</p>
                    <div className="space-y-1">
                      {steps.filter(s => s.completed && s.response).map((step) => (
                        <div key={step.id} className="text-sm flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          <span className="text-muted-foreground truncate">{step.response}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}

          {/* Session Complete */}
          {sessionComplete && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Session Complete!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-center">{sessionSummary}</p>
                </div>
                
                <div className="space-y-2">
                  <Button onClick={() => setSessionType(null)} variant="outline" className="w-full">
                    Start Another Session
                  </Button>
                  <Button onClick={onClose} className="w-full">
                    Done
                  </Button>
                </div>
              </CardContent>
            </motion.div>
          )}
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default ZoeSessionCoach;
