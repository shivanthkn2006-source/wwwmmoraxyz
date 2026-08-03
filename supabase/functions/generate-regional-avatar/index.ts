import { sovereignFetch, sovereignKey } from "../_shared/sovereign-ai.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REGIONAL_PROMPTS: Record<string, string> = {
  'south-indian-saree': 'A beautiful young Indian woman wearing an elegant traditional Kerala silk saree in gold and maroon, with temple jewelry, jasmine flowers in her hair, warm smile, full body portrait, digital art style, clean background',
  'north-indian-traditional': 'A beautiful young Indian woman wearing a vibrant red and gold lehenga choli with kundan jewelry, ornate dupatta, warm smile, full body portrait, digital art style, clean background',
  'bengali-traditional': 'A beautiful young Bengali woman wearing a red and white tant saree with gold borders, red bindi, traditional jewelry, warm smile, full body portrait, digital art style, clean background',
  'gujarati-traditional': 'A beautiful young Gujarati woman wearing a colorful bandhani saree with mirror work, traditional jewelry, warm smile, full body portrait, digital art style, clean background',
  'punjabi-traditional': 'A beautiful young Punjabi woman wearing a vibrant phulkari dupatta with salwar kameez, traditional jewelry, warm smile, full body portrait, digital art style, clean background',
  'northeast-traditional': 'A beautiful young Northeast Indian woman wearing a mekhela chador with traditional tribal patterns, silver jewelry, warm smile, full body portrait, digital art style, clean background',
  'western-casual': 'A beautiful young woman wearing a modern elegant blazer and smart casual outfit, contemporary style, warm smile, full body portrait, digital art style, clean background',
  'east-asian': 'A beautiful young East Asian woman wearing an elegant kimono-inspired modern outfit, delicate accessories, warm smile, full body portrait, digital art style, clean background',
  'middle-eastern': 'A beautiful young Middle Eastern woman wearing an elegant abaya with gold embroidery accents, modest and stylish, warm smile, full body portrait, digital art style, clean background',
  'southeast-asian': 'A beautiful young Southeast Asian woman wearing a colorful batik-inspired outfit, traditional accessories, warm smile, full body portrait, digital art style, clean background',
  'african-traditional': 'A beautiful young African woman wearing a vibrant ankara print dress with bold patterns, traditional headwrap, warm smile, full body portrait, digital art style, clean background',
  'latin-traditional': 'A beautiful young Latin American woman wearing a colorful traditional folkloric dress with embroidery, warm smile, full body portrait, digital art style, clean background',
};

/**
 * Try Pollinations API first (free, no API key), fall back to Lovable AI Gateway
 */
async function tryPollinations(prompt: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=768&model=flux&nologo=true&enhance=true`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
    
    const resp = await fetch(url, { 
      signal: controller.signal,
      headers: { 'Accept': 'image/*' },
    });
    clearTimeout(timeout);
    
    if (!resp.ok) return null;
    
    const buf = await resp.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    const ct = resp.headers.get('content-type') || 'image/jpeg';
    return `data:${ct};base64,${b64}`;
  } catch (e) {
    console.warn('[generate-regional-avatar] Pollinations failed, falling back:', e);
    return null;
  }
}

async function tryLovableAI(prompt: string): Promise<string | null> {
  const SOVEREIGN_AI_KEY = sovereignKey();
  if (!SOVEREIGN_AI_KEY) return null;

  try {
    const aiResponse = await sovereignFetch('sovereign://chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SOVEREIGN_AI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-image-preview',
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error(`[generate-regional-avatar] AI Gateway error [${aiResponse.status}]: ${errText}`);
      return null;
    }

    const data = await aiResponse.json();
    return data?.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
  } catch (e) {
    console.error('[generate-regional-avatar] Lovable AI failed:', e);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { style, mood, provider } = await req.json();

    if (!style || !REGIONAL_PROMPTS[style]) {
      return new Response(
        JSON.stringify({ error: 'Invalid regional style' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const moodSuffix = mood && mood !== 'idle' ? `, expressing ${mood} emotion` : '';
    const prompt = REGIONAL_PROMPTS[style] + moodSuffix;

    let imageUrl: string | null = null;
    let usedProvider = 'unknown';

    // Provider selection: pollinations (default) → lovable-ai fallback
    if (provider === 'lovable-ai') {
      imageUrl = await tryLovableAI(prompt);
      usedProvider = 'lovable-ai';
    }

    if (!imageUrl) {
      imageUrl = await tryPollinations(prompt);
      usedProvider = 'pollinations';
    }

    // Fallback to Lovable AI if Pollinations failed
    if (!imageUrl && usedProvider === 'pollinations') {
      imageUrl = await tryLovableAI(prompt);
      usedProvider = 'lovable-ai-fallback';
    }

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'All image providers failed', fallback: true }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ imageUrl, style, provider: usedProvider }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[generate-regional-avatar] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error', fallback: true }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
