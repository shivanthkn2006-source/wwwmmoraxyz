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
    const { prompt, imageBase64, imageUrl } = await req.json();

    if (!prompt || prompt.trim().length === 0) throw new Error('Prompt is required');
    if (!imageBase64 && !imageUrl) throw new Error('Image data is required');

    const GOOGLE_KEY = Deno.env.get('GOOGLE_AI_STUDIO_KEY');
    if (!GOOGLE_KEY) throw new Error('GOOGLE_AI_STUDIO_KEY not configured');

    // Strip data-URI prefix if present; detect mime.
    let mime = 'image/png';
    let b64 = imageBase64 || '';
    if (imageUrl && !imageBase64) {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) throw new Error('Reference image could not be loaded');
      mime = imageResponse.headers.get('content-type') || 'image/jpeg';
      const bytes = new Uint8Array(await imageResponse.arrayBuffer());
      const chunks: string[] = [];
      for (let index = 0; index < bytes.length; index += 0x8000) {
        chunks.push(String.fromCharCode(...bytes.subarray(index, index + 0x8000)));
      }
      b64 = btoa(chunks.join(''));
    }
    const m = /^data:([^;]+);base64,(.+)$/.exec(b64);
    if (m) { mime = m[1]; b64 = m[2]; }

    // Identity generation should not silently substitute an animal, celebrity,
    // fictional avatar, logo, or generic face for the account holder.
    // The classifier is advisory: if it is unavailable we fail OPEN and continue,
    // because blocking the edit on a classifier outage produced a hard 500.
    let classification = 'HUMAN_PHOTO';
    try {
      const classificationResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [
              { text: 'Classify this identity reference. Return only HUMAN_PHOTO if it is a clear photograph containing a real human face suitable for identity-preserving image editing. Return only NOT_HUMAN otherwise, including cartoons, animals, gods, celebrities shown as posters, logos, scenery, obscured faces, or images without a clear human face.' },
              { inline_data: { mime_type: mime, data: b64 } },
            ] }],
          }),
        },
      );
      if (classificationResponse.ok) {
        const classificationData = await classificationResponse.json();
        const raw: string = (classificationData?.candidates?.[0]?.content?.parts ?? [])
          .map((part: { text?: string }) => part.text || '').join('').trim().toUpperCase();
        if (raw.includes('NOT_HUMAN')) classification = 'NOT_HUMAN';
        else if (raw.includes('HUMAN_PHOTO')) classification = 'HUMAN_PHOTO';
        else console.warn('[edit-image] Unrecognized classification, continuing:', raw.slice(0, 120));
      } else {
        console.warn('[edit-image] Classifier unavailable:', classificationResponse.status, (await classificationResponse.text()).slice(0, 300));
      }
    } catch (classifyError) {
      console.warn('[edit-image] Classifier threw, continuing:', classifyError);
    }

    if (classification === 'NOT_HUMAN') {
      return new Response(
        JSON.stringify({ code: 'REFERENCE_NOT_HUMAN', message: 'Please upload a clear photo of yourself so I can preserve your real identity.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }


    console.log('[edit-image] Editing via Google AI Studio Gemini image model, prompt:', prompt);

    // Try the image models in order; free-tier quota (429) on one model should
    // roll over to the next instead of failing the whole request.
    const models = ['gemini-2.5-flash-image', 'gemini-2.0-flash-preview-image-generation'];
    let resp: Response | null = null;
    let lastStatus = 0;
    let lastErr = '';

    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const r = await fetch(
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

        if (r.ok) { resp = r; break; }

        lastStatus = r.status;
        lastErr = (await r.text()).slice(0, 300);
        console.error('[edit-image] Google AI error:', model, r.status, lastErr);

        if (r.status === 429 && attempt === 0) {
          await new Promise((res) => setTimeout(res, 3000));
          continue; // one short retry, then move to next model
        }
        break;
      }
      if (resp) break;
    }

    if (!resp) {
      if (lastStatus === 429) {
        return new Response(
          JSON.stringify({
            error: 'RATE_LIMIT',
            message: 'The image model is at its quota right now. Please try again in a minute.',
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Google AI error: ${lastStatus}`);
    }

    const data = await resp.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((part: { inlineData?: { data?: string }; inline_data?: { data?: string } }) =>
      part?.inlineData?.data || part?.inline_data?.data
    );
    if (!imgPart) {
      console.error('[edit-image] No image in response', JSON.stringify(data).slice(0, 500));
      throw new Error('No edited image returned');
    }

    const imageData = imgPart.inlineData ?? imgPart.inline_data;
    if (!imageData?.data) throw new Error('Edited image data was empty');
    const outMime = ('mimeType' in imageData ? imageData.mimeType : imageData.mime_type) || 'image/png';
    const resultImageUrl = `data:${outMime};base64,${imageData.data}`;

    return new Response(
      JSON.stringify({ imageUrl: resultImageUrl, provider: 'gemini-direct' }),
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
