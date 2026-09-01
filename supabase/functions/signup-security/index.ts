import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const clientIp = (req: Request): string | null => {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false }, 405);

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? '');
  if (action === 'config') {
    const siteKey = Deno.env.get('TURNSTILE_SITE_KEY');
    return siteKey ? json({ ok: true, siteKey }) : json({ ok: false }, 503);
  }
  if (action !== 'verify') return json({ ok: false }, 400);

  const token = typeof body.token === 'string' ? body.token : '';
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secret || !token || token.length > 4096) return json({ ok: false }, 400);

  try {
    const form = new FormData();
    form.set('secret', secret);
    form.set('response', token);
    const ip = clientIp(req);
    if (ip) form.set('remoteip', ip);
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    if (!response.ok) return json({ ok: false }, 502);
    const result = await response.json() as { success?: boolean };
    return json({ ok: result.success === true }, result.success === true ? 200 : 403);
  } catch {
    return json({ ok: false }, 502);
  }
});