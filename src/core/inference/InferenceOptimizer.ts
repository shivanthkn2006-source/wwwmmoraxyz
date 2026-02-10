// ═══════════════════════════════════════════════════════════════════════════════
// ZOE DHF INFERENCE OPTIMIZER - The Economic Engine
// IBM Technology Integration: AI Inference Cost Reduction Stack
// ═══════════════════════════════════════════════════════════════════════════════
//
// THREE LAYERS OF OPTIMIZATION:
// 1. HARDWARE LAYER - Edge AI Protocol (NPU/WebGPU/WASM detection)
// 2. SOFTWARE LAYER - Model Compression (Quantization, Pruning concepts)
// 3. MIDDLEWARE LAYER - Graph Fusion (Fused Perception Pipeline)
//
// MISSION: Reduce inference cost by 90% using Local NPU for easy tasks
// ═══════════════════════════════════════════════════════════════════════════════

import { StateSpaceEngine, processLocalQuery } from '@/core/ssm/StateSpaceEngine';

// ═══ TYPES ═══

export interface HardwareCapabilities {
  /** Device has Neural Processing Unit */
  hasNPU: boolean;
  /** WebGPU available and working */
  hasWebGPU: boolean;
  /** WASM SIMD support */
  hasWasmSIMD: boolean;
  /** Device memory in GB */
  deviceMemoryGB: number;
  /** CPU core count */
  cpuCores: number;
  /** GPU tier estimate */
  gpuTier: 'none' | 'low' | 'mid' | 'high' | 'flagship';
  /** Battery level (0-1) */
  batteryLevel: number;
  /** Is device charging */
  isCharging: boolean;
  /** Connection type */
  connectionType: 'wifi' | 'cellular' | '4g' | '5g' | 'satellite' | 'offline';
  /** Effective bandwidth estimate (Mbps) */
  effectiveBandwidth: number;
}

export interface InferenceDecision {
  /** Route: local (free) or cloud (paid) */
  route: 'local' | 'hybrid' | 'cloud';
  /** Reason for decision */
  reason: string;
  /** Estimated cost ($) */
  estimatedCost: number;
  /** Estimated latency (ms) */
  estimatedLatencyMs: number;
  /** Confidence in decision */
  confidence: number;
  /** Hardware capabilities used */
  hardwareUsed: ('npu' | 'webgpu' | 'wasm' | 'cpu' | 'cloud')[];
  /** Model compression applied */
  compression: CompressionConfig;
}

export interface CompressionConfig {
  /** Quantization level */
  quantization: 'float32' | 'float16' | 'int8' | 'int4';
  /** Pruning applied */
  pruningLevel: 'none' | 'light' | 'moderate' | 'aggressive';
  /** Model size reduction factor */
  sizeReductionFactor: number;
  /** Speed improvement factor */
  speedupFactor: number;
}

export interface FusedPipelineResult<T> {
  /** Pipeline output */
  result: T;
  /** Total pipeline latency */
  totalLatencyMs: number;
  /** Trips saved by fusion */
  tripsSaved: number;
  /** Original steps that were fused */
  fusedSteps: string[];
  /** Battery impact (0-1) */
  batteryImpact: number;
}

export interface InferenceMetrics {
  /** Total inferences */
  totalInferences: number;
  /** Local (free) inferences */
  localInferences: number;
  /** Cloud (paid) inferences */
  cloudInferences: number;
  /** Total cost saved ($) */
  costSaved: number;
  /** Average local latency (ms) */
  avgLocalLatencyMs: number;
  /** Average cloud latency (ms) */
  avgCloudLatencyMs: number;
  /** Cache hit rate */
  cacheHitRate: number;
  /** Fusion efficiency */
  fusionEfficiency: number;
}

// ═══ COMPLEXITY SCORING ═══

interface ComplexityScore {
  score: number; // 0-100
  factors: string[];
  recommendedRoute: 'local' | 'hybrid' | 'cloud';
}

const COMPLEXITY_PATTERNS: Array<{
  pattern: RegExp;
  score: number;
  factor: string;
}> = [
  // Very Simple (0-20) - Local
  { pattern: /^(hi|hello|hey|yo|sup)/i, score: 5, factor: 'greeting' },
  { pattern: /what('s| is) the time/i, score: 10, factor: 'time_query' },
  { pattern: /set (alarm|timer|reminder)/i, score: 15, factor: 'simple_command' },
  { pattern: /turn (on|off) (the )?lights?/i, score: 15, factor: 'smart_home' },
  
  // Simple (20-40) - Local with cache
  { pattern: /weather/i, score: 25, factor: 'weather_lookup' },
  { pattern: /play (music|song)/i, score: 25, factor: 'media_control' },
  { pattern: /call|text|message/i, score: 30, factor: 'communication' },
  { pattern: /navigate|directions/i, score: 35, factor: 'navigation' },
  
  // Medium (40-60) - Hybrid
  { pattern: /summarize|summary/i, score: 45, factor: 'summarization' },
  { pattern: /translate/i, score: 50, factor: 'translation' },
  { pattern: /search|find|look up/i, score: 55, factor: 'search' },
  
  // Complex (60-80) - Cloud preferred
  { pattern: /analyze|analysis/i, score: 65, factor: 'analysis' },
  { pattern: /explain|why|how does/i, score: 70, factor: 'explanation' },
  { pattern: /compare|versus|vs/i, score: 75, factor: 'comparison' },
  
  // Very Complex (80-100) - Cloud required
  { pattern: /meaning of life|purpose|philosophy/i, score: 90, factor: 'deep_philosophy' },
  { pattern: /write (a |an )?essay|article|story/i, score: 85, factor: 'long_generation' },
  { pattern: /code|program|algorithm/i, score: 80, factor: 'coding' },
  { pattern: /10 years|lifetime|entire/i, score: 95, factor: 'massive_context' },
];

// ═══ HARDWARE DETECTION ═══

class InferenceOptimizerClass {
  private static instance: InferenceOptimizerClass;
  private capabilities: HardwareCapabilities | null = null;
  private metrics: InferenceMetrics;
  private fusionCache: Map<string, any>;
  private initialized: boolean = false;
  
  private constructor() {
    this.metrics = {
      totalInferences: 0,
      localInferences: 0,
      cloudInferences: 0,
      costSaved: 0,
      avgLocalLatencyMs: 0,
      avgCloudLatencyMs: 0,
      cacheHitRate: 0,
      fusionEfficiency: 0,
    };
    this.fusionCache = new Map();
  }
  
  static getInstance(): InferenceOptimizerClass {
    if (!InferenceOptimizerClass.instance) {
      InferenceOptimizerClass.instance = new InferenceOptimizerClass();
    }
    return InferenceOptimizerClass.instance;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // LAYER 1: HARDWARE DETECTION (Edge AI Protocol)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  async detectHardware(): Promise<HardwareCapabilities> {
    if (this.capabilities && this.initialized) {
      return this.capabilities;
    }
    
    console.log('[InferenceOptimizer] 🔍 Detecting hardware capabilities...');
    
    const capabilities: HardwareCapabilities = {
      hasNPU: false,
      hasWebGPU: false,
      hasWasmSIMD: false,
      deviceMemoryGB: 4,
      cpuCores: 4,
      gpuTier: 'low',
      batteryLevel: 1,
      isCharging: true,
      connectionType: 'wifi',
      effectiveBandwidth: 10,
    };
    
    // Detect WebGPU
    try {
      if ('gpu' in navigator) {
        const adapter = await (navigator as any).gpu?.requestAdapter();
        if (adapter) {
          capabilities.hasWebGPU = true;
          
          // Estimate GPU tier from adapter info
          const info = await adapter.requestAdapterInfo?.();
          if (info?.description) {
            const desc = info.description.toLowerCase();
            if (desc.includes('rtx 40') || desc.includes('m3') || desc.includes('a17')) {
              capabilities.gpuTier = 'flagship';
            } else if (desc.includes('rtx 30') || desc.includes('m2') || desc.includes('a16')) {
              capabilities.gpuTier = 'high';
            } else if (desc.includes('rtx 20') || desc.includes('m1') || desc.includes('a15')) {
              capabilities.gpuTier = 'mid';
            }
          }
        }
      }
    } catch (e) {
      console.log('[InferenceOptimizer] WebGPU not available');
    }
    
    // Detect NPU (heuristic based on device)
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('iphone') || ua.includes('ipad')) {
      // Apple Neural Engine available on A11+ (iPhone 8+)
      capabilities.hasNPU = true;
    } else if (ua.includes('android')) {
      // Many modern Android phones have NPUs
      capabilities.hasNPU = capabilities.deviceMemoryGB >= 6;
    }
    
    // Detect WASM SIMD
    try {
      capabilities.hasWasmSIMD = WebAssembly.validate(new Uint8Array([
        0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11
      ]));
    } catch {
      capabilities.hasWasmSIMD = false;
    }
    
    // Device memory
    capabilities.deviceMemoryGB = (navigator as any).deviceMemory || 4;
    capabilities.cpuCores = navigator.hardwareConcurrency || 4;
    
    // Battery status
    try {
      const battery = await (navigator as any).getBattery?.();
      if (battery) {
        capabilities.batteryLevel = battery.level;
        capabilities.isCharging = battery.charging;
        
        // Listen for changes
        battery.addEventListener('levelchange', () => {
          if (this.capabilities) {
            this.capabilities.batteryLevel = battery.level;
          }
        });
        battery.addEventListener('chargingchange', () => {
          if (this.capabilities) {
            this.capabilities.isCharging = battery.charging;
          }
        });
      }
    } catch {
      // Battery API not available
    }
    
    // Connection type
    try {
      const conn = (navigator as any).connection;
      if (conn) {
        const type = conn.effectiveType || conn.type;
        if (type === '4g') capabilities.connectionType = '4g';
        else if (type === '3g') capabilities.connectionType = 'cellular';
        else if (type === 'wifi') capabilities.connectionType = 'wifi';
        
        capabilities.effectiveBandwidth = conn.downlink || 10;
      }
    } catch {
      // Connection API not available
    }
    
    // Update GPU tier based on all factors
    if (capabilities.hasWebGPU && capabilities.deviceMemoryGB >= 8 && capabilities.cpuCores >= 8) {
      capabilities.gpuTier = 'flagship';
    } else if (capabilities.hasWebGPU && capabilities.deviceMemoryGB >= 6) {
      capabilities.gpuTier = 'high';
    } else if (capabilities.hasWebGPU || capabilities.hasWasmSIMD) {
      capabilities.gpuTier = 'mid';
    } else if (capabilities.cpuCores >= 4) {
      capabilities.gpuTier = 'low';
    } else {
      capabilities.gpuTier = 'none';
    }
    
    this.capabilities = capabilities;
    this.initialized = true;
    
    console.log('[InferenceOptimizer] ✅ Hardware detected:', {
      npu: capabilities.hasNPU,
      webgpu: capabilities.hasWebGPU,
      simd: capabilities.hasWasmSIMD,
      memory: `${capabilities.deviceMemoryGB}GB`,
      cores: capabilities.cpuCores,
      gpu: capabilities.gpuTier,
      battery: `${Math.round(capabilities.batteryLevel * 100)}%`,
      charging: capabilities.isCharging,
    });
    
    return capabilities;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // LAYER 2: MODEL COMPRESSION (Quantization/Pruning)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  getOptimalCompression(capabilities: HardwareCapabilities): CompressionConfig {
    // Flagship device: Minimal compression
    if (capabilities.gpuTier === 'flagship' && capabilities.isCharging) {
      return {
        quantization: 'float16',
        pruningLevel: 'none',
        sizeReductionFactor: 0.5, // 50% of original
        speedupFactor: 1.5,
      };
    }
    
    // High-end device: Light compression
    if (capabilities.gpuTier === 'high') {
      return {
        quantization: 'float16',
        pruningLevel: 'light',
        sizeReductionFactor: 0.4,
        speedupFactor: 2.0,
      };
    }
    
    // Mid-tier device: Moderate compression
    if (capabilities.gpuTier === 'mid') {
      return {
        quantization: 'int8',
        pruningLevel: 'moderate',
        sizeReductionFactor: 0.25, // 16GB -> 4GB
        speedupFactor: 3.0,
      };
    }
    
    // Low-end or low battery: Aggressive compression
    if (capabilities.gpuTier === 'low' || capabilities.batteryLevel < 0.2) {
      return {
        quantization: 'int4',
        pruningLevel: 'aggressive',
        sizeReductionFactor: 0.125, // 16GB -> 2GB
        speedupFactor: 5.0,
      };
    }
    
    // Default: 8-bit quantization
    return {
      quantization: 'int8',
      pruningLevel: 'light',
      sizeReductionFactor: 0.25,
      speedupFactor: 2.5,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // LAYER 3: GRAPH FUSION (Fused Perception Pipeline)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Fuse multiple operations into one to reduce round trips
   * Example: Capture + Analyze + Speak -> Fused(Capture+Analyze) + Speak
   */
  async executeFusedPipeline<T>(
    operations: Array<{
      name: string;
      execute: () => Promise<any>;
      canFuseWithNext?: boolean;
    }>
  ): Promise<FusedPipelineResult<T>> {
    const startTime = performance.now();
    const fusedSteps: string[] = [];
    let result: any;
    
    // Group fuseable operations
    const groups: Array<typeof operations> = [];
    let currentGroup: typeof operations = [];
    
    for (const op of operations) {
      currentGroup.push(op);
      if (!op.canFuseWithNext) {
        groups.push(currentGroup);
        currentGroup = [];
      }
    }
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    // Execute fused groups in parallel
    for (const group of groups) {
      if (group.length > 1) {
        // Fuse: Execute in parallel
        const results = await Promise.all(group.map(op => op.execute()));
        result = results[results.length - 1];
        fusedSteps.push(group.map(op => op.name).join('+'));
      } else {
        // Single operation
        result = await group[0].execute();
      }
    }
    
    const totalLatencyMs = performance.now() - startTime;
    const tripsSaved = operations.length - groups.length;
    
    // Update fusion efficiency metric
    const totalFusions = this.metrics.fusionEfficiency * this.metrics.totalInferences + tripsSaved;
    this.metrics.fusionEfficiency = this.metrics.totalInferences > 0 
      ? totalFusions / (this.metrics.totalInferences + 1)
      : tripsSaved;
    
    console.log(`[InferenceOptimizer] 🔗 Fused pipeline: ${tripsSaved} trips saved, ${totalLatencyMs.toFixed(1)}ms`);
    
    return {
      result: result as T,
      totalLatencyMs,
      tripsSaved,
      fusedSteps,
      batteryImpact: this.estimateBatteryImpact(totalLatencyMs, groups.length),
    };
  }
  
  private estimateBatteryImpact(latencyMs: number, operationCount: number): number {
    // Estimate battery impact (0-1 scale)
    const baseImpact = 0.001; // 0.1% per operation
    const timeImpact = latencyMs / 100000; // 0.001% per 100ms
    return Math.min(1, baseImpact * operationCount + timeImpact);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // THE INFERENCE SWITCH (decideBrain)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * THE CORE DECISION: Local (Free) or Cloud (Paid)?
   * This is the "decideBrain" function from the IBM video
   */
  async decideBrain(userQuery: string): Promise<InferenceDecision> {
    const capabilities = await this.detectHardware();
    const complexity = this.checkComplexity(userQuery);
    const compression = this.getOptimalCompression(capabilities);
    
    // Cost per cloud inference (estimated)
    const CLOUD_COST_PER_INFERENCE = 0.001; // $0.001 per request
    
    let route: 'local' | 'hybrid' | 'cloud';
    let reason: string;
    let estimatedCost: number;
    let estimatedLatencyMs: number;
    let hardwareUsed: InferenceDecision['hardwareUsed'];
    
    // DECISION LOGIC
    if (complexity.score <= 30) {
      // Simple query: Always local
      route = 'local';
      reason = `Simple query (${complexity.factors.join(', ')}) - using local NPU`;
      estimatedCost = 0;
      estimatedLatencyMs = 50;
      hardwareUsed = capabilities.hasNPU ? ['npu'] : 
                     capabilities.hasWebGPU ? ['webgpu'] :
                     capabilities.hasWasmSIMD ? ['wasm'] : ['cpu'];
    } else if (complexity.score <= 60 && capabilities.gpuTier !== 'none') {
      // Medium complexity: Hybrid (local processing, cloud enhancement)
      route = 'hybrid';
      reason = `Medium complexity (${complexity.factors.join(', ')}) - local SSM with cloud boost`;
      estimatedCost = CLOUD_COST_PER_INFERENCE * 0.5; // Half cost due to local pre-processing
      estimatedLatencyMs = 200;
      hardwareUsed = ['cpu', 'cloud'];
      if (capabilities.hasWebGPU) hardwareUsed.unshift('webgpu');
    } else {
      // Complex query: Cloud required
      route = 'cloud';
      reason = `Complex query (${complexity.factors.join(', ')}) - requires full cloud inference`;
      estimatedCost = CLOUD_COST_PER_INFERENCE;
      estimatedLatencyMs = 500;
      hardwareUsed = ['cloud'];
    }
    
    // Battery override: If low battery & not charging, prefer cloud
    if (capabilities.batteryLevel < 0.15 && !capabilities.isCharging && route === 'local') {
      route = 'cloud';
      reason = 'Low battery override - routing to cloud to preserve device power';
      estimatedCost = CLOUD_COST_PER_INFERENCE;
      estimatedLatencyMs = 500;
      hardwareUsed = ['cloud'];
    }
    
    // Offline override: Must use local
    if (capabilities.connectionType === 'offline' && route !== 'local') {
      route = 'local';
      reason = 'Offline mode - using local inference only';
      estimatedCost = 0;
      estimatedLatencyMs = complexity.score <= 60 ? 100 : 300;
      hardwareUsed = capabilities.hasWebGPU ? ['webgpu', 'cpu'] : ['cpu'];
    }
    
    const decision: InferenceDecision = {
      route,
      reason,
      estimatedCost,
      estimatedLatencyMs,
      confidence: 0.9,
      hardwareUsed,
      compression,
    };
    
    console.log(`[InferenceOptimizer] 🧠 Decision: ${route.toUpperCase()} | ${reason}`);
    
    return decision;
  }
  
  /**
   * Check query complexity (0-100 score)
   */
  checkComplexity(query: string): ComplexityScore {
    let score = 30; // Base score
    const factors: string[] = [];
    
    // Pattern matching
    for (const { pattern, score: patternScore, factor } of COMPLEXITY_PATTERNS) {
      if (pattern.test(query)) {
        score = patternScore;
        factors.push(factor);
        break; // Use first match
      }
    }
    
    // Length factor
    if (query.length > 200) {
      score += 20;
      factors.push('long_input');
    } else if (query.length > 100) {
      score += 10;
      factors.push('medium_input');
    }
    
    // Question complexity
    const questionWords = (query.match(/\b(why|how|what if|imagine|suppose|consider)\b/gi) || []).length;
    if (questionWords >= 2) {
      score += 15;
      factors.push('multi_part_question');
    }
    
    // Cap at 100
    score = Math.min(100, score);
    
    // Determine route
    let recommendedRoute: 'local' | 'hybrid' | 'cloud';
    if (score <= 30) recommendedRoute = 'local';
    else if (score <= 60) recommendedRoute = 'hybrid';
    else recommendedRoute = 'cloud';
    
    return { score, factors, recommendedRoute };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // EXECUTION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Execute inference with optimization
   */
  async executeOptimized(
    query: string,
    cloudExecutor: (query: string, stateContext?: any) => Promise<any>
  ): Promise<{
    response: any;
    route: 'local' | 'hybrid' | 'cloud';
    latencyMs: number;
    cost: number;
  }> {
    const startTime = performance.now();
    const decision = await this.decideBrain(query);
    
    let response: any;
    let actualCost = 0;
    
    try {
      if (decision.route === 'local') {
        // 🟢 ROUTE A: LOCAL INFERENCE (Free/Fast)
        const localResult = await processLocalQuery(query);
        
        // Check if we need to upgrade to cloud
        if (localResult.handoffToCloud) {
          // Hybrid fallback
          const stateContext = StateSpaceEngine.prepareCloudHandoff();
          response = await cloudExecutor(query, stateContext);
          actualCost = decision.estimatedCost;
          this.metrics.cloudInferences++;
        } else {
          // Stay local
          response = this.formatLocalResponse(localResult);
          this.metrics.localInferences++;
          this.metrics.costSaved += decision.estimatedCost || 0.001;
        }
        
      } else if (decision.route === 'hybrid') {
        // 🟡 ROUTE B: HYBRID (Local SSM + Cloud Enhancement)
        const localResult = await processLocalQuery(query);
        const stateContext = StateSpaceEngine.prepareCloudHandoff();
        
        // Fuse local + cloud
        response = await cloudExecutor(query, {
          ...stateContext,
          localIntent: localResult.intent,
          localSentiment: localResult.sentiment,
        });
        
        actualCost = decision.estimatedCost;
        this.metrics.cloudInferences++;
        this.metrics.costSaved += (0.001 - decision.estimatedCost); // Partial saving
        
      } else {
        // 🔴 ROUTE C: CLOUD INFERENCE (Paid/Smart)
        response = await cloudExecutor(query);
        actualCost = decision.estimatedCost;
        this.metrics.cloudInferences++;
      }
      
    } catch (error) {
      console.error('[InferenceOptimizer] Execution error:', error);
      
      // Fallback to local on cloud failure
      if (decision.route !== 'local') {
        console.log('[InferenceOptimizer] 🔄 Falling back to local inference');
        const localResult = await processLocalQuery(query);
        response = this.formatLocalResponse(localResult);
        actualCost = 0;
        this.metrics.localInferences++;
      } else {
        throw error;
      }
    }
    
    const latencyMs = performance.now() - startTime;
    
    // Update metrics
    this.metrics.totalInferences++;
    if (decision.route === 'local') {
      const totalLocal = this.metrics.avgLocalLatencyMs * (this.metrics.localInferences - 1) + latencyMs;
      this.metrics.avgLocalLatencyMs = totalLocal / this.metrics.localInferences;
    } else {
      const totalCloud = this.metrics.avgCloudLatencyMs * (this.metrics.cloudInferences - 1) + latencyMs;
      this.metrics.avgCloudLatencyMs = totalCloud / this.metrics.cloudInferences;
    }
    
    console.log(`[InferenceOptimizer] ✅ ${decision.route.toUpperCase()} in ${latencyMs.toFixed(1)}ms | Cost: $${actualCost.toFixed(4)}`);
    
    return {
      response,
      route: decision.route,
      latencyMs,
      cost: actualCost,
    };
  }
  
  private formatLocalResponse(localResult: Awaited<ReturnType<typeof processLocalQuery>>): any {
    return {
      content: this.generateLocalAnswer(localResult.intent),
      intent: localResult.intent,
      sentiment: localResult.sentiment,
      confidence: localResult.confidence,
      source: 'local_ssm',
    };
  }
  
  private generateLocalAnswer(intent: string): string {
    const now = new Date();
    
    switch (intent) {
      case 'time_query':
        return `It's ${now.toLocaleTimeString()}.`;
      case 'greeting':
        const hour = now.getHours();
        if (hour < 12) return 'Good morning! How can I help you?';
        if (hour < 17) return 'Good afternoon! What can I do for you?';
        return 'Good evening! How may I assist you?';
      case 'wake_word':
        return "I'm here. What do you need?";
      case 'smart_home':
        return 'Smart home command received. Processing...';
      default:
        return 'Processing locally...';
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // METRICS & STATUS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  getMetrics(): InferenceMetrics {
    return { ...this.metrics };
  }
  
  getCapabilities(): HardwareCapabilities | null {
    return this.capabilities;
  }
  
  getLocalInferenceRatio(): number {
    if (this.metrics.totalInferences === 0) return 0;
    return this.metrics.localInferences / this.metrics.totalInferences;
  }
  
  getCostSavingsReport(): {
    totalSaved: number;
    percentSaved: number;
    localRatio: number;
    avgLatencyReduction: number;
  } {
    const totalCost = this.metrics.totalInferences * 0.001;
    const percentSaved = totalCost > 0 ? (this.metrics.costSaved / totalCost) * 100 : 0;
    const avgLatencyReduction = this.metrics.avgCloudLatencyMs > 0 
      ? ((this.metrics.avgCloudLatencyMs - this.metrics.avgLocalLatencyMs) / this.metrics.avgCloudLatencyMs) * 100
      : 0;
    
    return {
      totalSaved: this.metrics.costSaved,
      percentSaved,
      localRatio: this.getLocalInferenceRatio(),
      avgLatencyReduction,
    };
  }
  
  // Reset metrics (for testing)
  resetMetrics(): void {
    this.metrics = {
      totalInferences: 0,
      localInferences: 0,
      cloudInferences: 0,
      costSaved: 0,
      avgLocalLatencyMs: 0,
      avgCloudLatencyMs: 0,
      cacheHitRate: 0,
      fusionEfficiency: 0,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const InferenceOptimizer = InferenceOptimizerClass.getInstance();

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function initializeInferenceOptimizer(): Promise<HardwareCapabilities> {
  return InferenceOptimizer.detectHardware();
}

export async function decideBrain(query: string): Promise<InferenceDecision> {
  return InferenceOptimizer.decideBrain(query);
}

export async function executeOptimizedInference(
  query: string,
  cloudExecutor: (query: string, stateContext?: any) => Promise<any>
) {
  return InferenceOptimizer.executeOptimized(query, cloudExecutor);
}

export function getInferenceMetrics(): InferenceMetrics {
  return InferenceOptimizer.getMetrics();
}

export function getCostSavings() {
  return InferenceOptimizer.getCostSavingsReport();
}

export default InferenceOptimizer;
