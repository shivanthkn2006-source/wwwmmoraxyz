// Pollinations-only image generation for Zoe Decorator (per user requirement)
import type { DecoratorSpace, DecoratorTheme } from './intent';

export interface DecorateOptions {
  space?: DecoratorSpace;
  theme?: DecoratorTheme;
  customNotes?: string;
  seed?: number;
}

export function buildDecoratorPrompt(opts: DecorateOptions): string {
  const space = opts.space ?? 'space';
  const theme = opts.theme ?? 'modern';
  const notes = (opts.customNotes ?? '').trim();
  return [
    `Photorealistic interior design redesign of a ${space.replace('-', ' ')}`,
    `${theme} style`,
    'professional architectural photography, natural lighting, 8k, ultra-detailed',
    'tasteful furniture, plants, decor, harmonious color palette, magazine-quality composition',
    notes ? `Additional notes: ${notes}` : '',
  ].filter(Boolean).join(', ');
}

export function pollinationsUrl(prompt: string, seed?: number, width = 1024, height = 1024): string {
  const encoded = encodeURIComponent(prompt.trim());
  const s = seed ?? Math.floor(Math.random() * 1_000_000);
  return `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&model=flux&enhance=true&nologo=true&seed=${s}`;
}

/**
 * Generate: try to fetch bytes for offline/gallery use; if CORS/timeout fails,
 * fall back to the direct Pollinations URL (still renders in <img>).
 */
export async function generateDecoratorImage(opts: DecorateOptions): Promise<{ imageUrl: string; prompt: string; seed: number; provider: 'pollinations-bytes' | 'pollinations-direct' }> {
  const prompt = buildDecoratorPrompt(opts);
  const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000);
  const url = pollinationsUrl(prompt, seed);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const resp = await fetch(url, { signal: controller.signal, headers: { Accept: 'image/*' }, mode: 'cors' });
    if (resp.ok) {
      const buf = await resp.arrayBuffer();
      if (buf.byteLength > 1000) {
        // Chunked base64 to avoid stack overflow on large buffers
        const bytes = new Uint8Array(buf);
        let bin = '';
        const CHUNK = 0x8000;
        for (let i = 0; i < bytes.length; i += CHUNK) {
          bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
        }
        const b64 = btoa(bin);
        const ct = resp.headers.get('content-type') || 'image/jpeg';
        return { imageUrl: `data:${ct};base64,${b64}`, prompt, seed, provider: 'pollinations-bytes' };
      }
    }
  } catch (e) {
    console.warn('[ZoeDecorator] fetch failed, using direct URL', e);
  } finally { clearTimeout(timeout); }

  // Direct URL fallback (browser will load it fine even if fetch was blocked)
  return { imageUrl: url, prompt, seed, provider: 'pollinations-direct' };
}
