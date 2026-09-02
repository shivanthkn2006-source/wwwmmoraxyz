/**
 * WAF RULE CATALOG — the single source of truth the attack response plan page
 * renders. Each entry mirrors a rule enforced in `supabase/functions/_shared/waf.ts`
 * (and, for the edge rules, in Cloudflare in front of it), so the published
 * response plan can never drift away from what actually runs.
 */

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

export type WafLayer = 'cloudflare' | 'edge' | 'sentinel';

export interface WafRule {
  id: WafRuleId;
  layer: WafLayer;
  threat: string;
  detection: string;
  mitigation: string;
  /** HTTP status returned to the caller. */
  status: number;
  severity: 'medium' | 'high' | 'critical';
  /** Human response once the rule fires repeatedly. */
  response: string;
}

/** Cloudflare thresholds — kept in sync with the edge guard constants. */
export const CF_THREAT_SCORE_BLOCK = 30;
export const CF_BOT_SCORE_BLOCK = 15;
export const CF_BLOCKED_COUNTRIES = ['T1'];

export const WAF_RULES: WafRule[] = [
  {
    id: 'cf_threat_score',
    layer: 'cloudflare',
    threat: 'Known-bad IP reputation',
    detection: `Cloudflare \`cf-threat-score\` at or above ${CF_THREAT_SCORE_BLOCK}`,
    mitigation: 'Refused at the edge guard before the handler runs; event written to Sentinel.',
    status: 403,
    severity: 'high',
    response: 'Confirm the address in Sentinel, then add a Cloudflare IP Access Rule to block it at the network edge.',
  },
  {
    id: 'cf_bot_score',
    layer: 'cloudflare',
    threat: 'Headless / scripted automation',
    detection: `Bot Management score at or below ${CF_BOT_SCORE_BLOCK} and not a verified good bot`,
    mitigation: 'Refused with a flat 403. Verified crawlers (Google, Bing) are exempt so SEO is untouched.',
    status: 403,
    severity: 'high',
    response: 'Raise the Cloudflare managed challenge for the matching ASN if the pattern persists past an hour.',
  },
  {
    id: 'cf_geo_block',
    layer: 'cloudflare',
    threat: 'Anonymised origin (Tor exit network)',
    detection: `\`cf-ipcountry\` in ${CF_BLOCKED_COUNTRIES.join(', ')}`,
    mitigation: 'Blocked outright — the member base has no legitimate traffic from anonymised exits.',
    status: 403,
    severity: 'medium',
    response: 'Review quarterly; widen or narrow the country list from real signup geography.',
  },
  {
    id: 'agent',
    layer: 'edge',
    threat: 'Vulnerability scanners',
    detection: 'User agent matches sqlmap, nikto, nmap, wpscan, acunetix, metasploit and peers — or is missing entirely',
    mitigation: 'Dropped with an uninformative 403; the scanner learns nothing about the stack.',
    status: 403,
    severity: 'high',
    response: 'Sentinel raises a high-severity event; repeated hits from one address trip an automatic block.',
  },
  {
    id: 'injection',
    layer: 'edge',
    threat: 'SQL injection, XSS and template injection',
    detection: 'Raw body matched against union/select, drop table, or-1=1, pg_sleep, script tags, event handlers and path traversal',
    mitigation: 'Body refused before it is parsed, so no payload ever reaches a query builder.',
    status: 403,
    severity: 'critical',
    response: 'Inspect the recorded payload in Sentinel and block the source address immediately.',
  },
  {
    id: 'body_size',
    layer: 'edge',
    threat: 'Payload flood / memory exhaustion',
    detection: 'Declared or actual body larger than the per-function cap (8 KB on signup, 64 KB by default)',
    mitigation: 'Rejected with 413 before parsing, so a multi-megabyte body cannot allocate memory.',
    status: 413,
    severity: 'medium',
    response: 'No action needed unless sustained; then rate-limit the source at Cloudflare.',
  },
  {
    id: 'malformed',
    layer: 'edge',
    threat: 'Protocol fuzzing',
    detection: 'Body is not a JSON object (arrays, scalars, broken JSON)',
    mitigation: 'Rejected with 400 before the handler dispatches on an action.',
    status: 400,
    severity: 'medium',
    response: 'Watch for bursts — fuzzers usually pair this with scanner user agents.',
  },
  {
    id: 'method',
    layer: 'edge',
    threat: 'Endpoint enumeration by GET crawling',
    detection: 'Any method other than POST (OPTIONS handled separately for CORS)',
    mitigation: 'Refused with 405, so crawlers cannot map the function surface.',
    status: 405,
    severity: 'medium',
    response: 'None; informational only.',
  },
  {
    id: 'rate_limit',
    layer: 'edge',
    threat: 'Credential stuffing and account farming',
    detection: 'Fixed-window counter per function, action and IP in `edge_rate_limits` — 30 signup calls / 10 min, 5 verified CAPTCHA passes / hour',
    mitigation: '429 with Retry-After. The counter is shared across every warm isolate, so it cannot be escaped by spraying instances.',
    status: 429,
    severity: 'medium',
    response: 'Sentinel logs a medium event; sustained pressure escalates to a Cloudflare rate-limit rule.',
  },
  {
    id: 'sentinel_block',
    layer: 'sentinel',
    threat: 'Previously convicted attacker returning',
    detection: 'Active row in `sentinel_blocks` for the caller IP, set by the auto-block score or by an admin',
    mitigation: 'Every guarded function refuses the address with 403 for as long as the block stays active.',
    status: 403,
    severity: 'critical',
    response: 'Release from /admin/sentinel only after review; blocks never expire on their own.',
  },
];

export const rulesByLayer = (layer: WafLayer): WafRule[] => WAF_RULES.filter((rule) => rule.layer === layer);

/** Mirror of the edge Cloudflare rule evaluation, used by tests and the page. */
export const evaluateCloudflareRules = (signals: {
  threatScore?: number | null;
  botScore?: number | null;
  verifiedBot?: boolean;
  country?: string | null;
}): WafRuleId | null => {
  const { threatScore = null, botScore = null, verifiedBot = false, country = null } = signals;
  if (country && CF_BLOCKED_COUNTRIES.includes(country.toUpperCase())) return 'cf_geo_block';
  if (threatScore !== null && threatScore >= CF_THREAT_SCORE_BLOCK) return 'cf_threat_score';
  if (!verifiedBot && botScore !== null && botScore <= CF_BOT_SCORE_BLOCK) return 'cf_bot_score';
  return null;
};
