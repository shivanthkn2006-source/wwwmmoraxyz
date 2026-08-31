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
