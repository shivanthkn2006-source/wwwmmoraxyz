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

export function pollinationsUrl(prompt: string, seed?: number): string {
  const encoded = encodeURIComponent(prompt.trim());
  const s = seed ?? Math.floor(Math.random() * 1_000_000);
  return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&model=flux&enhance=true&nologo=true&seed=${s}`;
}

export async function generateDecoratorImage(opts: DecorateOptions): Promise<{ imageUrl: string; prompt: string; seed: number }> {
  const prompt = buildDecoratorPrompt(opts);
  const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000);
  const url = pollinationsUrl(prompt, seed);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const resp = await fetch(url, { signal: controller.signal, headers: { Accept: 'image/*' } });
    if (!resp.ok) throw new Error(`Pollinations HTTP ${resp.status}`);
    const buf = await resp.arrayBuffer();
    if (buf.byteLength < 1000) throw new Error('Pollinations returned empty image');
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    const ct = resp.headers.get('content-type') || 'image/jpeg';
    return { imageUrl: `data:${ct};base64,${b64}`, prompt, seed };
  } finally { clearTimeout(timeout); }
}
