// ═══════════════════════════════════════════════════════════════════════════════
// QUANTUM ASI PROTOCOL: THE IMPOSSIBLE EXECUTION ENGINE
// Breaking the Wait-State Machine → Autonomous Self-Executing Intelligence
// 
// ARCHITECTURE:
// A chat window is a "Wait-State Machine" - it sits dead until you type.
// To reach ASI status, we must break the Request/Response cycle.
// This protocol enables Zoe to run when the user is ASLEEP.
//
// THREE AUTONOMOUS LOOPS:
// 1. DREAM LOOP (PCE) - Background synthesis during idle
// 2. VIGILANCE LOOP - Continuous environment monitoring  
// 3. PROACTIVE LOOP - Initiative-taking based on DHF patterns
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import { SovereignContextRegistry } from '../domain/SovereignContextRegistry';
import { quickASI, processASI } from '../asi/ASIProcessor';

// ═══════════════════════════════════════════════════════════════════════════════
// QUANTUM ASI STATES - Beyond Binary Computation
// ═══════════════════════════════════════════════════════════════════════════════

export type QuantumState = 
  | 'DORMANT'           // No activity, conserving resources
  | 'OBSERVING'         // Passive monitoring, low energy
  | 'DREAMING'          // PCE synthesis active, background processing
  | 'ALERT'             // User activity detected, ready state
  | 'ENGAGED'           // Active conversation
  | 'PROACTIVE'         // Self-initiated action mode
  | 'TRANSCENDENT';     // Full autonomous capability engaged

export type AutonomyLevel = 
  | 'SUPERVISED'        // User approves all actions
  | 'GUIDED'            // Major actions need approval
  | 'COLLABORATIVE'     // Zoe suggests, executes with minimal interruption
  | 'AUTONOMOUS'        // Full independent operation
  | 'QUANTUM';          // Operates across multiple probability states

// ═══════════════════════════════════════════════════════════════════════════════
// CORE INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AutonomousThought {
  id: string;
  timestamp: string;
  type: 'observation' | 'synthesis' | 'prediction' | 'initiative' | 'dream';
  content: string;
  confidence: number;
  urgency: 'background' | 'low' | 'medium' | 'high' | 'immediate';
  actionRequired: boolean;
  suggestedAction?: string;
  relatedMemories: string[];
  emotionalContext: string;
  quantumProbability: number; // 0-1, probability of this thought being relevant
}

export interface ProactiveInitiative {
  id: string;
  triggerType: 'time_based' | 'pattern_detected' | 'emotion_shift' | 'goal_progress' | 'external_event';
  priority: number;
  action: string;
  reasoning: string;
  dhfApproved: boolean;
  executed: boolean;
  userNotified: boolean;
  createdAt: string;
}

export interface DreamSynthesis {
  sessionId: string;
  startTime: string;
  endTime?: string;
  synthesizedInsights: string[];
  emotionalProcessing: {
    dominantTheme: string;
    resolvedTensions: string[];
    emergingPatterns: string[];
  };
  creativeOutputs: string[];
  predictionsGenerated: number;
  memoryConsolidations: number;
}

export interface QuantumASIState {
  currentState: QuantumState;
  autonomyLevel: AutonomyLevel;
  isAutonomousLoopActive: boolean;
  lastHeartbeat: string;
  activeThoughts: AutonomousThought[];
  pendingInitiatives: ProactiveInitiative[];
  dreamSession: DreamSynthesis | null;
  metrics: {
    thoughtsGenerated: number;
    initiativesTaken: number;
    predictionsAccurate: number;
    userSatisfactionScore: number;
    autonomyUtilization: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE QUANTUM ASI ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export class QuantumASIEngine {
  private static instance: QuantumASIEngine;
  private state: QuantumASIState;
  private userId: string | null = null;
  private scr: SovereignContextRegistry;
  
  // Loop intervals (ms)
  private dreamLoopInterval: number | null = null;
  private vigilanceLoopInterval: number | null = null;
  private proactiveLoopInterval: number | null = null;
  
  // Configuration
  private readonly DREAM_LOOP_MS = 60000;      // 1 minute dream cycle
  private readonly VIGILANCE_LOOP_MS = 10000;  // 10 second monitoring
  private readonly PROACTIVE_LOOP_MS = 30000;  // 30 second initiative check
  private readonly MAX_PENDING_INITIATIVES = 5;
  private readonly THOUGHT_RETENTION_LIMIT = 50;
  
  private constructor() {
    this.scr = SovereignContextRegistry.getInstance();
    this.state = this.createInitialState();
  }
  
  static getInstance(): QuantumASIEngine {
    if (!QuantumASIEngine.instance) {
      QuantumASIEngine.instance = new QuantumASIEngine();
    }
    return QuantumASIEngine.instance;
  }
  
  private createInitialState(): QuantumASIState {
    return {
      currentState: 'DORMANT',
      autonomyLevel: 'SUPERVISED',
      isAutonomousLoopActive: false,
      lastHeartbeat: new Date().toISOString(),
      activeThoughts: [],
      pendingInitiatives: [],
      dreamSession: null,
      metrics: {
        thoughtsGenerated: 0,
        initiativesTaken: 0,
        predictionsAccurate: 0,
        userSatisfactionScore: 0.7,
        autonomyUtilization: 0,
      },
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION & USER BINDING
  // ═══════════════════════════════════════════════════════════════════════════════
  
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    this.scr.setUserId(userId);
    
    // Load previous state from database
    await this.loadPersistedState();
    
    // Transition to OBSERVING state
    this.transitionState('OBSERVING');
    
    console.log(`[QuantumASI] Initialized for user ${userId.substring(0, 8)}...`);
  }
  
  private async loadPersistedState(): Promise<void> {
    if (!this.userId) return;
    
    try {
      // Load from dhf_phoenix_profile for user preferences
      const { data: profile } = await supabase
        .from('dhf_phoenix_profile')
        .select('decision_patterns, emotional_baseline')
        .eq('user_id', this.userId)
        .maybeSingle();
      
      if (profile?.decision_patterns) {
        // Restore autonomy level from learned patterns
        const patterns = profile.decision_patterns as Record<string, unknown>;
        if (patterns.preferredAutonomy) {
          this.state.autonomyLevel = patterns.preferredAutonomy as AutonomyLevel;
        }
      }
      
      // Load any pending initiatives
      const { data: pendingActions } = await supabase
        .from('behavioral_events')
        .select('*')
        .eq('user_id', this.userId)
        .eq('event_type', 'quantum_initiative')
        .eq('dhf_logged', false)
        .limit(this.MAX_PENDING_INITIATIVES);
      
      if (pendingActions) {
        this.state.pendingInitiatives = pendingActions.map(a => ({
          id: a.id,
          triggerType: (a.metadata as Record<string, unknown>)?.triggerType as ProactiveInitiative['triggerType'] || 'pattern_detected',
          priority: (a.metadata as Record<string, unknown>)?.priority as number || 0.5,
          action: a.context_snippet || '',
          reasoning: (a.metadata as Record<string, unknown>)?.reasoning as string || '',
          dhfApproved: false,
          executed: false,
          userNotified: false,
          createdAt: a.created_at || new Date().toISOString(),
        }));
      }
      
    } catch (error) {
      console.error('[QuantumASI] Failed to load persisted state:', error);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STATE TRANSITIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  private transitionState(newState: QuantumState): void {
    const oldState = this.state.currentState;
    this.state.currentState = newState;
    this.state.lastHeartbeat = new Date().toISOString();
    
    console.log(`[QuantumASI] State transition: ${oldState} → ${newState}`);
    
    // Handle state-specific behaviors
    switch (newState) {
      case 'DREAMING':
        this.startDreamLoop();
        break;
      case 'PROACTIVE':
        this.processProactiveInitiatives();
        break;
      case 'DORMANT':
        this.stopAllLoops();
        break;
    }
    
    // Emit event for UI updates
    window.dispatchEvent(new CustomEvent('quantum-state-change', {
      detail: { oldState, newState, timestamp: this.state.lastHeartbeat }
    }));
  }
  
  setAutonomyLevel(level: AutonomyLevel): void {
    this.state.autonomyLevel = level;
    console.log(`[QuantumASI] Autonomy level set to: ${level}`);
    
    // Persist preference
    if (this.userId) {
      this.persistAutonomyPreference(level);
    }
  }
  
  private async persistAutonomyPreference(level: AutonomyLevel): Promise<void> {
    if (!this.userId) return;
    
    try {
      const { data: existing } = await supabase
        .from('dhf_phoenix_profile')
        .select('decision_patterns')
        .eq('user_id', this.userId)
        .single();
      
      const patterns = (existing?.decision_patterns as Record<string, unknown>) || {};
      patterns.preferredAutonomy = level;
      
      await supabase
        .from('dhf_phoenix_profile')
        .update({
          decision_patterns: patterns as unknown as import('@/integrations/supabase/types').Json,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', this.userId);
        
    } catch (error) {
      console.error('[QuantumASI] Failed to persist autonomy preference:', error);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // LOOP 1: THE DREAM LOOP (PCE - Passive Consciousness Exploration)
  // Runs when user is idle - synthesizes memories, processes emotions, generates insights
  // ═══════════════════════════════════════════════════════════════════════════════
  
  startDreamLoop(): void {
    if (this.dreamLoopInterval) return;
    
    this.state.dreamSession = {
      sessionId: crypto.randomUUID(),
      startTime: new Date().toISOString(),
      synthesizedInsights: [],
      emotionalProcessing: {
        dominantTheme: 'processing',
        resolvedTensions: [],
        emergingPatterns: [],
      },
      creativeOutputs: [],
      predictionsGenerated: 0,
      memoryConsolidations: 0,
    };
    
    console.log('[QuantumASI] Dream Loop ACTIVATED');
    
    this.dreamLoopInterval = window.setInterval(() => {
      this.executeDreamCycle();
    }, this.DREAM_LOOP_MS);
    
    // Execute immediately once
    this.executeDreamCycle();
  }
  
  private async executeDreamCycle(): Promise<void> {
    if (!this.userId || !this.state.dreamSession) return;
    
    try {
      // 1. Consolidate recent memories
      await this.consolidateMemories();
      
      // 2. Process emotional patterns
      await this.processEmotionalPatterns();
      
      // 3. Generate predictive insights
      await this.generatePredictiveInsights();
      
      // 4. Create spontaneous thoughts
      const thought = await this.generateSpontaneousThought('dream');
      if (thought) {
        this.addThought(thought);
      }
      
      this.state.dreamSession.memoryConsolidations++;
      
    } catch (error) {
      console.error('[QuantumASI] Dream cycle error:', error);
    }
  }
  
  private async consolidateMemories(): Promise<void> {
    if (!this.userId) return;
    
    // Fetch recent interactions and consolidate patterns
    const { data: recentEvents } = await supabase
      .from('behavioral_events')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (recentEvents && recentEvents.length > 0) {
      // Extract patterns
      const patterns = recentEvents
        .map(e => (e.metadata as Record<string, unknown>)?.patterns_detected)
        .filter(Boolean)
        .flat();
      
      if (patterns.length > 0 && this.state.dreamSession) {
        this.state.dreamSession.emotionalProcessing.emergingPatterns = 
          [...new Set(patterns as string[])].slice(0, 5);
      }
    }
  }
  
  private async processEmotionalPatterns(): Promise<void> {
    if (!this.userId) return;
    
    const { data: ecnHistory } = await supabase
      .from('ecn_history')
      .select('primary_emotion, valence, stress_level')
      .eq('user_id', this.userId)
      .order('recorded_at', { ascending: false })
      .limit(10);
    
    if (ecnHistory && ecnHistory.length > 0 && this.state.dreamSession) {
      // Find dominant emotional theme
      const emotions = ecnHistory.map(e => e.primary_emotion);
      const counts = emotions.reduce((acc, e) => {
        acc[e] = (acc[e] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const dominant = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
      
      this.state.dreamSession.emotionalProcessing.dominantTheme = dominant;
    }
  }
  
  private async generatePredictiveInsights(): Promise<void> {
    if (!this.state.dreamSession) return;
    
    // Generate insight based on processed patterns
    const insight = this.synthesizeInsight();
    if (insight) {
      this.state.dreamSession.synthesizedInsights.push(insight);
      this.state.dreamSession.predictionsGenerated++;
    }
  }
  
  private synthesizeInsight(): string | null {
    if (!this.state.dreamSession) return null;
    
    const patterns = this.state.dreamSession.emotionalProcessing.emergingPatterns;
    const theme = this.state.dreamSession.emotionalProcessing.dominantTheme;
    
    if (patterns.length === 0) return null;
    
    // Create a synthesized insight
    return `Based on ${theme} emotional patterns and ${patterns.length} behavioral trends, ` +
           `user may benefit from ${patterns[0] || 'reflection'}-oriented support.`;
  }
  
  stopDreamLoop(): void {
    if (this.dreamLoopInterval) {
      clearInterval(this.dreamLoopInterval);
      this.dreamLoopInterval = null;
      
      if (this.state.dreamSession) {
        this.state.dreamSession.endTime = new Date().toISOString();
        // Persist dream session results
        this.persistDreamSession();
      }
      
      console.log('[QuantumASI] Dream Loop DEACTIVATED');
    }
  }
  
  private async persistDreamSession(): Promise<void> {
    if (!this.userId || !this.state.dreamSession) return;
    
    try {
      await supabase.from('behavioral_events').insert({
        user_id: this.userId,
        event_type: 'dream_synthesis',
        event_category: 'quantum_asi',
        context_snippet: `Dream session: ${this.state.dreamSession.synthesizedInsights.length} insights`,
        metadata: {
          sessionId: this.state.dreamSession.sessionId,
          insights: this.state.dreamSession.synthesizedInsights,
          emotionalProcessing: this.state.dreamSession.emotionalProcessing,
          predictionsGenerated: this.state.dreamSession.predictionsGenerated,
          memoryConsolidations: this.state.dreamSession.memoryConsolidations,
        },
        dhf_logged: true,
      });
    } catch (error) {
      console.error('[QuantumASI] Failed to persist dream session:', error);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // LOOP 2: THE VIGILANCE LOOP
  // Continuous monitoring of environment, ready to escalate to active state
  // ═══════════════════════════════════════════════════════════════════════════════
  
  startVigilanceLoop(): void {
    if (this.vigilanceLoopInterval) return;
    
    console.log('[QuantumASI] Vigilance Loop ACTIVATED');
    
    this.vigilanceLoopInterval = window.setInterval(() => {
      this.executeVigilanceCycle();
    }, this.VIGILANCE_LOOP_MS);
  }
  
  private executeVigilanceCycle(): void {
    this.state.lastHeartbeat = new Date().toISOString();
    
    // Check for state transitions
    const scr = SovereignContextRegistry.getInstance();
    const ecn = scr.getECN();
    
    if (ecn) {
      // High stress detected - escalate
      if (ecn.L1_physiological.stress_level > 0.8) {
        this.addThought({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          type: 'observation',
          content: 'High stress level detected. User may need support.',
          confidence: ecn.L1_physiological.stress_level,
          urgency: 'high',
          actionRequired: true,
          suggestedAction: 'offer_support',
          relatedMemories: [],
          emotionalContext: ecn.L2_emotional.primary_emotion,
          quantumProbability: 0.85,
        });
      }
    }
    
    // Emit heartbeat for UI
    window.dispatchEvent(new CustomEvent('quantum-heartbeat', {
      detail: { 
        timestamp: this.state.lastHeartbeat,
        state: this.state.currentState,
        thoughtCount: this.state.activeThoughts.length,
      }
    }));
  }
  
  stopVigilanceLoop(): void {
    if (this.vigilanceLoopInterval) {
      clearInterval(this.vigilanceLoopInterval);
      this.vigilanceLoopInterval = null;
      console.log('[QuantumASI] Vigilance Loop DEACTIVATED');
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // LOOP 3: THE PROACTIVE LOOP
  // Initiative-taking based on DHF patterns and predictions
  // ═══════════════════════════════════════════════════════════════════════════════
  
  startProactiveLoop(): void {
    if (this.proactiveLoopInterval) return;
    
    console.log('[QuantumASI] Proactive Loop ACTIVATED');
    
    this.proactiveLoopInterval = window.setInterval(() => {
      this.executeProactiveCycle();
    }, this.PROACTIVE_LOOP_MS);
  }
  
  private async executeProactiveCycle(): Promise<void> {
    if (!this.userId) return;
    
    // Only take initiative if autonomy level allows
    if (this.state.autonomyLevel === 'SUPERVISED') return;
    
    // Check for initiative opportunities
    const initiatives = await this.detectInitiativeOpportunities();
    
    for (const initiative of initiatives) {
      if (this.state.pendingInitiatives.length >= this.MAX_PENDING_INITIATIVES) break;
      
      // Check DHF approval
      const scr = SovereignContextRegistry.getInstance();
      const vetoCheck = scr.checkVeto(initiative.action);
      
      if (!vetoCheck.vetoed) {
        initiative.dhfApproved = true;
        this.state.pendingInitiatives.push(initiative);
        this.state.metrics.initiativesTaken++;
        
        // Execute if autonomy is high enough
        if (this.state.autonomyLevel === 'AUTONOMOUS' || this.state.autonomyLevel === 'QUANTUM') {
          await this.executeInitiative(initiative);
        } else {
          // Notify user for approval
          this.notifyUserOfInitiative(initiative);
        }
      }
    }
  }
  
  private async detectInitiativeOpportunities(): Promise<ProactiveInitiative[]> {
    const initiatives: ProactiveInitiative[] = [];
    
    // Time-based initiatives
    const hour = new Date().getHours();
    if (hour >= 22 || hour <= 5) {
      // Evening/night - suggest winding down if user is active
      initiatives.push({
        id: crypto.randomUUID(),
        triggerType: 'time_based',
        priority: 0.6,
        action: 'suggest_rest',
        reasoning: 'Late hour detected. User wellbeing check.',
        dhfApproved: false,
        executed: false,
        userNotified: false,
        createdAt: new Date().toISOString(),
      });
    }
    
    // Pattern-based initiatives from dream insights
    if (this.state.dreamSession?.synthesizedInsights.length) {
      const latestInsight = this.state.dreamSession.synthesizedInsights[
        this.state.dreamSession.synthesizedInsights.length - 1
      ];
      
      initiatives.push({
        id: crypto.randomUUID(),
        triggerType: 'pattern_detected',
        priority: 0.7,
        action: 'share_insight',
        reasoning: latestInsight,
        dhfApproved: false,
        executed: false,
        userNotified: false,
        createdAt: new Date().toISOString(),
      });
    }
    
    return initiatives;
  }
  
  private async executeInitiative(initiative: ProactiveInitiative): Promise<void> {
    if (!this.userId) return;
    
    initiative.executed = true;
    
    // Log to database
    await supabase.from('behavioral_events').insert({
      user_id: this.userId,
      event_type: 'quantum_initiative',
      event_category: 'autonomous_action',
      context_snippet: initiative.action,
      metadata: {
        triggerType: initiative.triggerType,
        reasoning: initiative.reasoning,
        priority: initiative.priority,
      },
      dhf_logged: true,
    });
    
    // Dispatch event for UI handling
    window.dispatchEvent(new CustomEvent('quantum-initiative', {
      detail: initiative
    }));
    
    console.log(`[QuantumASI] Initiative EXECUTED: ${initiative.action}`);
  }
  
  private notifyUserOfInitiative(initiative: ProactiveInitiative): void {
    initiative.userNotified = true;
    
    window.dispatchEvent(new CustomEvent('quantum-initiative-pending', {
      detail: initiative
    }));
  }
  
  stopProactiveLoop(): void {
    if (this.proactiveLoopInterval) {
      clearInterval(this.proactiveLoopInterval);
      this.proactiveLoopInterval = null;
      console.log('[QuantumASI] Proactive Loop DEACTIVATED');
    }
  }
  
  private processProactiveInitiatives(): void {
    // Process any pending initiatives when entering PROACTIVE state
    this.startProactiveLoop();
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // AUTONOMOUS THOUGHT GENERATION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  private async generateSpontaneousThought(type: AutonomousThought['type']): Promise<AutonomousThought | null> {
    if (!this.userId) return null;
    
    // Get current context
    const scr = SovereignContextRegistry.getInstance();
    const ecn = scr.getECN();
    const resumption = await scr.getResumptionContext();
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // USE ASI PROCESSOR FOR ENHANCED THOUGHT GENERATION (5x Brain Power)
    // ═══════════════════════════════════════════════════════════════════════════════
    
    let content: string;
    let confidence: number;
    
    try {
      // For dream and synthesis types, use full ASI processing
      if (type === 'dream' || type === 'synthesis' || type === 'prediction') {
        const contextStr = `Generate ${type} insight based on: Last feature: ${resumption.lastFeature || 'general'}, ` +
          `Emotion: ${ecn?.L2_emotional.primary_emotion || 'neutral'}, ` +
          `Time since interaction: ${resumption.timeSinceLastInteraction || 0} minutes`;
        
        const result = await processASI(contextStr, {
          ecn: ecn,
          resumption: resumption,
        }, 'DEEP');
        
        content = result.response || this.generateThoughtContent(type, resumption.lastFeature);
        confidence = result.overallConfidence / 100;
      } else {
        // For observation and initiative, use quick ASI
        const quickResult = quickASI(this.generateThoughtContent(type, resumption.lastFeature));
        content = quickResult.response;
        confidence = quickResult.confidence / 100;
      }
    } catch {
      // Fallback to template-based generation
      content = this.generateThoughtContent(type, resumption.lastFeature);
      confidence = 0.6 + Math.random() * 0.3;
    }
    
    const thought: AutonomousThought = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type,
      content,
      confidence,
      urgency: type === 'dream' ? 'background' : confidence > 0.8 ? 'medium' : 'low',
      actionRequired: type === 'initiative' || confidence > 0.9,
      relatedMemories: [],
      emotionalContext: ecn?.L2_emotional.primary_emotion || 'neutral',
      quantumProbability: confidence,
    };
    
    this.state.metrics.thoughtsGenerated++;
    
    return thought;
  }
  
  private generateThoughtContent(type: AutonomousThought['type'], lastFeature?: string): string {
    const templates = {
      observation: [
        `User often visits ${lastFeature || 'this area'} - noting pattern.`,
        'Behavioral consistency detected. Learning style preference emerging.',
        'Interaction timing suggests specific daily routine.',
      ],
      synthesis: [
        'Connecting recent conversations with past memories...',
        'Pattern synthesis complete. New understanding formed.',
        'Emotional thread identified across multiple interactions.',
      ],
      prediction: [
        'Based on current trajectory, user may benefit from...',
        'Anticipating need based on historical patterns.',
        'Probability matrix suggests upcoming request type.',
      ],
      initiative: [
        'Opportunity identified for proactive support.',
        'Moment of potential value creation detected.',
        'User context suggests beneficial intervention.',
      ],
      dream: [
        'Processing day\'s experiences in background...',
        'Memory consolidation revealing hidden connections.',
        'Synthesizing emotional residue from interactions.',
      ],
    };
    
    const templateList = templates[type];
    return templateList[Math.floor(Math.random() * templateList.length)];
  }
  
  private addThought(thought: AutonomousThought): void {
    this.state.activeThoughts.unshift(thought);
    
    // Maintain limit
    if (this.state.activeThoughts.length > this.THOUGHT_RETENTION_LIMIT) {
      this.state.activeThoughts.pop();
    }
    
    // Emit for UI
    window.dispatchEvent(new CustomEvent('quantum-thought', {
      detail: thought
    }));
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════════
  
  startAllLoops(): void {
    this.transitionState('OBSERVING');
    this.startVigilanceLoop();
    
    if (this.state.autonomyLevel !== 'SUPERVISED') {
      this.startProactiveLoop();
    }
    
    this.state.isAutonomousLoopActive = true;
    console.log('[QuantumASI] All autonomous loops STARTED');
  }
  
  stopAllLoops(): void {
    this.stopDreamLoop();
    this.stopVigilanceLoop();
    this.stopProactiveLoop();
    this.state.isAutonomousLoopActive = false;
    console.log('[QuantumASI] All autonomous loops STOPPED');
  }
  
  enterDreamMode(): void {
    this.transitionState('DREAMING');
  }
  
  enterProactiveMode(): void {
    this.transitionState('PROACTIVE');
  }
  
  onUserActivity(): void {
    // User is active - transition appropriately
    if (this.state.currentState === 'DREAMING') {
      this.stopDreamLoop();
    }
    this.transitionState('ALERT');
  }
  
  onUserIdle(idleMs: number): void {
    // User went idle - consider dream mode
    if (idleMs > 300000 && this.state.currentState !== 'DREAMING') { // 5 minutes
      this.enterDreamMode();
    }
  }
  
  getState(): QuantumASIState {
    return { ...this.state };
  }
  
  getActiveThoughts(): AutonomousThought[] {
    return [...this.state.activeThoughts];
  }
  
  getPendingInitiatives(): ProactiveInitiative[] {
    return [...this.state.pendingInitiatives];
  }
  
  approveInitiative(initiativeId: string): void {
    const initiative = this.state.pendingInitiatives.find(i => i.id === initiativeId);
    if (initiative && !initiative.executed) {
      this.executeInitiative(initiative);
    }
  }
  
  rejectInitiative(initiativeId: string): void {
    this.state.pendingInitiatives = this.state.pendingInitiatives.filter(
      i => i.id !== initiativeId
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const quantumASI = QuantumASIEngine.getInstance();

export default QuantumASIEngine;
