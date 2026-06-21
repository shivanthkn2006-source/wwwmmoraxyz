// ═══════════════════════════════════════════════════════════════════════════════
// QUANTUM ASI BRIDGE - UNIFIED ROOT CONNECTION
// Connects all ASI modules to a single coherent system
// This is the "nervous system" that ensures all components work together
// ═══════════════════════════════════════════════════════════════════════════════

import { 
  processASI, 
  quickASI, 
  generateQuantumThought,
  dreamSynthesisASI,
  detectProactiveInitiative,
  ASIResult,
  ASIMode,
  QuantumASIBridge as ASIBridgeType
} from './asi/ASIProcessor';

import { 
  pentarchySynthesize, 
  detectQueryType,
  PentarchySynthesis 
} from './asi/PentarchySwarmCore';

import { 
  neuroSymbolicProcess, 
  quickTruthCheck,
  NeuroSymbolicOutput 
} from './asi/NeuroSymbolicTruthEngine';

import { 
  quantumLoopProcess,
  QuantumLoopResult 
} from './asi/QuantumLoopCorrection';

import { 
  triangulateKnowledge,
  TriangulatedKnowledge 
} from './asi/AkashicAdapter';

import { SovereignContextRegistry } from './domain/SovereignContextRegistry';

// ═══════════════════════════════════════════════════════════════════════════════
// BRIDGE STATE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BridgeState {
  initialized: boolean;
  userId: string | null;
  lastProcessingTime: number;
  totalQueries: number;
  averageConfidence: number;
  activeModules: {
    pentarchy: boolean;
    truthEngine: boolean;
    quantumLoop: boolean;
    akashic: boolean;
  };
  health: 'optimal' | 'degraded' | 'critical';
}

export interface UnifiedASIResponse {
  // Core Response
  response: string;
  confidence: number;
  humanEquivalent: number;
  
  // Processing Details
  mode: ASIMode;
  processingMs: number;
  
  // Module Results (optional based on mode)
  pentarchyResult?: PentarchySynthesis;
  truthResult?: NeuroSymbolicOutput;
  quantumLoopResult?: QuantumLoopResult;
  akashicResult?: TriangulatedKnowledge;
  
  // Meta
  warnings: string[];
  recommendations: string[];
  truthValidated: boolean;
  selfCorrections: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUANTUM ASI BRIDGE - SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

class QuantumASIBridgeClass {
  private static instance: QuantumASIBridgeClass;
  private state: BridgeState;
  private scr: SovereignContextRegistry;
  
  private constructor() {
    this.scr = SovereignContextRegistry.getInstance();
    this.state = {
      initialized: false,
      userId: null,
      lastProcessingTime: 0,
      totalQueries: 0,
      averageConfidence: 0,
      activeModules: {
        pentarchy: true,
        truthEngine: true,
        quantumLoop: true,
        akashic: true
      },
      health: 'optimal'
    };
  }
  
  static getInstance(): QuantumASIBridgeClass {
    if (!QuantumASIBridgeClass.instance) {
      QuantumASIBridgeClass.instance = new QuantumASIBridgeClass();
    }
    return QuantumASIBridgeClass.instance;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  initialize(userId: string): void {
    this.state.userId = userId;
    this.state.initialized = true;
    this.scr.setUserId(userId);
    console.log('[QuantumASIBridge] Initialized for user:', userId.substring(0, 8));
  }
  
  isInitialized(): boolean {
    return this.state.initialized;
  }
  
  getState(): BridgeState {
    return { ...this.state };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // UNIFIED PROCESSING - MAIN ENTRY POINT
  // ═══════════════════════════════════════════════════════════════════════════════
  
  async process(
    query: string,
    context: Record<string, any> = {},
    options: {
      mode?: ASIMode;
      includeAkashic?: boolean;
      strictTruth?: boolean;
    } = {}
  ): Promise<UnifiedASIResponse> {
    const startTime = performance.now();
    
    try {
      // Merge with SCR context
      const ecn = this.scr.getECN();
      const enrichedContext = {
        ...context,
        emotionalState: ecn?.L2_emotional.primary_emotion,
        stressLevel: ecn?.L1_physiological.stress_level,
        currentEmotion: this.scr.getCurrentEmotion()
      };
      
      // Process through ASI
      const asiResult = await processASI(query, enrichedContext, options.mode);
      
      // Optionally triangulate with Akashic
      let akashicResult: TriangulatedKnowledge | undefined;
      if (options.includeAkashic && this.state.activeModules.akashic) {
        try {
          const queryType = detectQueryType(query);
          if (['spiritual', 'emotional', 'decision'].includes(queryType)) {
            // Extract key concept from query
            const concept = this.extractKeyConcept(query);
            if (concept) {
              akashicResult = triangulateKnowledge(concept, enrichedContext);
            }
          }
        } catch (akashicError) {
          console.warn('[QuantumASIBridge] Akashic lookup failed:', akashicError);
        }
      }
      
      // Update state
      this.state.totalQueries++;
      this.state.lastProcessingTime = performance.now() - startTime;
      this.state.averageConfidence = (
        (this.state.averageConfidence * (this.state.totalQueries - 1)) + 
        asiResult.overallConfidence
      ) / this.state.totalQueries;
      
      return {
        response: asiResult.response,
        confidence: asiResult.overallConfidence,
        humanEquivalent: asiResult.humanEquivalent,
        mode: asiResult.mode,
        processingMs: asiResult.totalProcessingMs,
        pentarchyResult: asiResult.pentarchyResult,
        truthResult: asiResult.truthEngineResult,
        quantumLoopResult: asiResult.quantumLoopResult,
        akashicResult,
        warnings: asiResult.warnings,
        recommendations: asiResult.recommendations,
        truthValidated: asiResult.truthValidated,
        selfCorrections: asiResult.selfCorrections
      };
      
    } catch (error) {
      console.error('[QuantumASIBridge] Processing error:', error);
      this.state.health = 'degraded';
      
      // Fallback to quick processing
      const fallback = quickASI(query);
      return {
        response: fallback.response,
        confidence: fallback.confidence,
        humanEquivalent: 1,
        mode: 'QUICK',
        processingMs: performance.now() - startTime,
        warnings: ['Full ASI processing failed, using fallback'],
        recommendations: ['Retry with simpler query'],
        truthValidated: false,
        selfCorrections: 0
      };
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // QUICK OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  quickProcess(query: string): { response: string; confidence: number } {
    return quickASI(query);
  }
  
  validateStatement(statement: string): boolean {
    return quickTruthCheck(statement);
  }
  
  detectQueryIntent(query: string): string {
    return detectQueryType(query);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // AUTONOMOUS THOUGHT GENERATION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  async generateThought(
    context: string,
    thoughtType: 'observation' | 'synthesis' | 'prediction' | 'initiative' | 'dream' = 'synthesis'
  ): Promise<ASIBridgeType> {
    const userContext = {
      emotionalState: this.scr.getCurrentEmotion(),
      userId: this.state.userId
    };
    return generateQuantumThought(context, thoughtType, userContext);
  }
  
  async synthesizeDreams(
    memories: string[],
    emotionalContext: Record<string, any> = {}
  ): Promise<{
    synthesizedInsight: string;
    emotionalTheme: string;
    predictions: string[];
    confidence: number;
  }> {
    return dreamSynthesisASI(memories, emotionalContext);
  }
  
  detectInitiative(
    patterns: string[],
    userGoals: string[] = []
  ): {
    shouldInitiate: boolean;
    priority: number;
    action: string;
    reasoning: string;
  } {
    return detectProactiveInitiative(patterns, userGoals);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PENTARCHY DIRECT ACCESS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  runPentarchy(query: string, context: Record<string, any> = {}): PentarchySynthesis {
    return pentarchySynthesize(query, context);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // QUANTUM LOOP DIRECT ACCESS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  runQuantumLoop(
    query: string,
    context: Record<string, any> = {},
    maxIterations: number = 5
  ): QuantumLoopResult {
    return quantumLoopProcess(query, context, maxIterations);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // TRUTH VALIDATION DIRECT ACCESS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  validateWithTruthEngine(
    statement: string,
    context: Record<string, any> = {},
    strict: boolean = false
  ): NeuroSymbolicOutput {
    return neuroSymbolicProcess(statement, context, strict);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // AKASHIC KNOWLEDGE ACCESS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  lookupKnowledge(
    concept: string,
    personalContext: Record<string, any> = {}
  ): TriangulatedKnowledge {
    return triangulateKnowledge(concept, personalContext);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // MODULE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════
  
  enableModule(module: keyof BridgeState['activeModules']): void {
    this.state.activeModules[module] = true;
  }
  
  disableModule(module: keyof BridgeState['activeModules']): void {
    this.state.activeModules[module] = false;
  }
  
  setHealth(health: BridgeState['health']): void {
    this.state.health = health;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  private extractKeyConcept(query: string): string | null {
    // Extract the main concept from a query for Akashic lookup
    const conceptKeywords = [
      'love', 'money', 'health', 'death', 'success', 'relationship',
      'purpose', 'soul', 'karma', 'mars', 'venus', 'saturn'
    ];
    
    const queryLower = query.toLowerCase();
    for (const keyword of conceptKeywords) {
      if (queryLower.includes(keyword)) {
        return keyword;
      }
    }
    
    // Extract first noun-like word
    const words = query.split(/\s+/).filter(w => w.length > 3);
    return words[0] || null;
  }
}

// Export singleton instance
export const QuantumASIBridge = QuantumASIBridgeClass.getInstance();
export default QuantumASIBridge;
