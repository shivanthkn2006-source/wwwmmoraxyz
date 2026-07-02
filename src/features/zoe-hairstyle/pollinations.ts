// Pollinations image generation for Zoe Hairstyle.
// IMPORTANT: when a selfie is supplied this must run as true image-editing via
// our Supabase Edge Function. Text-to-image fallbacks create a random model face,
// which is the exact bug users are reporting.
import { supabase } from '@/integrations/supabase/client';
export interface HairGenOpts {
  cut: string;
  color: string;
  gender: 'men' | 'women' | 'unisex';
  notes?: string;
  seed?: number;
  /** Base64 data URL or public URL of the user's selfie. If provided, we use
   *  Pollinations `kontext` (image-to-image) so the user's actual face is kept. */
  sourceImage?: string;
}

export function buildHairPrompt(o: HairGenOpts, faceMode: boolean): string {
  if (faceMode) {
    // Instruction-style prompt for image editing. Keep this very explicit so the
    // provider edits hair only instead of regenerating the whole person.
    return [
      `Edit the uploaded selfie, preserve the exact same person and identity`,
      `Do not change the face, eyes, nose, lips, jawline, skin tone, age, gender, expression, pose, or background`,
      `Only replace/restyle the hair area into a ${o.cut} hairstyle`,
      `Only change the hair color to ${o.color}`,
      `Realistic salon preview, natural hairline, photorealistic, no new person, no model face`,
      o.notes || '',
    ].filter(Boolean).join('. ');
  }
  return [
    `Ultra-realistic professional portrait photograph of a ${o.gender === 'unisex' ? 'person' : o.gender === 'men' ? 'man' : 'woman'}`,
    `with ${o.cut} hairstyle`,
    `${o.color} hair color`,
    'salon-quality lighting, studio backdrop, sharp focus, 8k, natural skin, magazine editorial',
    o.notes || '',
  ].filter(Boolean).join(', ');
}

export function hairstyleUrl(prompt: string, seed?: number, sourceUrl?: string): string {
  const s = seed ?? Math.floor(Math.random() * 1_000_000);
  const base = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.trim())}`;
  if (sourceUrl) {
    // kontext = image-to-image editing (preserves the person)
    return `${base}?width=768&height=1024&model=kontext&image=${encodeURIComponent(sourceUrl)}&nologo=true&seed=${s}`;
  }
  return `${base}?width=768&height=1024&model=flux&enhance=true&nologo=true&seed=${s}`;
}

export async function generateHairstyleImage(o: HairGenOpts): Promise<{ imageUrl: string; prompt: string; seed: number; provider: string; usedFace: boolean }> {
  const faceMode = !!o.sourceImage;
  const prompt = buildHairPrompt(o, faceMode);
  const seed = o.seed ?? Math.floor(Math.random() * 1_000_000);

  // Selfie flow: server-side Pollinations image edit. Never silently fall back
  // to text-to-image because that returns somebody else's face.
  if (o.sourceImage) {
    const { data, error } = await supabase.functions.invoke('pollinations-image', {
      body: {
        mode: 'hairstyle-edit',
        prompt,
        sourceImage: o.sourceImage,
        width: 768,
        height: 1024,
        model: 'p-image-edit',
        seed,
        nologo: true,
      },
    });

    if (error) {
      throw new Error(error.message || 'Pollinations image edit failed');
    }
    if (!data?.imageUrl) {
      throw new Error(data?.message || data?.error || 'No edited hairstyle image returned');
    }
    if (data.usedFace === false) {
      throw new Error('Face-preserving edit was unavailable; refusing to create a random face. Please check Pollinations image-edit API key/quota.');
    }

    return {
      imageUrl: data.imageUrl,
      prompt,
      seed: data.seed ?? seed,
      provider: data.provider ?? data.model ?? 'pollinations-image-edit',
      usedFace: true,
    };
  }

  const url = hairstyleUrl(prompt, seed);

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 60_000);
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'image/*' } });
    clearTimeout(t);
    if (r.ok) {
      const buf = await r.arrayBuffer();
      if (buf.byteLength > 1000) {
        const bytes = new Uint8Array(buf); let bin = ''; const C = 0x8000;
        for (let i = 0; i < bytes.length; i += C) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + C)));
        const ct = r.headers.get('content-type') || 'image/jpeg';
        return { imageUrl: `data:${ct};base64,${btoa(bin)}`, prompt, seed, provider: 'pollinations-flux', usedFace: false };
      }
    }
  } catch (e) { console.warn('[ZoeHair] fetch failed, using direct URL', e); }
  return { imageUrl: url, prompt, seed, provider: 'pollinations-flux-direct', usedFace: false };
}
