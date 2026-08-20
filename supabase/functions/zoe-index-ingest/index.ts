/**
 * ZOE INDEX INGEST — multimodal async indexing pipeline.
 * Writes any platform entity (loop_video, chat, dhf_node, spot, 3d_asset, post…)
 * into public.zoe_universal_index with a 1536-dim sovereign embedding.
 * 100% sovereign providers — no Lovable AI credits.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { embedText } from '../_shared/zoe-embeddings.ts';
import { isUuid, requireSearchUser, safeHttpUrl } from '../_shared/zoe-search-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_KEY = Deno.env.get('GOOGLE_AI_STUDIO_KEY') || Deno.env.get('GEMINI_API_KEY');
const VISION_MODEL = 'gemini-3.6-flash';
const SUPPORTED_TYPES = new Set(['post', 'loop_video', 'image', 'quote', 'profile', 'chat', 'dhf_node']);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Gemini vision pass: OCR + object/mood extraction for images. */
async function describeMedia(mediaUrl: string): Promise<string> {
  if (!GOOGLE_KEY) return '';
  try {
    const media = await fetch(mediaUrl);
    if (!media.ok) return '';
    const mimeType = media.headers.get('content-type') || 'image/jpeg';
    if (!mimeType.startsWith('image/')) return '';
    const buf = new Uint8Array(await media.arrayBuffer());
    if (buf.byteLength > 6_000_000) return '';
    let binary = '';
    for (let i = 0; i < buf.length; i += 8192) binary += String.fromCharCode(...buf.subarray(i, i + 8192));

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${VISION_MODEL}:generateContent?key=${GOOGLE_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: 'Extract all visual elements, OCR text, objects, people, mood and actions from this media, concisely, for database indexing.',
                },
                { inline_data: { mime_type: mimeType, data: btoa(binary) } },
              ],
            },
          ],
          generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
        }),
      },
    );
    if (!resp.ok) {
      console.warn('[zoe-index-ingest] vision failed', resp.status);
      return '';
    }
    const data = await resp.json();
    return data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join('') ?? '';
  } catch (e) {
    console.warn('[zoe-index-ingest] vision threw', e);
    return '';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const user = await requireSearchUser(req);
    const {
      entityType,
      entityId,
      rawContent,
      mediaUrl,
      ownerId,
      privacyLevel,
      socialWeight,
      metadata,
      requestId: clientRequestId,
    } = await req.json();

    const requestId = clientRequestId || crypto.randomUUID();
    const t0 = performance.now();

    if (!SUPPORTED_TYPES.has(entityType) || !isUuid(entityId)) {
      return json({ error: 'A supported entityType and UUID entityId are required', requestId }, 400);
    }
    if (ownerId && ownerId !== user.id) return json({ error: 'Forbidden owner', requestId }, 403);
    if (privacyLevel && !['public', 'friends', 'private'].includes(privacyLevel)) {
      return json({ error: 'Invalid privacyLevel', requestId }, 400);
    }
    if (String(rawContent || '').length > 20000) return json({ error: 'rawContent is too large', requestId }, 413);
    const validatedMediaUrl = safeHttpUrl(mediaUrl);
    if (mediaUrl && !validatedMediaUrl) return json({ error: 'Invalid mediaUrl', requestId }, 400);
    console.log('[zoe-index-ingest:req]', JSON.stringify({ requestId, entityType, entityId, hasMedia: Boolean(mediaUrl) }));

    let synthesizedText = (rawContent || '').toString().trim();

    let visionMs = 0;
    if (validatedMediaUrl) {
      const tVision = performance.now();
      const visuals = await describeMedia(validatedMediaUrl);
      visionMs = Math.round(performance.now() - tVision);
      if (visuals) synthesizedText = `${synthesizedText}\n[Visual Data]: ${visuals}`.trim();
      console.log('[zoe-index-ingest:vision]', JSON.stringify({ requestId, visionMs, extractedChars: visuals.length }));
    }

    if (!synthesizedText) return json({ error: 'Nothing to index (empty synthesis)', requestId }, 400);

    const tEmbed = performance.now();
    const embedding = await embedText(synthesizedText);
    const embedMs = Math.round(performance.now() - tEmbed);
    if (!embedding) {
      console.error('[zoe-index-ingest:embed]', JSON.stringify({ requestId, embedMs, error: 'embedding failed' }));
      return json({ error: 'Failed to generate embedding vector', requestId }, 502);
    }
    console.log('[zoe-index-ingest:embed]', JSON.stringify({ requestId, embedMs, dims: embedding.length }));
    const tWrite = performance.now();

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { error: dbError } = await supabase
      .from('zoe_universal_index')
      .upsert(
        {
          owner_id: user.id,
          entity_type: entityType,
          entity_id: entityId,
          content_synthesis: synthesizedText,
          embedding: JSON.stringify(embedding),
          privacy_level: privacyLevel || 'private',
          social_weight: typeof socialWeight === 'number' ? socialWeight : 1.0,
          metadata: metadata || {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'entity_type,entity_id' },
      );

    if (dbError) throw dbError;
    const writeMs = Math.round(performance.now() - tWrite);
    const totalMs = Math.round(performance.now() - t0);
    console.log('[zoe-index-ingest:res]', JSON.stringify({
      requestId, visionMs, embedMs, writeMs, totalMs, indexedCharacters: synthesizedText.length,
    }));

    return json({
      success: true,
      requestId,
      indexedCharacters: synthesizedText.length,
      dims: embedding.length,
      timings: { visionMs, embedMs, writeMs, totalMs },
    });
  } catch (err: any) {
    console.error('[zoe-index-ingest:error]', err?.message || err);
    const unauthorized = err?.message === 'UNAUTHORIZED';
    return json({ error: unauthorized ? 'Unauthorized' : (err?.message || 'Ingest failed') }, unauthorized ? 401 : 500);
  }
});
