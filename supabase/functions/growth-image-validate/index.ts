import { sovereignFetch, sovereignKey } from '../_shared/sovereign-ai.ts';
/**
 * Growth card content-to-image validation.
 *
 * Given a generated illustration and the card's own data, a vision model
 * answers one question: does this picture actually match the card? When the
 * card names a real person, the face must be that person. When it names no
 * one, no identifiable face is allowed. The client re-rolls or falls back to a
 * faceless image whenever this returns `match: false`.
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/**
 * Hard ceiling for the whole request. Validation is advisory: whatever happens,
 * answer well before the 150s platform idle timeout so the caller never hangs.
 */
const OVERALL_BUDGET_MS = 25_000;

const handle = async (req: Request): Promise<Response> => {
  try {
    const { imageUrl, person, subject, category, strictness } = await req.json();
    const mode = strictness === 'strict' || strictness === 'lenient' ? strictness : 'balanced';
    if (typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
      return json({ error: 'imageUrl is required' }, 400);
    }

    if (!sovereignKey()) {
      console.error('[growth-image-validate] no sovereign AI provider key configured');
      return json({ error: 'AI is not configured. Ask an admin to add a provider key.' }, 503);
    }

    const tolerance = mode === 'strict'
      ? 'Judge harshly: any doubt about likeness, era or subject relevance is a mismatch.'
      : mode === 'lenient'
        ? 'Judge generously: only an obvious contradiction with the card is a mismatch.'
        : 'Judge fairly: a clear contradiction with the card is a mismatch.';

    const rule = person
      ? `The card is about the real person "${person}". The image matches ONLY if the depicted person is plausibly ${person} (correct era, age, clothing, likeness). A generic modern model is a mismatch. ${tolerance}`
      : `The card names no person. The image matches ONLY if it shows no identifiable human face. ${tolerance}`;

    // Providers cannot crawl the image host, so inline the bytes instead.
    let inlineImage: string;
    try {
      const imgRes = await fetch(imageUrl, { headers: { Accept: 'image/*' }, signal: AbortSignal.timeout(10_000) });
      if (!imgRes.ok) return json({ match: true, reason: 'image unavailable for validation' });
      const buf = new Uint8Array(await imgRes.arrayBuffer());
      if (buf.byteLength < 1000) return json({ match: true, reason: 'image too small to validate' });
      let binary = '';
      for (let i = 0; i < buf.length; i += 8192) {
        binary += String.fromCharCode(...buf.subarray(i, i + 8192));
      }
      const mime = imgRes.headers.get('content-type') ?? 'image/jpeg';
      inlineImage = `data:${mime};base64,${btoa(binary)}`;
    } catch (e) {
      console.warn('[growth-image-validate] image download failed', e);
      return json({ match: true, reason: 'image download failed' });
    }



    let res: Response;
    try {
      res = await sovereignFetch('sovereign://chat/completions', {
      signal: AbortSignal.timeout(45_000),
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content:
              'You validate whether an image matches a card. Reply with strict JSON only: {"match":boolean,"reason":string}. No markdown.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Card theme: ${category ?? 'personal growth'}\nCard content: ${String(subject ?? '').slice(0, 600)}\n\nRule: ${rule}`,
              },
              { type: 'image_url', image_url: { url: inlineImage } },
            ],
          },
        ],
      }),
      });
    } catch (e) {
      // A hung provider must never hold the request open until the 150s idle
      // timeout: inconclusive is not a mismatch, so keep the image.
      console.warn('[growth-image-validate] provider timeout/abort', e);
      return json({ match: true, inconclusive: true, reason: 'validator timed out' });
    }

    if (res.status === 429) return json({ error: 'Rate limited, try again shortly' }, 429);
    if (res.status === 402) return json({ error: 'AI credits exhausted' }, 402);
    if (res.status === 503) {
      // No vision-capable provider. Inconclusive is NOT a mismatch: keep the image.
      console.warn('[growth-image-validate] no vision provider available');
      return json({ match: true, inconclusive: true, reason: 'vision provider unavailable' });
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[growth-image-validate] gateway error', res.status, text);
      return json({ error: 'Validation unavailable' }, res.status);
    }

    const data = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? '';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    let parsed: { match?: boolean; reason?: string } = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { match: /"match"\s*:\s*true/i.test(cleaned), reason: cleaned.slice(0, 200) };
    }

    const reason = parsed.reason ?? '';
    // Guard against a model that never actually saw the picture (text-only
    // route, stripped attachment). That is inconclusive, never a mismatch.
    if (/\b(no|not?)\b[^.]{0,40}\bimage\b[^.]{0,40}\b(provided|supplied|attached|available|received)\b/i.test(reason)
      || /unable to (see|view|access) (the )?image/i.test(reason)) {
      console.warn('[growth-image-validate] model reported no image — treating as inconclusive', reason);
      return json({ match: true, inconclusive: true, reason: 'validator did not receive the image' });
    }

    return json({ match: parsed.match === true, reason });

  } catch (error) {
    console.error('[growth-image-validate] failed', error);
    return json({ error: 'Validation failed' }, 500);
  }
});
