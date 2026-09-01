/**
 * SIGNUP SECURITY — Turnstile config + verification behind the edge WAF.
 *
 *  config → hands the browser the public Turnstile site key (never the secret).
 *  verify → validates the visitor's Turnstile token with Cloudflare, binds it
 *           to the caller's IP, and burns it so the same token can never be
 *           replayed for a second account.
 *
 * Every call passes through `guardRequest`: bad user agents, oversized bodies,
 * injection payloads and burst traffic are refused before any work happens.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { guardRequest, wafCorsHeaders, consumeRateLimit } from '../_shared/waf.ts';

const corsHeaders = wafCorsHeaders;

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

/** Tokens already spent in this isolate — a cheap replay guard. */
const spent = new Map<string, number>();
const TOKEN_TTL_MS = 5 * 60_000;

const burn = (token: string): boolean => {
  const now = Date.now();
  for (const [key, at] of spent) if (now - at > TOKEN_TTL_MS) spent.delete(key);
  if (spent.has(token)) return false;
  spent.set(token, now);
  return true;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // 30 calls / 10 min per IP covers a human retrying; it stops a farm cold.
  const guard = await guardRequest(req, {
    name: 'signup-security',
    limit: 30,
    windowSeconds: 600,
    maxBodyBytes: 8 * 1024,
  });
  if (guard.response) return guard.response;

  const body = guard.body;
  const action = String(body.action ?? '');

  if (action === 'config') {
    const siteKey = Deno.env.get('TURNSTILE_SITE_KEY');
    return siteKey ? json({ ok: true, siteKey }) : json({ ok: false, reason: 'unconfigured' }, 503);
  }
  if (action !== 'verify') return json({ ok: false }, 400);

  const token = typeof body.token === 'string' ? body.token : '';
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secret || !token || token.length > 4096) return json({ ok: false }, 400);

  // A verified pass is a scarce resource: at most 5 successful checks per hour
  // per address, so a solved-CAPTCHA reseller cannot mint accounts in bulk.
  const passes = await consumeRateLimit(`signup-verify:${guard.ip}`, 5, 3600);
  if (!passes.allowed) {
    console.warn('[signup-security] verification budget exhausted for one address');
    return json({ ok: false, reason: 'rate_limited' }, 429);
  }

  if (!burn(token)) {
    console.warn('[signup-security] replayed Turnstile token refused');
    return json({ ok: false, reason: 'replay' }, 400);
  }

  try {
    const form = new FormData();
    form.set('secret', secret);
    form.set('response', token);
    if (guard.ip && guard.ip !== 'unknown') form.set('remoteip', guard.ip);
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const result = (await response.json().catch(() => ({ success: false }))) as {
      success?: boolean;
      'error-codes'?: string[];
    };
    if (!response.ok || result.success !== true) {
      console.warn('[signup-security] Turnstile rejected verification', {
        upstreamStatus: response.status,
        errorCodes: result['error-codes'] ?? [],
      });
      return json({ ok: false });
    }
    return json({ ok: true });
  } catch (error) {
    console.error('[signup-security] verification failed', error);
    return json({ ok: false });
  }
});
