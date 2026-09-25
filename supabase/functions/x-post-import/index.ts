import { requireCaller } from '../_shared/caller-guard.ts';
/**
 * X POST IMPORT — reads a public post on X (twitter.com / x.com) and returns
 * its text, image and original date so the member can save it to their Home.
 *
 * No X credentials are involved and nothing is invented: the function reads the
 * public syndication/oEmbed representation of that single post. If the post is
 * private, deleted or unreadable it says so instead of guessing.
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const decode = (value: string) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

/** Accepts any x.com / twitter.com status link and returns the numeric id. */
export function parseStatusId(input: string): string | null {
  const match = String(input).match(
    /(?:https?:\/\/)?(?:www\.|mobile\.)?(?:twitter|x|fxtwitter|vxtwitter|fixupx)\.com\/[^/]+\/status(?:es)?\/(\d{1,25})/i,
  );
  if (match) return match[1];
  const bare = String(input).trim();
  return /^\d{10,25}$/.test(bare) ? bare : null;
}

interface Imported {
  id: string;
  url: string;
  text: string;
  author: string | null;
  handle: string | null;
  imageUrl: string | null;
  createdAt: string | null;
}

async function viaSyndication(id: string): Promise<Imported | null> {
  // Public syndication endpoint used by embedded posts.
  const token = ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
  const res = await fetch(
    `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${token}`,
    { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } },
  );
  if (!res.ok) return null;
  const data = await res.json().catch(() => null) as Record<string, any> | null;
  if (!data || typeof data.text !== 'string') return null;

  const photo = data.photos?.[0]?.url
    ?? data.mediaDetails?.find((m: any) => m?.type === 'photo')?.media_url_https
    ?? data.video?.poster
    ?? null;

  return {
    id,
    url: `https://x.com/i/status/${id}`,
    text: String(data.text).trim(),
    author: data.user?.name ?? null,
    handle: data.user?.screen_name ? `@${data.user.screen_name}` : null,
    imageUrl: typeof photo === 'string' ? photo : null,
    createdAt: typeof data.created_at === 'string' ? data.created_at : null,
  };
}

async function viaOEmbed(id: string): Promise<Imported | null> {
  const res = await fetch(
    `https://publish.twitter.com/oembed?url=${encodeURIComponent(`https://x.com/i/status/${id}`)}&omit_script=1&dnt=true`,
    { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } },
  );
  if (!res.ok) return null;
  const data = await res.json().catch(() => null) as Record<string, any> | null;
  if (!data?.html) return null;

  const html = String(data.html);
  const body = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? '';
  const text = decode(body.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).trim();
  const dateText = html.match(/>([A-Z][a-z]{2,8} \d{1,2}, \d{4})</)?.[1] ?? null;
  const parsed = dateText ? new Date(dateText) : null;

  return {
    id,
    url: `https://x.com/i/status/${id}`,
    text,
    author: data.author_name ?? null,
    handle: null,
    imageUrl: null,
    createdAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  { const __c = await requireCaller(req, 'member'); if (__c instanceof Response) return __c; }

  try {
    const { url } = await req.json().catch(() => ({ url: '' }));
    const id = parseStatusId(String(url ?? ''));
    if (!id) {
      return json({ ok: false, error: 'That does not look like a link to a post on X.' }, 400);
    }

    let post: Imported | null = null;
    try {
      post = await viaSyndication(id);
    } catch (error) {
      console.error('x-post-import syndication failed:', error);
    }
    if (!post) {
      try {
        post = await viaOEmbed(id);
      } catch (error) {
        console.error('x-post-import oembed failed:', error);
      }
    }

    if (!post || !post.text) {
      return json(
        { ok: false, error: 'That post could not be read. It may be private, deleted, or from a protected account.' },
        404,
      );
    }

    return json({ ok: true, post });
  } catch (error) {
    console.error('x-post-import error:', error);
    return json({ ok: false, error: 'Could not read that link right now.' }, 500);
  }
});
