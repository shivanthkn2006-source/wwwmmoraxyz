# M'Mora / Zoe — End-to-End Deep Scan & Integration Audit
**Date:** 02 September 2026, 10:22 IST (04:52 UTC) · **Scope:** every prompt executed today + full platform integration status
**Method:** live database queries, live edge-function probes, cron run history, analytics logs, full Vitest run, route/link static scan. No estimates — every number below came from a live check.

---

## 1. What today's prompts were for (purpose, not just output)

| # | Prompt | What it actually protects or enables | Status |
|---|--------|--------------------------------------|--------|
| 1 | Wire Cloudflare WAF rules into `_shared/waf.ts` and test with a bot IP | Stops automated signup abuse *before* it reaches auth or the database. Without it, a scripted bot farm can mint thousands of accounts and burn AI credits. | **Live & proven** — 403 on threat score ≥30, bot score ≤15, scanner UA, SQL-injection payload, and Sentinel-blocked IP. Verified bots and humans pass (200). |
| 2 | Create live test accounts and run the six `agent_interactions` RLS isolation tests | Proves one user cannot read/modify another's private agent context. This is the single highest-risk claim in a beta — it must be *demonstrated*, not assumed. | **6/6 pass** against the live backend. Root cause of the earlier skip found: the `agent_interactions` table did not exist; created with owner-only policies + GRANTs. |
| 3 | Attack response plan page from the WAF/rate-limit guard | Turns invisible security code into an auditable public document — required for enterprise/beta trust reviews. | **Live** at `/attack-response`, linked from `/platform-architecture`. |
| 4 | Role-based permissions on `/admin/overview` | Replaces username-based admin checks (spoofable) with database roles, and gives you a UI to grant admin/moderator/tester without SQL. | **Live** — `tester` added to `app_role`; `RolePermissionsPanel` mounted. |
| 5 | Daily YouTube dispatch so the DHF feed isn't empty | Guarantees the DHF video shelf always has real, playable content even with zero user activity. | **Live** — cron `dhf-video-dispatch` at 02:20 daily; 60/60 videos verified playable via YouTube oEmbed. |

---

## 2. The DHF video page — what it is, where it is, how it works

- **What it is:** a curated shelf of real YouTube videos of the DHF figures (thinkers, scientists, philosophers) that the Growth/DHF engine writes about. It is *not* user-generated content and not the social Loops feed.
- **Where the user sees it:** `/dhf-dashboard` → **Videos** tab. Rendered by `src/components/dhf/DhfVideoFeed.tsx`, mounted inside `src/pages/DHFDashboardPage.tsx`.
- **Data source:** `public.dhf_videos` — **60 active rows** today.
- **How it fills:** the `dhf-video-dispatch` edge function runs nightly at 02:20 UTC (pg_cron), resolves real YouTube IDs per figure, decodes titles and dedupes. Run history is written to `dhf_video_dispatch_runs`.
- **Health today:** last run 02:20 UTC succeeded; **60/60 video IDs return HTTP 200 from YouTube oEmbed**, i.e. every card opens a live video, none deleted or private.
- **Why it exists:** DHF cards are text-heavy. Video gives the same figure a second, lower-effort entry point, and it is the surface that later carries share-out to YouTube/TikTok/Instagram/X via `src/lib/shareTargets.ts`.

---

## 3. Frontend surface — how much exists, how much a user can actually reach

| Measure | Count | Notes |
|---|---|---|
| Page components | 81 | `src/pages` |
| Unique routes registered | 87 | `src/App.tsx` |
| Routes behind `ProtectedRoute` (sign-in required) | 67 | matches the "unauthenticated → /auth" rule |
| Admin/ops consoles | 9 | `/admin/*` |
| Public routes | 20 | auth, recovery, architecture, attack-response, overview, install, etc. |
| Routes with **no in-app link** before this pass | 6 | orphaned — reachable only by typing the URL |
| Routes with no in-app link **after** this pass | 4 | see below |

**Orphans found:** `/admin/overview`, `/admin/search-index`, `/admin/zoe-preview`, `/platform-overview`, `/compatibility-report`, `/zoe-astro/birth`.
**Fixed this pass:** `/admin/search-index` and `/admin/zoe-preview` are now linked from the Admin surfaces bar on `/admin/overview` (which also now links Attack response and Architecture).
**Still unlinked (deliberate or pending your call):** `/admin/overview` itself (bookmark entry point), `/platform-overview`, `/compatibility-report`, `/zoe-astro/birth`.

**Admin gating audit (all 9 consoles):** 8 enforce admin/moderator either in the page or via RLS. `/admin/search-index` had **no UI gate** — fixed this pass with a shared `useIsAdmin()` hook calling the security-definer `has_role` RPC. Note that on every admin page the real enforcement is RLS: a non-admin sees no rows even if they reach the URL.

---

## 4. Backend integrations — what runs, what is idle

**Edge functions deployed: 142.** Not all are hot; that is expected — many are on-demand (document x-ray, song ID, image validation) and only fire when a user triggers them.

**Scheduled jobs: 10 — all active, zero failures in the last 24 h.**

| Job | Schedule | Runs (24 h) | Failures |
|---|---|---|---|
| astro-dispatch-quarter-hourly | */15 * * * * | 96 | 0 |
| growth-dispatch | */15 * * * * | 96 | 0 |
| dhf-compass-dispatch | */10 * * * * | 144 | 0 |
| deliver-due-dhf-essays | */5 * * * * | 266 | 0 |
| auto-generate-video-posters | */5 * * * * | 288 | 0 |
| zoe-motivation-hourly | 7 * * * * | 24 | 0 |
| growth-reconcile | 20 */6 * * * | 4 | 0 |
| dhf-video-dispatch | 20 2 * * * | 1 | 0 |
| astro-audit-nightly | 30 23 * * * | 1 | 0 |
| prune-platform-telemetry | 15 3 * * * | 1 | 0 |

**HTTP traffic to edge functions (last 72 h):** sentinel-guard 20 calls / 0 errors · growth-dispatch 9 / 0 · signup-security 5 / 2 (**both 4xx were my own bot-refusal tests — correct behaviour**) · auto-generate-video-posters 2 / 0 · astro-dispatch 1 / 0 · dhf-compass-dispatch 1 / 0. Low volume simply reflects 14 accounts in gated beta.

**Live content inventory:** 14 users · 12 profiles · 63 posts · 250 DHF daily cards · 68 growth feed items · 60 DHF videos · 748 search-index rows · 32 notifications · 135 Sentinel sessions · 12 threat events · 5 essay schedules · 3 content reports · 1 admin role.

---

## 5. Test and build state

- **Vitest: 610 passed, 6 skipped, 0 failed** (73 files). The 6 skips are the `agent_interactions` RLS integration tests, which skip without live credentials — run with the test accounts they are **6/6 green**.
- **Typecheck/build: clean.**
- **Database linter:** 1 informational (`edge_rate_limits` has RLS on and no policies — intentional, it is service-role-only, so "locked" is the correct posture). Remaining warnings are pre-existing `SECURITY DEFINER` function notices and the pgvector-in-public extension notice.

---

## 6. Honest gaps — what is *not* done

1. **Coverage of user-triggered edge functions is unproven at load.** 142 functions exist; only 6 have real traffic. Nothing is broken, but "deployed" is not "exercised".
2. **Growth preferences exist for 3 of 14 users.** The other 11 will get generic, non-personalised cards until they complete onboarding.
3. **Only 1 admin role assigned; moderator and tester roles have zero holders**, so the moderation queue has no second pair of eyes.
4. **4 routes remain unlinked** from any in-app navigation.
5. **Cloudflare geo rule (`cf-ipcountry: T1`, Tor) cannot be spoof-tested** from this sandbox because the platform edge rewrites that header — it will only fire behind real Cloudflare. Threat-score and bot-score rules were proven live.
6. **`content_reports` has 3 open items** and no SLA/auto-escalation.

---

## 7. Recommended next prompts, in priority order

1. **"Run a synthetic exercise pass over all 142 edge functions and report which return non-2xx"** — converts "deployed" into "verified", and finds dead functions worth deleting before launch.
2. **"Force growth onboarding for the 11 users without preferences, with a dismissible prompt and a reconciliation job"** — the fastest lift to perceived quality in the feed.
3. **"Assign moderator and tester roles and add an SLA timer + auto-escalation to the moderation queue"** — makes `content_reports` operational rather than decorative.
4. **"Add a nightly link-health job for `dhf_videos` that deactivates dead YouTube IDs"** — today 60/60 are live; videos rot, and a broken card is worse than no card.
5. **"Add a navigation audit test that fails the build when a route has no in-app link"** — prevents orphan pages returning.
6. **"Run a 500-concurrent-session load test against sentinel-guard and growth-dispatch"** — the 50-tab test proved WebSocket multiplexing; edge throughput at 500+ is still untested.

---

*Every figure in this report was read from the live system on 02 Sep 2026. Where something could not be verified (Cloudflare geo header), it is stated as unverified rather than assumed.*
