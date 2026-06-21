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
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
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

  throw new Error('All image generation providers failed');
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

export default { generateImage, generateRegionalAvatar, getPollinationsUrl };
