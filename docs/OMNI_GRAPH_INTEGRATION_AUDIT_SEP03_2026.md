# mmora Omni-Graph Deep-Root Integration Audit — 03 Sep 2026

Scope: full-platform deep scan against the target enterprise architecture (Perception layer → Temporal DHF graph → Zoe metacognitive core → Unified Search Dock → zero-trust verification).

## 0. Measured baseline

| Dimension | Measured |
|---|---|
| Edge functions | 148 directories, 119 `verify_jwt` entries in config |
| Pages / components / hooks | 83 pages, 619 TSX components, 413 hooks |
| Routes | 91 unique `path=` in `src/App.tsx` |
| Migrations | 346 |
| Public tables | 240, all with RLS enabled |
| DB size | 288 MB (`platform_health_logs` 92 MB / 163,964 rows; `zoe_universal_index` 47 MB; `posts` 39 MB; `behavioral_events` 17 MB; `dhf_heartbeats` 7 MB) |
| Cron jobs | 11 active |
| WAF coverage | 4 of 148 functions import `_shared/waf.ts`; ~16 reference rate limiting |

## 1. P0 — Security / trust boundary

1. **8 public unauthenticated functions with no WAF and no rate limit**: `geo-stream-optimizer`, `get-mapbox-token`, `get-user-location`, `phantom-router`, `zoe-realtime-voice`, `zoe-motivation`, `external-search`, `storage-cleaner`. Fix: wrap each in `guardRequest` + per-IP limiter (pattern: `ecn-analysis-processor/index.ts:45`).
2. **Hardening is opt-in.** Only 4/148 functions import the WAF helper. Fix: a shared `withPublicGuard()` wrapper plus a CI check that fails when a `verify_jwt = false` function omits it.
3. **`external-search` is anonymous and unlogged** — no auth, no query telemetry, no quota. It is the single most abusable surface (fan-out to YouTube/SerpAPI/Open-Meteo).
4. **Silent auth-failure data loss**: `behavioral-event-stream/index.ts:132-155` returns `success:true, skipped:true` on missing/expired JWT, so `useContinuousDHFStream` reports `streamHealth: healthy` while persisting nothing.

## 2. P0 — DHF integrity (the tensor is partly fictional)

5. **`useBioTelemetry.ts:173-210` fabricates heart rate, HRV, SpO2, stress with `Math.sin`/`Math.random`** and never persists. Any DHF surface presenting these as biometrics is showing invented data.
6. **`useBehavioralTelemetry.ts:52-105` has no persistence path at all** (no supabase import) — typing rhythm/hesitation, a core cognitive vector, is computed and discarded.
7. **`behavioral_fingerprints` and `agent_interactions`: 0 readers, 0 writers.** The table that should anchor DHF identity is provisioned (RLS, triggers, indexes) and dead.
8. **`dhf_consciousness_memory` is write-only** (edge writes, zero app reads) — the pgvector memory the brain is supposed to recall is never queried.
9. **`dhf_ghost_interactions` write-only**; `growth_used_figures`, `dhf_referrals`, `dhf_dispatch_lease`, `user_activity_patterns`, `user_dhf_profiles` have no traced writer.
10. **Duplicate `dhf_heartbeats` definitions** (`20260210052116` and `20260621151328`, both `CREATE TABLE IF NOT EXISTS`) — live schema drift; second migration silently no-ops.

## 3. P0 — Temporal graph and lineage are missing

11. **No validity windows anywhere.** `dhf_soul_codex`, `dhf_phoenix_profile`, `dhf_relationship_matrix`, `dhf_active_construct` store `user_id + created_at` only. The architecture requires facts with `valid_from` / `valid_to` and invalidation instead of deletion; today a 2024 voice fingerprint is indistinguishable from yesterday's.
12. **No cryptographic lineage.** `dhf_asset_logs` has `dhf_stack_hash` but no `session_id`/IP; the identity tables have neither. Tracing a recommendation back to the session, IP and timestamp that produced it is currently impossible.
13. **Three unrelated "device fingerprint" concepts** — `DeviceFingerprinting.tsx:24-27` (display-only 16-char concat, spoofable), `shadow_ai_incidents.fingerprint_hash`, `biometric_auth_events.device_fingerprint` — with no canonical source.
14. **No `S(t+1) = αS(t) + (1-α)F(E,Z)` decay update exists.** DHF rows are overwritten, not decayed; there is no `user_life_growth` trajectory table driving the loop.

## 4. P1 — Zoe brain does not know the platform

15. **Zero platform-state injection.** `zoe-infinity-brain/index.ts:577-808` builds its prompt entirely from client-supplied `soulCodex`/`memoryContext`/`personalityMatrix` plus one `profiles` row. No route list, no feature flags, no current screen. Zoe cannot truthfully answer "what can mmora do".
16. **Grounding is fabricated.** `searchWeb()` (`:452-459`) prompts an LLM to invent "real, plausible URLs" instead of calling the existing `external-search` lanes. Citations may not exist.
17. **Prompt hard-truncated at 5800 chars with no priority ordering** (`:807`) — memory and grounding are clipped first by accident.
18. **Vision permanently off**: `const hasImage = false; // TODO` (`:592`) makes the `vision` provider chain unreachable.
19. **Dead tier in all 5 cascades**: `tryLovableAI()` (`:224-226`) always returns null yet is appended to every chain.
20. **Three non-communicating intent classifiers**: `classifyTask()` (brain, 5 types), `detectOrbCapability()` (`src/lib/orbCapabilities.ts:84-114`, 7 types), `classifyQuery()` (`searchSanitize`). No shared taxonomy; "rank my feed" is understood by one and invisible to the others.
21. **Memory retrieval never happens server-side** — no pgvector lookup in the brain; the client assembles memory and passes it in.

## 5. P1 — Unified Search Dock is not the Nexus yet

22. **No canonical route registry.** Three hand-maintained lists: `App.tsx` (91 routes), `dockExtraActions.tsx` (27 + 8 reserved), `routeSeo.ts` (7 SEO routes). ~56 routes appear in none.
23. **Routes/menus are never indexed** into `zoe_universal_index`; only posts/content are ingested. Typing "vastu scan" can never resolve to `/vastu-scan`.
24. **Zero-loss telemetry is absent in the primary dock.** `recordHomeSearch()` (`useHomeSearch.ts:244-256`) is called only from `HomeFloatingTools.tsx:242,260`; `ZoeSearchModal.tsx` drives three query streams and logs none of them.
25. **The "memory" tab is a keyword filter**, not a pgvector lane (`ZoeSearchModal.tsx:138-141`).

## 6. P1 — Scale: per-client polling multiplies with users

26. `useDeepRootScanScheduler.ts:107` — hourly interval per client (comment claims 24h).
27. `useEmotionCheckIns.ts:161,166` — two overlapping intervals per client.
28. `useAgenticWorkforce.ts:343` — 60 s polling of deployment status.
29. `useAmbientUI.ts:213`, `useAnimaSynergy.ts:239`, `useDHFDataHealthScanner.ts:275`, `utils/offlineDataSync.ts:533` — further 1–5 min pollers.
   Aggregate: ~6 pollers × 5,000 users ≈ 30,000 req/min of baseline load unrelated to usage. All should become cron edge functions or realtime subscriptions.
30. **6 direct `supabase.channel()` sites bypass the multiplexer**: `realtimeRetry.ts:85`, `platformDiagnostics.ts:302`, `ChatPage.tsx:101`, `useEphemeralBroadcast.ts:198`, `useMultiplayerPresence.ts:122`, `useOnlinePresence.ts:19` — the last two create one channel per mounted instance.
31. **~20 eager provider imports in `src/App.tsx:1-26`** load before any route renders.
32. **Unbounded Zoe Infinity manual chunk** (`vite.config.ts:301-331`) — needs a size budget in CI.

## 7. P2 — Data volume / retention

33. `platform_health_logs`: 82,261 rows older than 7 days (92 MB) despite a 14-day prune migration. Tighten to 72 h + aggregate rollups.
34. `behavioral_events`: 24,397 rows > 7 days — needs partitioning or a cold-store rollup into `dhf_asset_logs` summaries.
35. `dhf_heartbeats`: 8,701 stale rows; `zoe_search_events`: 1,141.
36. `zoe_universal_index` is 47 MB for 754 rows — embedding storage should move to `halfvec` / IVFFlat compression before route indexing multiplies row count.
37. `posts` is 39 MB for 12 rows — base64/inline media in a relational column; must move to storage buckets.

## 8. Missing components required by the target architecture

- **Route/menu registry service** — single generated source consumed by App router, dock, SEO, search index and Zoe prompt.
- **Platform State Injection service** — a cached, versioned snapshot of routes + capabilities + flags injected into every brain call.
- **Temporal graph layer** — `valid_from`/`valid_to`, invalidation instead of delete, and a `dhf_lineage` table with `(session_id, ip_hash, device_hash, content_hash, correlation_id)` on every write.
- **Unified intent taxonomy** shared by brain, orb router and search.
- **Consent + provenance ledger** for biometric vectors (fixes fabricated-biometric and freshness risks).
- **Shadow-mode harness** to replay historical traces through the brain without surfacing output.
- **Synthetic crawler** exercising all 91 routes nightly and asserting telemetry packets land.
- **Daily deep-scan report job** flagging unhandled intents, orphan tables and DHF anomalies.

## 9. Recommended fix order

1. Items 1–4 (public surface hardening + silent auth loss).
2. Items 5–10 (stop fabricated/discarded DHF data; kill or wire dead tables; fix heartbeat drift).
3. Items 11–14 (lineage columns + validity windows + decay update).
4. Items 15–21 (platform-state injection, real grounding, single intent taxonomy).
5. Items 22–25 (route registry → index → dock telemetry).
6. Items 26–32 (polling → cron/realtime; multiplexer compliance; bundle budgets).
7. Items 33–37 (retention, partitioning, media offload).
8. Section 8 components, then shadow mode and the nightly crawler as the acceptance gate.

---

## Remediation log — 2026-09-03

### Stage 1 · Public surface hardening (CLOSED)

| Item | Status | Evidence |
| --- | --- | --- |
| Unauthenticated edge functions without a WAF | **Fixed** | All 28 live `verify_jwt = false` functions now call `publicGuard`. `edge-tts` and `zoe-voice` are stale config entries with no directory. |
| Method-agnostic guard | **Fixed** | `supabase/functions/_shared/public-guard.ts` wraps `guardRequest`, keeps GET/cron paths working and exposes the parsed body as `guard.body` so handlers never double-read the request. |
| Regression prevention | **Fixed** | `scripts/check-public-guard.mjs` fails `prebuild` if a new unauthenticated function ships without a guard. |
| Live verification | **Passed** | `external-search` / `get-user-location` / `zoe-infinity-quota-monitor` return 200; `User-Agent: sqlmap` → 403; 31st call in a 60s window → 429. |

### Stage 2 · Telemetry integrity (CLOSED)

| Item | Status | Evidence |
| --- | --- | --- |
| Silent behavioural-event loss | **Fixed** | `behavioral-event-stream` returns HTTP 401 with `success:false, retryable:true` for anonymous/expired sessions; `useContinuousDHFStream` and `useAdaptiveLearning` now requeue on `success:false` instead of reporting a healthy stream. Live probe returns 401. |
| Fabricated biometrics presented as real | **Fixed** | `useBioTelemetry` exposes `dataSource: 'simulated'` / `isSimulated`, the fake "Oura Ring Gen 3" label is gone, and `DeviceStatus` renders a **Simulated** chip. The values are never persisted or fed to the DHF graph. |
| `platform_health_logs` write storm | **Fixed** | Six hooks wrote ~3,300 rows/user/day (16M/day at 5,000 members, 93 MB for three test accounts). All now funnel through `logHealthSnapshot`, which keeps one row per source per 15 min and always lets genuine state changes and one-off events through. Covered by `src/test/healthSnapshotThrottle.test.ts`. |
| Retention gaps | **Fixed** | `prune_platform_telemetry` now also prunes `dhf_heartbeats` (14d), `zoe_search_events` (90d) and `dhf_asset_logs` (30d), and tightens health logs to 7d / behavioural events to 30d. First run removed 101,765 rows. Execute is revoked from `anon`/`authenticated`. |

Note: `VACUUM FULL` cannot run through the SQL API, so the freed pages stay
allocated to the tables and are reused by new inserts rather than returned to
the filesystem. Total database size stops growing, which is the operative goal.
