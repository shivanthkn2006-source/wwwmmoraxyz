/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE SOVEREIGN EMBEDDINGS
 * 1536-dim vectors for public.zoe_universal_index — no Lovable AI credits.
 * Provider cascade: Google AI Studio (gemini-embedding-001) → OpenRouter → NVIDIA NIM.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { nvidiaEmbed } from './nvidia-provider.ts';

const GOOGLE_EMBED_MODEL = 'gemini-embedding-001';
export const ZOE_VECTOR_DIMS = 1536;

/** Embed a single text chunk. Returns null when every provider is unavailable. */
export async function embedText(text: string): Promise<number[] | null> {

  const clean = (text || '').trim().slice(0, 20000);
  if (!clean) return null;

  const googleKey = Deno.env.get('GOOGLE_AI_STUDIO_KEY') || Deno.env.get('GEMINI_API_KEY');
  if (googleKey) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_EMBED_MODEL}:embedContent?key=${googleKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: `models/${GOOGLE_EMBED_MODEL}`,
            content: { parts: [{ text: clean }] },
            outputDimensionality: ZOE_VECTOR_DIMS,
          }),
        },
      );
      if (resp.ok) {
        const data = await resp.json();
        const values = data?.embedding?.values;
        if (Array.isArray(values) && values.length === ZOE_VECTOR_DIMS) return values;
        console.warn('[zoe-embeddings] unexpected google dims', values?.length);
      } else {
        console.warn('[zoe-embeddings] google failed', resp.status, (await resp.text()).slice(0, 200));
      }
    } catch (e) {
      console.warn('[zoe-embeddings] google threw', e);
    }
  }

  // Fallback: OpenRouter-hosted embedding endpoint (OpenAI-compatible).
  const orKey = Deno.env.get('OPENROUTER_API_KEY');
  if (orKey) {
    try {
      const resp = await fetch('https://openrouter.ai/api/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${orKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://myzoe.xyz',
          'X-Title': 'Zoe Ambient Search',
        },
        body: JSON.stringify({
          model: 'openai/text-embedding-3-small',
          input: clean,
          dimensions: ZOE_VECTOR_DIMS,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const values = data?.data?.[0]?.embedding;
        if (Array.isArray(values) && values.length === ZOE_VECTOR_DIMS) return values;
      } else {
        console.warn('[zoe-embeddings] openrouter failed', resp.status);
      }
    } catch (e) {
      console.warn('[zoe-embeddings] openrouter threw', e);
    }
  }

  // Last-resort tier: NVIDIA NIM (llama-3.2-nv-embedqa-1b-v2), width-normalised to 1536.
  const nvidia = await nvidiaEmbed(clean, ZOE_VECTOR_DIMS, 'passage');
  if (nvidia) return nvidia;

  return null;
}


/** Split long text into embeddable chunks (~1200 chars with overlap). */
export function chunkText(text: string, size = 1200, overlap = 150): string[] {
  const clean = (text || '').trim();
  if (clean.length <= size) return clean ? [clean] : [];
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < clean.length) {
    chunks.push(clean.slice(cursor, cursor + size));
    cursor += size - overlap;
  }
  return chunks;
}
