/**
 * Pollinations Image Generation Edge Function
 * 
 * Free/open-source image generation via https://pollinations.ai.
 * Text-to-image does not need a key. Image editing / hairstyle selfie
 * preservation uses Pollinations authenticated OpenAI-compatible edits API.
 * 
 * Usage:
 *   POST /pollinations-image
 *   Body: { prompt, width?, height?, model?, seed?, enhance?, nologo?, sourceImage? }
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
  mode?: 'text-to-image' | 'hairstyle-edit' | 'image-edit';
  sourceImage?: string;
  // For avatar/regional use cases
  style?: string;
  mood?: string;
}

function getPollinationsKey(): string | null {
  return Deno.env.get('POLLINATIONS_API_KEY')
    || Deno.env.get('POLLINATIONS_TOKEN')
    || Deno.env.get('POLLINATIONS_KEY')
    || null;
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; mime: string } {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error('Invalid source image data URL');
  const mime = match[1] || 'image/jpeg';
  const isBase64 = !!match[2];
  const payload = match[3];
  let bytes: Uint8Array;

  if (isBase64) {
    const binary = atob(payload);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  } else {
    bytes = new TextEncoder().encode(decodeURIComponent(payload));
  }

  return { blob: new Blob([bytes], { type: mime }), mime };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function sourceImageToBlob(sourceImage: string): Promise<{ blob: Blob; mime: string }> {
  if (sourceImage.startsWith('data:')) return dataUrlToBlob(sourceImage);
  if (/^https?:\/\//i.test(sourceImage)) {
    const resp = await fetch(sourceImage);
    if (!resp.ok) throw new Error(`Unable to fetch source image (${resp.status})`);
    const mime = resp.headers.get('content-type') || 'image/jpeg';
    return { blob: await resp.blob(), mime };
  }
  // Accept raw base64 as a last resort.
  return dataUrlToBlob(`data:image/jpeg;base64,${sourceImage}`);
}

async function editWithPollinations(body: PollinationsRequest): Promise<Record<string, unknown>> {
  const key = getPollinationsKey();
  if (!key) {
    return {
      error: 'POLLINATIONS_API_KEY missing',
      message: 'Face-preserving hairstyle edit needs the authenticated Pollinations image-edit API. Add POLLINATIONS_API_KEY in Supabase secrets.',
      usedFace: false,
    };
  }
  if (!body.sourceImage) throw new Error('sourceImage is required for image edit');

  const w = Math.min(Math.max(body.width || 768, 256), 2048);
  const h = Math.min(Math.max(body.height || 1024, 256), 2048);
  const model = body.model || 'p-image-edit';
  const { blob, mime } = await sourceImageToBlob(body.sourceImage);

  const form = new FormData();
  form.append('image', blob, `zoe-selfie.${mime.includes('png') ? 'png' : 'jpg'}`);
  form.append('prompt', body.prompt.trim());
  form.append('model', model);
  form.append('size', `${w}x${h}`);
  form.append('n', '1');
  form.append('quality', 'medium');
  form.append('response_format', 'b64_json');
  if (typeof body.seed === 'number') form.append('seed', String(body.seed));
  form.append('safe', 'true');

  console.log(`[pollinations-image] Image edit: model=${model}, ${w}x${h}`);
  const editResp = await fetch('https://gen.pollinations.ai/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });

  const text = await editResp.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }

  if (!editResp.ok) {
    console.error(`[pollinations-image] Edit failed [${editResp.status}]: ${text.slice(0, 1000)}`);
    return {
      error: 'Pollinations image edit failed',
      status: editResp.status,
      message: data?.error?.message || data?.message || text.slice(0, 500),
      usedFace: false,
    };
  }

  const first = data?.data?.[0];
  const b64 = first?.b64_json;
  const url = first?.url;
  if (b64) {
    return {
      imageUrl: b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`,
      provider: 'pollinations-v1-images-edits',
      model,
      width: w,
      height: h,
      seed: body.seed ?? null,
      usedFace: true,
    };
  }
  if (url) {
    return {
      imageUrl: url,
      provider: 'pollinations-v1-images-edits',
      model,
      width: w,
      height: h,
      seed: body.seed ?? null,
      usedFace: true,
    };
  }

  return {
    error: 'No edited image returned from Pollinations',
    message: 'Pollinations edit response did not include url or b64_json.',
    usedFace: false,
  };
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
    let { prompt, width, height, model, seed, enhance, nologo, style, mood, sourceImage, mode } = body;

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

    // Face-preserving hairstyle/image edits. This path intentionally does not
    // fall back to text-to-image because that creates a different person's face.
    if (sourceImage || mode === 'hairstyle-edit' || mode === 'image-edit' || model === 'p-image-edit') {
      const result = await editWithPollinations({ ...body, prompt, sourceImage, mode });
      if (!result.imageUrl) {
        return new Response(
          JSON.stringify(result),
          { status: result.status === 402 ? 402 : result.status === 401 ? 401 : 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    const base64 = arrayBufferToBase64(imgBuffer);
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
