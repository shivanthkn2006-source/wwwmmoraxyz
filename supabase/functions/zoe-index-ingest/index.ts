/**
 * ZOE INDEX INGEST — multimodal async indexing pipeline.
 * Writes any platform entity (loop_video, chat, dhf_node, spot, 3d_asset, post…)
 * into public.zoe_universal_index with a 1536-dim sovereign embedding.
 * 100% sovereign providers — no Lovable AI credits.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { embedText } from '../_shared/zoe-embeddings.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_KEY = Deno.env.get('GOOGLE_AI_STUDIO_KEY') || Deno.env.get('GEMINI_API_KEY');
const VISION_MODEL = 'gemini-3.6-flash';

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
    const {
      entityType,
      entityId,
      rawContent,
      mediaUrl,
      ownerId,
      privacyLevel,
      socialWeight,
      metadata,
    } = await req.json();

    if (!entityType || !entityId) return json({ error: 'entityType and entityId are required' }, 400);

    let synthesizedText = (rawContent || '').toString().trim();

    if (mediaUrl) {
      const visuals = await describeMedia(mediaUrl);
      if (visuals) synthesizedText = `${synthesizedText}\n[Visual Data]: ${visuals}`.trim();
    }

    if (!synthesizedText) return json({ error: 'Nothing to index (empty synthesis)' }, 400);

    const embedding = await embedText(synthesizedText);
    if (!embedding) return json({ error: 'Failed to generate embedding vector' }, 502);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { error: dbError } = await supabase
      .from('zoe_universal_index')
      .upsert(
        {
          owner_id: ownerId ?? null,
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

    return json({ success: true, indexedCharacters: synthesizedText.length, dims: embedding.length });
  } catch (err: any) {
    console.error('[zoe-index-ingest]', err);
    return json({ error: err?.message || 'Ingest failed' }, 500);
  }
});
