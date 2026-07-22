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
  width: z.number().min(256).max(2048).optional(),
  height: z.number().min(256).max(2048).optional(),
  provider: z.enum(['auto', 'pollinations', 'gemini']).optional(),
});

/**
 * Try Pollinations API first (free, no API key needed)
 */
async function tryPollinations(prompt: string, width = 1024, height = 1024): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&model=flux&nologo=true&enhance=true`;

    console.log('[generate-image] Trying Pollinations...');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'image/*' },
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      console.warn(`[generate-image] Pollinations returned ${resp.status}`);
      return null;
    }

    const buf = await resp.arrayBuffer();
    if (buf.byteLength < 1000) {
      console.warn('[generate-image] Pollinations returned suspiciously small image');
      return null;
    }

    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    const ct = resp.headers.get('content-type') || 'image/jpeg';
    console.log(`[generate-image] ✅ Pollinations success (${(buf.byteLength / 1024).toFixed(1)}KB)`);
    return `data:${ct};base64,${b64}`;
  } catch (e) {
    console.warn('[generate-image] Pollinations failed:', e);
    return null;
  }
}

// Lovable Gateway removed — Pollinations is the sole provider (free, unlimited).


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const parsed = promptSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prompt, width, height } = parsed.data;

    let imageUrl: string | null = null;
    let usedProvider = 'unknown';
    const attempts: Array<{ provider: string; ok: boolean; reason?: string }> = [];

    // Sovereign image gen — Pollinations only (free, no Lovable credits).
    imageUrl = await tryPollinations(prompt, width || 1024, height || 1024);
    if (imageUrl) {
      usedProvider = 'pollinations';
      attempts.push({ provider: 'pollinations', ok: true });
    } else {
      attempts.push({ provider: 'pollinations', ok: false, reason: 'unreachable' });
    }


    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'All image providers failed', fallback: true, attempts }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ imageUrl, provider: usedProvider, attempts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[generate-image] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
