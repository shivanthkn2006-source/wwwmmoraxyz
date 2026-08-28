# Harden the global dock and Growth delivery

## What will change
- Make the authenticated platform dock render from the true app shell so every protected route receives the same bottom-right Home and Growth controls; keep only authentication/recovery screens chrome-free and prevent a duplicate dock on Home.
- Stop the Home profile sheet from reopening on every sign-in for established users merely because optional bio/hobbies are empty; only incomplete onboarding can trigger it.
- Fix Growth catch-up to generate every elapsed scheduled slot in one run, preserving per-user timezone ordering and idempotency so missed morning/day cards are not delayed across later cron cycles.
- Keep the unread Growth badge live through realtime plus polling fallback, and retain the latest-alert panel behavior.
- Correct notification digest bookkeeping so daily delivery is marked complete only after a successful channel send, and add bounded retry/audit handling for Growth push and email failures.
- Add CSV and JSON downloads to the Growth “why empty” diagnostics report.

## Validation
- Add focused unit tests for elapsed-slot catch-up, timezone/digest decisions, and notification retry/idempotency.
- Add route-level coverage proving the dock appears on representative protected pages (including Growth Insights) without duplicating on Home.
- Add regression coverage for the affected profile auto-open condition and realtime unread updates.
- Run the relevant test suites and inspect current build/runtime diagnostics before completion.

## Technical details
- Preserve existing visual components and layouts; changes are limited to shared shell/routing, Home’s profile-open guard, Growth worker/helpers, diagnostics export, and tests.
- Existing database rows remain intact. The affected account currently has Growth enabled at frequency 5 in `Asia/Calcutta`, but only midday and afternoon cards exist for the current date; the worker fix will safely fill missing elapsed slots using existing uniqueness constraints.
