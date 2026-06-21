import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function callDeepgramWithRetry(text: string, model: string, apiKey: string): Promise<ArrayBuffer> {
  const deepgramUrl = `https://api.deepgram.com/v1/speak?model=${model}&encoding=mp3`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(deepgramUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (response.ok) {
      return response.arrayBuffer();
    }

    const errorText = await response.text();

    if (response.status === 503 && attempt < MAX_RETRIES) {
      console.warn(`[Deepgram TTS] 503 on attempt ${attempt}/${MAX_RETRIES}, retrying in ${RETRY_DELAY_MS * attempt}ms...`);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
      continue;
    }

    throw new Error(`Deepgram API error [${response.status}]: ${errorText}`);
  }

  throw new Error('Deepgram API failed after all retries');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ─── AUTH GATE: prevent uncapped Deepgram billing from public anon key ───
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY');
    if (!DEEPGRAM_API_KEY) {
      throw new Error('DEEPGRAM_API_KEY is not configured');
    }

    const { text: rawText, model = 'aura-2-janus-en' } = await req.json();

    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── COST GUARD: cap text length (Deepgram bills per character) ───
    const MAX_TTS_CHARS = 2000;
    if (rawText.length > MAX_TTS_CHARS) {
      return new Response(JSON.stringify({ error: `Text exceeds ${MAX_TTS_CHARS} char limit` }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── MODEL ALLOWLIST: prevent arbitrary model strings ───
    const ALLOWED_MODELS = new Set(['aura-2-janus-en', 'aura-2-orion-en']);
    const safeModel = ALLOWED_MODELS.has(model) ? model : 'aura-2-janus-en';

    // Sanitize: strip emoji, lone surrogates, and control chars that Deepgram rejects.
    // Deepgram's JSON parser fails on non-BMP / pictographic characters in some cases.
    let text = rawText
      // Remove emoji & pictographs (Extended_Pictographic range)
      .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
      .replace(/[\u{2600}-\u{27BF}]/gu, '')
      // Remove variation selectors & ZWJ
      .replace(/[\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
      // Remove lone surrogates
      .replace(/[\uD800-\uDFFF]/g, '')
      // Strip control chars (keep \n, \t)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim();

    if (text.length === 0) {
      text = '...';
    }

    console.log(`[Deepgram TTS] Synthesizing with model=${safeModel}, text length=${text.length}`);

    const audioBuffer = await callDeepgramWithRetry(text, safeModel, DEEPGRAM_API_KEY);
    console.log(`[Deepgram TTS] Success: ${audioBuffer.byteLength} bytes`);

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('[Deepgram TTS] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
