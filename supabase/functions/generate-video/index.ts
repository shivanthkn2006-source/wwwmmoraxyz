import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, model = 'seedance', duration = 6 } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'A prompt string is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const POLLINATIONS_KEY = Deno.env.get('POLLINATIONS_API_KEY');
    const LOVABLE_KEY = Deno.env.get('LOVABLE_API_KEY');

    console.log('[GenerateVideo] Prompt:', prompt.slice(0, 80), '| model:', model);

    // ── 1. Try Pollinations with API key ──────────────────────────
    if (POLLINATIONS_KEY) {
      for (const m of [model, model === 'seedance' ? 'veo' : 'seedance']) {
        try {
          const encoded = encodeURIComponent(prompt.trim());
          const url = `https://gen.pollinations.ai/video/${encoded}?model=${m}&duration=${duration}&nologo=true`;

          console.log(`[GenerateVideo] Trying Pollinations ${m}...`);
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 90_000);

          const resp = await fetch(url, {
            signal: controller.signal,
            headers: {
              'Authorization': `Bearer ${POLLINATIONS_KEY}`,
              'Accept': 'video/*,image/*',
            },
          });
          clearTimeout(timeout);

          if (resp.ok) {
            const ct = resp.headers.get('content-type') || '';
            const buf = await resp.arrayBuffer();

            if (buf.byteLength > 10_000 && ct.includes('video')) {
              const bytes = new Uint8Array(buf);
              let binary = '';
              for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              const b64 = btoa(binary);
              const dataUrl = `data:${ct};base64,${b64}`;

              console.log(`[GenerateVideo] ✅ Pollinations ${m} success (${(buf.byteLength / 1024).toFixed(0)}KB)`);
              return new Response(
                JSON.stringify({ videoUrl: dataUrl, provider: `pollinations-${m}`, success: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            // If it returned an image instead, accept as animated fallback
            if (buf.byteLength > 5_000 && ct.includes('image')) {
              const bytes = new Uint8Array(buf);
              let binary = '';
              for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              const b64 = btoa(binary);
              const dataUrl = `data:${ct};base64,${b64}`;

              console.log(`[GenerateVideo] ⚠️ Pollinations ${m} returned image fallback`);
              return new Response(
                JSON.stringify({ videoUrl: dataUrl, provider: `pollinations-${m}-image`, isImageFallback: true, success: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            console.warn(`[GenerateVideo] Pollinations ${m}: unexpected response (${ct}, ${buf.byteLength}B)`);
          } else {
            const errText = await resp.text();
            console.warn(`[GenerateVideo] Pollinations ${m} HTTP ${resp.status}:`, errText.slice(0, 200));
          }
        } catch (e) {
          console.warn(`[GenerateVideo] Pollinations ${m} failed:`, e);
        }
      }
    }

    // ── 2. Fallback: Generate image via Pollinations image endpoint (no auth needed) ──
    try {
      const encoded = encodeURIComponent(`cinematic ${prompt}, dynamic motion, film still`.trim());
      const imgUrl = `https://image.pollinations.ai/prompt/${encoded}?width=640&height=360&model=flux&nologo=true`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);
      const resp = await fetch(imgUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (resp.ok) {
        const ct = resp.headers.get('content-type') || 'image/jpeg';
        const buf = await resp.arrayBuffer();
        if (buf.byteLength > 2_000) {
          const bytes = new Uint8Array(buf);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const b64 = btoa(binary);
          const dataUrl = `data:${ct};base64,${b64}`;

          console.log('[GenerateVideo] ✅ Image fallback success');
          return new Response(
            JSON.stringify({ videoUrl: dataUrl, provider: 'animated-fallback', isImageFallback: true, success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } catch (e) {
      console.warn('[GenerateVideo] Image fallback failed:', e);
    }

    // ── 3. Last resort: Gemini image generation ──
    if (LOVABLE_KEY) {
      try {
        console.log('[GenerateVideo] Trying Gemini image fallback...');
        const resp = await fetch('https://ai.gateway.lovable.dev/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3.1-flash-image-preview',
            prompt: `cinematic film still: ${prompt}`,
            n: 1,
            size: '640x360',
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const imgB64 = data?.data?.[0]?.b64_json;
          if (imgB64) {
            console.log('[GenerateVideo] ✅ Gemini image fallback success');
            return new Response(
              JSON.stringify({ videoUrl: `data:image/png;base64,${imgB64}`, provider: 'gemini-fallback', isImageFallback: true, success: true }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (e) {
        console.warn('[GenerateVideo] Gemini fallback failed:', e);
      }
    }

    return new Response(
      JSON.stringify({ error: 'All video generation providers failed', success: false }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[GenerateVideo] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
