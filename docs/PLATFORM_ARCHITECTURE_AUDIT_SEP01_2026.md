# M'Mora / Zoe / DHF — Platform Architecture & End-to-End Audit
Window audited: 2026-09-01 07:43 → 14:20 IST (02:13 → 08:50 UTC). Snapshot taken 08:49 UTC.
Live map: `/platform-architecture`

## 1. Scale snapshot
| Metric | Value |
|---|---|
| Source files (src) | 1,599 |
| Source lines | 440,996 |
| Routes | 93 |
| Edge functions | 141 |
| Migrations | 330 |
| Public tables | 229 |
| RLS policies | 661 |
| Tables without RLS | 0 |
| pg_cron jobs | 9 |
| Database size | 267 MB (was 513 MB before telemetry pruning) |
| Unit tests | 578 passing, 6 skipped |

## 2. Architecture layers
Client (React 18 + Vite + Zustand) → `AppErrorBoundary` → `PlatformLayout`, which mounts
`GlobalRealtimeProvider` (single multiplexed socket, ref-counted topics), `SecurityShell`
(VoidShell, DevTools trap, Fortress watermark, camera sentinel), `SentinelWatchHost`
(threat probes + scorched-earth lockout), `GlobalHomeDock`, then 93 lazy routes.

Backend (Lovable Cloud): PostgREST behind RLS, Auth with Turnstile-gated sign-up and
`user_roles`/`has_role('admin')` role model, Storage, Realtime, 141 Deno edge functions
(`verify_jwt` on all AI surfaces), pg_cron.

External providers, all keyed server-side only: Gemini/Google AI, Cohere, NVIDIA NIM, Groq,
Deepgram TTS, Pollinations, YouTube Data API, Open-Meteo, ipwho.is, Cloudflare Turnstile,
TencentDB memory gateway.

## 3. Security circuit
- Visitor → `useSentinelWatch` detects devtools, view-source, page-save, context-menu probes →
  `sentinel-guard` edge function resolves GeoIP + device fingerprint/hardware, scores severity,
  auto-blocks at ≥ 12, and writes `sentinel_sessions` / `sentinel_threat_events` / `sentinel_blocks`
  (admin-only RLS with explicit GRANTs).
- Sign-up → Cloudflare Turnstile token verified server-side by `signup-security`, fail-closed.
- Session → `ProtectedRoute` + RLS on every read/write; immutable-column triggers on `profiles`
  and `messages`; admin rights only via `user_roles`.
- Secrets: browser sees only the Supabase URL, publishable anon key and the Turnstile site key.
  `check-backend-target.mjs` and `check-no-lovable-ai.mjs` act as tripwires.

## 4. Realtime and feed
One socket, ref-counted subscriptions feed growth cards, notifications, likes/comments and the
Sentinel live tab. Feed assembly merges posts + attachments, loops, growth cards, YouTube results
and DHF compass cards through `composeChronologicalFeed` → `orderGrowthByTime` →
`interleaveGrowthCards` (every third item). Playback is muted by default, plays once, and clears
the New badge on completion.

## 5. AI routing
Cascade: Gemini → Cohere → NVIDIA NIM → Groq, with circuit breakers and a `provider-health`
endpoint. Imagery via Pollinations then `growth-image-validate` (subject/face match, cached).
Voice via Deepgram with Web Speech fallback. Search via `zoe_universal_index` (pgvector).
Orb tools routed by `orbCapabilities.ts`: document X-ray, song identification, post relevance
scoring, provider health — each with silent fallback to the normal brain.

## 6. Scheduled jobs
02:00–04:00 DHF prewarm · 05:00–18:30 growth dispatch across five local windows ·
15-minute idempotent DHF essay delivery · nightly astro-slot audit with Slack/email alerts ·
nightly growth reconciliation · weekly `prune_platform_telemetry()`.

## 7. Delivered in today's window
Sentinel dashboard and hardware/geo intelligence (plus the GRANT and WebGL-capability fixes),
Turnstile CAPTCHA on both sign-up flows, moderation queue with spam flag/status filter/deep links,
DHF essay scheduling + delivery cron + reader page + notification routing, orb capability router,
growth roster expanded to 181 figures with anti-repetition, realtime multiplexing, WebGL boundary,
managed intervals, Velvet Rope scorer fix, notification-sound AudioContext guard,
and the published social-video and hacker-gate audits.

## 8. Open items
Errors (security scan 08:49 UTC):
1. `exodus_quiz_questions` — `correct_option` readable by clients; move validation server-side.
2. `exodus_puzzles` — `answer_hash` readable; expose via view/RPC only.

Warnings:
3. `messages` receiver UPDATE is not column-restricted.
4. `notifications` INSERT has no constraint on the recipient.
5. SECURITY DEFINER functions still executable by `authenticated`.

Engineering: mega-files (4,604 / 4,446 / 4,170 lines) awaiting pure extraction; ~21 dormant edge
functions; no APM/uptime alerting; no WAF/rate limiting in front of public edge functions;
test coverage still thin relative to code size.

## 9. Why 6 tests are skipped
All six live in `src/test/agentInteractionsRls.integration.test.ts`, guarded by
`describe.skipIf(!configured)`. They need two real Supabase test accounts
(`URL`, `KEY`, `A_EMAIL/A_PASSWORD`, `B_EMAIL/B_PASSWORD`) to prove cross-user RLS isolation on
`agent_interactions`. Without those env vars the suite skips by design so CI stays green during
an outage. Supplying the six env vars runs them: own-row insert, rejected foreign-owner insert,
no cross-user reads, agent_id partitioning, blocked foreign update/delete, and empty results for
anonymous visitors.
