// ═══════════════════════════════════════════════════════════════════════════════
// ZOE DHF INFERENCE OPTIMIZATION STACK
// IBM Technology Integration: AI Inference Cost Reduction
// ═══════════════════════════════════════════════════════════════════════════════
//
// THREE LAYERS:
// 1. HARDWARE LAYER - Edge AI Protocol (InferenceOptimizer)
// 2. SOFTWARE LAYER - Model Compression (InferenceOptimizer compression config)
// 3. MIDDLEWARE LAYER - Graph Fusion (FusedPerceptionPipeline)
//
// ═══════════════════════════════════════════════════════════════════════════════

// Hardware Layer + Software Layer (Combined)
export {
  InferenceOptimizer,
  initializeInferenceOptimizer,
  decideBrain,
  executeOptimizedInference,
  getInferenceMetrics,
  getCostSavings,
  type HardwareCapabilities,
  type InferenceDecision,
  type CompressionConfig,
  type InferenceMetrics,
  type FusedPipelineResult,
} from './InferenceOptimizer';

// Middleware Layer - Graph Fusion
export {
  FusedPerceptionPipeline,
  initializeFusedPipeline,
  processPerception,
  type PerceptionInput,
  type FusedPerceptionResult,
  type PipelineConfig,
} from './FusedPerceptionPipeline';
