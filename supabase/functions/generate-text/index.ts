import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { 
  callAIGateway, 
  corsHeaders, 
  createErrorResponse, 
  createSuccessResponse,
  logTelemetry,
  estimateCost,
  getLatencyTarget
} from "../_shared/ai-telemetry.ts";

// Pre-fetch API key at module load for faster cold starts
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const requestSchema = z.object({
  prompt: z.string()
    .min(1, { message: 'Prompt is required' })
    .max(2000, { message: 'Prompt must be less than 2000 characters' })
    .trim(),
  model: z.string().optional().default('google/gemini-2.5-flash'),
  generateImage: z.boolean().optional().default(false),
  userId: z.string().uuid().optional(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  const requestId = crypto.randomUUID();

  try {
    // Validate API key early
    if (!LOVABLE_API_KEY) {
      console.error(`[generate-text:${requestId}] LOVABLE_API_KEY not configured`);
      return createErrorResponse({ code: 'SERVICE_UNAVAILABLE', message: 'AI service not configured' }, 503);
    }

    const body = await req.json();
    const { prompt, model, generateImage, userId } = requestSchema.parse(body);

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    // Determine if this is an image generation request
    const isImageRequest = model === 'google/gemini-2.5-flash-image-preview' || 
                           model === 'google/gemini-3-pro-image-preview' ||
                           generateImage;

    const selectedModel = isImageRequest ? 'google/gemini-3-pro-image-preview' : (model || 'google/gemini-2.5-flash');
    const latencyTarget = getLatencyTarget(selectedModel);

    console.log(`[generate-text:${requestId}] model=${selectedModel}, prompt_length=${prompt.length}`);

    // Use unified AI gateway
    const result = await callAIGateway(
      'generate-text',
      isImageRequest ? 'image_generation' : 'text_generation',
      userId || null,
      {
        model: selectedModel,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: isImageRequest ? undefined : 500,
        temperature: 0.7,
        modalities: isImageRequest ? ['image', 'text'] : undefined,
      }
    );

    if (!result.success) {
      return createErrorResponse(result.error);
    }

    const message = result.data.choices?.[0]?.message;
    const latency = Math.round(result.telemetry.latencyMs);

    console.log(`[generate-text:${requestId}] ✓ ${latency}ms | Cost: $${result.telemetry.estimatedCost.toFixed(6)} | SLA: ${result.telemetry.slaMet}`);

    if (isImageRequest) {
      const images = message?.images || [];
      const text = message?.content || 'Image generated successfully';
      return createSuccessResponse({ 
        text, 
        images, 
        latency, 
        slaMet: result.telemetry.slaMet,
        model: selectedModel,
        estimatedCost: result.telemetry.estimatedCost,
      });
    }

    const text = message?.content || 'No content generated';
    return createSuccessResponse({ 
      text, 
      latency,
      slaMet: result.telemetry.slaMet,
      model: selectedModel,
      estimatedCost: result.telemetry.estimatedCost,
    });

  } catch (error) {
    const latency = Math.round(performance.now() - startTime);
    console.error(`[generate-text:${requestId}] Error after ${latency}ms:`, error);
    
    // Log error telemetry
    await logTelemetry({
      requestId,
      userId: null,
      functionName: 'generate-text',
      operationType: 'text_generation',
      model: 'google/gemini-2.5-flash',
      thinkingLevel: 'medium',
      latencyMs: latency,
      targetLatencyMs: 500,
      slaMet: false,
      estimatedCost: 0,
      cacheHit: false,
      success: false,
      errorCode: error instanceof z.ZodError ? 'VALIDATION_ERROR' : 'EXCEPTION',
    });
    
    const errorMessage = error instanceof z.ZodError
      ? 'Invalid request format'
      : error instanceof Error 
        ? error.message 
        : 'Unknown error';

    return createErrorResponse({ code: 'INTERNAL_ERROR', message: errorMessage });
  }
});
