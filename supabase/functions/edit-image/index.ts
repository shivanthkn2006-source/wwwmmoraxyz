import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sovereign image editing — Google AI Studio (Gemini) directly, no Lovable Gateway.
// Requires GOOGLE_AI_STUDIO_KEY (already provisioned in project secrets).
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, imageBase64 } = await req.json();

    if (!prompt || prompt.trim().length === 0) throw new Error('Prompt is required');
    if (!imageBase64) throw new Error('Image data is required');

    const GOOGLE_KEY = Deno.env.get('GOOGLE_AI_STUDIO_KEY');
    if (!GOOGLE_KEY) throw new Error('GOOGLE_AI_STUDIO_KEY not configured');

    // Strip data-URI prefix if present; detect mime.
    let mime = 'image/png';
    let b64 = imageBase64;
    const m = /^data:([^;]+);base64,(.+)$/.exec(imageBase64);
    if (m) { mime = m[1]; b64 = m[2]; }

    console.log('[edit-image] Editing via Google AI Studio Gemini image model, prompt:', prompt);

    const model = 'gemini-2.5-flash-image-preview';
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mime, data: b64 } },
            ],
          }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
        }),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('[edit-image] Google AI error:', resp.status, errText);
      if (resp.status === 429) {
        return new Response(
          JSON.stringify({ error: 'RATE_LIMIT', message: 'Rate limit exceeded. Try again shortly.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Google AI error: ${resp.status}`);
    }

    const data = await resp.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p: any) => p?.inline_data?.data);
    if (!imgPart) {
      console.error('[edit-image] No image in response', JSON.stringify(data).slice(0, 500));
      throw new Error('No edited image returned');
    }

    const outMime = imgPart.inline_data.mime_type || 'image/png';
    const imageUrl = `data:${outMime};base64,${imgPart.inline_data.data}`;

    return new Response(
      JSON.stringify({ imageUrl, provider: 'gemini-direct' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[edit-image] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
