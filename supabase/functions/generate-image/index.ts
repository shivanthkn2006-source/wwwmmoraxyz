import { requireCaller } from '../_shared/caller-guard.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { openRouterImage } from '../_shared/sovereign-ai.ts';
import { fetchImageCascade } from '../_shared/image-cascade.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const promptSchema = z.object({
  prompt: z.string()
    .min(1, { message: 'Prompt is required' })
    .max(1000, { message: 'Prompt must be less than 1000 characters' })
    .trim(),
  width: z.number().min(256).max(2048).optional(),
  height: z.number().min(256).max(2048).optional(),
  provider: z.enum(['auto', 'pollinations', 'gemini']).optional(),
});

/**
 * Shared picture cascade: Pollinations first, then ordered free backups.
 */
async function tryPollinations(prompt: string, width = 1024, height = 1024): Promise<string | null> {
  const art = await fetchImageCascade({ prompt, width, height });
  if (!art.bytes) return null;
  let bin = '';
  for (let i = 0; i < art.bytes.length; i += 0x8000) bin += String.fromCharCode(...art.bytes.subarray(i, i + 0x8000));
  console.log(`[generate-image] ✅ ${art.provider} success (${(art.bytes.byteLength / 1024).toFixed(1)}KB)`);
  return `data:${art.contentType.split(';')[0]};base64,${btoa(bin)}`;
}

// Lovable Gateway removed — Pollinations is the sole provider (free, unlimited).


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  { const __c = await requireCaller(req, 'member'); if (__c instanceof Response) return __c; }

  try {
    const body = await req.json();
    const parsed = promptSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prompt, width, height } = parsed.data;

    let imageUrl: string | null = null;
    let usedProvider = 'unknown';
    const attempts: Array<{ provider: string; ok: boolean; reason?: string }> = [];

    // Sovereign image gen — Pollinations first (free), then OpenRouter Nano
    // Banana so a Pollinations outage/moderation never turns an image request
    // into a broken picture. No Lovable credits on either tier.
    imageUrl = await tryPollinations(prompt, width || 1024, height || 1024);
    if (imageUrl) {
      usedProvider = 'pollinations';
      attempts.push({ provider: 'pollinations', ok: true });
    } else {
      attempts.push({ provider: 'pollinations', ok: false, reason: 'unreachable' });
      imageUrl = await openRouterImage(prompt, []);
      if (imageUrl) {
        usedProvider = 'openrouter-gemini-image';
        attempts.push({ provider: 'openrouter-gemini-image', ok: true });
      } else {
        attempts.push({ provider: 'openrouter-gemini-image', ok: false, reason: 'unavailable' });
      }
    }



    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'All image providers failed', fallback: true, attempts }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ imageUrl, provider: usedProvider, attempts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[generate-image] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
