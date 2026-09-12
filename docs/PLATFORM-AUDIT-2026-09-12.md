# M'Mora / Zoe / DHF — Head-to-Toe Platform Audit
Date: 12 September 2026 · Scope: full codebase, routes, gates, backend, integrations, security, cost

All numbers below are measured from the live repository and backend, not estimated.

---

## 1. Codebase size (measured)

| Area | Files | Lines |
|---|---|---|
| Frontend `src` (TS/TSX/CSS) | 1,765 files (926 .ts, 778 .tsx) | 470,847 |
| — components | 635 | 186,176 |
| — hooks | 420 | 121,434 |
| — pages | 101 | 35,740 |
| — utils | — | 24,699 |
| — backend types (auto-generated) | 1 | 12,629 |
| — lib | — | 10,137 |
| — tests | 102 test files | 7,001 |
| — services | 31 | 6,502 |
| — features | — | 5,167 |
| — contexts | — | 2,953 |
| Edge functions (backend) | 167 functions | 58,610 |
| Database migrations | 386 files | 20,601 |
| **Total hand-maintained code** | — | **≈ 550,000 lines** |

Largest single files (refactor candidates): `ZoeOrbConversationPanel.tsx` (4,789), `ZoeAssistant.tsx` (4,437), `ZoeInfinityUnlocked.tsx` (4,090), `VROMEGAWorld.tsx` (3,313), `HomePage.tsx` (2,988).

## 2. Languages, frameworks, brands in use

- **Languages:** TypeScript, TSX/JSX, SQL (PostgreSQL), CSS, GLSL (via three.js shaders), Deno TypeScript for backend functions.
- **Core stack:** React 18, Vite 5, Tailwind CSS 3, TypeScript 5, React Router, TanStack Query, Zustand, Zod, React Hook Form.
- **UI/brand libraries:** Radix UI (24 packages), lucide-react, framer-motion, sonner, embla-carousel, vaul, cmdk, recharts.
- **3D / spatial:** three.js, @react-three/fiber, drei, postprocessing, react-globe.gl, d3-geo/selection/zoom.
- **Maps:** Mapbox GL JS + Leaflet / react-leaflet (9 files).
- **On-device AI:** TensorFlow.js, coco-ssd object detection, MediaPipe tasks-genai.
- **Documents/media:** jsPDF, pdfjs-dist, react-to-print, dexie (offline store), vite-plugin-pwa.
- **Native shell:** Capacitor (iOS + Android) — scaffolded, not yet published to devices.
- **Total dependencies:** 85 runtime + 23 dev.

## 3. Third-party integrations (28 configured secrets)

Live and keyed: Deepgram (voice), Lovable AI Gateway, Google AI Studio / Google API, Groq, OpenRouter, Cohere, NVIDIA, Pollinations (3 keys), SerpAPI (news), YouTube Data, Mapbox, Resend (email), Twilio (SMS/voice), AssemblyAI, ACRCloud (audio ID), Cloudflare Turnstile, Ollama endpoint, plus internal drain/demo secrets.

**Referenced in code but NOT configured (19) — these features silently degrade:**

| Missing key | Impact |
|---|---|
| `MESHY_API_KEY` | 3D asset generation returns "unavailable" (known) |
| `GEMINI_API_KEY` | Gemini path falls back to other providers |
| `SLACK_BOT_TOKEN`, `SLACK_API_KEY` | Slack alerting/ingestion inert (by design, optional) |
| `ASTRO_ALERT_*` (4) | Astrology alerting to email/Slack inert |
| `CRON_SECRET`, `CRAWLER_SECRET` | Scheduled crawler/cron endpoints unauthenticated-by-absence — must be set before launch |
| `MMORA_MGMT_API_TOKEN` | Management API endpoints unusable |
| `SITE_URL`, `ZOE_MAIL_FROM`, `GROWTH_EMAIL_FROM`, `BUG_REPORT_EMAIL_FROM` | Email links/senders fall back to defaults; sending domain still unverified |
| `DEMO_ACCOUNT_EMAIL` | Demo session relies on fallback |
| `SUPABASE_PROJECT_ID/REF`, `VITE_*` duplicates | Redundant references, harmless |

## 4. Routes, gates, and site map

- **110 canonical routes** in the generated registry, all reachable and mounted in `App.tsx`.
- **82 routes behind `ProtectedRoute`** (sign-in required), **2 behind `EarnedRoute`** (7-distinct-active-days unlock), admin surfaces behind server-verified admin role (`@moksh50` only).
- Public: `/`, `/auth`, `/signup`, `/welcome`, `/demo`, `/privacy`, `/terms`, `/data-policy`, `/help`, `/map`.
- Last full signed-in crawl: no blank screens, no failed navigations across static routes.
- **Gate gap:** `/map` lists admin/earned pages as greyed tags — correct — but there is no automated test asserting every new route is gated, so a future route can ship ungated.

## 5. Backend (database + functions)

- **262 tables**, **707 RLS policies**, **138 database functions**, **386 migrations**, **15 auth users**.
- **Every table has at least one policy** — zero unprotected tables. Good.
- **167 edge functions.** Known runtime issues already fixed this cycle: `sentinel-guard` 150s idle timeout, `zoe-search-indexer` 401 for signed-out callers, DHF lineage hashing, privileged helper wrappers (17 functions moved private + `SECURITY INVOKER` public wrappers).
- **Database linter:** 1 warning — an extension installed in the `public` schema. Low risk, should be relocated before launch.
- **No sharding / read replicas** yet; single instance serves preview and production.

## 6. Security findings (5 open)

| Severity | Finding | Fix |
|---|---|---|
| **Error** | `post_tags` SELECT readable by any signed-in user — reveals who is tagged on private posts | Scope SELECT to posts the requester can view |
| **Error** | `video_assets` SELECT `USING (true)` — leaks `playback_url`/`storage_path` for private post videos | Scope to owner or viewers of the parent post |
| Warn | `comment_likes` leaks engagement on private posts | Scope to visible posts |
| Warn | `post_ratings` leaks ratings on private posts | Scope to visible posts |
| Warn | `user_follows` exposes the entire social graph to any signed-in user | Scope to requester's own edges or public profiles |

Supply-chain scan: **clean, 0 vulnerable dependencies.** App-MCP scan: clean.

## 7. Quality signals

- **Vitest: 778 passing, 6 skipped, 0 failing** across 102 test files (~14% of files carry tests — thin for this size).
- **Typecheck: clean.** **Build: OK.**
- Only 2 literal TODO/FIXME markers; ~120 files contain honest "unavailable"/degraded-state handling (intentional truthful-state design).

## 8. What is still missing for beta launch

Ordered by launch-blocking weight.

**Blocking**
1. Fix the 2 error-level RLS leaks (`post_tags`, `video_assets`) and 3 warnings. (~250 lines SQL + tests)
2. Set `CRON_SECRET` / `CRAWLER_SECRET` and verify the email sending domain. (~50 lines)
3. Video delivery: no CDN/HLS pipeline — large uploads stream from storage directly. (~2,500 lines)
4. Real device QA: iOS Safari / Android Chrome / iPad / PWA hands-free and AirPods paths are code-complete but unverified on hardware.
5. Load testing at 500+ concurrent users; no results yet.

**Important**
6. Native wrappers (Capacitor iOS/Android) built, signed, installed — required for locked-screen wake word, which browsers cannot do. (~4,000 lines + store review)
7. 3D generation: `MESHY_API_KEY` or a self-hosted generator. (~800 lines)
8. Database scaling: read replicas / partitioning of `feed_events`, `ai_companion_messages`, DHF queue. (~1,200 lines)
9. Observability: error tracking (Sentry-class), uptime alerting, per-function latency dashboards. (~1,500 lines)
10. Test coverage from ~14% of files to a defensible ~40% on critical paths. (~8,000 lines)
11. Refactor the five 3k–5k-line files; they are the main regression risk. (net ~0, high value)
12. Penetration test + WAF rule review; social ingestion, travel booking, and provider quota surfaces remain parked.

**Estimated remaining code to beta: ≈ 20,000–30,000 lines** (plus non-code work: store review, pen test, load test, domain verification).

## 9. Development cost if built by human developers

Measured base: ~550,000 lines of maintained code, 110 routes, 262 tables, 167 backend services.

Sustained output for senior product engineers on a system of this complexity is 40–80 shipped, reviewed lines/day.

| Basis | Effort | Cost |
|---|---|---|
| Raw line count at 75 lines/dev-day | ~7,300 dev-days ≈ 33 dev-years | **$4.0M–$8.7M** (US blended $120k salary → $150/hr contract) |
| Feature-equivalent (discounting AI verbosity ~45%) | ~18 dev-years | **$2.2M–$4.8M** |
| Realistic team view: 8 engineers + 1 designer + 1 PM + 1 SRE, 24 months | 22 person-years | **≈ $3.3M** at $150k fully loaded |

**Fair headline figure: a human team would have spent roughly $2.5M–4M and 20–24 months to reach today's state.** Remaining beta work adds roughly **$250k–450k and 3–5 months** of that same team.

## 10. If Apple or Google were building this — start to public beta

They would not ship 550k lines in one product. Their sequence:

**Phase 0 — Charter (4–6 weeks).** One-sentence product thesis, a named executive owner, a privacy/legal review before any code. Zoe's always-listening capability alone would trigger a formal privacy design review (Apple: on-device-first mandate; Google: privacy-by-design sign-off).

**Phase 1 — Vertical slice (8–12 weeks).** One user, one device, one flow: wake word → answer → memory. Native from day one (Swift/Kotlin), not a browser shell. Kill criteria defined up front.

**Phase 2 — Platform foundation (4–6 months).** Identity, data model, RLS equivalents, telemetry, feature flags, kill switches, and a rollback path — before feature breadth. They would freeze the surface at ~15 screens, not 110.

**Phase 3 — Dogfood (3 months).** Thousands of internal users, hard latency budgets (Apple's bar: voice first-token under 500 ms), weekly bug-bash gates. Nothing ships past this without a p95 latency and crash-free-session target met.

**Phase 4 — Closed beta (3 months).** 5k–50k invited users, staged rollout by cohort, mandatory red-team + external pen test, accessibility (VoiceOver/TalkBack) certification, and store-review compliance.

**Phase 5 — Public beta.** Region-by-region ramp with automatic rollback.

**Total: 18–24 months, 40–120 people, $25M–80M** — for a deliberately narrower product than this one.

**What to copy from them, concretely:**
1. **Cut surface area.** 110 routes is more than Apple ships in a v1 OS feature. Pick 15 for beta; hide the rest behind the earned-unlock gate you already built.
2. **Set numeric budgets and enforce in CI.** Voice first-token p95, Home first paint, crash-free sessions. Fail the build, not the launch.
3. **Native-first for the voice promise.** Locked-screen listening is physically impossible in a browser tab; the Capacitor shell must ship before you promise "Jarvis".
4. **Privacy review before feature review.** Preference learning, biometrics, and always-on mic need a written data-flow document and a user-visible off switch (the master toggle exists — document it).
5. **One owner per subsystem** with a kill switch each: voice, feed, DHF, admin.

---

## Appendix — verification commands used
- Line counts: `find`/`wc -l` over `src`, `supabase/functions`, `supabase/migrations`
- Backend: `information_schema.tables`, `pg_policies`, `pg_proc`, `auth.users`
- Security: platform security scanner (5 findings) + Supabase linter (1 warning) + supply-chain scan (clean)
- Tests: `bunx vitest run` — 778 passed / 6 skipped / 0 failed; `bunx tsgo --noEmit` clean
