import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface ContextualMemory {
  conversation_topics: string[];
  key_decisions: Record<string, any>;
  unresolved_topics: string[];
  successful_interactions: any[];
  failed_interactions: any[];
}

interface Goal {
  id: string;
  goal_description: string;
  goal_category: string;
  goal_status: 'active' | 'completed' | 'paused' | 'abandoned';
  target_date?: string;
  current_progress_percentage: number;
  progress_milestones: any[];
  zoe_interventions: any[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface EmotionalIntelligence {
  emotional_patterns: {
    morning_mood: string;
    evening_mood: string;
    stress_triggers: string[];
    joy_triggers: string[];
  };
  current_sentiment: number;
  detected_emotions: string[];
  sentiment_history?: any[];
}

interface FeedbackItem {
  id: string;
  suggestion_text: string;
  user_action?: 'accepted' | 'ignored' | 'rejected' | 'deferred';
  outcome_quality?: number;
  suggested_at: string;
}

interface IntentPrediction {
  next_likely_action?: string;
  prediction_confidence?: number;
  prediction_reasoning?: string;
  accuracy_rate: number;
  intent_sequences?: any[];
}

interface PerformanceMetrics {
  suggestion_acceptance_rate: number;
  command_success_rate: number;
  overall_satisfaction_score: number;
  total_interactions: number;
}

export const useZoeIntelligence = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Intelligence States
  const [contextualMemory, setContextualMemory] = useState<ContextualMemory | null>(null);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [emotionalIntelligence, setEmotionalIntelligence] = useState<EmotionalIntelligence | null>(null);
  const [recentFeedback, setRecentFeedback] = useState<FeedbackItem[]>([]);
  const [intentPrediction, setIntentPrediction] = useState<IntentPrediction | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);

  // Initialize all intelligence systems
  useEffect(() => {
    if (user) {
      loadAllIntelligence();
    }
  }, [user]);

  const loadAllIntelligence = async () => {
    setLoading(true);
    await Promise.all([
      loadContextualMemory(),
      loadGoals(),
      loadEmotionalIntelligence(),
      loadRecentFeedback(),
      loadIntentPredictions(),
      loadPerformanceMetrics(),
    ]);
    setLoading(false);
  };

  // ==========================================
  // CONTEXTUAL MEMORY
  // ==========================================

  const loadContextualMemory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('zoe_contextual_memory')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setContextualMemory(data as any);
      } else {
        // Initialize
        const { data: newData } = await supabase
          .from('zoe_contextual_memory')
          .insert({ user_id: user.id })
          .select()
          .single();
        setContextualMemory(newData as any);
      }
    } catch (error) {
      console.error('Error loading contextual memory:', error);
    }
  };

  const addConversationTopic = async (topic: string) => {
    if (!user || !contextualMemory) return;

    const topics = [...(contextualMemory.conversation_topics || []), {
      topic,
      timestamp: new Date().toISOString(),
      context: window.location.pathname
    }];

    await supabase
      .from('zoe_contextual_memory')
      .update({ conversation_topics: topics })
      .eq('user_id', user.id);

    loadContextualMemory();
  };

  const recordSuccessfulInteraction = async (interactionDetails: any) => {
    if (!user || !contextualMemory) return;

    const interactions = [...(contextualMemory.successful_interactions || []), {
      ...interactionDetails,
      timestamp: new Date().toISOString()
    }];

    await supabase
      .from('zoe_contextual_memory')
      .update({ successful_interactions: interactions })
      .eq('user_id', user.id);

    loadContextualMemory();
  };

  // ==========================================
  // GOAL TRACKING
  // ==========================================

  const loadGoals = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('zoe_goal_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('goal_status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActiveGoals(data as Goal[]);
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const createGoal = async (goalData: {
    goal_description: string;
    goal_category: string;
    target_date?: string;
    priority?: string;
  }) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('zoe_goal_tracking')
        .insert({
          user_id: user.id,
          ...goalData
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Goal created! Zoe will help you track progress.');
      loadGoals();
      return data;
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Failed to create goal');
    }
  };

  const updateGoalProgress = async (goalId: string, progressPercentage: number, milestoneData?: any) => {
    if (!user) return;

    try {
      const goal = activeGoals.find(g => g.id === goalId);
      if (!goal) return;

      const updateData: any = {
        current_progress_percentage: progressPercentage
      };

      if (milestoneData) {
        const milestones = [...(goal.progress_milestones || []), {
          ...milestoneData,
          timestamp: new Date().toISOString()
        }];
        updateData.progress_milestones = milestones;
      }

      if (progressPercentage >= 100) {
        updateData.goal_status = 'completed';
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('zoe_goal_tracking')
        .update(updateData)
        .eq('id', goalId);

      if (error) throw error;

      if (progressPercentage >= 100) {
        toast.success('🎉 Goal completed! Amazing work!');
      }

      loadGoals();
    } catch (error) {
      console.error('Error updating goal progress:', error);
    }
  };

  const recordZoeIntervention = async (goalId: string, intervention: any) => {
    if (!user) return;

    const goal = activeGoals.find(g => g.id === goalId);
    if (!goal) return;

    const interventions = [...(goal.zoe_interventions || []), {
      ...intervention,
      timestamp: new Date().toISOString()
    }];

    await supabase
      .from('zoe_goal_tracking')
      .update({ zoe_interventions: interventions })
      .eq('id', goalId);

    loadGoals();
  };

  // ==========================================
  // EMOTIONAL INTELLIGENCE
  // ==========================================

  const loadEmotionalIntelligence = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('zoe_emotional_intelligence')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setEmotionalIntelligence(data as any);
      } else {
        const { data: newData } = await supabase
          .from('zoe_emotional_intelligence')
          .insert({ user_id: user.id })
          .select()
          .single();
        setEmotionalIntelligence(newData as any);
      }
    } catch (error) {
      console.error('Error loading emotional intelligence:', error);
    }
  };

  const updateEmotionalState = async (emotion: string, sentiment: number) => {
    if (!user || !emotionalIntelligence) return;

    const currentHour = new Date().getHours();
    const timeOfDay = currentHour < 12 ? 'morning' : currentHour < 18 ? 'afternoon' : 'evening';

    const sentimentHistory = [
      ...(emotionalIntelligence.sentiment_history || []),
      {
        timestamp: new Date().toISOString(),
        sentiment,
        time_of_day: timeOfDay,
        context: window.location.pathname
      }
    ].slice(-50); // Keep last 50 entries

    await supabase
      .from('zoe_emotional_intelligence')
      .update({
        current_sentiment: sentiment,
        detected_emotions: [...new Set([...emotionalIntelligence.detected_emotions, emotion])],
        sentiment_history: sentimentHistory
      })
      .eq('user_id', user.id);

    loadEmotionalIntelligence();
  };

  // ==========================================
  // FEEDBACK LOOP
  // ==========================================

  const loadRecentFeedback = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('zoe_feedback_loop')
        .select('*')
        .eq('user_id', user.id)
        .order('suggested_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecentFeedback(data as FeedbackItem[]);
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  };

  const recordSuggestion = async (suggestionText: string, suggestionType: string, context?: any) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('zoe_feedback_loop')
        .insert({
          user_id: user.id,
          suggestion_text: suggestionText,
          suggestion_type: suggestionType,
          context_when_suggested: context || { page: window.location.pathname },
          time_of_day: new Date().getHours()
        })
        .select()
        .single();

      if (error) throw error;
      loadRecentFeedback();
      return data;
    } catch (error) {
      console.error('Error recording suggestion:', error);
    }
  };

  const provideFeedback = async (suggestionId: string, action: 'accepted' | 'ignored' | 'rejected', outcomeQuality?: number, feedback?: string) => {
    if (!user) return;

    try {
      await supabase
        .from('zoe_feedback_loop')
        .update({
          user_action: action,
          outcome_quality: outcomeQuality,
          user_explicit_feedback: feedback,
          responded_at: new Date().toISOString()
        })
        .eq('id', suggestionId);

      loadRecentFeedback();
      updatePerformanceMetrics(action === 'accepted');
    } catch (error) {
      console.error('Error providing feedback:', error);
    }
  };

  // ==========================================
  // INTENT PREDICTIONS
  // ==========================================

  const loadIntentPredictions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('zoe_intent_predictions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setIntentPrediction(data as any);
      } else {
        const { data: newData } = await supabase
          .from('zoe_intent_predictions')
          .insert({ user_id: user.id })
          .select()
          .single();
        setIntentPrediction(newData as any);
      }
    } catch (error) {
      console.error('Error loading intent predictions:', error);
    }
  };

  const recordIntentSequence = async (actions: string[]) => {
    if (!user || !intentPrediction) return;

    const sequences = [...(intentPrediction.intent_sequences || []), {
      sequence: actions,
      timestamp: new Date().toISOString()
    }];

    await supabase
      .from('zoe_intent_predictions')
      .update({ intent_sequences: sequences })
      .eq('user_id', user.id);
  };

  // ==========================================
  // PERFORMANCE METRICS
  // ==========================================

  const loadPerformanceMetrics = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('zoe_performance_metrics')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPerformanceMetrics(data as any);
      } else {
        const { data: newData } = await supabase
          .from('zoe_performance_metrics')
          .insert({ user_id: user.id })
          .select()
          .single();
        setPerformanceMetrics(newData as any);
      }
    } catch (error) {
      console.error('Error loading performance metrics:', error);
    }
  };

  const updatePerformanceMetrics = async (suggestionAccepted: boolean) => {
    if (!user || !performanceMetrics) return;

    const totalInteractions = performanceMetrics.total_interactions + 1;
    const acceptedCount = suggestionAccepted ? 
      (performanceMetrics.suggestion_acceptance_rate * performanceMetrics.total_interactions + 1) : 
      (performanceMetrics.suggestion_acceptance_rate * performanceMetrics.total_interactions);
    
    const newAcceptanceRate = acceptedCount / totalInteractions;

    await supabase
      .from('zoe_performance_metrics')
      .update({
        total_interactions: totalInteractions,
        suggestion_acceptance_rate: newAcceptanceRate
      })
      .eq('user_id', user.id);

    loadPerformanceMetrics();
  };

  // ==========================================
  // PROACTIVE INTELLIGENCE
  // ==========================================

  const getProactiveSuggestions = useCallback(() => {
    if (!contextualMemory || !emotionalIntelligence || !intentPrediction) return [];

    const suggestions: string[] = [];
    const currentHour = new Date().getHours();

    // Time-based suggestions
    if (currentHour >= 8 && currentHour <= 10) {
      suggestions.push('Good morning! Ready to tackle your goals for today?');
    }

    // Goal-based suggestions
    activeGoals.forEach(goal => {
      if (goal.current_progress_percentage < 50 && goal.target_date) {
        const daysLeft = Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 7 && daysLeft > 0) {
          suggestions.push(`Your goal "${goal.goal_description}" is due in ${daysLeft} days. Need help?`);
        }
      }
    });

    // Intent-based sovereign notifications (not questions)
    if (intentPrediction.next_likely_action && intentPrediction.prediction_confidence && intentPrediction.prediction_confidence > 0.7) {
      // SOVEREIGN: Don't ask, inform
      suggestions.push(`I'm preparing ${intentPrediction.next_likely_action} for you. Say "stop" to cancel.`);
    }

    // Emotional intelligence suggestions
    if (emotionalIntelligence.current_sentiment < 0.3) {
      suggestions.push('You seem stressed. Would you like me to suggest some relaxing activities?');
    }

    return suggestions;
  }, [contextualMemory, emotionalIntelligence, intentPrediction, activeGoals]);

  return {
    // States
    loading,
    contextualMemory,
    activeGoals,
    emotionalIntelligence,
    recentFeedback,
    intentPrediction,
    performanceMetrics,

    // Memory functions
    addConversationTopic,
    recordSuccessfulInteraction,

    // Goal functions
    createGoal,
    updateGoalProgress,
    recordZoeIntervention,

    // Emotional functions
    updateEmotionalState,

    // Feedback functions
    recordSuggestion,
    provideFeedback,

    // Intent functions
    recordIntentSequence,

    // Proactive intelligence
    getProactiveSuggestions,

    // Refresh
    loadAllIntelligence,
  };
};
