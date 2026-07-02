// Pollinations image generation for Zoe Hairstyle
// Face-preserving via kontext model when a source selfie is provided.
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
    // Instruction-style prompt for image editing (kontext)
    return [
      `Keep the same person, same face, same skin tone, same identity`,
      `Restyle ONLY the hair to a ${o.cut} hairstyle`,
      `Change hair color to ${o.color}`,
      `Professional salon photograph, sharp focus, natural lighting, photo-realistic`,
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

/** Upload a data URL / blob URL to catbox.moe (free, no key) → public https URL. */
async function uploadSelfieToPublicHost(dataUrl: string): Promise<string | null> {
  try {
    // Convert data URL → Blob
    let blob: Blob;
    if (dataUrl.startsWith('data:')) {
      const [meta, b64] = dataUrl.split(',');
      const mime = /data:([^;]+)/.exec(meta)?.[1] ?? 'image/jpeg';
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      blob = new Blob([arr], { type: mime });
    } else {
      const r = await fetch(dataUrl);
      blob = await r.blob();
    }
    const fd = new FormData();
    fd.append('reqtype', 'fileupload');
    fd.append('fileToUpload', blob, 'selfie.jpg');
    const resp = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: fd });
    if (!resp.ok) return null;
    const url = (await resp.text()).trim();
    return url.startsWith('http') ? url : null;
  } catch (e) {
    console.warn('[ZoeHair] selfie upload failed', e);
    return null;
  }
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
  // 1. If we have a selfie, host it publicly so kontext can read it.
  let publicSourceUrl: string | undefined;
  if (o.sourceImage) {
    const uploaded = await uploadSelfieToPublicHost(o.sourceImage);
    if (uploaded) publicSourceUrl = uploaded;
    else console.warn('[ZoeHair] falling back to text-only (host upload failed)');
  }
  const faceMode = !!publicSourceUrl;
  const prompt = buildHairPrompt(o, faceMode);
  const seed = o.seed ?? Math.floor(Math.random() * 1_000_000);
  const url = hairstyleUrl(prompt, seed, publicSourceUrl);

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
        return { imageUrl: `data:${ct};base64,${btoa(bin)}`, prompt, seed, provider: faceMode ? 'pollinations-kontext' : 'pollinations-flux', usedFace: faceMode };
      }
    }
  } catch (e) { console.warn('[ZoeHair] fetch failed, using direct URL', e); }
  return { imageUrl: url, prompt, seed, provider: faceMode ? 'pollinations-kontext-direct' : 'pollinations-flux-direct', usedFace: faceMode };
}
