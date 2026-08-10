/**
 * ═══════════════════════════════════════════════════════════════
 * POLLINATIONS SERVICE - Client-side image generation
 * ═══════════════════════════════════════════════════════════════
 * 
 * Primary: Pollinations.ai (free, no API key)
 * Fallback: Edge functions (generate-image, pollinations-image)
 * 
 * Usage:
 *   import { generateImage, getPollinationsUrl } from '@/services/pollinationsService';
 *   const result = await generateImage('a sunset over mountains');
 *   // result.imageUrl = data:image/...  or direct URL
 * ═══════════════════════════════════════════════════════════════
 */

import { supabase } from '@/integrations/supabase/client';

export interface PollinationsOptions {
  width?: number;
  height?: number;
  model?: 'flux' | 'turbo' | 'flux-realism' | 'flux-anime' | 'flux-3d';
  seed?: number;
  enhance?: boolean;
  nologo?: boolean;
  timeoutMs?: number;
}

export interface ImageGenResult {
  imageUrl: string;
  provider: 'pollinations-direct' | 'pollinations-edge' | 'gemini-edge' | 'unknown';
  directUrl?: string; // Pollinations direct URL (hotlinkable)
}

export type IdentityImageErrorCode = 'REFERENCE_NOT_HUMAN' | 'IDENTITY_GENERATION_FAILED';

export class IdentityImageError extends Error {
  constructor(public readonly code: IdentityImageErrorCode, message: string) {
    super(message);
    this.name = 'IdentityImageError';
  }
}

const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Unable to read image'));
  reader.onerror = () => reject(reader.error ?? new Error('Unable to read image'));
  reader.readAsDataURL(file);
});

export async function generateIdentityImage(
  prompt: string,
  reference: { file?: File; imageUrl?: string },
): Promise<ImageGenResult> {
  const imageBase64 = reference.file ? await fileToDataUrl(reference.file) : undefined;
  const sourceImage = imageBase64 ?? reference.imageUrl;
  if (!sourceImage) {
    throw new IdentityImageError('IDENTITY_GENERATION_FAILED', 'A reference photo is required.');
  }

  // Pollinations is the primary identity-preserving editor. It was already
  // configured, but this flow previously bypassed it and called Gemini only.
  try {
    const { data: pollinationsData, error: pollinationsError } = await supabase.functions.invoke('pollinations-image', {
      body: {
        prompt,
        sourceImage,
        mode: 'image-edit',
        model: 'p-image-edit',
        width: 768,
        height: 1024,
      },
    });

    if (!pollinationsError && pollinationsData?.imageUrl && pollinationsData?.usedFace !== false) {
      return { imageUrl: pollinationsData.imageUrl, provider: 'pollinations-edge' };
    }
    console.warn('[PollinationsService] Identity edit unavailable, trying Gemini fallback:', pollinationsData?.message || pollinationsError?.message);
  } catch (pollinationsError) {
    console.warn('[PollinationsService] Identity edit failed, trying Gemini fallback:', pollinationsError);
  }

  const { data, error } = await supabase.functions.invoke('edit-image', {
    body: { prompt, imageBase64, imageUrl: reference.imageUrl },
  });

  if (error || !data?.imageUrl) {
    const responseCode = data?.code;
    if (responseCode === 'REFERENCE_NOT_HUMAN') {
      throw new IdentityImageError('REFERENCE_NOT_HUMAN', data?.message || 'A clear human reference photo is required.');
    }
    throw new IdentityImageError('IDENTITY_GENERATION_FAILED', data?.message || error?.message || 'Identity image generation failed.');
  }

  return { imageUrl: data.imageUrl, provider: 'gemini-edge' };
}

/**
 * Get a direct Pollinations URL (no fetch needed, use as img src)
 */
export function getPollinationsUrl(prompt: string, opts: PollinationsOptions = {}): string {
  const {
    width = 1024, height = 1024, model = 'flux',
    seed, enhance = true, nologo = true,
  } = opts;
  const encoded = encodeURIComponent(prompt.trim());
  let url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&model=${model}&enhance=${enhance}&nologo=${nologo}`;
  if (seed !== undefined) url += `&seed=${seed}`;
  return url;
}

/**
 * Generate image: Pollinations direct → Edge function fallback
 */
export async function generateImage(
  prompt: string,
  opts: PollinationsOptions = {}
): Promise<ImageGenResult> {
  const { timeoutMs = 25000, ...rest } = opts;

  // 1. Try Pollinations directly from client
  try {
    const url = getPollinationsUrl(prompt, rest);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'image/*' },
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const buf = await resp.arrayBuffer();
      if (buf.byteLength > 1000) {
        const bytes = new Uint8Array(buf);
        const chunks: string[] = [];
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
        }
        const b64 = btoa(chunks.join(''));
        const ct = resp.headers.get('content-type') || 'image/jpeg';
        console.log(`[PollinationsService] ✅ Direct success (${(buf.byteLength / 1024).toFixed(1)}KB)`);
        return {
          imageUrl: `data:${ct};base64,${b64}`,
          provider: 'pollinations-direct',
          directUrl: url,
        };
      }
    }
  } catch (e) {
    console.warn('[PollinationsService] Direct fetch failed, trying edge function:', e);
  }

  // 2. Fallback: Edge function (which also tries Pollinations → Gemini)
  try {
    const { data, error } = await supabase.functions.invoke('generate-image', {
      body: { prompt, width: rest.width, height: rest.height },
    });

    if (!error && data?.imageUrl) {
      console.log(`[PollinationsService] ✅ Edge function success (provider: ${data.provider})`);
      return {
        imageUrl: data.imageUrl,
        provider: data.provider?.includes('pollinations') ? 'pollinations-edge' : 'gemini-edge',
      };
    }
  } catch (e) {
    console.error('[PollinationsService] Edge function fallback failed:', e);
  }

  // Browser CORS can block reading the response even though the image endpoint
  // itself is available. Let the <img> element load that URL directly rather
  // than incorrectly downgrading an image request into a text reply.
  return {
    imageUrl: getPollinationsUrl(prompt, rest),
    provider: 'pollinations-direct',
    directUrl: getPollinationsUrl(prompt, rest),
  };
}

/**
 * Generate regional avatar via Pollinations
 */
export async function generateRegionalAvatar(
  style: string,
  mood = 'idle'
): Promise<ImageGenResult> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-regional-avatar', {
      body: { style, mood },
    });

    if (!error && data?.imageUrl) {
      return {
        imageUrl: data.imageUrl,
        provider: data.provider?.includes('pollinations') ? 'pollinations-edge' : 'gemini-edge',
      };
    }
  } catch (e) {
    console.error('[PollinationsService] Regional avatar failed:', e);
  }

  throw new Error('Regional avatar generation failed');
}

export default { generateImage, generateIdentityImage, generateRegionalAvatar, getPollinationsUrl };
