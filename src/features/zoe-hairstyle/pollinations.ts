// Pollinations image generation for Zoe Hairstyle
export interface HairGenOpts { cut: string; color: string; gender: 'men' | 'women' | 'unisex'; notes?: string; seed?: number; }

export function buildHairPrompt(o: HairGenOpts): string {
  return [
    `Ultra-realistic professional portrait photograph of a ${o.gender === 'unisex' ? 'person' : o.gender === 'men' ? 'man' : 'woman'}`,
    `with ${o.cut} hairstyle`,
    `${o.color} hair color`,
    'salon-quality lighting, studio backdrop, sharp focus, 8k, natural skin, magazine editorial',
    o.notes || '',
  ].filter(Boolean).join(', ');
}

export function hairstyleUrl(prompt: string, seed?: number): string {
  const s = seed ?? Math.floor(Math.random() * 1_000_000);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.trim())}?width=768&height=1024&model=flux&enhance=true&nologo=true&seed=${s}`;
}

export async function generateHairstyleImage(o: HairGenOpts): Promise<{ imageUrl: string; prompt: string; seed: number; provider: string }> {
  const prompt = buildHairPrompt(o);
  const seed = o.seed ?? Math.floor(Math.random() * 1_000_000);
  const url = hairstyleUrl(prompt, seed);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 45_000);
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'image/*' } });
    clearTimeout(t);
    if (r.ok) {
      const buf = await r.arrayBuffer();
      if (buf.byteLength > 1000) {
        const bytes = new Uint8Array(buf); let bin = ''; const C = 0x8000;
        for (let i = 0; i < bytes.length; i += C) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + C)));
        const ct = r.headers.get('content-type') || 'image/jpeg';
        return { imageUrl: `data:${ct};base64,${btoa(bin)}`, prompt, seed, provider: 'pollinations-bytes' };
      }
    }
  } catch (e) { console.warn('[ZoeHair] fetch failed, using direct URL', e); }
  return { imageUrl: url, prompt, seed, provider: 'pollinations-direct' };
}
