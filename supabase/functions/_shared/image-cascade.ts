/**
 * Shared picture cascade — the ONE place every image feature fetches art.
 * Order (first success wins):
 *   1. pollinations   – AI generation (flux)
 *   2. placeholdr     – AI generation (Flux on Cloudflare), keyword prompt
 *   3. horde        – AI Horde community Stable Diffusion (anonymous key)
 *   4. cloudflare   – Workers AI flux-1-schnell (CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_AI_TOKEN)
 *   5. deepai       – DeepAI text2img (DEEPAI_API_KEY)
 *   6. pixazo       – Pixazo free Flux Schnell (PIXAZO_API_KEY)
 *   7. kaleido        – stock AI library, used only when keywords match (relevance gate)
 *   8. justapi        – abstract filler
 *   9. imagenow       – plain colored filler (last resort)
 * Free.ai has no public API and is intentionally absent.
 * Callers persist the returned bytes once; provider URLs are never stored.
 */

export type CascadeProvider = 'pollinations' | 'placeholdr' | 'horde' | 'cloudflare' | 'deepai' | 'pixazo' | 'kaleido' | 'justapi' | 'imagenow';
export interface CascadeAttempt { provider: CascadeProvider; ok: boolean; ms: number; reason?: string }
export interface CascadeResult {
  bytes: Uint8Array | null;
  contentType: string;
  provider: CascadeProvider | null;
  kind: 'generated' | 'stock' | 'filler' | 'none';
  log: CascadeAttempt[];
}
export interface CascadeOptions {
  prompt: string;
  keywords?: string[];
  width?: number;
  height?: number;
  seed?: string;
  /** Skip providers (e.g. tests). */
  only?: CascadeProvider[];
}

export const CASCADE_ORDER: CascadeProvider[] = ['pollinations', 'placeholdr', 'horde', 'cloudflare', 'deepai', 'pixazo', 'kaleido', 'justapi', 'imagenow'];
const KIND: Record<CascadeProvider, CascadeResult['kind']> = {
  pollinations: 'generated', placeholdr: 'generated', horde: 'generated', cloudflare: 'generated', deepai: 'generated', pixazo: 'generated', kaleido: 'stock', justapi: 'filler', imagenow: 'filler',
};
const STOP = new Set('a an the and or of to in on at for with this that is are was be by from as it its no not show described exact scene funny bright warm color family friendly square composition written words letters captions logos brands watermark cartoon editorial depicts literally people objects action setting facial expressions title context joke dialogue headline'.split(' '));

export function deriveKeywords(prompt: string, max = 4): string[] {
  const seen = new Set<string>();
  for (const w of prompt.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)) {
    if (w.length > 3 && !STOP.has(w)) seen.add(w);
    if (seen.size >= max) break;
  }
  return [...seen];
}

function hash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getImage(url: string, headers: Record<string, string> = {}, minBytes = 1024): Promise<{ bytes: Uint8Array; type: string } | string> {
  try {
    const res = await fetch(url, { headers: { Accept: 'image/*', ...headers } });
    const type = res.headers.get('content-type') || '';
    if (!res.ok) { await res.body?.cancel(); return `http ${res.status}`; }
    if (!type.startsWith('image/')) { await res.body?.cancel(); return `not an image (${type})`; }
    if (res.status === 202) { await res.body?.cancel(); return 'pending'; }
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength < minBytes) return `tiny payload ${bytes.byteLength}b`;
    if (bytes.byteLength > 6 * 1024 * 1024) return 'too large';
    return { bytes, type };
  } catch (e) { return String((e as Error)?.message ?? e); }
}

async function runProvider(p: CascadeProvider, o: Required<Pick<CascadeOptions, 'prompt' | 'width' | 'height' | 'seed'>> & { keywords: string[] }) {
  const w = Math.min(2048, Math.max(128, o.width));
  const h = Math.min(2048, Math.max(128, o.height));
  const n = hash(o.seed);
  const kw = o.keywords.join(' ') || 'abstract';
  switch (p) {
    case 'pollinations': {
      const token = Deno.env.get('POLLINATIONS_API_KEY');
      const full = `${o.prompt}, no text, no words, no letters, no watermark, no logo`;
      return getImage(`https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=${w}&height=${h}&nologo=true&enhance=true&seed=${n % 100000}`, token ? { Authorization: `Bearer ${token}` } : {});
    }
    case 'placeholdr': {
      const url = `https://placeholdr.dev/${w}x${h}/${encodeURIComponent(o.prompt.slice(0, 300))}?style=cartoon&seed=${(n % 3) + 1}`;
      // The service renders asynchronously: 202 + SVG spinner while pending.
      for (let i = 0; i < 6; i++) {
        const out = await getImage(url);
        if (typeof out !== 'string' && !out.type.includes('svg')) return out;
        if (typeof out === 'string' && out !== 'pending' && !out.includes('svg')) return out;
        await sleep(4000);
      }
      return 'still rendering';
    }
    case 'horde': {
      const key = Deno.env.get('AI_HORDE_API_KEY') || '0000000000';
      const hdr = { apikey: key, 'Content-Type': 'application/json', 'Client-Agent': 'mmora:1:admin@mmora.xyz' };
      const sub = await fetch('https://aihorde.net/api/v2/generate/async', { method: 'POST', headers: hdr, body: JSON.stringify({ prompt: o.prompt.slice(0, 900), params: { width: 512, height: 512, steps: 20 }, nsfw: false, censor_nsfw: true, r2: true }) }).catch(() => null);
      if (!sub?.ok) { await sub?.body?.cancel(); return `submit http ${sub?.status ?? 'error'}`; }
      const { id } = await sub.json() as { id?: string };
      if (!id) return 'no job id';
      for (let i = 0; i < 30; i++) {
        await sleep(4000);
        const st = await fetch(`https://aihorde.net/api/v2/generate/check/${id}`).then((r) => r.json()).catch(() => null) as { done?: boolean; faulted?: boolean; is_possible?: boolean } | null;
        if (st?.faulted || st?.is_possible === false) return 'job faulted';
        if (st?.done) {
          const res = await fetch(`https://aihorde.net/api/v2/generate/status/${id}`).then((r) => r.json()).catch(() => null) as { generations?: { img: string }[] } | null;
          const img = res?.generations?.[0]?.img;
          return img ? getImage(img) : 'no image in result';
        }
      }
      await fetch(`https://aihorde.net/api/v2/generate/status/${id}`, { method: 'DELETE' }).then((r) => r.body?.cancel()).catch(() => {});
      return 'queue too slow';
    }
    case 'cloudflare': {
      const acct = Deno.env.get('CLOUDFLARE_ACCOUNT_ID'); const token = Deno.env.get('CLOUDFLARE_AI_TOKEN');
      if (!acct || !token) return 'not configured';
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/ai/run/@cf/black-forest-labs/flux-1-schnell`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: o.prompt.slice(0, 2000), steps: 4 }) }).catch(() => null);
      if (!res?.ok) { await res?.body?.cancel(); return `http ${res?.status ?? 'error'}`; }
      const b64 = (await res.json().catch(() => null) as { result?: { image?: string } } | null)?.result?.image;
      if (!b64) return 'no image';
      return { bytes: Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), type: 'image/jpeg' };
    }
    case 'deepai': {
      const key = Deno.env.get('DEEPAI_API_KEY'); if (!key) return 'not configured';
      const form = new FormData(); form.append('text', o.prompt.slice(0, 1000));
      const res = await fetch('https://api.deepai.org/api/text2img', { method: 'POST', headers: { 'api-key': key }, body: form }).catch(() => null);
      if (!res?.ok) { await res?.body?.cancel(); return `http ${res?.status ?? 'error'}`; }
      const url = (await res.json().catch(() => null) as { output_url?: string } | null)?.output_url;
      return url ? getImage(url) : 'no image';
    }
    case 'pixazo': {
      const key = Deno.env.get('PIXAZO_API_KEY'); if (!key) return 'not configured';
      const res = await fetch('https://gateway.pixazo.ai/flux-1-schnell/v1/getData', { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }, body: JSON.stringify({ prompt: o.prompt.slice(0, 1000), num_steps: 4, seed: n % 100000, height: 1024, width: 1024 }) }).catch(() => null);
      if (!res?.ok) { await res?.body?.cancel(); return `http ${res?.status ?? 'error'}`; }
      const d = await res.json().catch(() => null) as { output?: string; imageUrl?: string; url?: string } | null;
      const url = d?.output || d?.imageUrl || d?.url;
      return url ? getImage(url) : 'no image';
    }
    case 'kaleido': {
      if (!o.keywords.length) return 'no keywords';
      // Try the full keyword set, then each keyword alone; 404 = no match.
      for (const q of [o.keywords.join(', '), ...o.keywords]) {
        const res = await fetch(`https://kaleidoimages.ai/search?q=${encodeURIComponent(q)}&limit=5`).catch(() => null);
        if (!res?.ok) { await res?.body?.cancel(); continue; }
        const data = await res.json().catch(() => null) as { results?: { url: string; relevance?: number }[] } | null;
        const best = (data?.results ?? []).filter((r) => (r.relevance ?? 0) >= 3);
        if (best.length) return getImage(`https://kaleidoimages.ai${best[n % best.length].url}`);
      }
      return 'no keyword match';
    }
    case 'justapi':
      // Abstract art is a compact SVG, so accept a smaller payload.
      return getImage(`https://photos.justapi.dev/abstract/${w}/${h}?seed=${encodeURIComponent(kw)}`, {}, 300);
    case 'imagenow':
      return getImage(`https://my.imagenow.dev/${w}x${h}/1b2440/c8a96a.png`);
  }
}

export async function fetchImageCascade(opts: CascadeOptions): Promise<CascadeResult> {
  const cfg = {
    prompt: opts.prompt,
    width: opts.width ?? 1024,
    height: opts.height ?? 1024,
    seed: opts.seed ?? opts.prompt,
    keywords: opts.keywords?.length ? opts.keywords : deriveKeywords(opts.prompt),
  };
  const log: CascadeAttempt[] = [];
  for (const p of CASCADE_ORDER) {
    if (opts.only && !opts.only.includes(p)) continue;
    const t = Date.now();
    const out = await runProvider(p, cfg);
    if (typeof out !== 'string') {
      log.push({ provider: p, ok: true, ms: Date.now() - t });
      return { bytes: out.bytes, contentType: out.type, provider: p, kind: KIND[p], log };
    }
    log.push({ provider: p, ok: false, ms: Date.now() - t, reason: out });
  }
  console.warn('[image-cascade] all providers failed', JSON.stringify(log));
  return { bytes: null, contentType: '', provider: null, kind: 'none', log };
}

export function extFor(contentType: string): string {
  return contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : contentType.includes('svg') ? 'svg' : 'jpg';
}

/**
 * Drop-in replacement for `fetch(<pollinations prompt URL>)`. Parses the prompt
 * and size from the URL, runs the full cascade, and returns an image Response
 * (or a 502) so existing callers keep their byte-handling code unchanged.
 */
export async function cascadeFetch(url: string, _init?: RequestInit): Promise<Response> {
  const u = new URL(url);
  const prompt = decodeURIComponent(u.pathname.replace(/^\/prompt\//, ''));
  const width = Number(u.searchParams.get('width')) || 1024;
  const height = Number(u.searchParams.get('height')) || 1024;
  const art = await fetchImageCascade({ prompt, width, height, seed: u.searchParams.get('seed') ?? undefined });
  if (!art.bytes) return new Response(JSON.stringify({ error: 'all image providers failed', log: art.log }), { status: 502 });
  return new Response(art.bytes, { status: 200, headers: { 'content-type': art.contentType.split(';')[0], 'x-image-provider': art.provider ?? '' } });
}
