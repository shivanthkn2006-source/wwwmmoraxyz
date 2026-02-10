// ═══════════════════════════════════════════════════════════════════════════════
// ZOE HEXAGONAL ARCHITECTURE - GEMINI ADAPTER
// Adapter Layer: Implements LLMInferencePort for Google Gemini models
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import type { 
  LLMInferencePort, 
  LLMInferenceRequest, 
  LLMInferenceResponse, 
  LLMAdapterConfig 
} from '../ports/LLMInferencePort';

const DEFAULT_CONFIG: LLMAdapterConfig = {
  name: 'Gemini_Adapter',
  version: '3.0.0',
  primaryModel: 'google/gemini-3-pro-preview',
  fallbackModels: ['google/gemini-2.5-pro', 'google/gemini-2.5-flash'],
  latencyTargetMs: 5000,
  costMultiplier: 5,
};

const THINKING_LEVEL_MODELS: Record<string, { primary: string; latencyTarget: number; cost: number }> = {
  low: { primary: 'google/gemini-2.5-flash', latencyTarget: 500, cost: 1 },
  medium: { primary: 'google/gemini-2.5-flash', latencyTarget: 1000, cost: 2 },
  high: { primary: 'google/gemini-3-pro-preview', latencyTarget: 5000, cost: 5 },
};

export class GeminiAdapter implements LLMInferencePort {
  readonly config: LLMAdapterConfig;
  
  constructor(config?: Partial<LLMAdapterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  async infer(request: LLMInferenceRequest): Promise<LLMInferenceResponse> {
    const startTime = performance.now();
    
    try {
      // Select model based on thinking level
      const thinkingConfig = THINKING_LEVEL_MODELS[request.thinkingLevel || 'medium'];
      const modelToUse = request.thinkingLevel 
        ? thinkingConfig.primary 
        : this.config.primaryModel;
      
      // Call via edge function for secure API key handling
      const { data, error } = await supabase.functions.invoke('zoe-core-executor', {
        body: {
          command: request.messages[request.messages.length - 1]?.content || '',
          userId: (await supabase.auth.getUser()).data.user?.id,
          context: {},
          options: {
            forceThinkingLevel: request.thinkingLevel || 'medium',
          }
        }
      });
      
      const latencyMs = performance.now() - startTime;
      
      if (error) {
        return {
          success: false,
          content: error.message || 'Inference failed',
          model: modelToUse,
          latencyMs,
        };
      }
      
      return {
        success: true,
        content: data?.message || '',
        toolCalls: data?.tool_executions?.map((t: any) => ({
          id: crypto.randomUUID(),
          type: 'function' as const,
          function: {
            name: t.tool,
            arguments: JSON.stringify(t.args || {}),
          }
        })),
        model: data?.metadata?.model || modelToUse,
        latencyMs,
        metadata: {
          thinkingLevel: request.thinkingLevel,
          ecnAnalysis: data?.ecn_analysis,
          thoughtSignature: data?.thought_signature,
        }
      };
    } catch (err) {
      return {
        success: false,
        content: err instanceof Error ? err.message : 'Unknown error',
        model: this.config.primaryModel,
        latencyMs: performance.now() - startTime,
      };
    }
  }
  
  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
    const startTime = performance.now();
    
    try {
      const { error } = await supabase.functions.invoke('zoe-core-executor', {
        body: {
          command: 'health check',
          userId: 'health-check',
          options: { forceThinkingLevel: 'low' }
        }
      });
      
      const latencyMs = performance.now() - startTime;
      
      return {
        healthy: !error,
        latencyMs,
        error: error?.message,
      };
    } catch (err) {
      return {
        healthy: false,
        latencyMs: performance.now() - startTime,
        error: err instanceof Error ? err.message : 'Health check failed',
      };
    }
  }
  
  getCapabilities() {
    return {
      streaming: true,
      toolCalling: true,
      vision: true,
      maxContextLength: 1000000, // 1M tokens for Gemini
    };
  }
}

// Factory function
export const createGeminiAdapter = (config?: Partial<LLMAdapterConfig>): LLMInferencePort => {
  return new GeminiAdapter(config);
};
