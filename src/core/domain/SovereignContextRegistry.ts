// ═══════════════════════════════════════════════════════════════════════════════
// ZOE HEXAGONAL ARCHITECTURE - SOVEREIGN CONTEXT REGISTRY (SCR) v2.0
// Enhanced with Always-In-Touch Context and DHF Continuous Stream Integration
// Domain Layer: Central registry for cognitive state and context management
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import type { LLMInferencePort } from '../ports/LLMInferencePort';
import type { TTSServicePort } from '../ports/TTSServicePort';
import type { ECNEmotionState } from '@/hooks/useContinuousDHFStream';

// Enhanced ECN with 27 emotion states
export interface ECNAnalysis {
  L1_physiological: {
    stress_level: number;
    energy_state: 'low' | 'medium' | 'high';
    alertness: number;
  };
  L2_emotional: {
    primary_emotion: ECNEmotionState;
    secondary_emotions: ECNEmotionState[];
    intensity: number;
    valence: number; // -1 to 1
    arousal: number; // 0 to 1
  };
  L3_cognitive: {
    drive_need: string;
    action_tendency: 'seeking_information' | 'taking_action' | 'avoiding' | 'approaching';
    cognitive_load: number;
    learning_style: {
      visual: number;
      auditory: number;
      kinesthetic: number;
      reading_writing: number;
    };
  };
  L4_reappraisal: {
    target_outcome: string;
    strategy: string;
    intervention_type: 'supportive' | 'directive' | 'collaborative' | 'empowering';
  };
  L5_synthesis: {
    overall_state: string;
    engagement_score: number;
    recommended_approach: string;
    tts_instruction: string;
  };
}

// CEPS (Cognitive-Emotional Predictive Synthesis) Types
export interface CEPSPrediction {
  predictionType: 'intent' | 'need' | 'behavior' | 'preference' | 'risk';
  confidence: number;
  prediction: string;
  reasoning: string[];
  suggestedAction?: string;
}

// DHF (Digital Human Fingerprint) Types
export interface DHFVetoRule {
  id: string;
  category: 'financial' | 'security' | 'destructive' | 'social' | 'privacy';
  priority: 'low' | 'medium' | 'high' | 'critical';
  conditions: string[];
  vetoEnabled: boolean;
  allowOverride: boolean;
}

// Enhanced Thought Signature with resumption context
export interface ThoughtSignature {
  signatureId: string;
  timestamp: string;
  thinkingLevel: 'low' | 'medium' | 'high';
  ecnState: ECNAnalysis;
  contextHash: string;
  chainDepth: number;
  parentSignature?: string;
  
  // Resumption context
  resumptionData?: {
    lastFeature: string;
    lastAction: string;
    lastContext: string;
    timeElapsed: number;
    suggestedResumption: string;
  };
}

// User activity snapshot for always-in-touch context
export interface ActivitySnapshot {
  lastEventType: string;
  lastEventCategory: string;
  lastEventContext: string;
  lastEventTime: string;
  sessionDuration: number;
  recentEmotions: ECNEmotionState[];
  currentFeature: string;
  activeGoals: string[];
}

// Port Registry for adapter management
interface AdapterEntry<T> {
  adapter: T;
  priority: number;
  healthStatus: 'healthy' | 'degraded' | 'unavailable';
}

/**
 * Sovereign Context Registry (SCR) v2.0
 * 
 * Enhanced with:
 * - Always-in-touch context from DHF continuous stream
 * - Session resumption with context awareness
 * - 27-emotion ECN integration
 * - Learning style tracking
 */
export class SovereignContextRegistry {
  private static instance: SovereignContextRegistry;
  
  // Adapter registries
  private llmAdapters: Map<string, AdapterEntry<LLMInferencePort>> = new Map();
  private ttsAdapters: Map<string, AdapterEntry<TTSServicePort>> = new Map();
  
  // State management
  private currentECN: ECNAnalysis | null = null;
  private thoughtChain: ThoughtSignature[] = [];
  private dhfRules: DHFVetoRule[] = [];
  private cepsCache: Map<string, CEPSPrediction> = new Map();
  
  // Always-in-touch context
  private activitySnapshot: ActivitySnapshot | null = null;
  private userId: string | null = null;
  private lastInteractionTime: Date | null = null;
  private sessionStartTime: Date | null = null;
  
  private constructor() {}
  
  static getInstance(): SovereignContextRegistry {
    if (!SovereignContextRegistry.instance) {
      SovereignContextRegistry.instance = new SovereignContextRegistry();
    }
    return SovereignContextRegistry.instance;
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // USER SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════
  
  setUserId(userId: string): void {
    this.userId = userId;
    this.sessionStartTime = new Date();
    this.loadUserContext();
  }
  
  private async loadUserContext(): Promise<void> {
    if (!this.userId) return;
    
    try {
      // Load latest behavioral events for context
      const { data: events } = await supabase
        .from('behavioral_events')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (events && events.length > 0) {
        const lastEvent = events[0];
        const metadata = lastEvent.metadata as Record<string, any> | null;
        const recentEmotions = events
          .map(e => (e.metadata as Record<string, any>)?.ecn_emotion)
          .filter(Boolean) as ECNEmotionState[];
        
        this.activitySnapshot = {
          lastEventType: lastEvent.event_type,
          lastEventCategory: lastEvent.event_category,
          lastEventContext: lastEvent.context_snippet || '',
          lastEventTime: lastEvent.created_at || new Date().toISOString(),
          sessionDuration: 0,
          recentEmotions: recentEmotions.slice(0, 5),
          currentFeature: metadata?.feature || 'unknown',
          activeGoals: metadata?.active_goals || [],
        };
      }
      
      // Load DHF learning history
      const { data: dhfHistory } = await supabase
        .from('dhf_learning_history')
        .select('*')
        .eq('user_id', this.userId)
        .maybeSingle();
      
      if (dhfHistory?.emotional_trends) {
        // Update ECN with historical data
        this.updateECNFromHistory(dhfHistory);
      }
      
      // Load ECN history for emotional patterns
      const { data: ecnHistory } = await supabase
        .from('ecn_history')
        .select('*')
        .eq('user_id', this.userId)
        .order('recorded_at', { ascending: false })
        .limit(5);
      
      if (ecnHistory && ecnHistory.length > 0) {
        // Update current ECN with recent patterns
        const latestECN = ecnHistory[0];
        this.currentECN = this.buildECNFromHistory(latestECN, ecnHistory);
      }
      
    } catch (error) {
      console.error('[SCR] Failed to load user context:', error);
    }
  }
  
  private updateECNFromHistory(dhfHistory: any): void {
    // Merge historical emotional trends into current ECN
    if (this.currentECN && dhfHistory.emotional_trends) {
      const trends = dhfHistory.emotional_trends;
      if (trends.latest_emotion) {
        this.currentECN.L2_emotional.primary_emotion = trends.latest_emotion;
      }
      if (trends.learning_style) {
        this.currentECN.L3_cognitive.learning_style = trends.learning_style;
      }
    }
  }
  
  private buildECNFromHistory(latest: any, history: any[]): ECNAnalysis {
    // Build comprehensive ECN from history
    const avgStress = history.reduce((sum, h) => sum + (h.stress_level || 0), 0) / history.length;
    const avgEngagement = history.reduce((sum, h) => sum + (h.engagement_score || 0), 0) / history.length;
    
    return {
      L1_physiological: {
        stress_level: avgStress,
        energy_state: avgEngagement > 0.7 ? 'high' : avgEngagement > 0.4 ? 'medium' : 'low',
        alertness: avgEngagement,
      },
      L2_emotional: {
        primary_emotion: (latest.primary_emotion as ECNEmotionState) || 'neutral',
        secondary_emotions: (latest.metadata?.secondary_emotions as ECNEmotionState[]) || [],
        intensity: latest.metadata?.arousal || 0.5,
        valence: latest.valence || 0,
        arousal: latest.metadata?.arousal || 0.5,
      },
      L3_cognitive: {
        drive_need: latest.metadata?.patterns_detected?.[0] || 'general_engagement',
        action_tendency: (latest.action_tendency as any) || 'seeking_information',
        cognitive_load: 0.5,
        learning_style: latest.metadata?.learning_style_indicators || {
          visual: 0.5,
          auditory: 0.5,
          kinesthetic: 0.5,
          reading_writing: 0.5,
        },
      },
      L4_reappraisal: {
        target_outcome: 'user_satisfaction',
        strategy: 'adaptive_response',
        intervention_type: 'collaborative',
      },
      L5_synthesis: {
        overall_state: latest.primary_emotion || 'neutral',
        engagement_score: latest.engagement_score || 0.5,
        recommended_approach: 'conversational',
        tts_instruction: 'Use a friendly, natural tone',
      },
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // RESUMPTION CONTEXT - "Always In Touch"
  // ═══════════════════════════════════════════════════════════════════
  
  async getResumptionContext(): Promise<{
    hasContext: boolean;
    message: string;
    lastFeature?: string;
    timeSinceLastInteraction?: number;
    suggestedAction?: string;
  }> {
    if (!this.activitySnapshot) {
      return { hasContext: false, message: '' };
    }
    
    const lastEventTime = new Date(this.activitySnapshot.lastEventTime);
    const timeSinceMs = Date.now() - lastEventTime.getTime();
    const timeSinceMinutes = Math.floor(timeSinceMs / 60000);
    
    // Generate contextual resumption message
    let message = '';
    let suggestedAction = '';
    
    if (timeSinceMinutes < 5) {
      message = "Welcome back! I'm still here.";
    } else if (timeSinceMinutes < 30) {
      const feature = this.activitySnapshot.currentFeature;
      const context = this.activitySnapshot.lastEventContext;
      
      if (feature === 'dhf-dashboard' || feature === 'dhf') {
        message = `Welcome back. Shall we resume the DHF configuration you were looking at before?`;
        suggestedAction = 'resume_dhf';
      } else if (feature === 'timeline' || feature === 'universal-timeline') {
        message = `Welcome back! You were exploring the timeline. Want to continue where you left off?`;
        suggestedAction = 'resume_timeline';
      } else if (feature === 'chat') {
        message = `Welcome back! We were having a conversation. Would you like to continue?`;
        suggestedAction = 'resume_chat';
      } else {
        message = `Welcome back! You were ${context || 'exploring the app'}. Ready to pick up where we left off?`;
        suggestedAction = 'resume_general';
      }
    } else if (timeSinceMinutes < 60 * 24) {
      const hours = Math.floor(timeSinceMinutes / 60);
      message = `Great to see you again! It's been ${hours} hour${hours > 1 ? 's' : ''}. How can I help you today?`;
    } else {
      const days = Math.floor(timeSinceMinutes / (60 * 24));
      message = `Welcome back! It's been ${days} day${days > 1 ? 's' : ''}. I've missed you! What would you like to do?`;
    }
    
    return {
      hasContext: true,
      message,
      lastFeature: this.activitySnapshot.currentFeature,
      timeSinceLastInteraction: timeSinceMinutes,
      suggestedAction,
    };
  }
  
  updateActivitySnapshot(event: {
    eventType: string;
    eventCategory: string;
    context?: string;
    feature?: string;
    emotion?: ECNEmotionState;
  }): void {
    const now = new Date();
    
    if (!this.activitySnapshot) {
      this.activitySnapshot = {
        lastEventType: event.eventType,
        lastEventCategory: event.eventCategory,
        lastEventContext: event.context || '',
        lastEventTime: now.toISOString(),
        sessionDuration: 0,
        recentEmotions: event.emotion ? [event.emotion] : [],
        currentFeature: event.feature || 'unknown',
        activeGoals: [],
      };
    } else {
      this.activitySnapshot.lastEventType = event.eventType;
      this.activitySnapshot.lastEventCategory = event.eventCategory;
      this.activitySnapshot.lastEventContext = event.context || '';
      this.activitySnapshot.lastEventTime = now.toISOString();
      this.activitySnapshot.currentFeature = event.feature || this.activitySnapshot.currentFeature;
      
      if (event.emotion) {
        this.activitySnapshot.recentEmotions.unshift(event.emotion);
        this.activitySnapshot.recentEmotions = this.activitySnapshot.recentEmotions.slice(0, 5);
      }
      
      if (this.sessionStartTime) {
        this.activitySnapshot.sessionDuration = (now.getTime() - this.sessionStartTime.getTime()) / 1000;
      }
    }
    
    this.lastInteractionTime = now;
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // ADAPTER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════
  
  registerLLMAdapter(name: string, adapter: LLMInferencePort, priority: number = 0): void {
    this.llmAdapters.set(name, { adapter, priority, healthStatus: 'healthy' });
  }
  
  registerTTSAdapter(name: string, adapter: TTSServicePort, priority: number = 0): void {
    this.ttsAdapters.set(name, { adapter, priority, healthStatus: 'healthy' });
  }
  
  getActiveLLMAdapter(): LLMInferencePort | null {
    const healthy = Array.from(this.llmAdapters.entries())
      .filter(([_, entry]) => entry.healthStatus === 'healthy')
      .sort((a, b) => a[1].priority - b[1].priority);
    
    return healthy[0]?.[1]?.adapter || null;
  }
  
  getActiveTTSAdapter(): TTSServicePort | null {
    const healthy = Array.from(this.ttsAdapters.entries())
      .filter(([_, entry]) => entry.healthStatus === 'healthy')
      .sort((a, b) => a[1].priority - b[1].priority);
    
    return healthy[0]?.[1]?.adapter || null;
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // ECN STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════
  
  updateECN(ecn: ECNAnalysis): void {
    this.currentECN = ecn;
    
    // Update activity snapshot with emotion
    if (this.activitySnapshot && ecn.L2_emotional.primary_emotion) {
      this.updateActivitySnapshot({
        eventType: 'ecn_update',
        eventCategory: 'emotional_state',
        emotion: ecn.L2_emotional.primary_emotion,
      });
    }
  }
  
  getECN(): ECNAnalysis | null {
    return this.currentECN;
  }
  
  getCurrentEmotion(): ECNEmotionState {
    return this.currentECN?.L2_emotional.primary_emotion || 'neutral';
  }
  
  getTTSInstruction(): string {
    return this.currentECN?.L5_synthesis.tts_instruction || 'Use a friendly, natural tone';
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // THOUGHT SIGNATURE TRACKING
  // ═══════════════════════════════════════════════════════════════════
  
  addThoughtSignature(signature: ThoughtSignature): void {
    this.thoughtChain.push(signature);
    // Keep last 20 signatures
    if (this.thoughtChain.length > 20) {
      this.thoughtChain.shift();
    }
  }
  
  getThoughtChain(): ThoughtSignature[] {
    return [...this.thoughtChain];
  }
  
  getLastThoughtSignature(): ThoughtSignature | null {
    return this.thoughtChain[this.thoughtChain.length - 1] || null;
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // DHF VETO SYSTEM
  // ═══════════════════════════════════════════════════════════════════
  
  setDHFRules(rules: DHFVetoRule[]): void {
    this.dhfRules = rules;
  }
  
  checkVeto(command: string): { vetoed: boolean; reason?: string; rule?: DHFVetoRule } {
    const commandLower = command.toLowerCase();
    
    for (const rule of this.dhfRules) {
      if (!rule.vetoEnabled) continue;
      
      for (const condition of rule.conditions) {
        if (commandLower.includes(condition.toLowerCase())) {
          return {
            vetoed: true,
            reason: `DHF Protection: Action blocked by ${rule.category} rule`,
            rule,
          };
        }
      }
    }
    
    return { vetoed: false };
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // CEPS PREDICTION CACHE
  // ═══════════════════════════════════════════════════════════════════
  
  cachePrediction(key: string, prediction: CEPSPrediction): void {
    this.cepsCache.set(key, prediction);
  }
  
  getPrediction(key: string): CEPSPrediction | undefined {
    return this.cepsCache.get(key);
  }
  
  clearPredictionCache(): void {
    this.cepsCache.clear();
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // RESET
  // ═══════════════════════════════════════════════════════════════════
  
  reset(): void {
    this.currentECN = null;
    this.thoughtChain = [];
    this.cepsCache.clear();
    this.activitySnapshot = null;
    this.lastInteractionTime = null;
    this.sessionStartTime = null;
  }
}

// Export singleton accessor
export const getSovereignRegistry = () => SovereignContextRegistry.getInstance();
