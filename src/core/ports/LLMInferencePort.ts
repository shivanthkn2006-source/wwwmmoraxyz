// ═══════════════════════════════════════════════════════════════════════════════
// ZOE HEXAGONAL ARCHITECTURE - LLM INFERENCE PORT
// Domain Layer: Defines contract for all LLM providers
// ═══════════════════════════════════════════════════════════════════════════════

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMInferenceRequest {
  messages: LLMMessage[];
  tools?: LLMTool[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  temperature?: number;
  maxTokens?: number;
  thinkingLevel?: 'low' | 'medium' | 'high';
}

export interface LLMToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMInferenceResponse {
  success: boolean;
  content: string;
  toolCalls?: LLMToolCall[];
  model: string;
  latencyMs: number;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  metadata?: Record<string, unknown>;
}

export interface LLMAdapterConfig {
  name: string;
  version: string;
  primaryModel: string;
  fallbackModels: string[];
  latencyTargetMs: number;
  costMultiplier: number;
}

/**
 * LLM Inference Port - Interface for all LLM adapters
 * 
 * This port defines the contract that any LLM adapter must implement.
 * The Hexagonal Architecture ensures the core business logic (ECN, DHF, CEPS)
 * remains completely decoupled from specific AI providers.
 */
export interface LLMInferencePort {
  readonly config: LLMAdapterConfig;
  
  /**
   * Execute an inference request
   */
  infer(request: LLMInferenceRequest): Promise<LLMInferenceResponse>;
  
  /**
   * Check adapter health status
   */
  healthCheck(): Promise<{ healthy: boolean; latencyMs: number; error?: string }>;
  
  /**
   * Get adapter capabilities
   */
  getCapabilities(): {
    streaming: boolean;
    toolCalling: boolean;
    vision: boolean;
    maxContextLength: number;
  };
}

/**
 * Factory function type for creating adapters
 */
export type LLMAdapterFactory = (config?: Partial<LLMAdapterConfig>) => LLMInferencePort;
