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