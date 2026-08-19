/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SOVEREIGN IMAGE ENGINE — Pollinations only.
 *
 * The old placeholder/Google path is gone. Every card image is rendered by
 * Pollinations with bounded retries across its models:
 *   flux → turbo → flux (retry) → flux-realism (retry)
 * A deterministic local SVG is written ONLY if every Pollinations attempt
 * failed, so a card never renders empty; it is reported as `local-svg` with
 * `status: 'fallback'` so the log page shows it truthfully.
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

export interface RenderImageAttempt {
  provider: string;
  model?: string;
  ok: boolean;
  ms: number;
  reason?: string;
}

export interface RenderImageResult {
  path: string | null;
  provider: 'pollinations-flux' | 'pollinations-turbo' | 'pollinations-flux-realism' | 'local-svg' | 'none';
  /** 'generated' = real Pollinations art, 'fallback' = local SVG, 'failed' = nothing stored. */
  status: 'generated' | 'fallback' | 'failed';
  /** Total provider calls made (including the successful one). */
  attempts: number;
  /** Provider calls that failed before the one that worked. */
  retries: number;
  /** Estimated spend. Pollinations is free, so this is 0 unless a paid provider is added. */
  costUsd: number;
  prompt: string;
  log: RenderImageAttempt[];
}

/** Per-successful-image price by provider (USD). Pollinations is free. */
const PROVIDER_COST_USD: Record<string, number> = {
  'pollinations-flux': 0,
  'pollinations-turbo': 0,
  'pollinations-flux-realism': 0,
  'local-svg': 0,
};

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
  const log: RenderImageAttempt[] = [];
  const seed = hashSeed(opts.storagePath) % 100000;
  const fullPrompt = `${opts.prompt}, no text, no words, no letters, no watermark, no logo`;
  const encoded = encodeURIComponent(fullPrompt);
  const pollToken = Deno.env.get('POLLINATIONS_API_KEY');
  const pollHeaders = pollToken ? { Authorization: `Bearer ${pollToken}` } : {};

  const pollUrl = (model: string, s: number, enhance: boolean) =>
    `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}` +
    `&nologo=true&model=${model}&seed=${s}${enhance ? '&enhance=true' : ''}`;

  // Pollinations-only ladder with retries. Each entry is one provider call.
  const ladder: Array<{ name: RenderImageResult['provider']; model: string; run: () => Promise<Uint8Array | string> }> = [
    { name: 'pollinations-flux', model: 'flux', run: () => fetchBytes(pollUrl('flux', seed, true), pollHeaders, 45000) },
    { name: 'pollinations-turbo', model: 'turbo', run: () => fetchBytes(pollUrl('turbo', (seed + 7) % 100000, false), pollHeaders, 30000) },
    { name: 'pollinations-flux', model: 'flux', run: () => fetchBytes(pollUrl('flux', (seed + 31) % 100000, false), pollHeaders, 45000) },
    { name: 'pollinations-flux-realism', model: 'flux-realism', run: () => fetchBytes(pollUrl('flux-realism', (seed + 61) % 100000, true), pollHeaders, 40000) },
  ];

  let attempts = 0;
  for (const step of ladder) {
    attempts++;
    const started = Date.now();
    const out = await step.run();
    const ms = Date.now() - started;
    if (out instanceof Uint8Array) {
      const stored = await upload(out, 'image/jpeg', opts);
      log.push({ provider: step.name, model: step.model, ok: stored, ms, reason: stored ? undefined : 'upload failed' });
      if (stored) {
        return {
          path: opts.storagePath,
          provider: step.name,
          status: 'generated',
          attempts,
          retries: attempts - 1,
          costUsd: PROVIDER_COST_USD[step.name] ?? 0,
          prompt: fullPrompt,
          log,
        };
      }
    } else {
      log.push({ provider: step.name, model: step.model, ok: false, ms, reason: out });
    }
    // Small spacing between retries so a rate-limited provider can recover.
    if (attempts < ladder.length) await new Promise((r) => setTimeout(r, 600 * attempts));
  }

  // Every Pollinations attempt failed — write the deterministic local poster so
  // the card is never blank, and report it as a fallback.
  const svgPath = opts.storagePath.replace(/\.(jpe?g|png)$/i, '.svg');
  const svg = localSvgPoster(opts.storagePath, palette, width, height);
  const started = Date.now();
  const stored = await upload(svg, 'image/svg+xml', { ...opts, storagePath: svgPath });
  log.push({ provider: 'local-svg', ok: stored, ms: Date.now() - started });
  console.warn('[image-engine] Pollinations exhausted', JSON.stringify(log));

  return {
    path: stored ? svgPath : null,
    provider: stored ? 'local-svg' : 'none',
    status: stored ? 'fallback' : 'failed',
    attempts,
    retries: attempts,
    costUsd: 0,
    prompt: fullPrompt,
    log,
  };
}
