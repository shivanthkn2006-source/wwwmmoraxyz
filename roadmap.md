# Roadmap

- [x] Fix home/loops media autoplay to play once per user/post.
- [x] Expand the existing single upload flow for videos, images, PDFs, and supported documents with responsive rendering.
- [x] Restore Growth Insights re-onboarding with expanded categories and durable live preference updates.
- [x] Harden New badge view-once behavior and add client/server diagnostics.
- [x] Validate realtime like events and creator-feed animation with fallbacks and logging.
- [x] Add focused automated tests and verify the preview build.
- [x] Verify video completion clears the exact per-user/per-post New marker in unit/rendered tests; authenticated browser coverage is committed and runs when a test session is available.
- [ ] Replace the Home/Loops single-file composer with one mixed multi-file picker and responsive per-file previews.
- [ ] Persist and render mixed image, video, and PDF attachments for every authenticated user.
- [ ] Merge posts, Loops, and Growth cards by one effective timestamp so the visible feed is truly newest-first.
- [ ] Add regression tests and verify upload selection, responsive previews, chronological feed order, and runtime health in the authenticated preview.

## Enterprise hardening — monitoring findings (one by one)
- [x] Retired NVIDIA model `z-ai/glm-5.2` removed; 410/404 responses now permanently skip a model in the cascade.
- [x] RLS write storms: telemetry writes go through `src/lib/safeTelemetry.ts` (live-session uid, drop when signed out) for behavioral_events, zoe_settings, platform_health_logs, feed_diagnostics_log, dhf_soul_codex, zoe_black_box_ledger.
- [ ] `zoe-motivation` scheduled job times out (504) — batch/parallelize LLM + image work.
- [ ] Audit diff view and trace link never appear on the Zoe dispatch dashboard.
- [ ] First injected search video restarts and plays off-screen in the background.
- [ ] Live view stays black after app/tab switch (camera never restarts).

## Notification and Zoe card voice reliability
- [x] Restore visible iOS/Android-style top notification cards through the shared Sonner host.
- [x] Make notification sound unlock/status explicit; retain blocked sounds for gesture recovery and use white/black dock badges.
- [x] Add discoverable hover tooltips and touch labels to the home dock without obstructing the bottom-right controls.
- [x] Add a shared Zoe/Deepgram card narration controller with play, pause/resume, and repeat controls.
- [x] Wire narration to Home/Loops timeline posts, Growth cards, and Zoe's DHF cards with settled one-time post-login sequencing.
- [ ] Complete authenticated desktop/mobile E2E verification; focused tests and build pass, but preview session minting requires an owner/admin or signed-in preview session.

## Enterprise hardening (Sep 2026) — 4-stage program
- [x] Stage 1.1 RLS: profiles/messages WITH CHECK + immutable-column guard triggers; invite_codes control columns admin-only
- [x] Stage 1.2 Removed per-card `posts.likes_count` 30s polling (visibility-driven reconcile instead)
- [x] Stage 1.3 verify_jwt=true on 14 user-facing AI functions; removed duplicate `dhf-compass-dispatch-10min` cron
- [ ] Stage 2 API secrets graceful failure, /admin/dhf-generation dashboard, 2–4am local prewarm cron
- [ ] Stage 3 GlobalRealtimeProvider (one socket/user), WebGL_ErrorBoundary for 3D canvases, setInterval leak sweep
- [ ] Stage 4 platform_error_logs table, GlobalBugReporter in PlatformLayout, top-level AppErrorBoundary reset
- [x] Lovable AI sweep: face-verification + growth-image-validate moved to sovereignFetch (tripwire green)
- [x] Stage 4 platform_error_logs + GlobalBugReporter mounted in PlatformLayout
- [x] Stage 2 /admin/dhf-generation dashboard + admin-only dhf-compass-rerun function + 2-4am timezone prewarm batching
- [ ] Stage 2 remaining: COHERE_API_KEY secret not yet provided
- [ ] Stage 3 GlobalRealtimeProvider, WebGL_ErrorBoundary, setInterval leak sweep

## Hacker-gate hardening and moderation verification
- [x] Expand Sentinel live cards so all collected hardware and browser details are visible with honest unavailable states.
- [x] Add DHF feed reporting and exercise the moderation spam → reviewing → actioned workflow.
- [x] Add server-verified Cloudflare Turnstile CAPTCHA to every email/password sign-up surface.
- [x] Document Cloudflare WAF rate-limit rules.
- [x] Generate controlled Sentinel threat/block events and verify persistence.
- [x] Publish a current attack-surface report.
- [x] Validate CAPTCHA config and fail-closed verification endpoint; run frontend regression suite.

## Zoe brain consolidation & enterprise DHF (Sep 2026)
- [x] Canonical Zoe engine (`src/services/zoeEngine.ts`) — recall → backend → persist, used by ZoeChat and orb voice
- [x] Cryptographic lineage ledger (`dhf_lineage_ledger` + `src/services/dhfLineage.ts`), session/IP-hash/content-hash chain
- [x] Canonical 91-route registry generated from App.tsx; feeds Zoe platform context; dock routes verified against it in tests
- [x] Real sensor ingestion into the DHF (`src/services/dhfSensorIngest.ts`) — geo, motion, battery, network, optional BLE heart rate; no simulated values
- [x] Nightly synthetic crawler (`zoe-synthetic-crawler`, 03:50 UTC) over every registered route + orphaned-DHF-table anomalies
- [x] Admin DHF growth console at `/admin/dhf-growth` — per-member DHF/recommendation/activity metrics, filters, CSV export, crawler controls
- [x] Live web grounding (`_shared/web-grounding.ts`) wired into `zoe-chat` — DuckDuckGo, Wikipedia and Google News feed real outside-platform answers with external citations
- [x] Biometric-driven recommendations (`zoe-biometric-recommend` + `zoe_biometric_recommendations`) generated from real heart-rate/motion/battery/location readings and surfaced in the DHF sensor panel
- [x] Shadow-mode replay (`zoe-shadow-mode`): replays all registered routes via the crawler, regenerates recommendations from real DHF rows, stores shadow vs live in `zoe_shadow_recommendations`, surfaced in `/admin/dhf-growth`
- [x] Authenticated recall/citation verification: signed-in `zoe-chat` call returned 8 provenance sources resolving to real `dhf_daily_posts` rows with correct timestamps and `/dhf/essay/:id` routes

## Sep 4 2026 — ephemeris + parked items
- [x] Real Swiss Ephemeris in the edge runtime (`_shared/swiss-ephemeris.ts`, `sweph-wasm` 2.6.9 with JPL DE431 `.se1` files); `astro-grounding.ts` now Swiss-first with Placidus houses/ascendant, astronomy-engine only as fallback
- [x] Clarification protocol extended to `zoe-agent` and `zoe-infinity-brain` (was only `zoe-chat` / `zoe-omega-chat`)
- [ ] PARKED — travel tools (flights/cabs/hotels): Amadeus API discontinued; pick a free provider (Skyscanner/Kiwi/Duffel) and wire server-side keys later. No mock bookings in the meantime.
- [ ] PARKED — full biometric loop: heart rate needs a paired BLE strap, location needs a granted permission. Zoe reports them unavailable rather than simulating.
- [x] Removed the last simulated telemetry: `useBioTelemetry` now reads only real BLE heart rate / DeviceMotion / Battery / Network; unmeasured metrics render as "—" (no fabricated HRV, SpO2, temp, steps)
- [x] `realtimeBehaviorMeter.ts` replaces randomised behavioural inputs to Guardian Angel with measured keystroke rhythm, visibility switches, blur interruptions and focused minutes
- [x] Persona boundary confirmed: M'Mora Zoe = `zoe-chat` (orb text+voice, ZoeChat, DHF, memory) with `zoe-agent`/`zoe-core-intelligence` for tools/deep thinking. `zoe-infinity-brain` is used ONLY by Zoe Infinity pages — separate project, separate login.
- Reconnect Slack in the new workspace

## Next-generation social layer (Sep 2026) — no Home/feed/loops changes
- [x] Closeness signals table `feed_events` (RLS: own rows only) + batched client ingestion
- [x] Derived `intimacy_scores` edges + server-side `recompute_intimacy_scores` (90-day decay, reciprocity, depth)
- [x] Pure intimacy ranking (`rankFeed.ts`) with velocity cap and author diversity + opt-in `useIntimacyFeed`
- [x] Legacy Vault: `legacy_memories` table (owner-only) + isolated `/legacy` page
- [x] Generational tone adapter (cohort from birth date -> style directive)
- [x] Zoe/orb answers closeness, feed-ranking and vault questions from live data
- [ ] Wire dwell/reply/save event capture into existing surfaces (behind a flag, no UI change)
- [ ] Server-side news carousel worker (quota-safe at 5k users)

## Intimacy / Zoe-written feed (Sep 2026)
- [x] Closeness signals wired to real interactions: likes, saves, comments, replies and direct messages (previously view/dwell/skip only).
- [x] `zoe_feed_cards` table with owner-only access + `zoe-feed-cards` backend writer grounded in real rows only (no fabricated posts).
- [x] Monochrome "From Zoe" card strip above the Mosaic feed with refresh and dismiss.
- [x] Database lockdown: internal SECURITY DEFINER functions revoked from visitors/signed-in members (65 → 41 linter findings; the rest are functions the app genuinely calls plus the pgvector extension in public).
- [ ] Signed-in end-to-end proof of card generation — session minting is refused for this account.

## Mosaic / Zoe cards / vault (Sep 7 2026)
- [x] Zoe's card topic now comes from a real Google News (GNews) RSS search built from the member's own words — no hardcoded topic.
- [x] Zoe cards render with cohort styling and show the real headlines they were grounded in.
- [x] Mosaic feed uses cohort columns/spacing and ranks by the intimacy graph (like, save, comment, reply, DM, view, dwell, skip all feed it).
- [x] Friends scope in the mosaic actually filters to people you follow (previously ignored).
- [x] Your own unlocked Digital Vault memories appear in your mosaic (owner-only).
- [x] Security warnings 65 → 32; the remaining 31 are app RPCs signed-in users must be able to call, plus 1 extension-in-public.
- [ ] Signed-in browser verification of cards/vault in the live preview (blocked: no preview session).

## Generational + astrology feed (Sep 8 2026)
- [x] Age group derived from birth date for every member (DB trigger + backfill); 9 members have no birth date and stay neutral.
- [x] Generation tone passed into Zoe's card writing and stored on each card.
- [x] Generation density applied on Home (Mosaic + Zoe cards).
- [x] Member astrology page at /astrology from real birth date, day lord and Swiss-Ephemeris readings.
- [x] Astrology affinity wired into Mosaic ranking, capped so closeness always wins.
- [ ] 34 database advisory warnings (extension placement + elevated-privilege helpers) — separate pass.

## Launch hardening (Sep 9 2026)
- [x] Voice shortcut counter locked to its owner (last unguarded elevated helper).
- [x] Terms of Service (/terms) and Data Policy (/data-policy) written to match invite-only signup, upload screening and the delete/export flow.
- [x] Video delivery pipeline: 720p delivery + 360p low-bandwidth rendition, poster, immutable 1-year CDN cache headers, `video_assets` record, automatic low-bandwidth playback on metered connections.
- [x] Early-user launch plan (4 waves, gates per wave) — /mnt/documents/mmora-early-launch-plan.md
- [ ] 31 database advisories remain: all are helpers the signed-in app calls and all now refuse cross-account use; clearing them needs each rewritten as plain RLS queries.
- [ ] pgvector in public schema (moving it rebuilds every embedding column).
- [ ] Server-side multi-bitrate HLS packaging (current transcode runs on the uploader's device).

## Compact controls and native hands-free Zoe (Sep 10 2026)
- [ ] Remove the audio control border/background/text and prevent notification overlap.
- [ ] Collapse the Home feed selector to Global; expand Friends, Mosaic, and Selfie City to the right on tap.
- [ ] Add a real Capacitor native bridge for background/locked-screen Zoe listening and connect it to AudioRouterService.
- [ ] Verify focused tests, native sync readiness, signed-in Home/audio preview, and current build health.
