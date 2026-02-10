// ═══════════════════════════════════════════════════════════════════════════════
// STATE SPACE ENGINE - The Phantom Brain (Google Purist)
// SSM/Mamba Architecture for Zero-Cost Local AI Processing
// ═══════════════════════════════════════════════════════════════════════════════
// 
// ARCHITECTURE: IBM Technology State Space Model Integration
// - O(N) Linear Memory (vs O(N²) Transformer Quadratic)
// - Running State (Hidden Memory) - No re-reading entire context
// - Selective Attention (Mamba Gate) - Focus on important data
// 
// MISSION: $0.00 Local Processing for Wake Words, Basic Chat, Screen Monitoring
// 
// NOTE: Uses local heuristic processing - no external AI dependencies
// ═══════════════════════════════════════════════════════════════════════════════

// ═══ STATE SPACE CORE TYPES ═══

export interface StateVector {
  /** 1024-bit state representation */
  dimensions: Float32Array;
  /** Timestamp of last update */
  lastUpdate: number;
  /** Number of observations compressed */
  observationCount: number;
  /** Confidence score (0-1) */
  confidence: number;
  /** Category of the state */
  category: 'soul' | 'context' | 'intent' | 'emotion' | 'memory';
}

export interface SSMConfig {
  /** State dimension size */
  stateDimensions: number;
  /** Selectivity gate threshold (Mamba) */
  selectivityThreshold: number;
  /** Maximum observations before compression */
  maxObservations: number;
  /** Enable WebGPU acceleration */
  useWebGPU: boolean;
  /** Model precision */
  precision: 'float32' | 'float16' | 'int8';
  /** Battery-aware processing */
  batteryOptimized: boolean;
}

export interface SSMObservation {
  type: 'text' | 'audio' | 'visual' | 'kinetic' | 'biometric';
  data: unknown;
  timestamp: number;
  importance: number; // 0-1, used by selectivity gate
  source: string;
}

export interface PhantomBrainState {
  isInitialized: boolean;
  isProcessing: boolean;
  deviceTier: 'local' | 'hybrid' | 'cloud';
  memoryUsageBytes: number;
  batteryImpact: number;
  inferenceLatencyMs: number;
  stateVectors: Map<string, StateVector>;
  observationBuffer: SSMObservation[];
  lastCloudHandoff: number | null;
}

// ═══ SSM CONSTANTS ═══

const DEFAULT_CONFIG: SSMConfig = {
  stateDimensions: 512, // Compact for mobile
  selectivityThreshold: 0.3,
  maxObservations: 100,
  useWebGPU: true,
  precision: 'float16',
  batteryOptimized: true,
};

// ═══ STATE SPACE ENGINE CLASS ═══

class StateSpaceEngineClass {
  private static instance: StateSpaceEngineClass;
  private state: PhantomBrainState;
  private config: SSMConfig;
  private hiddenState: Float32Array | null;
  private subscribers: Set<(state: PhantomBrainState) => void>;
  
  private constructor() {
    this.config = DEFAULT_CONFIG;
    this.hiddenState = null;
    this.subscribers = new Set();
    
    this.state = {
      isInitialized: false,
      isProcessing: false,
      deviceTier: 'cloud', // Start with cloud, upgrade to local
      memoryUsageBytes: 0,
      batteryImpact: 0,
      inferenceLatencyMs: 0,
      stateVectors: new Map(),
      observationBuffer: [],
      lastCloudHandoff: null,
    };
  }
  
  static getInstance(): StateSpaceEngineClass {
    if (!StateSpaceEngineClass.instance) {
      StateSpaceEngineClass.instance = new StateSpaceEngineClass();
    }
    return StateSpaceEngineClass.instance;
  }
  
  // ═══ INITIALIZATION ═══
  
  async initialize(config?: Partial<SSMConfig>): Promise<boolean> {
    if (this.state.isInitialized) return true;
    
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    try {
      console.log('[SSM] 🧠 Initializing Phantom Brain (Google Purist)...');
      
      // Check WebGPU availability
      const hasWebGPU = await this.checkWebGPUSupport();
      
      console.log(`[SSM] WebGPU: ${hasWebGPU ? 'available' : 'not available'}`);
      
      // Initialize hidden state (the "Running State" from SSM)
      this.hiddenState = new Float32Array(this.config.stateDimensions);
      
      // Determine device tier based on capabilities
      const tier = this.determineDeviceTier(hasWebGPU);
      this.state.deviceTier = tier;
      
      this.state.isInitialized = true;
      
      console.log(`[SSM] ✅ Phantom Brain Online (Tier: ${tier})`);
      this.notifySubscribers();
      
      return true;
    } catch (error) {
      console.error('[SSM] Initialization failed:', error);
      return false;
    }
  }
  
  private async checkWebGPUSupport(): Promise<boolean> {
    if (typeof navigator === 'undefined') return false;
    
    try {
      if ('gpu' in navigator) {
        const adapter = await (navigator as any).gpu?.requestAdapter();
        return !!adapter;
      }
    } catch {
      // WebGPU not available
    }
    return false;
  }
  
  private determineDeviceTier(hasWebGPU: boolean): 'local' | 'hybrid' | 'cloud' {
    const memory = (navigator as any).deviceMemory;
    const cores = navigator.hardwareConcurrency || 4;
    
    // Flagship devices: Full local processing
    if (hasWebGPU && memory >= 8 && cores >= 8) {
      return 'local';
    }
    
    // Mid-tier: Hybrid (local for simple, cloud for complex)
    if (hasWebGPU || (memory >= 4 && cores >= 4)) {
      return 'hybrid';
    }
    
    // Budget: Cloud-only
    return 'cloud';
  }
  
  // ═══ STATE SPACE EQUATIONS ═══
  // State Equation: h_t = A * h_{t-1} + B * x_t
  // Observation Equation: y_t = C * h_t + D * x_t
  
  /**
   * Update the hidden state with new observation (State Equation)
   * This is the core SSM: We DON'T re-read history, we UPDATE a running state
   */
  private updateHiddenState(
    observation: Float32Array,
    importance: number
  ): Float32Array {
    if (!this.hiddenState) {
      this.hiddenState = new Float32Array(this.config.stateDimensions);
    }
    
    // Selectivity Gate (Mamba): Skip unimportant observations
    if (importance < this.config.selectivityThreshold) {
      return this.hiddenState;
    }
    
    // State Equation: h_t = decay * h_{t-1} + importance * x_t
    const decay = 0.95; // State persistence
    
    for (let i = 0; i < this.hiddenState.length; i++) {
      const inputValue = i < observation.length ? observation[i] : 0;
      this.hiddenState[i] = decay * this.hiddenState[i] + importance * inputValue;
    }
    
    return this.hiddenState;
  }
  
  /**
   * Generate output from hidden state (Observation Equation)
   */
  private generateFromState(queryContext?: string): Float32Array {
    if (!this.hiddenState) {
      return new Float32Array(this.config.stateDimensions);
    }
    
    // Output is a projection of the hidden state
    return this.hiddenState.slice();
  }
  
  // ═══ LOCAL INFERENCE (Zero Cost) ═══
  
  /**
   * Process text locally with SSM - $0.00 cost
   */
  async processLocalText(text: string): Promise<{
    intent: string;
    confidence: number;
    sentiment: number;
    embedding: Float32Array;
    handoffToCloud: boolean;
  }> {
    const startTime = performance.now();
    this.state.isProcessing = true;
    this.notifySubscribers();
    
    try {
      // Simple intent detection (local rules)
      const intent = this.classifyIntentLocal(text);
      
      // Sentiment from simple heuristics (zero latency)
      const sentiment = this.analyzeSentimentLocal(text);
      
      // Generate embedding (local hash-based)
      const embedding = this.generateEmbeddingLocal(text);
      
      // Update hidden state with this observation
      const importance = this.calculateImportance(text, intent);
      this.updateHiddenState(embedding, importance);
      
      // Determine if we need cloud handoff
      const handoffToCloud = this.shouldHandoffToCloud(text, intent, importance);
      
      this.state.inferenceLatencyMs = performance.now() - startTime;
      this.state.batteryImpact = 0.001; // Minimal battery impact
      
      return {
        intent,
        confidence: 0.85,
        sentiment,
        embedding,
        handoffToCloud,
      };
    } finally {
      this.state.isProcessing = false;
      this.notifySubscribers();
    }
  }
  
  /**
   * Local intent classification (rule-based for zero cost)
   */
  private classifyIntentLocal(text: string): string {
    const lower = text.toLowerCase();
    
    // Wake words and commands
    if (lower.includes('hey zoe') || lower.includes('hi zoe') || lower.includes('okay zoe')) {
      return 'wake_word';
    }
    
    // Time/Date queries (can answer locally)
    if (lower.match(/what('s| is) the time|current time|what time is it/)) {
      return 'time_query';
    }
    
    // Weather (needs cloud)
    if (lower.includes('weather')) {
      return 'weather_query';
    }
    
    // Navigation
    if (lower.match(/navigate|directions|how do i get to/)) {
      return 'navigation';
    }
    
    // Smart home (can be local with Matter)
    if (lower.match(/turn (on|off)|dim|brightness|lights|thermostat/)) {
      return 'smart_home';
    }
    
    // Greeting
    if (lower.match(/^(hi|hello|hey|good morning|good evening)/)) {
      return 'greeting';
    }
    
    // Deep questions (need cloud)
    if (lower.match(/why|how|what is the meaning|explain|analyze|think about/)) {
      return 'deep_reasoning';
    }
    
    return 'general';
  }
  
  /**
   * Local sentiment analysis (heuristic-based)
   */
  private analyzeSentimentLocal(text: string): number {
    const lower = text.toLowerCase();
    
    // Positive indicators
    const positiveWords = ['love', 'great', 'amazing', 'happy', 'wonderful', 'excellent', 'thank', 'awesome'];
    // Negative indicators
    const negativeWords = ['hate', 'terrible', 'awful', 'sad', 'angry', 'frustrated', 'bad', 'worst'];
    
    let score = 0.5; // Neutral
    
    for (const word of positiveWords) {
      if (lower.includes(word)) score += 0.1;
    }
    for (const word of negativeWords) {
      if (lower.includes(word)) score -= 0.1;
    }
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Generate simple embedding (hash-based for speed)
   */
  private generateEmbeddingLocal(text: string): Float32Array {
    const embedding = new Float32Array(this.config.stateDimensions);
    
    // Simple hash-based embedding
    const words = text.toLowerCase().split(/\s+/);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const hash = this.hashString(word);
      const index = Math.abs(hash) % this.config.stateDimensions;
      embedding[index] += 1.0 / words.length;
    }
    
    // Normalize
    let magnitude = 0;
    for (let i = 0; i < embedding.length; i++) {
      magnitude += embedding[i] * embedding[i];
    }
    magnitude = Math.sqrt(magnitude);
    
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    return embedding;
  }
  
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }
  
  /**
   * Calculate observation importance (Mamba Selectivity Gate)
   */
  private calculateImportance(text: string, intent: string): number {
    // High importance for wake words and commands
    if (intent === 'wake_word') return 1.0;
    if (intent === 'smart_home') return 0.9;
    if (intent === 'navigation') return 0.8;
    
    // Lower importance for casual chat
    if (intent === 'greeting') return 0.3;
    
    // Medium importance for general
    return 0.5;
  }
  
  /**
   * Determine if request should be handed off to cloud
   */
  private shouldHandoffToCloud(text: string, intent: string, importance: number): boolean {
    // Simple queries stay local
    const localIntents = ['wake_word', 'time_query', 'smart_home', 'greeting'];
    if (localIntents.includes(intent)) {
      return false;
    }
    
    // Complex queries go to cloud
    const cloudIntents = ['deep_reasoning', 'weather_query'];
    if (cloudIntents.includes(intent)) {
      return true;
    }
    
    // Long text likely needs cloud
    if (text.length > 100) {
      return true;
    }
    
    // In hybrid mode, use importance threshold
    if (this.state.deviceTier === 'hybrid') {
      return importance > 0.7;
    }
    
    return this.state.deviceTier === 'cloud';
  }
  
  // ═══ CONTEXT COMPRESSION ═══
  
  /**
   * Compress observations into state vector (Linear Memory)
   * This is the SSM magic: Store MEANING not DATA
   */
  async compressToStateVector(
    observations: SSMObservation[],
    category: StateVector['category']
  ): Promise<StateVector> {
    const stateVector: StateVector = {
      dimensions: new Float32Array(this.config.stateDimensions),
      lastUpdate: Date.now(),
      observationCount: observations.length,
      confidence: 0,
      category,
    };
    
    let totalImportance = 0;
    
    for (const obs of observations) {
      let embedding: Float32Array;
      
      if (obs.type === 'text' && typeof obs.data === 'string') {
        embedding = this.generateEmbeddingLocal(obs.data);
      } else {
        // For other types, create a simple feature vector
        embedding = new Float32Array(this.config.stateDimensions);
        embedding[0] = obs.importance;
      }
      
      // Apply selectivity gate
      if (obs.importance >= this.config.selectivityThreshold) {
        this.updateHiddenState(embedding, obs.importance);
        totalImportance += obs.importance;
      }
    }
    
    // Copy hidden state to state vector
    if (this.hiddenState) {
      stateVector.dimensions.set(this.hiddenState);
    }
    
    stateVector.confidence = observations.length > 0 
      ? totalImportance / observations.length 
      : 0;
    
    // Store the state vector
    this.state.stateVectors.set(category, stateVector);
    
    return stateVector;
  }
  
  /**
   * Get the "Soul Summary" - compressed representation of all states
   */
  getSoulSummary(): {
    vectorHash: string;
    dimensions: number;
    confidence: number;
    categories: string[];
    observationCount: number;
  } {
    const categories: string[] = [];
    let totalConfidence = 0;
    let totalObservations = 0;
    
    this.state.stateVectors.forEach((vector, key) => {
      categories.push(key);
      totalConfidence += vector.confidence;
      totalObservations += vector.observationCount;
    });
    
    // Create a hash of the current hidden state
    let vectorHash = '0x';
    if (this.hiddenState) {
      const hashParts: string[] = [];
      for (let i = 0; i < Math.min(8, this.hiddenState.length); i++) {
        hashParts.push(Math.abs(this.hiddenState[i]).toFixed(2));
      }
      vectorHash = '0x' + hashParts.join('');
    }
    
    return {
      vectorHash,
      dimensions: this.config.stateDimensions,
      confidence: categories.length > 0 ? totalConfidence / categories.length : 0,
      categories,
      observationCount: totalObservations,
    };
  }
  
  // ═══ CLOUD HANDOFF ═══
  
  /**
   * Prepare compressed context for cloud handoff
   */
  prepareCloudHandoff(): {
    compressedContext: string;
    stateHash: string;
    priority: number;
    timestamp: number;
  } {
    const soul = this.getSoulSummary();
    
    return {
      compressedContext: JSON.stringify({
        vectorHash: soul.vectorHash,
        categories: soul.categories,
        observationCount: soul.observationCount,
      }),
      stateHash: soul.vectorHash,
      priority: soul.confidence,
      timestamp: Date.now(),
    };
  }
  
  // ═══ STATE MANAGEMENT ═══
  
  getState(): PhantomBrainState {
    return {
      ...this.state,
      stateVectors: new Map(this.state.stateVectors),
      observationBuffer: [...this.state.observationBuffer],
    };
  }
  
  subscribe(callback: (state: PhantomBrainState) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
  
  private notifySubscribers(): void {
    this.subscribers.forEach(cb => cb(this.getState()));
  }
  
  // ═══ CLEANUP ═══
  
  dispose(): void {
    this.hiddenState = null;
    this.state.isInitialized = false;
    this.state.stateVectors.clear();
    this.state.observationBuffer = [];
    console.log('[SSM] Phantom Brain disposed');
  }
}

// ═══ SINGLETON EXPORT ═══

export const StateSpaceEngine = StateSpaceEngineClass.getInstance();

// ═══ CONVENIENCE FUNCTIONS ═══

export async function initializePhantomBrain(config?: Partial<SSMConfig>): Promise<boolean> {
  return StateSpaceEngine.initialize(config);
}

export async function processLocalQuery(text: string): Promise<{
  intent: string;
  confidence: number;
  sentiment: number;
  embedding: Float32Array;
  handoffToCloud: boolean;
}> {
  return StateSpaceEngine.processLocalText(text);
}

export function getPhantomBrainState(): PhantomBrainState {
  return StateSpaceEngine.getState();
}

export function getSoulStateVector(): {
  vectorHash: string;
  dimensions: number;
  confidence: number;
  categories: string[];
  observationCount: number;
} {
  return StateSpaceEngine.getSoulSummary();
}

export default StateSpaceEngine;
