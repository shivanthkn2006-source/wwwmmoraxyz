/**
 * Pollinations Image Generation Edge Function
 * 
 * Free, open-source image generation via https://pollinations.ai
 * No API key required. Supports text-to-image with multiple models.
 * 
 * Usage:
 *   POST /pollinations-image
 *   Body: { prompt, width?, height?, model?, seed?, enhance?, nologo? }
 * 
 * Models: "flux", "turbo", "flux-realism", "flux-anime", "flux-3d", "any"
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PollinationsRequest {
  prompt: string;
  width?: number;
  height?: number;
  model?: string;
  seed?: number;
  enhance?: boolean;
  nologo?: boolean;
  // For avatar/regional use cases
  style?: string;
  mood?: string;
}

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: PollinationsRequest = await req.json();
    let { prompt, width, height, model, seed, enhance, nologo, style, mood } = body;

    // If style is provided, use regional prompt
    if (style && REGIONAL_PROMPTS[style]) {
      prompt = REGIONAL_PROMPTS[style];
      if (mood && mood !== 'idle') {
        prompt += `, expressing ${mood} emotion`;
      }
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize & default params
    const w = Math.min(Math.max(width || 512, 256), 2048);
    const h = Math.min(Math.max(height || 512, 256), 2048);
    const m = model || 'flux';
    const s = seed ?? Math.floor(Math.random() * 999999);
    const enh = enhance !== false;
    const nl = nologo !== false;

    // Build Pollinations URL
    const encodedPrompt = encodeURIComponent(prompt.trim());
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${w}&height=${h}&model=${m}&seed=${s}&enhance=${enh}&nologo=${nl}`;

    console.log(`[pollinations-image] Requesting: model=${m}, ${w}x${h}, seed=${s}`);

    // Fetch the image from Pollinations (it returns the image directly)
    const imgResponse = await fetch(pollinationsUrl, {
      headers: { 'Accept': 'image/*' },
    });

    if (!imgResponse.ok) {
      const errText = await imgResponse.text();
      console.error(`[pollinations-image] Pollinations error [${imgResponse.status}]: ${errText}`);
      return new Response(
        JSON.stringify({ error: 'Pollinations API failed', status: imgResponse.status }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert image to base64 data URL
    const imgBuffer = await imgResponse.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
    const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
    const dataUrl = `data:${contentType};base64,${base64}`;

    console.log(`[pollinations-image] ✅ Image generated successfully (${(imgBuffer.byteLength / 1024).toFixed(1)}KB)`);

    return new Response(
      JSON.stringify({
        imageUrl: dataUrl,
        pollinationsUrl, // Direct URL for embedding if preferred
        model: m,
        width: w,
        height: h,
        seed: s,
        style: style || null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[pollinations-image] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error', message: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
