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

/** Cloudflare thresholds. Tuned to refuse abusers without touching humans. */
export const CF_THREAT_SCORE_BLOCK = 30; // Cloudflare's own "bad reputation" line
export const CF_BOT_SCORE_BLOCK = 15; // 1..30 is automated; below 15 is hostile automation
/** Countries with no member base and a heavy share of credential-stuffing traffic. */
export const CF_BLOCKED_COUNTRIES = ['T1']; // T1 = Tor exit network

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

const num = (value: string | null): number | null => {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Read the Cloudflare edge signals Cloudflare adds in front of the function. */
export const readCloudflareSignals = (req: Request): CloudflareSignals => ({
  threatScore: num(req.headers.get('cf-threat-score')),
  botScore: num(req.headers.get('cf-bot-score') ?? req.headers.get('x-bot-score')),
  verifiedBot: (req.headers.get('cf-verified-bot') ?? '').toLowerCase() === 'true',
  country: req.headers.get('cf-ipcountry'),
  ray: req.headers.get('cf-ray'),
});

/**
 * Cloudflare rule evaluation. Verified good bots (Googlebot and friends) are
 * exempt so crawling never trips the bot score rule.
 */
export const evaluateCloudflareRules = (cf: CloudflareSignals): WafRuleId | null => {
  if (cf.country && CF_BLOCKED_COUNTRIES.includes(cf.country.toUpperCase())) return 'cf_geo_block';
  if (cf.threatScore !== null && cf.threatScore >= CF_THREAT_SCORE_BLOCK) return 'cf_threat_score';
  if (!cf.verifiedBot && cf.botScore !== null && cf.botScore <= CF_BOT_SCORE_BLOCK) return 'cf_bot_score';
  return null;
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


/** True when Sentinel holds an active block for this address. */
export async function isSentinelBlockedIp(ip: string): Promise<boolean> {
  if (!ip || ip === 'unknown') return false;
  const db = adminClient();
  if (!db) return false;
  try {
    const { data, error } = await db
      .from('sentinel_blocks')
      .select('id')
      .eq('ip_address', ip)
      .eq('active', true)
      .limit(1);
    if (error) return false;
    return (data ?? []).length > 0;
  } catch {
    return false;
  }
}

/** Record a WAF refusal as a Sentinel threat event. Never throws. */
export async function recordWafThreat(
  rule: WafRuleId,
  ip: string,
  cf: CloudflareSignals,
  fn: string,
): Promise<void> {
  const db = adminClient();
  if (!db) return;
  const severity = rule === 'rate_limit' ? 'medium' : rule === 'sentinel_block' ? 'critical' : 'high';
  try {
    await db.from('sentinel_threat_events').insert({
      threat_type: `waf_${rule}`,
      severity,
      ip_address: ip === 'unknown' ? null : ip,
      country: cf.country,
      page_url: `edge:${fn}`,
      blocked: true,
      details: { rule, function: fn, cf },
    });
  } catch {
    /* telemetry must never break the guard */
  }
}

/** Run every guard. Returns `{ response }` when the caller must stop. */
export async function guardRequest(req: Request, options: WafOptions): Promise<WafVerdict> {
  const ip = wafClientIp(req);
  const cf = readCloudflareSignals(req);
  const maxBody = options.maxBodyBytes ?? DEFAULT_MAX_BODY;
  const empty: WafVerdict = { body: {}, ip, remaining: options.limit, cf };

  const deny = (rule: WafRuleId, status: number, body: Record<string, unknown> = {}): WafVerdict => {
    void recordWafThreat(rule, ip, cf, options.name);
    return { ...empty, body, rule, response: refuse(status) };
  };

  if (req.method !== 'POST') return { ...empty, rule: 'method', response: refuse(405) };

  const ua = (req.headers.get('user-agent') ?? '').toLowerCase();
  if (!ua || BAD_AGENTS.some((bad) => ua.includes(bad))) return deny('agent', 403);

  // Cloudflare edge verdicts come before any work: reputation, bots and geo.
  const cfRule = evaluateCloudflareRules(cf);
  if (cfRule) return deny(cfRule, 403);

  if (await isSentinelBlockedIp(ip)) return deny('sentinel_block', 403);

  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > maxBody) return deny('body_size', 413);

  const raw = await req.text();
  if (raw.length > maxBody) return deny('body_size', 413);

  if (!options.allowRichText && INJECTION_PATTERNS.some((p) => p.test(raw))) return deny('injection', 403);

  let body: Record<string, unknown> = {};
  if (raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return deny('malformed', 400);
      body = parsed as Record<string, unknown>;
    } catch {
      return deny('malformed', 400);
    }
  }

  const scope = options.scope ?? (typeof body.action === 'string' ? body.action.slice(0, 32) : 'default');
  const { allowed, remaining } = await consumeRateLimit(
    `${options.name}:${scope}:${ip}`,
    options.limit,
    options.windowSeconds,
  );
  if (!allowed) {
    void recordWafThreat('rate_limit', ip, cf, options.name);
    return {
      body,
      ip,
      cf,
      rule: 'rate_limit',
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
