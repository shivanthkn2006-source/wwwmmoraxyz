import { sovereignFetch, sovereignKey } from "../_shared/sovereign-ai.ts";
// ═══════════════════════════════════════════════════════════════════════════════
// ZOE VIDEO ANCHOR — Anti-Hallucination Layer 4
// Locks video generation to a verified first-frame reference image
// Pipeline:
//   1. Generate (or accept) a first-frame image matching the prompt
//   2. Verify the frame matches the prompt (Gemini Vision)
//   3. Compose a "motion-only" prompt that references the locked frame
//   4. Return the anchor bundle for downstream video providers
// ═══════════════════════════════════════════════════════════════════════════════

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnchorBody {
  prompt: string;
  referenceImageUrl?: string; // optional pre-generated frame
  duration?: number;
}

async function generateAnchorFrame(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const resp = await sovereignFetch('sovereign://chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-image-preview',
        messages: [{
          role: 'user',
          content: `Cinematic film still — first frame for a video. Subject: ${prompt}. Style: photoreal, sharp focus, perfect composition, no motion blur.`
        }],
        modalities: ['image', 'text'],
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const imgB64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
      ?? data.choices?.[0]?.message?.content?.match?.(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/)?.[0];
    return imgB64 ?? null;
  } catch (e) {
    console.error('[video-anchor] frame gen failed', e);
    return null;
  }
}

async function verifyFrame(imageUrl: string, prompt: string, apiKey: string): Promise<number> {
  try {
    const resp = await sovereignFetch('sovereign://chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Score 0.0–1.0 how well the image matches the prompt. Output ONLY a number.' },
          { role: 'user', content: [
            { type: 'text', text: `Prompt: "${prompt}". Score this frame:` },
            { type: 'image_url', image_url: { url: imageUrl } },
          ]},
        ],
        temperature: 0.1,
      }),
    });
    if (!resp.ok) return 0.5;
    const data = await resp.json();
    const raw = String(data.choices?.[0]?.message?.content ?? '0.5').trim();
    const n = parseFloat(raw.match(/0?\.\d+|1\.0|1|0/)?.[0] ?? '0.5');
    return isNaN(n) ? 0.5 : Math.max(0, Math.min(1, n));
  } catch {
    return 0.5;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, referenceImageUrl, duration = 5 }: AnchorBody = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'prompt required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SOVEREIGN_AI_KEY = sovereignKey();
    if (!SOVEREIGN_AI_KEY) {
      return new Response(JSON.stringify({ error: 'SOVEREIGN_AI_KEY missing' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Anchor frame
    let anchorFrame = referenceImageUrl ?? null;
    if (!anchorFrame) {
      anchorFrame = await generateAnchorFrame(prompt, SOVEREIGN_AI_KEY);
    }

    // 2. Verify frame
    let frameScore = 0.5;
    if (anchorFrame) {
      frameScore = await verifyFrame(anchorFrame, prompt, SOVEREIGN_AI_KEY);
    }

    // 3. Compose motion-only prompt
    const motionPrompt = `Animate this exact scene with subtle, realistic motion.
Subject reference (locked): ${prompt}
Motion: smooth camera, natural movement, ${duration}s.
DO NOT change subject identity, composition, or environment.`;

    return new Response(JSON.stringify({
      success: true,
      anchorFrame,
      frameScore,
      frameVerified: frameScore >= 0.6,
      motionPrompt,
      duration,
      originalPrompt: prompt,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[video-anchor] error', e);
    return new Response(JSON.stringify({ error: String(e), success: false }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
