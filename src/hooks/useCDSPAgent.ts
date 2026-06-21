// ═══════════════════════════════════════════════════════════════════════════════
// ZOE CODE GENESIS MANIFESTO - CONTINUOUS DEEP SCAN PROTOCOL (CDSP) AGENT
// Part 4: Deep Ultra Level Continuous Scan Protocol
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

// CDSP Analysis Types
interface EmotionalTonalMetric {
  stressKeywords: string[];
  joySources: string[];
  underlyingConcerns: string[];
  emotionalIntensity: number;
  valenceScore: number;  // -1 to 1
  arousalScore: number;  // 0 to 1
}

interface QueryNeedMetric {
  trackedGoals: TrackedGoal[];
  unresolvedNeeds: string[];
  resolvedQueries: string[];
}

interface TrackedGoal {
  goal: string;
  createdAt: string;
  status: 'active' | 'in_progress' | 'resolved' | 'abandoned';
  progressNotes: string[];
}

interface SituationalTrigger {
  context: string;
  suggestedIntervention: string;
  priority: 'gentle' | 'moderate' | 'urgent';
  delivered: boolean;
}

interface CDSPState {
  isScanning: boolean;
  emotionalMetric: EmotionalTonalMetric | null;
  queryMetric: QueryNeedMetric | null;
  pendingInterventions: SituationalTrigger[];
  lastScanTime: Date | null;
}

// Stress-indicating keywords to track
const STRESS_KEYWORDS = [
  'worried', 'anxious', 'stressed', 'overwhelmed', 'frustrated',
  'tired', 'exhausted', 'struggling', 'difficult', 'problem',
  'can\'t', 'unable', 'failing', 'scared', 'afraid', 'nervous'
];

// Joy-indicating keywords to track
const JOY_KEYWORDS = [
  'happy', 'excited', 'grateful', 'thankful', 'love', 'enjoy',
  'wonderful', 'amazing', 'great', 'fantastic', 'blessed',
  'peaceful', 'calm', 'satisfied', 'proud', 'accomplished'
];

// Goal-indicating patterns
const GOAL_PATTERNS = [
  /i want to (.+?)(?:\.|$)/i,
  /i need to (.+?)(?:\.|$)/i,
  /i\'m trying to (.+?)(?:\.|$)/i,
  /i\'d like to (.+?)(?:\.|$)/i,
  /my goal is to (.+?)(?:\.|$)/i,
  /i hope to (.+?)(?:\.|$)/i,
  /planning to (.+?)(?:\.|$)/i,
];

/**
 * CDSP Agent Hook
 * 
 * Implements the Continuous Deep Scan Protocol from the Zoe Code Genesis Manifesto:
 * - Emotional/Tonal Metric (The Heart): Analyzes sentiment and emotional intensity
 * - Query/Need Metric (The Practical Mind): Tracks explicit user needs and goals
 * - Situational Suggestion Logic: Provides context-aware interventions
 */
export const useCDSPAgent = () => {
  const { user } = useAuth();
  const [state, setState] = useState<CDSPState>({
    isScanning: false,
    emotionalMetric: null,
    queryMetric: null,
    pendingInterventions: [],
    lastScanTime: null,
  });
  
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const conversationBufferRef = useRef<string[]>([]);

  // Analyze text for emotional/tonal metrics
  const analyzeEmotionalTonal = useCallback((texts: string[]): EmotionalTonalMetric => {
    const combinedText = texts.join(' ').toLowerCase();
    
    const foundStress = STRESS_KEYWORDS.filter(kw => combinedText.includes(kw));
    const foundJoy = JOY_KEYWORDS.filter(kw => combinedText.includes(kw));
    
    // Calculate emotional intensity based on keyword frequency
    const totalKeywords = foundStress.length + foundJoy.length;
    const emotionalIntensity = Math.min(1, totalKeywords / 5);
    
    // Calculate valence (-1 = negative, 1 = positive)
    const valenceScore = totalKeywords > 0 
      ? (foundJoy.length - foundStress.length) / totalKeywords 
      : 0;
    
    // Calculate arousal based on intensity
    const arousalScore = emotionalIntensity;
    
    // Identify underlying concerns from stress patterns
    const underlyingConcerns: string[] = [];
    if (foundStress.includes('work') || combinedText.includes('job')) {
      underlyingConcerns.push('work-related stress');
    }
    if (foundStress.includes('money') || combinedText.includes('financial')) {
      underlyingConcerns.push('financial concerns');
    }
    if (foundStress.includes('relationship') || combinedText.includes('family')) {
      underlyingConcerns.push('relationship dynamics');
    }
    
    return {
      stressKeywords: foundStress,
      joySources: foundJoy,
      underlyingConcerns,
      emotionalIntensity,
      valenceScore,
      arousalScore,
    };
  }, []);

  // Analyze text for goals and needs
  const analyzeQueryNeed = useCallback((texts: string[]): QueryNeedMetric => {
    const trackedGoals: TrackedGoal[] = [];
    const unresolvedNeeds: string[] = [];
    
    texts.forEach(text => {
      GOAL_PATTERNS.forEach(pattern => {
        const match = text.match(pattern);
        if (match && match[1]) {
          trackedGoals.push({
            goal: match[1].trim(),
            createdAt: new Date().toISOString(),
            status: 'active',
            progressNotes: [],
          });
        }
      });
    });
    
    // Deduplicate goals
    const uniqueGoals = trackedGoals.reduce((acc, goal) => {
      if (!acc.find(g => g.goal.toLowerCase() === goal.goal.toLowerCase())) {
        acc.push(goal);
      }
      return acc;
    }, [] as TrackedGoal[]);
    
    return {
      trackedGoals: uniqueGoals,
      unresolvedNeeds,
      resolvedQueries: [],
    };
  }, []);

  // Generate situational intervention if needed
  const generateIntervention = useCallback((
    emotional: EmotionalTonalMetric,
    query: QueryNeedMetric
  ): SituationalTrigger | null => {
    // High stress detected - suggest support
    if (emotional.stressKeywords.length >= 2 && emotional.valenceScore < -0.3) {
      return {
        context: 'High stress levels detected',
        suggestedIntervention: "I've noticed you might be feeling overwhelmed. Would you like to talk about what's on your mind? Sometimes it helps to share.",
        priority: emotional.emotionalIntensity > 0.7 ? 'moderate' : 'gentle',
        delivered: false,
      };
    }
    
    // Unresolved goals with time passing
    if (query.trackedGoals.length > 0) {
      const oldestGoal = query.trackedGoals[0];
      return {
        context: `Tracked goal: "${oldestGoal.goal}"`,
        suggestedIntervention: `I remember you mentioned wanting to ${oldestGoal.goal}. Would you like some help making progress on that?`,
        priority: 'gentle',
        delivered: false,
      };
    }
    
    // Joy detected - reinforce positive
    if (emotional.joySources.length >= 2 && emotional.valenceScore > 0.3) {
      return {
        context: 'Positive emotional state',
        suggestedIntervention: "I can sense you're in a good place right now. That's wonderful! What's bringing you joy today?",
        priority: 'gentle',
        delivered: false,
      };
    }
    
    return null;
  }, []);

  // Add text to conversation buffer for analysis
  const addToBuffer = useCallback((text: string) => {
    conversationBufferRef.current.push(text);
    // Keep only last 20 messages
    if (conversationBufferRef.current.length > 20) {
      conversationBufferRef.current.shift();
    }
  }, []);

  // Run a CDSP scan
  const runScan = useCallback(async () => {
    if (!user || conversationBufferRef.current.length === 0) return;
    
    setState(prev => ({ ...prev, isScanning: true }));
    
    try {
      const texts = conversationBufferRef.current;
      
      // Analyze emotional/tonal metrics
      const emotionalMetric = analyzeEmotionalTonal(texts);
      
      // Analyze query/need metrics
      const queryMetric = analyzeQueryNeed(texts);
      
      // Generate intervention if needed
      const intervention = generateIntervention(emotionalMetric, queryMetric);
      
      // Save to CDSP analysis database
      await supabase.from('zoe_cdsp_analysis' as any).insert({
        user_id: user.id,
        analysis_type: 'emotional_tonal',
        stress_keywords: emotionalMetric.stressKeywords,
        joy_sources: emotionalMetric.joySources,
        underlying_concerns: emotionalMetric.underlyingConcerns,
        emotional_intensity: emotionalMetric.emotionalIntensity,
        valence_score: emotionalMetric.valenceScore,
        arousal_score: emotionalMetric.arousalScore,
        tracked_goals: queryMetric.trackedGoals,
        unresolved_needs: queryMetric.unresolvedNeeds,
        resolved_queries: queryMetric.resolvedQueries,
        trigger_context: intervention?.context,
        suggested_intervention: intervention?.suggestedIntervention,
        intervention_priority: intervention?.priority || 'gentle',
      });
      
      // Also record to ECN history for Zoe's memory integration
      const primaryEmotion = emotionalMetric.valenceScore > 0.3 
        ? (emotionalMetric.joySources.length > 0 ? 'joy' : 'optimism')
        : emotionalMetric.valenceScore < -0.3 
          ? (emotionalMetric.stressKeywords.length > 0 ? 'anxiety' : 'concern')
          : 'neutral';
      
      const stressLevel = Math.min(1, Math.max(0, 
        emotionalMetric.stressKeywords.length * 0.15 + 
        (1 - emotionalMetric.valenceScore) * 0.3
      ));
      
      await supabase.from('ecn_history').insert({
        user_id: user.id,
        primary_emotion: primaryEmotion,
        valence: emotionalMetric.valenceScore,
        stress_level: stressLevel,
        engagement_score: Math.min(1, emotionalMetric.emotionalIntensity * 0.2),
        action_tendency: emotionalMetric.arousalScore > 0.5 ? 'taking_action' : 'seeking_information',
        metadata: {
          source: 'cdsp_scan',
          joy_sources: emotionalMetric.joySources,
          stress_keywords: emotionalMetric.stressKeywords,
          underlying_concerns: emotionalMetric.underlyingConcerns,
          tracked_goals: queryMetric.trackedGoals?.length || 0,
          unresolved_needs: queryMetric.unresolvedNeeds?.length || 0,
        },
      });
      
      setState(prev => ({
        ...prev,
        isScanning: false,
        emotionalMetric,
        queryMetric,
        pendingInterventions: intervention 
          ? [...prev.pendingInterventions, intervention]
          : prev.pendingInterventions,
        lastScanTime: new Date(),
      }));
      
    } catch (error) {
      console.error('[CDSP] Scan error:', error);
      setState(prev => ({ ...prev, isScanning: false }));
    }
  }, [user, analyzeEmotionalTonal, analyzeQueryNeed, generateIntervention]);

  // Start continuous scanning
  const startContinuousScan = useCallback(() => {
    if (scanIntervalRef.current) return;
    
    // Run scan every 30 seconds if there's new content
    scanIntervalRef.current = setInterval(() => {
      if (conversationBufferRef.current.length > 0) {
        runScan();
      }
    }, 30000);
    
    console.log('[CDSP] Continuous scanning started');
  }, [runScan]);

  // Stop continuous scanning
  const stopContinuousScan = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    console.log('[CDSP] Continuous scanning stopped');
  }, []);

  // Mark intervention as delivered
  const markInterventionDelivered = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      pendingInterventions: prev.pendingInterventions.map((int, i) => 
        i === index ? { ...int, delivered: true } : int
      ),
    }));
  }, []);

  // Get next pending intervention
  const getNextIntervention = useCallback((): SituationalTrigger | null => {
    return state.pendingInterventions.find(int => !int.delivered) || null;
  }, [state.pendingInterventions]);

  // Clear delivered interventions
  const clearDeliveredInterventions = useCallback(() => {
    setState(prev => ({
      ...prev,
      pendingInterventions: prev.pendingInterventions.filter(int => !int.delivered),
    }));
  }, []);

  // Load existing analysis on mount
  useEffect(() => {
    const loadExistingAnalysis = async () => {
      if (!user) return;
      
      try {
        const { data } = await supabase
          .from('zoe_cdsp_analysis' as any)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (data) {
          setState(prev => ({
            ...prev,
            emotionalMetric: {
              stressKeywords: (data as any).stress_keywords || [],
              joySources: (data as any).joy_sources || [],
              underlyingConcerns: (data as any).underlying_concerns || [],
              emotionalIntensity: (data as any).emotional_intensity || 0,
              valenceScore: (data as any).valence_score || 0,
              arousalScore: (data as any).arousal_score || 0,
            },
            queryMetric: {
              trackedGoals: (data as any).tracked_goals || [],
              unresolvedNeeds: (data as any).unresolved_needs || [],
              resolvedQueries: (data as any).resolved_queries || [],
            },
            lastScanTime: new Date((data as any).created_at),
          }));
        }
      } catch (error) {
        // No existing analysis, that's fine
      }
    };
    
    loadExistingAnalysis();
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopContinuousScan();
    };
  }, [stopContinuousScan]);

  return {
    // State
    ...state,
    
    // Actions
    addToBuffer,
    runScan,
    startContinuousScan,
    stopContinuousScan,
    markInterventionDelivered,
    getNextIntervention,
    clearDeliveredInterventions,
    
    // Metrics
    getEmotionalSummary: () => {
      if (!state.emotionalMetric) return 'No emotional data yet';
      const { valenceScore, emotionalIntensity } = state.emotionalMetric;
      if (valenceScore > 0.3) return 'Positive emotional state';
      if (valenceScore < -0.3) return 'May benefit from support';
      return emotionalIntensity > 0.5 ? 'Emotionally engaged' : 'Neutral state';
    },
    
    getGoalCount: () => state.queryMetric?.trackedGoals.length || 0,
    getStressLevel: () => state.emotionalMetric?.stressKeywords.length || 0,
  };
};

export type { EmotionalTonalMetric, QueryNeedMetric, TrackedGoal, SituationalTrigger, CDSPState };
