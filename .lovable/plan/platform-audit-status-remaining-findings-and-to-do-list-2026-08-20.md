# Platform audit — status, remaining findings, and to-do list

Fresh scan run just now (2026-08-20 12:21 UTC). No UI/UX changes anywhere in this plan.

## 1. What is already done (verified)

Step 1 of the hardening roadmap shipped and re-verified against a live scan:

- `brand_deals`, `dhf_stack_sessions`, `sft_deployment_queue`, `zoe_paused_threads`, `zoe_synthetic_scenarios` — the blanket `USING(true)` policies exposed to `{public}` are gone. None appear in the new scan.
- `face_login_attempts` — no longer world-readable/writable; absent from the new scan.
- Notification impersonation — insert now bound to the sender's own id.
- Forgeable health/audit log inserts — `WITH CHECK(true)` removed; service role retained for edge functions.
- Leaked-password protection — enabled (it no longer appears as a finding).
- AI gateway removal (separate earlier job) — zero Lovable-gateway calls remain; `scripts/check-no-lovable-ai.mjs` tripwire exists but is not yet in CI.

Error count went from 5 to 3, and the 3 that remain are **different** findings the earlier scan had not surfaced.

## 2. Still open — security (3 errors, 6 warnings)

Errors:

1. `profiles` — `profiles_public_view` lets any signed-in user read every profile whose `profile_visibility` is `public` (the default), including `birth_date`, `birth_place`, `real_name`, `job_title`, `organization`, `location` and Zoe personalization fields.
2. `zoe_black_box_ledger` — rows with `user_id IS NULL` (system security events: GOD_MODE_ACTION, defense_active, cognitive_collapse) are readable by every signed-in user. The `OR user_id IS NULL` branch is still present, so this one was not actually closed in step 1.
3. `selfie_city_pins` — `USING(true)` for the public role exposes images, captions and precise lat/long to unauthenticated visitors.

Warnings:

4. `zoe_sovereign_memory` — placeholder-UUID carve-out readable by all users.
5. `exodus_players` — leaderboard policy exposes `banned` / `ban_reason`.
6. `is_root_admin` and inline `profiles.username` checks — admin rights keyed to a hardcoded, user-editable username list (should use `user_roles` + `has_role`).
7. Materialized view exposed over the Data API.
8. SECURITY DEFINER functions executable by `anon`.
9. SECURITY DEFINER functions executable by `authenticated`.

## 3. Still open — engineering

- Tests: 34 test/spec files against 414,331 lines across 1,427 source files (~2%).
- Mega-files: `ZoeOrbConversationPanel.tsx` 4,604; `ZoeAssistant.tsx` 4,446; `ZoeInfinityUnlocked.tsx` 4,170; `VROMEGAWorld.tsx` 3,313; `SolarSystemExplorer.tsx` 2,176; `HomePage.tsx` 2,149.
- 125 edge functions, heavy duplication, no shared contract/versioning layer.
- ~200 tables, many single-purpose and dormant.
- One CI workflow only; no bundle-size budget for a 3D/TF-heavy app.
- No server-side error sink — `errorBoundaryLogger` writes to localStorage only.

## 4. Still open — infrastructure / third-party

- No video CDN or server-side transcoding (client-side WebM, 480p cap). Explicitly de-scoped by you earlier; listed here for completeness only.
- No APM / uptime alerting.
- Self-hosted TencentDB memory gateway is a single point of failure.
- No push notifications (FCM/APNs) despite the Capacitor shell.
- Android-only; no iOS target.
- No rate limiting / WAF in front of public edge functions.

## 5. Health verdict (current)

Security B- (3 data-exposure errors left, down from 5 plus the password gap), reliability B- (no APM, thin tests), maintainability C (mega-files, 125 functions, ~200 tables), performance B, product completeness A-.

## 6. Proposed order of work

**Step 2a — close the 3 remaining errors (one migration, no app changes).**
Restrict `profiles` public reads to a safe column set via a view or a narrowed policy while keeping every existing client read working; drop the `OR user_id IS NULL` branch from the black-box ledger read policies; require authentication for `selfie_city_pins` reads. Each table's client usage is checked before the policy changes so no screen breaks.

**Step 2b — warnings sweep.** Move `is_root_admin` onto `user_roles`/`has_role`, remove the placeholder-UUID carve-out, add a leaderboard view for `exodus_players`, pull the materialized view out of the API schema, and revoke `EXECUTE` from `anon`/`authenticated` on the definer functions that no client calls.

**Step 3 — error monitoring.** `platform_error_events` table, a small service-role edge function sink, and an admin-only read view. Frontend keeps its current behaviour; only the sink is added.

**Step 4 — split the mega-files.** One per pass, pure extraction (same props, same hook order, same JSX). Start with `HomePage.tsx`.

**Step 5 — prune dormant tables/functions.** Usage report first, deletion only after you approve the list.

**Step 6 — tests + CI.** Playwright specs for sign-in/session persistence, feed render, loop rail single pass, Zoe orb reply; add `check-no-lovable-ai.mjs` and a bundle-size budget to CI.

## Non-regression rules (unchanged)

- No UI/UX changes, no visual changes, no behaviour changes to any existing screen or flow.
- Every policy tightening is preceded by a client-usage check on that table; legitimate browser reads/writes keep working.
- Mega-file splits are pure extraction, no logic rewrites.
- Each step ships and is verified (rescan, preview load, console check) before the next starts.
- Nothing is dropped without your explicit approval of the list.
