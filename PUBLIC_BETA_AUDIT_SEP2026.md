# M'Mora / Zoe / DHF — Public Beta Readiness Audit
**Date:** 1 September 2026 · **Target:** 5,000 active users, enterprise-grade robustness
**Verdict:** NOT READY for open public beta today. Ready for a **gated beta (200–500 invited users)** after the P0 list below (~1 week of work). Estimated launch success rate as-is: **~55–60%**. After P0+P1: **~92%**. After P2: **~99%**.

---

## 1. Platform size (measured)

| Layer | Count |
|---|---|
| Routes | 68 pages, 2 parallel route trees (light shell + full shell) |
| React components | 638 files / 44 clusters |
| TS/TSX source files | 1,514 |
| Edge functions | 137 deployed (+ `_shared`) |
| Database tables (public) | 222 |
| RLS policies | 644 — **0 tables without RLS** |
| Scheduled cron jobs | 8 |
| Unit tests | 56 vitest files (~513 tests) |
| E2E tests | 18–20 Playwright specs |
| Registered users today | 12 |
| DB size / disk | 511.9 MB / 10% used |

Build status: **build OK**, strict typecheck passes, `console`/`debugger` are stripped in production builds (`vite.config.ts:383`).

---

## 2. Menu / navigation map

**Two route trees** (`src/App.tsx:412-433`). `isLightRoute` paths (`/`, `/auth*`, `/login`, `/signup`, `/password-recovery`, `/zoe-omega*`, `/zoe-infinity*`, `/genesis-imprint`, `/platform-audit`, `/root-scan`, `/agent-memory`, `/vr-audit`, `/install`) bypass the heavy provider shell; everything else renders inside `PlatformLayout`.

**Primary user menu — `GlobalHomeDock`** (`src/components/home/GlobalHomeDock.tsx:33-112`, mounted in `PlatformLayout.tsx:79`, hidden on `/home`, auth routes and `/zoe-infinity*`):
Home → `/home` · Compass (DHF) → `/compass` · Growth Insights → overlay panel · Zoe AI → `/zoe-ai` · Chat → `/chat` · Notifications → `/notification-history` · Profile → `/profile`.

**Persistent chrome** (all routes): `GrowthCardAlertHost`, `NotificationAlertHost`, `ZoeSpeechPauseBar`, `ZoeCardNarrationProvider`.

**Functional route groups**
- *Core social*: `/home`, `/chat`, `/chat/:userId`, `/huddle`, `/profile`, `/profile/:userId`, `/webdrop`, `/mmora`
- *Zoe*: `/zoe-ai`, `/zoe-infinity`, `/zoe-infinity/mail`, `/zoe-omega`, `/omega-evolution`, `/god-mode`, `/zoe-nexus`, `/phoenix-core`, `/zoe-architecture`, `/ai-companion`
- *DHF & Growth*: `/compass`, `/dhf-dashboard`, `/growth-insights`, `/universal-timeline`, `/kronos-anima`
- *Astrology*: `/zoe-astro`, `/zoe-astro/birth`, `/zoe-astro/log`, `/zoe-astro/dispatch`, `/zoe-astro/trace/:correlationId`
- *Voice/camera*: `/voice-auth`, `/voice-commands`, `/voice-command-history`, `/camera`, `/quantum-camera`, `/selfie-city`
- *Vertical apps*: `/merchant`, `/legal-nexus`, `/contract-scanner`, `/career-divinity`, `/resleeve`, `/exodus`, `/exodus-map`, `/anka-shastra`, `/vastu-scan`, `/agasthya-vision`, `/vitruvian`, `/orbital-command`
- *Admin*: `/admin/health`, `/admin/search-index`, `/admin/feed-debug`, `/admin/zoe-preview`, `/admin/growth-runs`, `/admin/growth-delivery`, `/analytics-dashboard`, `/platform-audit`, `/root-scan`
- *Auth/system*: `/auth`, `/password-recovery`, `/access-denied`, `/security`, `/notification-preferences`, `/activity-export`, `*` → NotFound

**Navigation defects found**
- `/zoe-omega`, `/zoe-infinity`, `/zoe-infinity/mail`, `/genesis-imprint` are declared in **both** route trees; the full-shell copies are unreachable dead routes (`App.tsx:676-679, 824-830`).
- `/about` and `/sentinel` are **not** wrapped in `ProtectedRoute` (`App.tsx:1018-1020`) — verify this is intentional.
- `src/pages/Index.tsx` is fully orphaned (duplicate of the inline `RootRedirect`).

---

## 3. Backend audit

### 3.1 Security — must fix before beta
| # | Severity | Finding |
|---|---|---|
| S1 | **ERROR** | `profiles` UPDATE policy has `USING` but **no `WITH CHECK`** — a user can rewrite `total_points`, `current_tier`, `tenant_id`, `zoe_identity_dhf_locked`, even `user_id`. Direct privilege escalation. |
| S2 | **ERROR** | `invite_codes` UPDATE policy is unscoped — any signed-in user can mutate **any** active invite code (`current_uses`, `max_uses`, `is_active`). Invite-gate bypass / DoS. |
| S3 | WARN | `messages` UPDATE policy has no `WITH CHECK` — a recipient can rewrite `content`, `media_url`, `sender_id` of a received message. |
| S4 | WARN | 65 SECURITY DEFINER functions are EXECUTE-able: 10 by `anon`, 55 by `authenticated`. Needs a `REVOKE EXECUTE FROM anon, authenticated` pass on everything except the intended RPCs. |
| S5 | WARN | An extension is installed in the `public` schema. |
| S6 | **HIGH (operational)** | ~30 edge functions run `verify_jwt = false`, including `zoe-god-mode`, `behavioral-event-stream`, `quadrillion-audit`, `ecn-analysis-processor`, `parent-zoe-executor`, `zoe-infinity-*`, `edge-tts`, `get-mapbox-token`. Any of these that call paid AI providers is an **unauthenticated cost-drain vector** at public-beta scale. |

### 3.2 Secrets — configuration gaps
18 secrets configured. Code references ~34 env vars. **Referenced but not configured:** `GEMINI_API_KEY`, `COHERE_API_KEY`, `RESEND_API_KEY`, `SLACK_API_KEY` / `SLACK_BOT_TOKEN`, `ASTRO_ALERT_SLACK_WEBHOOK_URL`, `MMORA_MGMT_API_TOKEN`, `SOVEREIGN_AI_KEY`, and the `POLLINATIONS_KEY` / `POLLINATIONS_TOKEN` name variants (only `POLLINATIONS_API_KEY` exists). Every function reading one of those fails at runtime today — this includes **email delivery (Resend)** and **Slack alerting**.

### 3.3 Database health & scaling signals
- Database up, 0 restarts, disk 10%. **Memory 72%** — the ceiling to watch.
- **Connections 49/90 already, with only 12 users.** At 5,000 users this saturates unless clients are consolidated onto the pooler. This is the single biggest scaling blocker.
- **300,675 rolled-back transactions since boot** — overwhelmingly RLS/permission denials and failed writes. Indicates a large volume of writes the app attempts and the DB rejects.
- Top query cost (7d):
  - `posts` media lookup by id-array: 12,736 calls, mean **152 ms**, max **7.9 s**, 1,937 s total → needs an index and batching.
  - `feed_posts_safe` per-user feed: 28,053 calls, mean 42 ms, 1,191 s total.
  - Poster backfill scan on `posts` (`media_preview_url IS NULL` + 6 `ILIKE`s): 1,090 calls, mean **338 ms** — unindexable as written, runs every 5 minutes.
  - `posts.likes_count` single-row read: **151,252 calls** in 7 days at 12 users. This is per-card polling; at 5,000 users it becomes ~60M reads/week. Must move to realtime or an aggregated batch read.

### 3.4 Cron jobs
| Job | Schedule | Note |
|---|---|---|
| astro-dispatch-quarter-hourly | */15 | ok |
| growth-dispatch | */15 | ok |
| dhf-compass-dispatch | */10 | **duplicate** |
| dhf-compass-dispatch-10min | */10 | **duplicate — double dispatch, double AI spend** |
| auto-generate-video-posters | */5 | drives the 338 ms unindexed scan |
| growth-reconcile | 20 */6 | ok |
| zoe-motivation-hourly | 7 * * * | known 504 timeout (open in roadmap) |
| astro-audit-nightly | 30 23 | Slack/email alerting is dead (missing secrets) |

Edge-function traffic in the last 7 days is only 24 invocations total with **0 errors** — the functions are healthy but effectively unexercised. Zero load evidence at scale.

---

## 4. Frontend audit

**Strengths:** route-level `AppErrorBoundary` on every route with `resetKeys`, `SafeCanvasWrapper` for WebGL, Zustand platform store, aggressive lazy route splitting, `manualChunks` vendor chunking, production console stripping, `PlatformLayout` owning cross-route services, 513 passing unit tests.

**Risks:**
| # | Severity | Finding |
|---|---|---|
| F1 | HIGH | Global always-mounted widgets have **no dedicated error boundary**: `ZoeAssistant.tsx` (4,434 lines), `ZoeOrbConversationPanel.tsx` (4,578), `ZoeInfinityUnlocked.tsx` (4,090). A crash there blanks the whole route. |
| F2 | HIGH | **63 realtime `.channel()` sites across 62 files**, ~30 overlapping notification hooks each opening their own channel. At 5,000 users this is the fastest way to hit Realtime connection limits, and duplicate channels leak on rapid navigation. Needs one shared multiplexed channel. |
| F3 | MED | 6 files call `setInterval` with no matching `clearInterval`: `SwarmIntelligence.ts`, `BackgroundHarvest.ts`, `SpeculativeDecoder.ts`, `useDeviceTier.ts`, `ZoeBackgroundProcessor.ts`, `errorBoundaryLogger.ts`. |
| F4 | MED | **1,697 `any` usages**, 19 `@ts-ignore`/`@ts-expect-error`. Strict mode is nominal, not real. |
| F5 | MED | Files over 600 lines are numerous; `HomePage.tsx` 2,870, `PostCard.tsx` 1,056, `App.tsx` 1,254, `VROMEGAWorld.tsx` 3,313. High regression surface. |
| F6 | MED | Three.js/R3F loaded by ~40 VR components. `VROMEGAWorld` is double-lazy (good), but `LegalGlobe`, `MerchantHeatmapGlobe`, `SelfieGlobe`, `QuantumCameraCanvas` are eager inside their lazy pages — those routes pull the full three.js runtime on first paint. |
| F7 | MED | `.fbx`/`.glb` avatar models are bundled assets, not CDN-streamed — heavy chunks on VR/Zoe routes. |
| F8 | LOW | ESLint reports ~2,687 legacy issues. |

**Test gaps:** zero direct coverage of the five largest components, **zero tests for any of the 137 edge functions**, no test asserting realtime channel cleanup on unmount, no coverage of voice/VR/quantum hooks. Authenticated E2E is still blocked on preview session minting.

---

## 5. Stack inventory

- **Frontend:** React 18, Vite 5, TypeScript 5, Tailwind 3, shadcn/Radix (30+ primitives), Zustand, TanStack Query, React Router, Framer Motion, three.js + R3F + drei + postprocessing, Leaflet, Capacitor 7 (Android), MediaPipe tasks-genai.
- **Backend:** Supabase (Postgres + RLS + pgvector, Realtime, Storage, Auth, 137 Deno edge functions), pg_cron.
- **AI providers:** NVIDIA NIM, Groq, OpenRouter, Google AI Studio / Gemini, Pollinations (images), Deepgram Aura 2 + AssemblyAI (voice/TTS), Ollama (sovereign/local), ACRCloud (audio ID).
- **Integrations:** YouTube Data API, Mapbox, Twilio, OpenSky, Open-Meteo (keyless), Resend (unconfigured), Slack (unconfigured).
- **Testing/CI:** Vitest, Playwright, GitHub Actions (astro-slot, loops-regression), Cloudflare Pages + wrangler, self-host migration scripts.

---

## 6. Prioritised fix list

### P0 — blockers for any public beta (est. 3–5 days)
1. Add `WITH CHECK (auth.uid() = user_id)` to the `profiles` UPDATE policy and block privileged columns with a trigger. *(S1)*
2. Replace the `invite_codes` UPDATE policy with a `SECURITY DEFINER` redeem RPC. *(S2)*
3. Add `WITH CHECK` / column trigger to the `messages` UPDATE policy. *(S3)*
4. Audit the ~30 `verify_jwt = false` functions; enable JWT everywhere except true webhooks/cron, and require a shared secret header on those. *(S6)*
5. `REVOKE EXECUTE` on SECURITY DEFINER functions from `anon`/`authenticated` except intended RPCs. *(S4)*
6. Drop the duplicate `dhf-compass-dispatch-10min` cron job.
7. Configure or remove the missing secrets — at minimum `RESEND_API_KEY` (email is silently dead) and the Slack alert vars.
8. Replace `posts.likes_count` per-card polling with realtime/batched counts, and index the `posts` id-array + `feed_posts_safe(user_id, created_at DESC)` paths.

### P1 — required for 5,000 users (est. 1–2 weeks)
9. Consolidate the ~30 notification realtime hooks into one multiplexed channel per user; add unmount-cleanup tests. *(F2)*
10. Move all client traffic to the transaction pooler and reduce idle connections (49/90 at 12 users is unsustainable). *(3.3)*
11. Fix the 6 leaking intervals. *(F3)*
12. Wrap `ZoeAssistant`, `ZoeOrbConversationPanel`, `ZoeInfinityUnlocked`, and feed widgets in their own `AppErrorBoundary`. *(F1)*
13. Rewrite the video-poster backfill as an indexed queue table instead of a 6-`ILIKE` scan every 5 minutes.
14. Fix `zoe-motivation` 504 by batching LLM + image work.
15. Investigate the 300k rolled-back transactions — instrument and eliminate the rejected write loop.
16. Unblock authenticated E2E and run the full desktop/mobile suite.

### P2 — hardening and scale headroom
17. Lazy-split `LegalGlobe`, `MerchantHeatmapGlobe`, `SelfieGlobe`, `QuantumCameraCanvas`; move `.glb`/`.fbx` to CDN/runtime fetch.
18. Delete duplicate routes and `src/pages/Index.tsx`; single route tree.
19. Add Deno tests for the top 20 edge functions.
20. Burn down `any` usages in feed/auth/notification paths; then ESLint backlog.
21. Split `HomePage.tsx`, `ZoeAssistant.tsx`, `ZoeOrbConversationPanel.tsx`.
22. Add rate limiting + per-user AI spend caps before opening signups.
23. Load-test 500 concurrent sessions before lifting the invite gate.

---

## 7. Launch-readiness scoring

| Area | Today | After P0 | After P0+P1 |
|---|---|---|---|
| Security / RLS | 55% | 92% | 96% |
| Backend scalability | 45% | 60% | 90% |
| Frontend stability | 75% | 80% | 93% |
| Feature completeness | 85% | 88% | 92% |
| Observability / alerting | 40% | 75% | 90% |
| Test confidence | 60% | 65% | 85% |
| **Overall launch success** | **~57%** | **~85%** | **~92%** |

**Recommendation:** ship P0, then invite-gated beta at 200–500 users with AI spend caps on, then P1 and a 500-concurrent load test before opening to 5,000.
