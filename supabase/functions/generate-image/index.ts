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

/**
 * Fallback: Lovable AI Gateway (Gemini)
 */
async function tryGemini(prompt: string, apiKey: string): Promise<string | null> {
  try {
    console.log('[generate-image] Trying Gemini fallback...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-image-preview',
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[generate-image] Gemini error [${response.status}]: ${errText}`);

      if (response.status === 429) throw { status: 429, error: 'RATE_LIMIT' };
      if (response.status === 402) throw { status: 402, error: 'NO_CREDITS' };
      return null;
    }

    const data = await response.json();
    const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (imageUrl) console.log('[generate-image] ✅ Gemini success');
    return imageUrl || null;
  } catch (e: any) {
    if (e.status) throw e; // Re-throw rate limit / credit errors
    console.error('[generate-image] Gemini failed:', e);
    return null;
  }
}

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

    const { prompt, width, height, provider } = parsed.data;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    let imageUrl: string | null = null;
    let usedProvider = 'unknown';
    const attempts: Array<{ provider: string; ok: boolean; reason?: string }> = [];

    // Provider routing — PRIMARY: Gemini 3.1 Flash (Lovable AI Gateway)
    //                   SECONDARY: Pollinations (free, no key required)
    // `provider=pollinations` forces pollinations-only; otherwise cascade Gemini → Pollinations.
    if (provider !== 'pollinations' && LOVABLE_API_KEY) {
      try {
        imageUrl = await tryGemini(prompt, LOVABLE_API_KEY);
        if (imageUrl) {
          usedProvider = 'gemini-3.1-flash';
          attempts.push({ provider: 'gemini-3.1-flash', ok: true });
        } else {
          attempts.push({ provider: 'gemini-3.1-flash', ok: false, reason: 'empty_response' });
        }
      } catch (e: any) {
        attempts.push({ provider: 'gemini-3.1-flash', ok: false, reason: e?.error ?? String(e?.message ?? e) });
        if (e.status === 429) {
          // soft-fail to Pollinations on rate limit instead of bouncing the caller
          console.warn('[generate-image] Gemini rate-limited → falling back to Pollinations');
        } else if (e.status === 402) {
          console.warn('[generate-image] Gemini credits exhausted → falling back to Pollinations');
        }
      }
    }

    if (!imageUrl && provider !== 'gemini') {
      imageUrl = await tryPollinations(prompt, width || 1024, height || 1024);
      if (imageUrl) {
        usedProvider = 'pollinations-fallback';
        attempts.push({ provider: 'pollinations', ok: true });
      } else {
        attempts.push({ provider: 'pollinations', ok: false, reason: 'unreachable' });
      }
    }

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'All image providers failed', fallback: true, attempts }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ imageUrl, provider: usedProvider }),
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
