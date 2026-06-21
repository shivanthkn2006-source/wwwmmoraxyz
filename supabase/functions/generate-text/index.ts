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

    // For image requests: try Pollinations first, then Gemini fallback
    if (isImageRequest) {
      console.log(`[generate-text:${requestId}] Image request - trying Pollinations first...`);
      
      // 1. Try Pollinations
      try {
        const encoded = encodeURIComponent(prompt);
        const polUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&model=flux&nologo=true&enhance=true`;
        const controller = new AbortController();
        const polTimeout = setTimeout(() => controller.abort(), 20000);
        const polResp = await fetch(polUrl, { signal: controller.signal, headers: { 'Accept': 'image/*' } });
        clearTimeout(polTimeout);
        if (polResp.ok) {
          const buf = await polResp.arrayBuffer();
          if (buf.byteLength > 1000) {
            const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
            const ct = polResp.headers.get('content-type') || 'image/jpeg';
            const imageUrl = `data:${ct};base64,${b64}`;
            const latency = Math.round(performance.now() - startTime);
            console.log(`[generate-text:${requestId}] ✅ Pollinations image (${(buf.byteLength / 1024).toFixed(1)}KB) in ${latency}ms`);
            return createSuccessResponse({
              text: 'Image generated successfully via Pollinations',
              images: [{ type: 'image_url', image_url: { url: imageUrl } }],
              latency,
              slaMet: true,
              model: 'pollinations-flux',
              estimatedCost: 0,
            });
          }
        }
      } catch (e) {
        console.warn(`[generate-text:${requestId}] Pollinations failed:`, e);
      }

      // 2. Fallback to Gemini
      console.log(`[generate-text:${requestId}] Falling back to Gemini for image...`);
    }

    const selectedModel = isImageRequest ? 'google/gemini-3.1-flash-image-preview' : (model || 'google/gemini-2.5-flash');
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
    
    // Return generic error to client - details are logged server-side only
    const errorMessage = error instanceof z.ZodError
      ? 'Invalid request format. Please check your input.'
      : 'An internal error occurred. Please try again later.';

    return createErrorResponse({ code: 'INTERNAL_ERROR', message: errorMessage });
  }
});
