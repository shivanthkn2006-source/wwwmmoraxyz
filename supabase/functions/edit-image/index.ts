import { requireCaller } from '../_shared/caller-guard.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { clientErrorResponse } from '../_shared/client-error.ts';
import { openRouterImage } from '../_shared/sovereign-ai.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sovereign image editing.
// Order: Pollinations (the account that holds the owner's credits, and the only
// tier that reliably keeps the person in the photo) → Google AI Studio Gemini →
// OpenRouter Nano Banana. Every tier edits the SAME reference image, so the
// result is the account holder, never a stranger.

const POLLINATIONS_EDIT_MODELS = ['nanobanana-2', 'nanobanana-pro', 'nanobanana', 'kontext', 'seedream5'];
const POLLINATIONS_BASE = 'https://gen.pollinations.ai';

/**
 * Identity-preserving edit through Pollinations' OpenAI-compatible image-edit
 * endpoint (gen.pollinations.ai — the legacy image host no longer carries the
 * edit models). The real reference photo is uploaded as the source image, so
 * the model conditions on the actual face instead of inventing a stranger.
 * Returns null on any failure so the caller falls through to the next tier.
 */
async function tryPollinationsEdit(prompt: string, mime: string, b64: string): Promise<string | null> {
  const token =
    Deno.env.get('POLLINATIONS_API_KEY') ??
    Deno.env.get('POLLINATIONS_TOKEN') ??
    Deno.env.get('POLLINATIONS_KEY');
  if (!token) return null;

  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const guarded = `${prompt}\n\nKeep the person in the supplied photograph exactly recognisable: same face shape, skin tone, hair and defining features. Never substitute a different person.`;

  for (const model of POLLINATIONS_EDIT_MODELS) {
    try {
      const form = new FormData();
      form.append('model', model);
      form.append('prompt', guarded);
      form.append('n', '1');
      form.append('image', new Blob([bytes], { type: mime }), `reference.${ext}`);

      const r = await fetch(`${POLLINATIONS_BASE}/v1/images/edits`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
        signal: AbortSignal.timeout(120_000),
      });

      if (!r.ok) {
        console.warn('[edit-image] Pollinations edit failed:', model, r.status, (await r.text()).slice(0, 220));
        continue;
      }

      const data = await r.json();
      const first = data?.data?.[0];
      if (first?.b64_json) {
        console.log('[edit-image] ✅ Pollinations identity edit via', model);
        return `data:image/png;base64,${first.b64_json}`;
      }
      if (first?.url) {
        console.log('[edit-image] ✅ Pollinations identity edit (url) via', model);
        return first.url as string;
      }
      console.warn('[edit-image] Pollinations returned no image for', model, JSON.stringify(data).slice(0, 200));
    } catch (err) {
      console.warn('[edit-image] Pollinations edit threw:', model, err);
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  { const __c = await requireCaller(req, 'member'); if (__c instanceof Response) return __c; }

  try {
    const { prompt, imageBase64, imageUrl } = await req.json();

    if (!prompt || prompt.trim().length === 0) throw new Error('Prompt is required');
    if (!imageBase64 && !imageUrl) throw new Error('Image data is required');

    const GOOGLE_KEY = Deno.env.get('GOOGLE_AI_STUDIO_KEY');

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
      if (!GOOGLE_KEY) throw new Error('no classifier key');
      const classificationResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GOOGLE_KEY}`,
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


    // Tier 1 — Pollinations, where the owner's image credits live.
    const pollinated = await tryPollinationsEdit(prompt, mime, b64);
    if (pollinated) {
      return new Response(
        JSON.stringify({ imageUrl: pollinated, provider: 'pollinations-edit' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!GOOGLE_KEY) {
      const orOnly = await openRouterImage(prompt, [`data:${mime};base64,${b64}`]);
      if (orOnly) {
        return new Response(
          JSON.stringify({ imageUrl: orOnly, provider: 'openrouter-gemini-image' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      throw new Error('No identity image editor is configured');
    }

    console.log('[edit-image] Editing via Google AI Studio Gemini image model, prompt:', prompt);

    // Try the image models in order; free-tier quota (429) on one model should
    // roll over to the next instead of failing the whole request.
    const models = [
      'gemini-3.1-flash-image-preview',
      'gemini-3-pro-image-preview',
      'gemini-2.5-flash-image',
    ];
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
      // Google image quota exhausted (429) or a model error → OpenRouter
      // Nano Banana edits the SAME reference image, so identity is preserved.
      console.warn('[edit-image] Google image models unavailable, trying OpenRouter image edit. last:', lastStatus, lastErr.slice(0, 120));
      const orImage = await openRouterImage(prompt, [`data:${mime};base64,${b64}`]);
      if (orImage) {
        return new Response(
          JSON.stringify({ imageUrl: orImage, provider: 'openrouter-gemini-image' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (lastStatus === 429) {
        // Truthful, machine-readable: every funded identity editor is at quota.
        return new Response(
          JSON.stringify({
            code: 'PROVIDER_QUOTA',
            error: 'RATE_LIMIT',
            message: "No identity-preserving image editor has credit right now: the Pollinations balance is 0 pollen (top up at enter.pollinations.ai), Google image quota is spent and the OpenRouter balance is empty. Your photo stays safe in the vault; nobody was substituted.",
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    const __clientError = clientErrorResponse(error, corsHeaders);
    if (__clientError) return __clientError;

    console.error('[edit-image] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
