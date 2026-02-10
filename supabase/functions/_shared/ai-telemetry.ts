/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE UNIFIED AI TELEMETRY & GOVERNANCE MODULE v2.0
 * Observability, Cost Governance, and Architecture Coherence
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TelemetryEvent {
  requestId: string;
  userId: string | null;
  functionName: string;
  operationType: string;
  model: string;
  thinkingLevel: 'low' | 'medium' | 'high';
  latencyMs: number;
  targetLatencyMs: number;
  slaMet: boolean;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCost: number;
  cacheHit: boolean;
  success: boolean;
  errorCode?: string;
  metadata?: Record<string, any>;
}

export interface CostEstimate {
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  costUnits: number;
}

export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxTokensPerDay: number;
  currentRequestCount: number;
  currentTokenCount: number;
}

export interface AIGatewayResponse {
  success: boolean;
  data?: any;
  error?: {
    code: 'RATE_LIMITED' | 'CREDITS_EXHAUSTED' | 'SERVICE_UNAVAILABLE' | 'INTERNAL_ERROR';
    message: string;
    retryAfter?: number;
  };
  telemetry: {
    latencyMs: number;
    model: string;
    estimatedCost: number;
    slaMet: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COST GOVERNANCE - MODEL PRICING (per 1M tokens)
// ═══════════════════════════════════════════════════════════════════════════════

const MODEL_PRICING: Record<string, { input: number; output: number; latencyTarget: number }> = {
  'google/gemini-2.5-flash': { input: 0.075, output: 0.30, latencyTarget: 500 },
  'google/gemini-2.5-flash-lite': { input: 0.0375, output: 0.15, latencyTarget: 300 },
  'google/gemini-2.5-pro': { input: 1.25, output: 5.00, latencyTarget: 2000 },
  'google/gemini-3-pro-preview': { input: 2.50, output: 10.00, latencyTarget: 3000 },
  'google/gemini-2.5-flash-image-preview': { input: 0.075, output: 0.30, latencyTarget: 3000 },
  'google/gemini-3-pro-image-preview': { input: 2.50, output: 10.00, latencyTarget: 5000 },
  'openai/gpt-5': { input: 5.00, output: 15.00, latencyTarget: 3000 },
  'openai/gpt-5-mini': { input: 0.15, output: 0.60, latencyTarget: 1000 },
  'openai/gpt-5-nano': { input: 0.075, output: 0.30, latencyTarget: 500 },
};

const THINKING_LEVEL_COST_MULTIPLIER: Record<string, number> = {
  'low': 1,
  'medium': 2,
  'high': 5,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

let _supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (!_supabaseClient) {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (url && key) {
      _supabaseClient = createClient(url, key, { auth: { persistSession: false } });
    }
  }
  return _supabaseClient;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COST ESTIMATION
// ═══════════════════════════════════════════════════════════════════════════════

export function estimateCost(model: string, inputTokens: number, outputTokens: number): CostEstimate {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['google/gemini-2.5-flash'];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const totalCost = inputCost + outputCost;
  
  // Convert to internal cost units (1 unit = $0.001)
  const costUnits = Math.ceil(totalCost * 1000);
  
  return {
    model,
    inputTokens,
    outputTokens,
    estimatedCostUsd: totalCost,
    costUnits,
  };
}

export function getLatencyTarget(model: string): number {
  return MODEL_PRICING[model]?.latencyTarget || 1000;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TELEMETRY LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

export async function logTelemetry(event: TelemetryEvent): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('[Telemetry] Supabase client not available');
      return;
    }
    
    // Log to latency_benchmarks table
    await supabase.from('latency_benchmarks').insert({
      user_id: event.userId || '00000000-0000-0000-0000-000000000000',
      operation_type: `${event.functionName}:${event.operationType}`,
      thinking_level: event.thinkingLevel,
      measured_latency_ms: Math.round(event.latencyMs),
      target_latency_ms: event.targetLatencyMs,
      sla_met: event.slaMet,
      cache_hit: event.cacheHit,
      optimization_applied: [
        event.model,
        `cost_units:${Math.round(event.estimatedCost * 1000)}`,
        `tokens:${(event.inputTokens || 0) + (event.outputTokens || 0)}`,
        event.success ? 'success' : `error:${event.errorCode}`,
      ],
    });
    
    console.log(`[Telemetry] ${event.functionName}:${event.operationType} | ${event.latencyMs}ms | SLA:${event.slaMet} | Cost:$${event.estimatedCost.toFixed(6)}`);
  } catch (e) {
    console.warn('[Telemetry] Failed to log:', e);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED AI GATEWAY WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

export interface AIGatewayOptions {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  tools?: any[];
  toolChoice?: string | object;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  modalities?: string[];
}

export async function callAIGateway(
  functionName: string,
  operationType: string,
  userId: string | null,
  options: AIGatewayOptions
): Promise<AIGatewayResponse> {
  const startTime = performance.now();
  const requestId = crypto.randomUUID();
  const model = options.model || 'google/gemini-2.5-flash';
  const latencyTarget = getLatencyTarget(model);
  
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return {
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'LOVABLE_API_KEY not configured' },
      telemetry: { latencyMs: 0, model, estimatedCost: 0, slaMet: false },
    };
  }
  
  try {
    const payload: Record<string, any> = {
      model,
      messages: options.messages,
    };
    
    if (options.tools) payload.tools = options.tools;
    if (options.toolChoice) payload.tool_choice = options.toolChoice;
    if (options.stream !== undefined) payload.stream = options.stream;
    if (options.temperature !== undefined) payload.temperature = options.temperature;
    if (options.maxTokens !== undefined) payload.max_tokens = options.maxTokens;
    if (options.modalities) payload.modalities = options.modalities;
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const latencyMs = performance.now() - startTime;
    const slaMet = latencyMs <= latencyTarget;
    
    // Handle rate limiting
    if (response.status === 429) {
      console.warn(`[AIGateway] Rate limited: ${functionName}:${operationType}`);
      await logTelemetry({
        requestId, userId, functionName, operationType, model,
        thinkingLevel: 'medium', latencyMs, targetLatencyMs: latencyTarget,
        slaMet: false, estimatedCost: 0, cacheHit: false, success: false,
        errorCode: 'RATE_LIMITED',
      });
      
      return {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'AI service is busy. Please try again shortly.', retryAfter: 5 },
        telemetry: { latencyMs, model, estimatedCost: 0, slaMet: false },
      };
    }
    
    // Handle credits exhausted
    if (response.status === 402) {
      console.warn(`[AIGateway] Credits exhausted: ${functionName}:${operationType}`);
      await logTelemetry({
        requestId, userId, functionName, operationType, model,
        thinkingLevel: 'medium', latencyMs, targetLatencyMs: latencyTarget,
        slaMet: false, estimatedCost: 0, cacheHit: false, success: false,
        errorCode: 'CREDITS_EXHAUSTED',
      });
      
      return {
        success: false,
        error: { code: 'CREDITS_EXHAUSTED', message: 'AI credits depleted. Please add credits to continue.' },
        telemetry: { latencyMs, model, estimatedCost: 0, slaMet: false },
      };
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AIGateway] Error ${response.status}: ${errorText}`);
      await logTelemetry({
        requestId, userId, functionName, operationType, model,
        thinkingLevel: 'medium', latencyMs, targetLatencyMs: latencyTarget,
        slaMet: false, estimatedCost: 0, cacheHit: false, success: false,
        errorCode: `HTTP_${response.status}`,
      });
      
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: `AI service error: ${response.status}` },
        telemetry: { latencyMs, model, estimatedCost: 0, slaMet: false },
      };
    }
    
    // Handle streaming response
    if (options.stream) {
      return {
        success: true,
        data: response.body,
        telemetry: { latencyMs, model, estimatedCost: 0.001, slaMet },
      };
    }
    
    const data = await response.json();
    
    // Calculate cost from usage if available
    const usage = data.usage || { prompt_tokens: 500, completion_tokens: 200 };
    const costEstimate = estimateCost(model, usage.prompt_tokens, usage.completion_tokens);
    
    // Log successful telemetry
    await logTelemetry({
      requestId, userId, functionName, operationType, model,
      thinkingLevel: model.includes('flash-lite') ? 'low' : model.includes('flash') ? 'medium' : 'high',
      latencyMs, targetLatencyMs: latencyTarget, slaMet,
      inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens,
      estimatedCost: costEstimate.estimatedCostUsd, cacheHit: false, success: true,
    });
    
    console.log(`[AIGateway] ✓ ${functionName}:${operationType} | ${Math.round(latencyMs)}ms | $${costEstimate.estimatedCostUsd.toFixed(6)}`);
    
    return {
      success: true,
      data,
      telemetry: { latencyMs, model, estimatedCost: costEstimate.estimatedCostUsd, slaMet },
    };
    
  } catch (error) {
    const latencyMs = performance.now() - startTime;
    console.error(`[AIGateway] Exception in ${functionName}:`, error);
    
    await logTelemetry({
      requestId, userId, functionName, operationType, model,
      thinkingLevel: 'medium', latencyMs, targetLatencyMs: latencyTarget,
      slaMet: false, estimatedCost: 0, cacheHit: false, success: false,
      errorCode: 'EXCEPTION',
    });
    
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
      telemetry: { latencyMs, model, estimatedCost: 0, slaMet: false },
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORS HEADERS HELPER
// ═══════════════════════════════════════════════════════════════════════════════

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR RESPONSE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function createErrorResponse(error: AIGatewayResponse['error'], status: number = 500): Response {
  if (!error) {
    return new Response(
      JSON.stringify({ error: 'Unknown error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  const headers: Record<string, string> = { ...corsHeaders, 'Content-Type': 'application/json' };
  if (error.retryAfter) {
    headers['Retry-After'] = String(error.retryAfter);
  }
  
  const statusMap: Record<string, number> = {
    'RATE_LIMITED': 429,
    'CREDITS_EXHAUSTED': 402,
    'SERVICE_UNAVAILABLE': 503,
    'INTERNAL_ERROR': 500,
  };
  
  return new Response(
    JSON.stringify({ error: error.message, code: error.code, retryAfter: error.retryAfter }),
    { status: statusMap[error.code] || status, headers }
  );
}

export function createSuccessResponse(data: any, additionalFields?: Record<string, any>): Response {
  return new Response(
    JSON.stringify({ success: true, ...data, ...additionalFields }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL SELECTION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export type ThinkingLevel = 'low' | 'medium' | 'high';

export function selectModel(thinkingLevel: ThinkingLevel, preferFast: boolean = false): string {
  if (thinkingLevel === 'low') {
    return preferFast ? 'google/gemini-2.5-flash-lite' : 'google/gemini-2.5-flash';
  }
  if (thinkingLevel === 'medium') {
    return 'google/gemini-2.5-flash';
  }
  // high
  return preferFast ? 'google/gemini-2.5-pro' : 'google/gemini-3-pro-preview';
}

export function getThinkingLevelFromIntent(intent: string): ThinkingLevel {
  const lowIntents = ['greeting', 'acknowledgment', 'status_check', 'quick_search', 'general_chat'];
  const highIntents = ['bug_fix', 'compliance_audit', 'strategic_planning', 'security_analysis', 'complex_reasoning', 'diagnostic'];
  
  if (lowIntents.includes(intent)) return 'low';
  if (highIntents.includes(intent)) return 'high';
  return 'medium';
}
