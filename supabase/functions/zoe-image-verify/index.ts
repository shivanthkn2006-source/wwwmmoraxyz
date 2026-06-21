// ═══════════════════════════════════════════════════════════════════════════════
// ZOE IMAGE VERIFY — Anti-Hallucination Layer 3
// Reverse-checks generated images against the original prompt using Gemini Vision.
// Returns { match: boolean, score: 0-1, missing: string[], suggestions: string[] }
// Called AFTER zoe-infinity-image-gen succeeds. UI consumes silently.
// ═══════════════════════════════════════════════════════════════════════════════

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyBody {
  imageUrl: string;        // data: URL or https URL
  originalPrompt: string;
  strict?: boolean;        // if true, requires score >= 0.8 to pass
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, originalPrompt, strict = false }: VerifyBody = await req.json();

    if (!imageUrl || !originalPrompt) {
      return new Response(
        JSON.stringify({ error: 'imageUrl and originalPrompt required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verifierPrompt = `You are an image verification critic.
Compare the image to this prompt: "${originalPrompt}"

Respond ONLY with strict JSON (no markdown):
{
  "match": <true|false>,
  "score": <0.0-1.0>,
  "missing_elements": [<short strings of things requested but not visible>],
  "extra_elements": [<short strings of things present but not requested>],
  "suggestions": [<short rewrite hints to improve future generations>]
}

Score guide:
- 1.0 = perfect match, all elements present and correct
- 0.7-0.9 = mostly correct, minor omissions
- 0.4-0.6 = partial match, key elements missing
- 0.0-0.3 = wrong subject / completely off`;

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a precise image verification critic. Output strict JSON only.' },
          {
            role: 'user',
            content: [
              { type: 'text', text: verifierPrompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('[image-verify] gateway error', resp.status, errText);
      // Fail-open: if verifier itself is rate-limited, don't block the user
      return new Response(
        JSON.stringify({ match: true, score: 0.5, skipped: true, reason: 'verifier_unavailable' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content ?? '{}';

    // Strip ```json fences if present
    const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { match: true, score: 0.5, raw: cleaned, parse_error: true };
    }

    const passThreshold = strict ? 0.8 : 0.5;
    const passed = (parsed.score ?? 0.5) >= passThreshold;

    return new Response(
      JSON.stringify({
        match: passed,
        score: parsed.score ?? 0.5,
        missing_elements: parsed.missing_elements ?? [],
        extra_elements: parsed.extra_elements ?? [],
        suggestions: parsed.suggestions ?? [],
        strict,
        passThreshold,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[image-verify] error', e);
    // Fail-open
    return new Response(
      JSON.stringify({ match: true, score: 0.5, skipped: true, error: String(e) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
