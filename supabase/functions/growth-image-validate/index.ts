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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl, person, subject, category } = await req.json();
    if (typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
      return json({ error: 'imageUrl is required' }, 400);
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) return json({ error: 'AI is not configured' }, 401);

    const rule = person
      ? `The card is about the real person "${person}". The image matches ONLY if the depicted person is plausibly ${person} (correct era, age, clothing, likeness). A generic modern model is a mismatch.`
      : 'The card names no person. The image matches ONLY if it shows no identifiable human face.';

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3.7-flash',
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
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    if (res.status === 429) return json({ error: 'Rate limited, try again shortly' }, 429);
    if (res.status === 402) return json({ error: 'AI credits exhausted' }, 402);
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

    return json({ match: parsed.match === true, reason: parsed.reason ?? '' });
  } catch (error) {
    console.error('[growth-image-validate] failed', error);
    return json({ error: 'Validation failed' }, 500);
  }
});
