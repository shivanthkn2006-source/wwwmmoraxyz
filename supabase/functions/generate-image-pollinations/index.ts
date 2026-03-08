import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const promptSchema = z.object({
  prompt: z.string()
    .min(1, { message: 'Prompt is required' })
    .max(1000, { message: 'Prompt must be less than 1000 characters' })
    .trim(),
  width: z.number().min(256).max(2048).optional().default(1024),
  height: z.number().min(256).max(2048).optional().default(1024),
  model: z.string().optional().default('flux'),
  seed: z.number().optional(),
  nologo: z.boolean().optional().default(true),
  enhance: z.boolean().optional().default(true),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { prompt, width, height, model, seed, nologo, enhance } = promptSchema.parse(body);

    console.log('[Pollinations] Generating image for prompt:', prompt);

    // Build Pollinations URL - completely free, no API key needed
    const params = new URLSearchParams({
      width: width.toString(),
      height: height.toString(),
      model,
      nologo: nologo.toString(),
      enhance: enhance.toString(),
    });

    if (seed !== undefined) {
      params.set('seed', seed.toString());
    }

    const encodedPrompt = encodeURIComponent(prompt);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;

    // Pollinations returns the image directly - we need to fetch it and convert to base64
    const response = await fetch(pollinationsUrl, {
      method: 'GET',
      headers: { 'Accept': 'image/*' },
    });

    if (!response.ok) {
      console.error('[Pollinations] API error:', response.status);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'RATE_LIMIT', message: 'Too many requests. Please wait a moment and try again.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Pollinations API error: ${response.status}`);
    }

    // Convert image to base64 data URL
    const imageBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const imageUrl = `data:${contentType};base64,${base64}`;

    console.log('[Pollinations] Image generated successfully');

    return new Response(
      JSON.stringify({ 
        imageUrl,
        engine: 'pollinations',
        model,
        free: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Pollinations] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
