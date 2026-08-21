import { nvidiaVision } from './nvidia-provider.ts';

const GOOGLE_KEY = Deno.env.get('GOOGLE_AI_STUDIO_KEY') || Deno.env.get('GEMINI_API_KEY');
const VISION_MODEL = 'gemini-3.6-flash';
const MAX_MEDIA_BYTES = 20_000_000;

const MEDIA_PROMPT = `Describe this media for semantic search. Include visible people, objects, animals, places, scenery, actions, clothing, colors, mood, readable OCR text, and the apparent topic. For video, describe the sequence of events and any visible text. Be factual and concise. Never identify an unknown person by name.`;

type MediaPayload = { dataUrl: string; mimeType: string };

function decodeDataUrl(value: string): MediaPayload | null {
  const match = value.match(/^data:([^;,]+);base64,(.+)$/s);
  if (!match) return null;
  const estimatedBytes = Math.floor(match[2].length * 0.75);
  if (estimatedBytes <= 0 || estimatedBytes > MAX_MEDIA_BYTES) return null;
  return { dataUrl: value, mimeType: match[1].toLowerCase() };
}

async function loadMedia(value: string): Promise<MediaPayload | null> {
  const inline = decodeDataUrl(value);
  if (inline) return inline;
  if (!/^https?:\/\//i.test(value)) return null;

  const response = await fetch(value);
  if (!response.ok) return null;
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > MAX_MEDIA_BYTES) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.byteLength || bytes.byteLength > MAX_MEDIA_BYTES) return null;
  const mimeType = (response.headers.get('content-type') || 'application/octet-stream').split(';')[0].toLowerCase();
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return { dataUrl: `data:${mimeType};base64,${btoa(binary)}`, mimeType };
}

async function describeWithGemini(payload: MediaPayload): Promise<string> {
  if (!GOOGLE_KEY || (!payload.mimeType.startsWith('image/') && !payload.mimeType.startsWith('video/'))) return '';
  const base64 = payload.dataUrl.slice(payload.dataUrl.indexOf(',') + 1);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${VISION_MODEL}:generateContent?key=${GOOGLE_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { text: MEDIA_PROMPT },
          { inlineData: { mimeType: payload.mimeType, data: base64 } },
        ] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 700 },
      }),
    },
  );
  if (!response.ok) {
    console.warn('[zoe-media-understanding] gemini failed', response.status, (await response.text()).slice(0, 200));
    return '';
  }
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text).filter(Boolean).join('').trim() || '';
}

/** Understand an image or a complete short video. Image analysis falls back to NVIDIA vision. */
export async function describeSearchMedia(mediaRef: string | null | undefined): Promise<string> {
  if (!mediaRef) return '';
  try {
    const payload = await loadMedia(mediaRef);
    if (!payload) return '';
    const gemini = await describeWithGemini(payload);
    if (gemini) return gemini;
    if (payload.mimeType.startsWith('image/')) {
      return (await nvidiaVision(payload.dataUrl, MEDIA_PROMPT, { maxTokens: 700 }))?.trim() || '';
    }
  } catch (error) {
    console.warn('[zoe-media-understanding] analysis failed', error);
  }
  return '';
}