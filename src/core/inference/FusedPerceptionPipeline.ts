// ═══════════════════════════════════════════════════════════════════════════════
// FUSED PERCEPTION PIPELINE - Graph Fusion Layer
// IBM Technology Integration: Reduce Round Trips for Real-Time Vision
// ═══════════════════════════════════════════════════════════════════════════════
//
// BEFORE: Capture Image -> Upload -> Analyze -> Download -> Speak (4 Trips)
// AFTER:  Capture + Analyze (Local Fuse) -> Speak (1 Trip)
//
// This enables "Real-Time Vision" (30 FPS) by removing network lag
// ═══════════════════════════════════════════════════════════════════════════════

import { InferenceOptimizer, HardwareCapabilities } from './InferenceOptimizer';
import { processLocalQuery } from '@/core/ssm/StateSpaceEngine';

// ═══ TYPES ═══

export interface PerceptionInput {
  type: 'image' | 'video_frame' | 'audio' | 'text' | 'sensor';
  data: Blob | ArrayBuffer | string | Float32Array;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface FusedPerceptionResult {
  /** Primary perception output */
  perception: {
    objects: string[];
    text: string | null;
    sentiment: number;
    scene: string;
    confidence: number;
  };
  /** Processing route used */
  route: 'fused_local' | 'fused_hybrid' | 'sequential_cloud';
  /** Total latency */
  latencyMs: number;
  /** Frames per second (for video) */
  fps: number;
  /** Network trips saved */
  tripsSaved: number;
  /** Ready for TTS output */
  spokenResponse?: string;
}

export interface PipelineConfig {
  /** Enable local object detection */
  localObjectDetection: boolean;
  /** Enable local OCR */
  localOCR: boolean;
  /** Enable local sentiment */
  localSentiment: boolean;
  /** Max frame rate */
  maxFPS: number;
  /** Skip cloud for confidence > threshold */
  localConfidenceThreshold: number;
}

// ═══ DEFAULT CONFIG ═══

const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  localObjectDetection: true,
  localOCR: true,
  localSentiment: true,
  maxFPS: 30,
  localConfidenceThreshold: 0.8,
};

// ═══ FUSED PERCEPTION PIPELINE ═══

class FusedPerceptionPipelineClass {
  private static instance: FusedPerceptionPipelineClass;
  private config: PipelineConfig;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private currentFPS: number = 0;
  private capabilities: HardwareCapabilities | null = null;
  
  // Local model caches (simulated - would use TensorFlow.js in production)
  private objectCache: Map<string, string[]> = new Map();
  private sceneCache: Map<string, string> = new Map();
  
  private constructor() {
    this.config = DEFAULT_PIPELINE_CONFIG;
  }
  
  static getInstance(): FusedPerceptionPipelineClass {
    if (!FusedPerceptionPipelineClass.instance) {
      FusedPerceptionPipelineClass.instance = new FusedPerceptionPipelineClass();
    }
    return FusedPerceptionPipelineClass.instance;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  async initialize(config?: Partial<PipelineConfig>): Promise<void> {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
    this.capabilities = await InferenceOptimizer.detectHardware();
    
    // Adjust config based on hardware
    if (!this.capabilities.hasWebGPU) {
      this.config.maxFPS = 15; // Reduce FPS for CPU-only
      this.config.localObjectDetection = false; // Too slow without GPU
    }
    
    if (this.capabilities.batteryLevel < 0.2 && !this.capabilities.isCharging) {
      this.config.maxFPS = 10; // Battery saver mode
    }
    
    console.log('[FusedPipeline] ✅ Initialized with config:', this.config);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // FUSED PERCEPTION (Main Entry Point)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Process perception input with graph fusion
   * Combines Capture + Analyze into single fused operation
   */
  async processPerception(input: PerceptionInput): Promise<FusedPerceptionResult> {
    const startTime = performance.now();
    
    // Frame rate limiting
    const timeSinceLastFrame = startTime - this.lastFrameTime;
    const minFrameInterval = 1000 / this.config.maxFPS;
    
    if (timeSinceLastFrame < minFrameInterval && input.type === 'video_frame') {
      // Skip frame to maintain target FPS
      return this.createSkippedResult();
    }
    
    this.lastFrameTime = startTime;
    this.frameCount++;
    
    // Determine fusion strategy
    const strategy = this.determineFusionStrategy(input);
    
    let result: FusedPerceptionResult;
    
    switch (strategy) {
      case 'fused_local':
        result = await this.executeFusedLocal(input);
        break;
      case 'fused_hybrid':
        result = await this.executeFusedHybrid(input);
        break;
      default:
        result = await this.executeSequentialCloud(input);
    }
    
    // Calculate FPS
    if (this.frameCount % 30 === 0) {
      this.currentFPS = 30000 / (startTime - (this.lastFrameTime - timeSinceLastFrame * 30));
    }
    
    result.latencyMs = performance.now() - startTime;
    result.fps = this.currentFPS;
    
    return result;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // FUSION STRATEGY SELECTION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  private determineFusionStrategy(
    input: PerceptionInput
  ): 'fused_local' | 'fused_hybrid' | 'sequential_cloud' {
    if (!this.capabilities) {
      return 'sequential_cloud';
    }
    
    // Text input: Always local
    if (input.type === 'text') {
      return 'fused_local';
    }
    
    // Offline: Must be local
    if (this.capabilities.connectionType === 'offline') {
      return 'fused_local';
    }
    
    // Video frames: Fused local for speed (30 FPS requirement)
    if (input.type === 'video_frame') {
      return this.capabilities.hasWebGPU ? 'fused_local' : 'fused_hybrid';
    }
    
    // Image: Hybrid for better quality
    if (input.type === 'image') {
      return this.capabilities.gpuTier === 'flagship' ? 'fused_local' : 'fused_hybrid';
    }
    
    // Audio: Depends on device
    if (input.type === 'audio') {
      return this.capabilities.hasNPU ? 'fused_local' : 'fused_hybrid';
    }
    
    // Default: Hybrid
    return 'fused_hybrid';
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // FUSED LOCAL EXECUTION (Zero Network)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  private async executeFusedLocal(input: PerceptionInput): Promise<FusedPerceptionResult> {
    // FUSED OPERATION: All processing happens in parallel, locally
    const [objectsResult, textResult, sentimentResult, sceneResult] = await Promise.all([
      this.detectObjectsLocal(input),
      this.extractTextLocal(input),
      this.analyzeSentimentLocal(input),
      this.classifySceneLocal(input),
    ]);
    
    const confidence = (
      objectsResult.confidence + 
      sceneResult.confidence + 
      sentimentResult.confidence
    ) / 3;
    
    return {
      perception: {
        objects: objectsResult.objects,
        text: textResult.text,
        sentiment: sentimentResult.score,
        scene: sceneResult.scene,
        confidence,
      },
      route: 'fused_local',
      latencyMs: 0, // Will be set by caller
      fps: this.currentFPS,
      tripsSaved: 3, // Saved: Upload + Analyze + Download
      spokenResponse: this.generateSpokenResponse(objectsResult.objects, sceneResult.scene),
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // FUSED HYBRID EXECUTION (Local Pre-process + Cloud Enhancement)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  private async executeFusedHybrid(input: PerceptionInput): Promise<FusedPerceptionResult> {
    // Step 1: Local pre-processing (fused)
    const [localObjects, localScene, localSentiment] = await Promise.all([
      this.detectObjectsLocal(input),
      this.classifySceneLocal(input),
      this.analyzeSentimentLocal(input),
    ]);
    
    // Step 2: Check if local is sufficient
    const localConfidence = (localObjects.confidence + localScene.confidence) / 2;
    
    if (localConfidence >= this.config.localConfidenceThreshold) {
      // Local is good enough, skip cloud
      return {
        perception: {
          objects: localObjects.objects,
          text: null,
          sentiment: localSentiment.score,
          scene: localScene.scene,
          confidence: localConfidence,
        },
        route: 'fused_hybrid',
        latencyMs: 0,
        fps: this.currentFPS,
        tripsSaved: 2, // Saved: Full cloud analysis
        spokenResponse: this.generateSpokenResponse(localObjects.objects, localScene.scene),
      };
    }
    
    // Step 3: Enhance with cloud (only send minimal data)
    // In production, this would call zoe-perception edge function
    const cloudEnhancement = await this.requestCloudEnhancement({
      objects: localObjects.objects,
      scene: localScene.scene,
      inputType: input.type,
    });
    
    return {
      perception: {
        objects: cloudEnhancement.objects || localObjects.objects,
        text: cloudEnhancement.text,
        sentiment: localSentiment.score,
        scene: cloudEnhancement.scene || localScene.scene,
        confidence: cloudEnhancement.confidence || localConfidence,
      },
      route: 'fused_hybrid',
      latencyMs: 0,
      fps: this.currentFPS,
      tripsSaved: 1, // Saved: Full image upload (only sent metadata)
      spokenResponse: this.generateSpokenResponse(
        cloudEnhancement.objects || localObjects.objects,
        cloudEnhancement.scene || localScene.scene
      ),
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SEQUENTIAL CLOUD (Fallback)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  private async executeSequentialCloud(input: PerceptionInput): Promise<FusedPerceptionResult> {
    // Traditional: Upload -> Analyze -> Download (no fusion)
    // This is the slow path we're trying to avoid
    
    console.log('[FusedPipeline] ⚠️ Falling back to sequential cloud processing');
    
    // Simulate cloud processing
    const result = await this.requestFullCloudAnalysis(input);
    
    return {
      perception: result,
      route: 'sequential_cloud',
      latencyMs: 0,
      fps: this.currentFPS,
      tripsSaved: 0,
      spokenResponse: this.generateSpokenResponse(result.objects, result.scene),
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // LOCAL PROCESSING FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  private async detectObjectsLocal(input: PerceptionInput): Promise<{
    objects: string[];
    confidence: number;
  }> {
    // Simulated local object detection
    // In production, would use TensorFlow.js with MobileNet/YOLO
    
    if (!this.config.localObjectDetection) {
      return { objects: [], confidence: 0 };
    }
    
    // Check cache first
    const cacheKey = this.getInputHash(input);
    const cached = this.objectCache.get(cacheKey);
    if (cached) {
      return { objects: cached, confidence: 0.9 };
    }
    
    // Simulated detection (would be actual ML inference)
    await new Promise(resolve => setTimeout(resolve, 5)); // Simulate processing
    
    const objects = ['person', 'background']; // Placeholder
    this.objectCache.set(cacheKey, objects);
    
    return { objects, confidence: 0.75 };
  }
  
  private async extractTextLocal(input: PerceptionInput): Promise<{
    text: string | null;
    confidence: number;
  }> {
    if (!this.config.localOCR || input.type !== 'image') {
      return { text: null, confidence: 0 };
    }
    
    // Simulated OCR (would use Tesseract.js)
    await new Promise(resolve => setTimeout(resolve, 10));
    
    return { text: null, confidence: 0.5 }; // No text detected
  }
  
  private async analyzeSentimentLocal(input: PerceptionInput): Promise<{
    score: number;
    confidence: number;
  }> {
    if (!this.config.localSentiment) {
      return { score: 0.5, confidence: 0 };
    }
    
    if (input.type === 'text' && typeof input.data === 'string') {
      const result = await processLocalQuery(input.data);
      return { score: result.sentiment, confidence: 0.85 };
    }
    
    // For images/video, use simple heuristics
    return { score: 0.5, confidence: 0.6 }; // Neutral
  }
  
  private async classifySceneLocal(input: PerceptionInput): Promise<{
    scene: string;
    confidence: number;
  }> {
    // Check cache
    const cacheKey = this.getInputHash(input);
    const cached = this.sceneCache.get(cacheKey);
    if (cached) {
      return { scene: cached, confidence: 0.85 };
    }
    
    // Simulated scene classification
    await new Promise(resolve => setTimeout(resolve, 3));
    
    const scene = 'indoor'; // Placeholder
    this.sceneCache.set(cacheKey, scene);
    
    return { scene, confidence: 0.7 };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // CLOUD INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  private async requestCloudEnhancement(localData: {
    objects: string[];
    scene: string;
    inputType: string;
  }): Promise<{
    objects?: string[];
    text?: string;
    scene?: string;
    confidence?: number;
  }> {
    // In production, this would call the edge function with minimal data
    // The key insight: We DON'T upload the full image, just our local analysis
    // Cloud enhances/corrects our local understanding
    
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate network
    
    return {
      objects: localData.objects,
      scene: localData.scene,
      confidence: 0.9,
    };
  }
  
  private async requestFullCloudAnalysis(input: PerceptionInput): Promise<{
    objects: string[];
    text: string | null;
    sentiment: number;
    scene: string;
    confidence: number;
  }> {
    // Full cloud analysis (slowest path)
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network
    
    return {
      objects: ['person', 'background'],
      text: null,
      sentiment: 0.5,
      scene: 'indoor',
      confidence: 0.95,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════════
  
  private getInputHash(input: PerceptionInput): string {
    // Simple hash for caching (would use perceptual hash in production)
    return `${input.type}_${input.timestamp}`;
  }
  
  private createSkippedResult(): FusedPerceptionResult {
    return {
      perception: {
        objects: [],
        text: null,
        sentiment: 0.5,
        scene: 'unknown',
        confidence: 0,
      },
      route: 'fused_local',
      latencyMs: 0,
      fps: this.currentFPS,
      tripsSaved: 4,
    };
  }
  
  private generateSpokenResponse(objects: string[], scene: string): string {
    if (objects.length === 0) {
      return `I see a ${scene} scene.`;
    }
    
    if (objects.length === 1) {
      return `I see ${objects[0]} in a ${scene} setting.`;
    }
    
    const objectList = objects.slice(0, -1).join(', ') + ' and ' + objects[objects.length - 1];
    return `I can see ${objectList} in a ${scene} environment.`;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STATUS & METRICS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  getConfig(): PipelineConfig {
    return { ...this.config };
  }
  
  getCurrentFPS(): number {
    return this.currentFPS;
  }
  
  getFrameCount(): number {
    return this.frameCount;
  }
  
  getCacheStats(): { objects: number; scenes: number } {
    return {
      objects: this.objectCache.size,
      scenes: this.sceneCache.size,
    };
  }
  
  clearCaches(): void {
    this.objectCache.clear();
    this.sceneCache.clear();
    console.log('[FusedPipeline] 🧹 Caches cleared');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const FusedPerceptionPipeline = FusedPerceptionPipelineClass.getInstance();

export async function initializeFusedPipeline(config?: Partial<PipelineConfig>): Promise<void> {
  return FusedPerceptionPipeline.initialize(config);
}

export async function processPerception(input: PerceptionInput): Promise<FusedPerceptionResult> {
  return FusedPerceptionPipeline.processPerception(input);
}

export default FusedPerceptionPipeline;
