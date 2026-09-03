/**
 * PUBLIC GUARD — the single entry gate every unauthenticated Edge Function
 * must sit behind.
 *
 * `guardRequest` in `waf.ts` is POST-only by design (it parses and inspects the
 * body). Several public functions legitimately answer GET (`?action=tick`,
 * `?action=stats`) or are pinged by cron with no body at all, so wrapping them
 * in the raw WAF would break them.
 *
 * `publicGuard` keeps the full WAF for POST and applies the method-agnostic
 * subset — user-agent reputation, Cloudflare verdicts, Sentinel IP blocks and
 * the shared fixed-window rate limiter — to everything else. It never throws;
 * on infrastructure failure it fails open so a database blip cannot take a
 * public surface down.
 */
import {
  guardRequest,
  wafClientIp,
  readCloudflareSignals,
  evaluateCloudflareRules,
  isSentinelBlockedIp,
  consumeRateLimit,
  recordWafThreat,
  wafCorsHeaders,
  type WafOptions,
  type WafRuleId,
} from './waf.ts';

export { wafCorsHeaders };

export interface PublicGuardResult {
  /** Present when the request must be refused — return it as-is. */
  response?: Response;
  /** Parsed JSON body (POST only; `{}` otherwise). */
  body: Record<string, unknown>;
  ip: string;
  remaining: number;
  rule?: WafRuleId;
}

const BAD_AGENTS = [
  'sqlmap', 'nikto', 'nmap', 'masscan', 'dirbuster', 'gobuster', 'wpscan',
  'acunetix', 'nessus', 'zgrab', 'havij', 'metasploit', 'python-requests/0',
];

const refuse = (status: number, message = 'Request refused') =>
  new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { ...wafCorsHeaders, 'Content-Type': 'application/json' },
  });

export async function publicGuard(req: Request, options: WafOptions): Promise<PublicGuardResult> {
  if (req.method === 'POST') {
    const verdict = await guardRequest(req, options);
    return {
      response: verdict.response,
      body: verdict.body,
      ip: verdict.ip,
      remaining: verdict.remaining,
      rule: verdict.rule,
    };
  }

  const ip = wafClientIp(req);
  const cf = readCloudflareSignals(req);
  const base: PublicGuardResult = { body: {}, ip, remaining: options.limit };

  const deny = (rule: WafRuleId, status: number): PublicGuardResult => {
    void recordWafThreat(rule, ip, cf, options.name);
    return { ...base, rule, remaining: 0, response: refuse(status) };
  };

  const ua = (req.headers.get('user-agent') ?? '').toLowerCase();
  if (!ua || BAD_AGENTS.some((bad) => ua.includes(bad))) return deny('agent', 403);

  const cfRule = evaluateCloudflareRules(cf);
  if (cfRule) return deny(cfRule, 403);

  if (await isSentinelBlockedIp(ip)) return deny('sentinel_block', 403);

  const scope = options.scope ?? new URL(req.url).searchParams.get('action') ?? req.method.toLowerCase();
  const { allowed, remaining } = await consumeRateLimit(
    `${options.name}:${scope.slice(0, 32)}:${ip}`,
    options.limit,
    options.windowSeconds,
  );
  if (!allowed) {
    void recordWafThreat('rate_limit', ip, cf, options.name);
    return {
      ...base,
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

  return { ...base, remaining };
}

export default publicGuard;
