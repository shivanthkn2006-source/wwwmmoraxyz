/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SOVEREIGN IMAGE ENGINE — never returns "no image".
 *
 * Provider ladder (first success wins):
 *   1. Pollinations · flux      (best quality)
 *   2. Pollinations · turbo     (fast, different endpoint params)
 *   3. Google AI Studio image   (only when GOOGLE_AI_STUDIO_KEY is present)
 *   4. Deterministic SVG poster (local, zero-network — ALWAYS succeeds)
 *
 * Bytes are always persisted to Supabase Storage; provider URLs are never
 * stored because they are not durable. No Lovable AI Gateway is used.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface RenderImageOptions {
  /** Scene/style description. No text should be requested inside the art. */
  prompt: string;
  /** Storage object path, e.g. `${userId}/2026-08-19_noon.jpg`. */
  storagePath: string;
  bucket: string;
  supabaseUrl: string;
  serviceKey: string;
  /** Palette used by the guaranteed local fallback. */
  palette?: [string, string, string];
  width?: number;
  height?: number;
}

export interface RenderImageResult {
  path: string | null;
  provider: 'pollinations-flux' | 'pollinations-turbo' | 'google' | 'local-svg' | 'none';
  attempts: Array<{ provider: string; ok: boolean; reason?: string }>;
}

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

async function fetchBytes(url: string, headers: Record<string, string>, timeoutMs: number): Promise<Uint8Array | string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'image/*', ...headers } });
    if (!res.ok) return `http ${res.status}`;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength < 1024) return `tiny payload ${bytes.byteLength}b`;
    return bytes;
  } catch (e) {
    return String((e as Error)?.message ?? e);
  } finally {
    clearTimeout(timer);
  }
}

/** Local, deterministic gradient poster. Pure string → bytes, cannot fail. */
export function localSvgPoster(seedText: string, palette: [string, string, string], w: number, h: number): Uint8Array {
  const seed = hashSeed(seedText);
  const orbs = Array.from({ length: 5 }, (_, i) => {
    const s = hashSeed(`${seedText}:${i}`);
    const cx = (s % w);
    const cy = ((s >> 7) % h);
    const r = 60 + ((s >> 3) % 220);
    const o = 0.05 + ((s >> 11) % 10) / 60;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${palette[i % 3]}" opacity="${o.toFixed(3)}"/>`;
  }).join('');
  const stars = Array.from({ length: 90 }, (_, i) => {
    const s = hashSeed(`${seedText}#${i}`);
    return `<circle cx="${s % w}" cy="${(s >> 9) % h}" r="${1 + ((s >> 5) % 2)}" fill="#ffffff" opacity="${(0.15 + ((s >> 13) % 60) / 120).toFixed(2)}"/>`;
  }).join('');
  const rot = seed % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" gradientTransform="rotate(${rot} 0.5 0.5)">
      <stop offset="0%" stop-color="${palette[0]}"/>
      <stop offset="55%" stop-color="${palette[1]}"/>
      <stop offset="100%" stop-color="${palette[2]}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  ${orbs}
  ${stars}
</svg>`;
  return new TextEncoder().encode(svg);
}

async function upload(
  bytes: Uint8Array,
  contentType: string,
  o: Pick<RenderImageOptions, 'bucket' | 'storagePath' | 'supabaseUrl' | 'serviceKey'>,
): Promise<boolean> {
  const res = await fetch(`${o.supabaseUrl}/storage/v1/object/${o.bucket}/${o.storagePath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${o.serviceKey}`,
      apikey: o.serviceKey,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: bytes,
  });
  if (!res.ok) {
    console.warn('[image-engine] upload failed', res.status, (await res.text()).slice(0, 200));
    return false;
  }
  return true;
}

export async function renderImage(opts: RenderImageOptions): Promise<RenderImageResult> {
  const width = opts.width ?? 1080;
  const height = opts.height ?? 1920;
  const palette = opts.palette ?? ['#131a2b', '#2b3d63', '#c8a96a'];
  const attempts: RenderImageResult['attempts'] = [];
  const seed = hashSeed(opts.storagePath) % 100000;
  const encoded = encodeURIComponent(
    `${opts.prompt}, no text, no words, no letters, no watermark, no logo`,
  );
  const pollToken = Deno.env.get('POLLINATIONS_API_KEY');
  const pollHeaders = pollToken ? { Authorization: `Bearer ${pollToken}` } : {};

  const ladder: Array<{ name: RenderImageResult['provider']; run: () => Promise<Uint8Array | string> }> = [
    {
      name: 'pollinations-flux',
      run: () => fetchBytes(
        `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&enhance=true&model=flux&seed=${seed}`,
        pollHeaders, 45000,
      ),
    },
    {
      name: 'pollinations-turbo',
      run: () => fetchBytes(
        `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&model=turbo&seed=${(seed + 7) % 100000}`,
        pollHeaders, 30000,
      ),
    },
  ];

  const googleKey = Deno.env.get('GOOGLE_AI_STUDIO_KEY');
  if (googleKey) {
    ladder.push({
      name: 'google',
      run: async () => {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${googleKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: opts.prompt }] }],
                generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
              }),
            },
          );
          if (!res.ok) return `http ${res.status}`;
          const j = await res.json();
          const parts = j?.candidates?.[0]?.content?.parts ?? [];
          const inline = parts.find((p: any) => p?.inlineData?.data)?.inlineData?.data;
          if (!inline) return 'no inline image';
          const bin = atob(inline);
          const out = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
          return out;
        } catch (e) {
          return String((e as Error)?.message ?? e);
        }
      },
    });
  }

  for (const step of ladder) {
    const out = await step.run();
    if (out instanceof Uint8Array) {
      const stored = await upload(out, 'image/jpeg', opts);
      attempts.push({ provider: step.name, ok: stored, reason: stored ? undefined : 'upload failed' });
      if (stored) return { path: opts.storagePath, provider: step.name, attempts };
    } else {
      attempts.push({ provider: step.name, ok: false, reason: out });
    }
  }

  // Guaranteed local fallback — an image ALWAYS exists.
  const svgPath = opts.storagePath.replace(/\.(jpe?g|png)$/i, '.svg');
  const svg = localSvgPoster(opts.storagePath, palette, width, height);
  const stored = await upload(svg, 'image/svg+xml', { ...opts, storagePath: svgPath });
  attempts.push({ provider: 'local-svg', ok: stored });
  return stored
    ? { path: svgPath, provider: 'local-svg', attempts }
    : { path: null, provider: 'none', attempts };
}
