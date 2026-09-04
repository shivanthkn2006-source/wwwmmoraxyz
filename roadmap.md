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
- [ ] Shadow-mode recommendation replay writer into `zoe_shadow_recommendations` (table + RLS ready; generator pending)
- [ ] Authenticated end-to-end recall/citation verification (needs a signed-in preview session)
