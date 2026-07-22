// ═══════════════════════════════════════════════════════════════════════════════
// ZOE INFINITY IMAGE GENERATION - Pollinations Primary, Gemini Fallback
// ═══════════════════════════════════════════════════════════════════════════════

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function uint8ToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

async function responseToDataUrl(resp: Response): Promise<string | null> {
  const buf = await resp.arrayBuffer();
  if (buf.byteLength < 1000) {
    return null;
  }

  const ct = resp.headers.get('content-type') || 'image/jpeg';
  const b64 = uint8ToBase64(new Uint8Array(buf));
  return `data:${ct};base64,${b64}`;
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, { headers: { 'Accept': 'image/*' } });
    if (!resp.ok) {
      console.warn(`[zoe-image-gen] Remote image fetch returned ${resp.status}`);
      return null;
    }

    return await responseToDataUrl(resp);
  } catch (error) {
    console.warn('[zoe-image-gen] Remote image fetch failed:', error);
    return null;
  }
}

/**
 * Try Pollinations API first (free, no API key needed)
 */
async function tryPollinations(prompt: string, width = 1024, height = 1024): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&model=flux&nologo=true&enhance=true`;

    console.log('[zoe-image-gen] Trying Pollinations...');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'image/*' },
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      console.warn(`[zoe-image-gen] Pollinations returned ${resp.status}`);
      return null;
    }

    const dataUrl = await responseToDataUrl(resp);
    if (!dataUrl) {
      console.warn('[zoe-image-gen] Pollinations returned suspiciously small image');
      return null;
    }

    const contentLength = Number(resp.headers.get('content-length') || 0);
    console.log(`[zoe-image-gen] ✅ Pollinations success (${contentLength > 0 ? (contentLength / 1024).toFixed(1) : 'unknown'}KB)`);
    return dataUrl;
  } catch (e) {
    console.warn('[zoe-image-gen] Pollinations failed:', e);
    return null;
  }
}

/**
 * Fallback: Lovable AI Gateway (Gemini)
 */
async function tryGemini(prompt: string, apiKey: string): Promise<string | null> {
  try {
    console.log('[zoe-image-gen] Trying Gemini fallback...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-image',
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[zoe-image-gen] Gemini error [${response.status}]: ${errText}`);
      if (response.status === 429) throw { status: 429 };
      if (response.status === 402) throw { status: 402 };
      return null;
    }

    const data = await response.json();
    const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) return null;

    if (imageUrl.startsWith('data:image/')) {
      console.log('[zoe-image-gen] ✅ Gemini fallback success');
      return imageUrl;
    }

    if (/^https?:\/\//i.test(imageUrl)) {
      const dataUrl = await fetchImageAsDataUrl(imageUrl);
      if (dataUrl) {
        console.log('[zoe-image-gen] ✅ Gemini fallback success');
        return dataUrl;
      }
    }

    console.warn('[zoe-image-gen] Gemini returned unsupported image payload');
    return null;
  } catch (e: any) {
    if (e.status) throw e;
    console.error('[zoe-image-gen] Gemini failed:', e);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  console.log('[zoe-image-gen] ═══ IMAGE GENERATION REQUEST ═══');

  try {
    const { prompt, style } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'No prompt provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[zoe-image-gen] Prompt: "${prompt.substring(0, 100)}..." | Style: ${style || 'default'}`);

    // Build enhanced prompt with style guidance
    let enhancedPrompt = prompt;
    if (style) {
      const styleMap: Record<string, string> = {
        'realistic': 'Create a photorealistic image: ',
        'artistic': 'Create a beautiful artistic painting: ',
        'digital': 'Create a high-quality digital art illustration: ',
        'anime': 'Create in anime/manga art style: ',
        'watercolor': 'Create a watercolor painting: ',
        'oil': 'Create an oil painting with rich textures: ',
        'sketch': 'Create a detailed pencil sketch: ',
        'fantasy': 'Create a fantasy art illustration with magical elements: ',
        'spiritual': 'Create a spiritual, divine, ethereal artwork: ',
        'minimalist': 'Create a clean, modern minimalist illustration: ',
      };
      const prefix = styleMap[style.toLowerCase()] || '';
      enhancedPrompt = prefix + prompt;
    }

    let imageUrl: string | null = null;
    let usedProvider = 'unknown';

    // Sovereign image gen — Pollinations only (Lovable Gateway removed).
    imageUrl = await tryPollinations(enhancedPrompt);
    if (imageUrl) usedProvider = 'pollinations';



    const latencyMs = Math.round(performance.now() - startTime);

    if (!imageUrl) {
      return new Response(JSON.stringify({
        success: false, error: 'All image providers failed',
      }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[zoe-image-gen] ✅ Generated in ${latencyMs}ms via ${usedProvider}`);

    return new Response(JSON.stringify({
      success: true,
      imageUrl,
      caption: `Generated: ${prompt.substring(0, 100)}`,
      latencyMs,
      provider: usedProvider,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[zoe-image-gen] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Image generation failed',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
