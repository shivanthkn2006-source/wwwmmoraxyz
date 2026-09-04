/**
 * WEB READER — server-side reader so every external source Zoe cites opens
 * INSIDE the platform. The browser never leaves mmora: this function fetches
 * the page, strips scripts/markup and returns clean readable text that the
 * internal `/source` reader renders.
 */
import { publicGuard } from '../_shared/public-guard.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const decode = (value: string) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&[a-z#0-9]+;/gi, ' ');

function meta(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`,
    'i',
  );
  const alt = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`,
    'i',
  );
  const m = html.match(re) || html.match(alt);
  return m ? decode(m[1]).trim() : null;
}

function readable(html: string): string[] {
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<(nav|header|footer|aside|form|svg)[\s\S]*?<\/\1>/gi, ' ');

  const blocks = body.match(/<(p|h1|h2|h3|li)[^>]*>[\s\S]*?<\/\1>/gi) ?? [];
  const paragraphs = blocks
    .map((block) =>
      decode(block.replace(/<[^>]+>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((text) => text.length > 40);

  const seen = new Set<string>();
  const unique = paragraphs.filter((text) => {
    if (seen.has(text)) return false;
    seen.add(text);
    return true;
  });

  if (unique.length) return unique.slice(0, 80);

  const flat = decode(body.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
  return flat ? [flat.slice(0, 6000)] : [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const guard = await publicGuard(req, {
    name: 'web-reader',
    limit: 60,
    windowSeconds: 60,
    maxBodyBytes: 16 * 1024,
  });
  if (guard.response) return guard.response;

  try {
    const rawUrl = String((guard.body as Record<string, unknown>)?.url ?? '').trim();
    let target: URL;
    try {
      target = new URL(rawUrl);
    } catch {
      return json({ error: 'Invalid url' }, 400);
    }
    if (!/^https?:$/.test(target.protocol)) return json({ error: 'Unsupported protocol' }, 400);
    if (/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.)/i.test(target.hostname)) {
      return json({ error: 'Blocked host' }, 400);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    let res: Response;
    try {
      res = await fetch(target.toString(), {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      return json({ url: target.toString(), ok: false, status: res.status, paragraphs: [] });
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (!/text\/html|application\/xhtml|text\/plain/i.test(contentType)) {
      return json({
        url: target.toString(),
        ok: false,
        status: res.status,
        contentType,
        paragraphs: [],
      });
    }

    const html = (await res.text()).slice(0, 1_500_000);
    const title =
      meta(html, 'og:title') ||
      decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim() ||
      target.hostname;

    return json({
      ok: true,
      url: target.toString(),
      title,
      siteName: meta(html, 'og:site_name') || target.hostname,
      description: meta(html, 'og:description') || meta(html, 'description'),
      image: meta(html, 'og:image'),
      publishedAt: meta(html, 'article:published_time'),
      paragraphs: readable(html),
    });
  } catch (error) {
    console.error('[web-reader] failed:', error);
    return json({ error: 'Reader failed', paragraphs: [] }, 200);
  }
});
