# Hacker-Gate Attack Surface Report — September 2026

## Executive posture

The application has layered authentication, row-level data isolation, server-resolved network telemetry, device fingerprinting, tamper-event collection, automatic blocking, and an admin-only moderation and Sentinel console. Browser-side anti-inspection controls are deterrents and signals, not secrecy boundaries: every asset delivered to a browser must be treated as discoverable.

## Closed gates

- **Authorization:** admin surfaces and telemetry tables are protected by database-enforced role checks.
- **Secrets:** private provider keys remain in server-side secret storage and are not returned to clients.
- **Input boundaries:** authentication and report forms enforce length and format limits; database constraints restrict report states and target types.
- **Abuse evidence:** Sentinel records IP and location server-side and joins them with browser-provided hardware signals.
- **Automated containment:** a rolling severity budget blocks repeated high-risk tamper behavior by account or device fingerprint.
- **Moderation:** reports support open, reviewing, actioned, and dismissed states plus a persistent spam flag and reviewer attribution.
- **Privacy-preserving media:** YouTube playback uses the privacy-enhanced embed domain.

## Cloudflare edge controls to enable

Apply these rules to `myzoe.xyz`, `www.myzoe.xyz`, `mmora.xyz`, and `www.mmora.xyz`:

1. **Sign-up/auth challenge:** Managed Challenge after 5 requests per minute per IP to `/auth` and authentication API routes; block for 10 minutes after 20 requests per minute.
2. **Function abuse:** Managed Challenge after 30 requests per minute per IP to function routes; use stricter rules of 10 per minute for biometric and document-analysis endpoints.
3. **Known bots:** enable Bot Fight Mode and block verified automated traffic from authentication, upload, and AI-generation routes unless explicitly allow-listed.
4. **Country/ASN anomalies:** challenge rather than block new regions; review Sentinel evidence before permanent rules.
5. **Upload limits:** reject unexpected methods and oversized request bodies at the edge, while retaining MIME and ownership validation in storage policies.

Cloudflare rate limits are the enforcement boundary. Client throttles are only user-experience controls and must not be counted as security.

## CAPTCHA status

Cloudflare Turnstile must protect sign-up. Production activation requires a Cloudflare-issued site key (public) and secret key (private), plus server-side token verification. Never accept a client-only CAPTCHA result.

## Residual risks

- Safari and privacy-focused browsers may conceal RAM and GPU data; the console must show “Unavailable” rather than imply collection succeeded.
- Device fingerprints can change and must not be used as the sole identity factor.
- Source code shipped to browsers cannot be hidden. Security relies on authorization, RLS, secret isolation, strict validation, WAF controls, monitoring, and rapid key rotation.
- Existing security-definer database functions require a dedicated least-privilege review; the database linter currently reports broad execute grants inherited from earlier work.

## Verification cadence

- Daily: review Sentinel threats, blocks, and authentication failures.
- Weekly: inspect moderation aging, function errors, and WAF events.
- Before each release: run dependency scanning, database linting, tests, and authenticated browser checks.
- Quarterly: rotate provider credentials, review admin roles, and rehearse incident containment and recovery.
---

## Edge WAF, rate limits and attack response (September 1, 2026)

### Shared WAF (`supabase/functions/_shared/waf.ts`)

Every guarded function now passes through one gate before any business logic:

| Control | Behaviour |
| --- | --- |
| Method guard | Non-`POST` (outside CORS preflight) is refused with `405`. |
| Body ceiling | Oversized payloads refused with `413` before parsing. |
| Reputation | Known scanner agents (sqlmap, nikto, nmap, wpscan, acunetix, …) refused with `403`. |
| Injection heuristics | SQLi / XSS / traversal signatures refused with `400` unless the endpoint opts into rich text. |
| Rate limit | Fixed window per client IP, counted atomically through `bump_edge_rate_limit()` into `public.edge_rate_limits`; over-limit returns `429`. |

### Deployed limits

| Function | Window | Ceiling | Rationale |
| --- | --- | --- | --- |
| `signup-security` | 60 s | 20 requests / IP | CAPTCHA config + verify; 5 *successful* verifications per hour per IP caps bulk account creation. |
| `sentinel-guard` | 60 s | 600 requests / IP | Telemetry is chatty and offices share one NAT address; only a flood trips it. |
| `dhf-social-links` | 60 s | 120 requests / IP | Protects the YouTube Data API quota; results are cached platform-wide by topic. |

### Sign-up gate

Turnstile is mandatory: tokens are verified server-side against Cloudflare, bound to the requesting IP, single-use (replays rejected), and length-capped. A missing or failed token stops the sign-up before Auth is touched.

### Attack response plan

1. **Detect** — Sentinel Threats tab, `edge_rate_limits` spikes, and edge function logs. Operators can fire the Sentinel *Run probe* control to confirm the pipeline is live end to end.
2. **Contain** — automatic: score ≥ 12 in the rolling window inserts a `sentinel_blocks` row and closes the session. Manual: add a block by user id or device fingerprint from the Blocks tab.
3. **Eradicate** — rotate the affected provider key, tighten the offending function's window/ceiling, and (for credential abuse) force sign-out by revoking the session rows.
4. **Recover** — lift the block from the Blocks tab once the actor is verified; blocks are reversible and audited with `released_by` / `released_at`.
5. **Review** — record the incident, the trigger score, and the control that caught it; adjust limits at the next release.
