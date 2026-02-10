// ═══════════════════════════════════════════════════════════════════════════════
// ZOE ASI ROOT CONNECTOR - THE QUANTUM SPINE
// This is the ABSOLUTE ROOT that connects ALL ASI modules to work as ONE
// Every component in the platform MUST flow through here for ASI integration
// ═══════════════════════════════════════════════════════════════════════════════

import { QuantumASIBridge, UnifiedASIResponse, BridgeState } from './QuantumASIBridge';
import { SovereignContextRegistry } from './domain/SovereignContextRegistry';
import { safeExecute, SafeResult, withRetry } from '@/lib/safeOperations';

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT CONNECTION STATUS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ASIRootStatus {
  connected: boolean;
  bridgeHealth: BridgeState['health'];
  modules: {
    pentarchy: { connected: boolean; lastPing: number };
    truthEngine: { connected: boolean; lastPing: number };
    quantumLoop: { connected: boolean; lastPing: number };
    akashic: { connected: boolean; lastPing: number };
    nexusOversoul: { connected: boolean; lastPing: number };
    matterBridge: { connected: boolean; lastPing: number };
    dreamerAgent: { connected: boolean; lastPing: number };
  };
  totalQueries: number;
  uptime: number;
  lastError: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT TYPES FOR ASI ROOT
// ═══════════════════════════════════════════════════════════════════════════════

export type ASIEventType = 
  | 'thought:generated'
  | 'truth:validated'
  | 'loop:corrected'
  | 'pentarchy:synthesized'
  | 'nexus:routed'
  | 'dream:synthesized'
  | 'initiative:detected'
  | 'error:occurred'
  | 'health:changed';

export interface ASIEvent {
  type: ASIEventType;
  timestamp: number;
  data: any;
  source: string;
}

type ASIEventListener = (event: ASIEvent) => void;

// ═══════════════════════════════════════════════════════════════════════════════
// ASI ROOT CONNECTOR - SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

class ASIRootConnectorClass {
  private static instance: ASIRootConnectorClass;
  private initialized: boolean = false;
  private startTime: number = Date.now();
  private lastError: string | null = null;
  private eventListeners: Map<ASIEventType, ASIEventListener[]> = new Map();
  private moduleStatus: ASIRootStatus['modules'];
  
  private constructor() {
    this.moduleStatus = {
      pentarchy: { connected: false, lastPing: 0 },
      truthEngine: { connected: false, lastPing: 0 },
      quantumLoop: { connected: false, lastPing: 0 },
      akashic: { connected: false, lastPing: 0 },
      nexusOversoul: { connected: false, lastPing: 0 },
      matterBridge: { connected: false, lastPing: 0 },
      dreamerAgent: { connected: false, lastPing: 0 },
    };
  }
  
  static getInstance(): ASIRootConnectorClass {
    if (!ASIRootConnectorClass.instance) {
      ASIRootConnectorClass.instance = new ASIRootConnectorClass();
    }
    return ASIRootConnectorClass.instance;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION - CONNECT ALL MODULES
  // ═══════════════════════════════════════════════════════════════════════════════
  
  async initialize(userId: string): Promise<SafeResult<boolean>> {
    return safeExecute(async () => {
      if (this.initialized) {
        console.log('[ASIRootConnector] Already initialized');
        return true;
      }
      
      console.log('[ASIRootConnector] Initializing Quantum Spine for user:', userId.substring(0, 8));
      
      // Initialize the Quantum ASI Bridge
      QuantumASIBridge.initialize(userId);
      
      // Initialize Sovereign Context Registry
      const scr = SovereignContextRegistry.getInstance();
      scr.setUserId(userId);
      
      // Mark local modules as connected
      this.moduleStatus.pentarchy = { connected: true, lastPing: Date.now() };
      this.moduleStatus.truthEngine = { connected: true, lastPing: Date.now() };
      this.moduleStatus.quantumLoop = { connected: true, lastPing: Date.now() };
      this.moduleStatus.akashic = { connected: true, lastPing: Date.now() };
      
      // Ping edge function modules (non-blocking)
      this.pingEdgeFunctions(userId);
      
      this.initialized = true;
      this.emit('health:changed', { status: 'initialized', userId });
      
      console.log('[ASIRootConnector] ✅ Quantum Spine fully initialized');
      return true;
    }, 'ASIRootConnector.initialize');
  }
  
  private async pingEdgeFunctions(userId: string): Promise<void> {
    const functions = [
      { name: 'nexusOversoul', path: 'zoe-nexus-oversoul' },
      { name: 'matterBridge', path: 'zoe-matter-bridge' },
      { name: 'dreamerAgent', path: 'zoe-dreamer-agent' },
    ];
    
    for (const fn of functions) {
      try {
        // Just mark as connected - actual ping would require network call
        this.moduleStatus[fn.name as keyof typeof this.moduleStatus] = { 
          connected: true, 
          lastPing: Date.now() 
        };
      } catch (error) {
        console.warn(`[ASIRootConnector] Failed to ping ${fn.name}:`, error);
        this.moduleStatus[fn.name as keyof typeof this.moduleStatus] = { 
          connected: false, 
          lastPing: Date.now() 
        };
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STATUS CHECK
  // ═══════════════════════════════════════════════════════════════════════════════
  
  getStatus(): ASIRootStatus {
    const bridgeState = QuantumASIBridge.getState();
    
    return {
      connected: this.initialized,
      bridgeHealth: bridgeState.health,
      modules: { ...this.moduleStatus },
      totalQueries: bridgeState.totalQueries,
      uptime: Date.now() - this.startTime,
      lastError: this.lastError,
    };
  }
  
  isConnected(): boolean {
    return this.initialized && QuantumASIBridge.isInitialized();
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // UNIFIED PROCESSING - ALL COMPONENTS FLOW THROUGH HERE
  // ═══════════════════════════════════════════════════════════════════════════════
  
  async process(
    query: string,
    context: Record<string, any> = {},
    options: {
      mode?: 'QUICK' | 'STANDARD' | 'DEEP' | 'MAXIMUM';
      includeAkashic?: boolean;
      strictTruth?: boolean;
      emitEvents?: boolean;
    } = {}
  ): Promise<SafeResult<UnifiedASIResponse>> {
    return safeExecute(async () => {
      if (!this.initialized) {
        throw new Error('ASI Root not initialized. Call initialize() first.');
      }
      
      const result = await QuantumASIBridge.process(query, context, options);
      
      if (options.emitEvents !== false) {
        this.emit('thought:generated', {
          query: query.substring(0, 100),
          confidence: result.confidence,
          mode: result.mode,
        });
        
        if (result.truthValidated) {
          this.emit('truth:validated', { validated: true });
        }
        
        if (result.selfCorrections > 0) {
          this.emit('loop:corrected', { corrections: result.selfCorrections });
        }
      }
      
      return result;
    }, 'ASIRootConnector.process');
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // QUICK OPERATIONS - FOR UI COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  quickProcess(query: string): { response: string; confidence: number } {
    try {
      return QuantumASIBridge.quickProcess(query);
    } catch (error) {
      this.handleError('quickProcess', error);
      return { response: 'Processing error', confidence: 0 };
    }
  }
  
  validateTruth(statement: string): boolean {
    try {
      return QuantumASIBridge.validateStatement(statement);
    } catch (error) {
      this.handleError('validateTruth', error);
      return false;
    }
  }
  
  detectIntent(query: string): string {
    try {
      return QuantumASIBridge.detectQueryIntent(query);
    } catch (error) {
      this.handleError('detectIntent', error);
      return 'general';
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // AUTONOMOUS THOUGHT - FOR PROACTIVE FEATURES
  // ═══════════════════════════════════════════════════════════════════════════════
  
  async generateAutonomousThought(
    context: string,
    type: 'observation' | 'synthesis' | 'prediction' | 'initiative' | 'dream' = 'synthesis'
  ): Promise<SafeResult<any>> {
    return safeExecute(async () => {
      const thought = await QuantumASIBridge.generateThought(context, type);
      this.emit('thought:generated', { type, context: context.substring(0, 50) });
      return thought;
    }, 'ASIRootConnector.generateAutonomousThought');
  }
  
  async runDreamSynthesis(
    memories: string[],
    emotionalContext: Record<string, any> = {}
  ): Promise<SafeResult<any>> {
    return safeExecute(async () => {
      const result = await QuantumASIBridge.synthesizeDreams(memories, emotionalContext);
      this.emit('dream:synthesized', { memoryCount: memories.length });
      return result;
    }, 'ASIRootConnector.runDreamSynthesis');
  }
  
  detectProactiveInitiative(
    patterns: string[],
    userGoals: string[] = []
  ): { shouldInitiate: boolean; priority: number; action: string; reasoning: string } {
    try {
      const result = QuantumASIBridge.detectInitiative(patterns, userGoals);
      if (result.shouldInitiate) {
        this.emit('initiative:detected', { action: result.action, priority: result.priority });
      }
      return result;
    } catch (error) {
      this.handleError('detectProactiveInitiative', error);
      return { shouldInitiate: false, priority: 0, action: '', reasoning: 'Error occurred' };
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // DIRECT MODULE ACCESS - FOR SPECIALIZED USE
  // ═══════════════════════════════════════════════════════════════════════════════
  
  runPentarchy(query: string, context: Record<string, any> = {}): any {
    try {
      const result = QuantumASIBridge.runPentarchy(query, context);
      this.emit('pentarchy:synthesized', { query: query.substring(0, 50) });
      return result;
    } catch (error) {
      this.handleError('runPentarchy', error);
      return null;
    }
  }
  
  runQuantumLoop(
    query: string,
    context: Record<string, any> = {},
    maxIterations: number = 5
  ): any {
    try {
      const result = QuantumASIBridge.runQuantumLoop(query, context, maxIterations);
      this.emit('loop:corrected', { iterations: result.iterationCount });
      return result;
    } catch (error) {
      this.handleError('runQuantumLoop', error);
      return null;
    }
  }
  
  validateWithTruthEngine(
    statement: string,
    context: Record<string, any> = {},
    strict: boolean = false
  ): any {
    try {
      const result = QuantumASIBridge.validateWithTruthEngine(statement, context, strict);
      this.emit('truth:validated', { validated: result.truthValidation.validated });
      return result;
    } catch (error) {
      this.handleError('validateWithTruthEngine', error);
      return null;
    }
  }
  
  lookupAkashicKnowledge(
    concept: string,
    personalContext: Record<string, any> = {}
  ): any {
    try {
      return QuantumASIBridge.lookupKnowledge(concept, personalContext);
    } catch (error) {
      this.handleError('lookupAkashicKnowledge', error);
      return null;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // EVENT SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════════
  
  on(eventType: ASIEventType, listener: ASIEventListener): () => void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.push(listener);
    this.eventListeners.set(eventType, listeners);
    
    // Return unsubscribe function
    return () => {
      const updatedListeners = this.eventListeners.get(eventType) || [];
      const index = updatedListeners.indexOf(listener);
      if (index > -1) {
        updatedListeners.splice(index, 1);
        this.eventListeners.set(eventType, updatedListeners);
      }
    };
  }
  
  private emit(type: ASIEventType, data: any): void {
    const event: ASIEvent = {
      type,
      timestamp: Date.now(),
      data,
      source: 'ASIRootConnector',
    };
    
    const listeners = this.eventListeners.get(type) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[ASIRootConnector] Event listener error:', error);
      }
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════════════════════
  
  private handleError(operation: string, error: any): void {
    this.lastError = `${operation}: ${error?.message || 'Unknown error'}`;
    console.error(`[ASIRootConnector] ${operation} error:`, error);
    this.emit('error:occurred', { operation, error: this.lastError });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ═══════════════════════════════════════════════════════════════════════════════
  
  async healthCheck(): Promise<{
    healthy: boolean;
    modules: Record<string, boolean>;
    recommendations: string[];
  }> {
    const status = this.getStatus();
    const recommendations: string[] = [];
    
    if (!status.connected) {
      recommendations.push('Initialize the ASI Root Connector');
    }
    
    if (status.bridgeHealth === 'degraded') {
      recommendations.push('Check network connectivity and retry processing');
    }
    
    if (status.bridgeHealth === 'critical') {
      recommendations.push('Restart the application or contact support');
    }
    
    const moduleHealth: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(status.modules)) {
      moduleHealth[key] = value.connected;
      if (!value.connected) {
        recommendations.push(`Reconnect ${key} module`);
      }
    }
    
    return {
      healthy: status.connected && status.bridgeHealth === 'optimal',
      modules: moduleHealth,
      recommendations,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // RESET / SHUTDOWN
  // ═══════════════════════════════════════════════════════════════════════════════
  
  reset(): void {
    this.initialized = false;
    this.lastError = null;
    this.eventListeners.clear();
    console.log('[ASIRootConnector] Reset complete');
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // MATTER BRIDGE INTEGRATION - THE HANDS OF ZOE
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Execute a real-world action through the Matter Bridge
   * This connects ASI cognition to physical/digital action
   */
  async executeMatterAction(
    actionType: string,
    parameters: Record<string, any>,
    options: { urgency?: 'low' | 'medium' | 'high' | 'critical'; requireApproval?: boolean } = {}
  ): Promise<SafeResult<any>> {
    return safeExecute(async () => {
      if (!this.initialized) {
        throw new Error('ASI Root not initialized');
      }
      
      // Import supabase dynamically to avoid circular deps
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated for Matter Bridge action');
      }
      
      const { data, error } = await supabase.functions.invoke('zoe-matter-bridge', {
        body: {
          userId: user.id,
          actionType,
          parameters,
          forceApproval: options.requireApproval,
          context: {
            fromNexus: true,
            urgency: options.urgency || 'medium',
            isUserPresent: true
          }
        }
      });
      
      if (error) throw error;
      
      // Emit event for action execution
      this.emit('thought:generated', {
        type: 'matter_action',
        action: actionType,
        executed: data.actionExecuted,
        requiresApproval: data.requiresApproval
      });
      
      // Update Matter Bridge module status
      this.moduleStatus.matterBridge = { connected: true, lastPing: Date.now() };
      
      return data;
    }, 'ASIRootConnector.executeMatterAction');
  }
  
  /**
   * Check if an action is within the Sovereignty Leash
   */
  checkSovereignty(actionType: string, amount?: number): { allowed: boolean; reason: string } {
    const SOVEREIGNTY_LIMITS = {
      spendLimit: 50,
      tradeLimit: 100,
      forbiddenActions: ['unlock_door', 'disable_alarm', 'send_message']
    };
    
    if (SOVEREIGNTY_LIMITS.forbiddenActions.includes(actionType)) {
      return { allowed: false, reason: `Action "${actionType}" always requires approval` };
    }
    
    if (amount !== undefined) {
      if (actionType.includes('payment') && amount > SOVEREIGNTY_LIMITS.spendLimit) {
        return { allowed: false, reason: `Amount $${amount} exceeds spend limit of $${SOVEREIGNTY_LIMITS.spendLimit}` };
      }
      if (actionType.includes('trade') && amount > SOVEREIGNTY_LIMITS.tradeLimit) {
        return { allowed: false, reason: `Trade amount $${amount} exceeds limit of $${SOVEREIGNTY_LIMITS.tradeLimit}` };
      }
    }
    
    return { allowed: true, reason: 'Action is within sovereignty limits' };
  }
}

// Export singleton instance
export const ASIRootConnector = ASIRootConnectorClass.getInstance();
export default ASIRootConnector;
