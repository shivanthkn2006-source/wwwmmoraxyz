/**
 * EDGE WAF — one small, dependency-free guard every public Edge Function can
 * put in front of its handler.
 *
 * It does four things, in this order, and returns a ready-made `Response` the
 * caller can return immediately when the request must not proceed:
 *
 *   1. Method + payload guards  — reject oversized or non-JSON bodies before
 *      they are parsed, so a 10 MB body can never reach the handler.
 *   2. Client reputation        — obvious scraper/scanner user agents and known
 *      exploit paths are dropped with a flat 403.
 *   3. Injection heuristics     — SQLi / XSS / template-injection signatures in
 *      the raw body text are refused.
 *   4. Rate limiting            — a fixed-window counter per bucket, stored in
 *      `public.edge_rate_limits` (service role only), so the limit is shared
 *      across every warm isolate instead of living in one instance's memory.
 *
 * The response body is deliberately uninformative: an attacker learns only
 * that the request was refused, never which rule caught them.
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

export const wafCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export interface WafOptions {
  /** Logical name used for the rate-limit bucket, e.g. 'signup-security'. */
  name: string;
  /** Maximum requests per window per client. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
  /** Maximum accepted body size in bytes. */
  maxBodyBytes?: number;
  /** Extra bucket discriminator, e.g. an action name. */
  scope?: string;
  /** Skip the injection heuristics (for endpoints that legitimately carry code). */
  allowRichText?: boolean;
}

export interface WafVerdict {
  /** Present when the request must be refused — return it as-is. */
  response?: Response;
  /** Parsed JSON body, when the request passed and carried one. */
  body: Record<string, unknown>;
  ip: string;
  /** Remaining requests in the current window. */
  remaining: number;
  /** Id of the rule that refused the request, when one did. */
  rule?: WafRuleId;
  /** Cloudflare edge signals seen on this request. */
  cf: CloudflareSignals;
}

export type WafRuleId =
  | 'method'
  | 'agent'
  | 'body_size'
  | 'injection'
  | 'malformed'
  | 'cf_threat_score'
  | 'cf_bot_score'
  | 'cf_geo_block'
  | 'sentinel_block'
  | 'rate_limit';

export interface CloudflareSignals {
  /** Cloudflare threat score, 0 (clean) … 100 (known abuser). */
  threatScore: number | null;
  /** Cloudflare Bot Management score, 1 (definitely bot) … 99 (human). */
  botScore: number | null;
  /** true when Cloudflare classified the caller as a verified good bot. */
  verifiedBot: boolean;
  /** Two-letter country from Cloudflare's edge. */
  country: string | null;
  /** Cloudflare ray id, useful for correlating with the Cloudflare dashboard. */
  ray: string | null;
}


const DEFAULT_MAX_BODY = 64 * 1024;

const BAD_AGENTS = [
  'sqlmap', 'nikto', 'nmap', 'masscan', 'dirbuster', 'gobuster', 'wpscan',
  'acunetix', 'nessus', 'zgrab', 'havij', 'metasploit', 'python-requests/0',
];

const INJECTION_PATTERNS: RegExp[] = [
  /(\bunion\b[\s\S]{0,20}\bselect\b)/i,
  /(\bdrop\b\s+\btable\b)|(\btruncate\b\s+\btable\b)/i,
  /(\bor\b\s+1\s*=\s*1\b)|('\s*or\s*'1'\s*=\s*'1)/i,
  /pg_sleep\s*\(|benchmark\s*\(/i,
  /<script[\s>]|javascript:\s*[a-z]/i,
  /\bon(error|load|click)\s*=\s*["']?[a-z]/i,
  /\{\{\s*[\w.]+\s*\}\}\s*\}\}/,
  /\.\.\/\.\.\/|\/etc\/passwd|\bfile:\/\//i,
];

const refuse = (status: number) =>
  new Response(JSON.stringify({ ok: false, error: 'Request refused' }), {
    status,
    headers: { ...wafCorsHeaders, 'Content-Type': 'application/json' },
  });

export const wafClientIp = (req: Request): string => {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip') ?? 'unknown';
};

let cachedAdmin: SupabaseClient | null = null;
const adminClient = (): SupabaseClient | null => {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  if (!cachedAdmin) cachedAdmin = createClient(url, key, { auth: { persistSession: false } });
  return cachedAdmin;
};

/**
 * Fixed-window counter. Never throws and never blocks the request path: if the
 * counter store is unreachable the request is allowed through (fail-open), so
 * a database blip can't take signup down.
 */
export async function consumeRateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const db = adminClient();
  if (!db) return { allowed: true, remaining: limit };
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000).toISOString();
  try {
    const { data, error } = await db.rpc('bump_edge_rate_limit', {
      _bucket: bucket,
      _window_start: windowStart,
    });
    if (error || typeof data !== 'number') return { allowed: true, remaining: limit };
    return { allowed: data <= limit, remaining: Math.max(0, limit - data) };
  } catch {
    return { allowed: true, remaining: limit };
  }
}


/** Run every guard. Returns `{ response }` when the caller must stop. */
export async function guardRequest(req: Request, options: WafOptions): Promise<WafVerdict> {
  const ip = wafClientIp(req);
  const maxBody = options.maxBodyBytes ?? DEFAULT_MAX_BODY;
  const empty: WafVerdict = { body: {}, ip, remaining: options.limit };

  if (req.method !== 'POST') return { ...empty, response: refuse(405) };

  const ua = (req.headers.get('user-agent') ?? '').toLowerCase();
  if (!ua || BAD_AGENTS.some((bad) => ua.includes(bad))) {
    return { ...empty, response: refuse(403) };
  }

  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > maxBody) return { ...empty, response: refuse(413) };

  const raw = await req.text();
  if (raw.length > maxBody) return { ...empty, response: refuse(413) };

  if (!options.allowRichText && INJECTION_PATTERNS.some((p) => p.test(raw))) {
    return { ...empty, response: refuse(403) };
  }

  let body: Record<string, unknown> = {};
  if (raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ...empty, response: refuse(400) };
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return { ...empty, response: refuse(400) };
    }
  }

  const scope = options.scope ?? (typeof body.action === 'string' ? body.action.slice(0, 32) : 'default');
  const { allowed, remaining } = await consumeRateLimit(
    `${options.name}:${scope}:${ip}`,
    options.limit,
    options.windowSeconds,
  );
  if (!allowed) {
    return {
      body,
      ip,
      remaining: 0,
      response: new Response(JSON.stringify({ ok: false, error: 'Too many requests' }), {
        status: 429,
        headers: {
          ...wafCorsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(options.windowSeconds),
        },
      }),
    };
  }

  return { body, ip, remaining };
}
