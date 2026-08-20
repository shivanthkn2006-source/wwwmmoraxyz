# Platform hardening roadmap (the 6 weak links)

First, to clear the confusion: the Lovable AI Gateway work is a **different, already-finished job**. That plan was about stopping AI-gateway charges, and it is done and verified — zero gateway calls remain. It has nothing to do with the six weak links below. This plan is the roadmap for those.

## Step 1 (do now): database access control + password protection

A fresh scan just confirmed six **error-level** policies where the rule is written against `{public}` with `USING(true)`, so any signed-in (and in some cases anonymous) caller can read or write backend-only tables:

- `brand_deals` — anyone can create/modify/delete deal records
- `dhf_stack_sessions` — anyone can read/tamper with other users' session state
- `face_login_attempts` — emails, IPs, device fingerprints readable and writable by anyone
- `sft_deployment_queue` — anyone can view/tamper with the deployment queue
- `zoe_paused_threads` — anyone can read other users' paused AI context
- `zoe_synthetic_scenarios` — anyone can fully manage training scenarios

Plus four warn-level issues in the same family:

- `notifications` — insert policy only checks the user is logged in, so anyone can send a notification that looks like it came from someone else
- `platform_health_logs`, `security_logs` / audit logs — `WITH CHECK(true)` lets clients inject fake monitoring and audit entries
- `zoe_black_box_ledger` — `user_id IS NULL` system rows are visible to every signed-in user

Work in one migration:

1. Rewrite each offending policy to `TO service_role` instead of `{public}`, keeping any genuine per-user read policy intact so the app keeps working.
2. Add `WITH CHECK (auth.uid() = from_user_id)` on notification inserts.
3. Drop the `OR user_id IS NULL` branch from the black-box ledger read policies.
4. Confirm every edge function that writes these tables uses the service-role client (it should already), then re-run the scanner to confirm the six errors are gone.
5. Turn on leaked-password protection in auth settings.

Risk: if any of these tables are written from the browser today, tightening them breaks that path. The migration will be preceded by a check of client-side usage for each table, and any legitimate client write moves behind an edge function.

## Step 2: error monitoring

There is a homegrown `errorBoundaryLogger` storing errors in localStorage only — nothing is visible server-side. Add a real sink: persist frontend errors and edge-function failures to a `platform_error_events` table (service-role insert via a small edge function), with an admin view showing rate, top messages, and affected routes. Optional Sentry later if you want off-platform alerting.

## Step 3: split the mega-files

Confirmed sizes: `ZoeOrbConversationPanel.tsx` 4,604 lines, `ZoeAssistant.tsx` 4,446, `ZoeInfinityUnlocked.tsx` 4,170, `VROMEGAWorld.tsx` 3,313, `HomePage.tsx` 2,149. Split one per pass, extracting hooks and subcomponents behind unchanged props so behaviour is byte-identical. Start with `HomePage.tsx`, since that is where edits keep causing regressions.

## Step 4: video transcoding CDN

Today loops are transcoded in-browser to 480p WebM only when the file is ≥5MB, so quality and consistency vary. Move uploads to a hosted transcoder (Mux or Cloudflare Stream) with HLS playback, poster generation, and adaptive bitrate. This one needs a paid third-party account and a key.

## Step 5: prune dormant tables and functions

~200 tables and 125 edge functions. Produce a usage report (last-write timestamps, function invocation counts), mark dead ones, then remove in a reviewed batch after you approve the list. Also revoke `EXECUTE` on the security-definer functions the linter flags that no longer need public access.

## Step 6: tests around feed and auth

Coverage is near zero. Add Playwright specs for: sign-in and session persistence, feed loads with posts visible and fitted, loop rail single-pass, and Zoe orb replying. Wire `scripts/check-no-lovable-ai.mjs` into the same CI run so the gateway can never come back.

## Sequencing

Steps 1 and 2 are the ones with real risk attached today. Steps 3–6 are quality and cost work. I would do step 1 as its own pass, then stop for your review before step 2.
