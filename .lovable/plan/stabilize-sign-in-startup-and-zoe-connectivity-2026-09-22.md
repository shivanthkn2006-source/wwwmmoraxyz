# Stabilize sign-in startup and Zoe connectivity

## Goal
Stop repeated post-sign-in loading/reloading, remove misleading Zoe reconnect states, and make the usable Home screen appear within three seconds without changing existing page designs or feature components.

## Root fixes
- Make authentication initialization single-source and bounded, preventing duplicate session callbacks, stale retries, and route-guard races.
- Remove boot-time platform purge/reconnect work from the critical rendering path and run nonessential diagnostics only after the page is usable.
- Replace the generic “Zoe is reconnecting” startup label with an accurate app-loading state; reserve reconnect messaging for a confirmed connection failure.
- Prevent duplicate Zoe deep scans and overlapping network calls; cache recent scan health and schedule refreshes in idle/background time.
- Audit reload triggers so automatic recovery is one-shot and only runs for verified stale-code failures, never ordinary auth or realtime delays.
- Reduce immediate Home startup requests, stale music artwork retries, and avoidable warnings while retaining each feature’s behavior.

## Verification
- Add focused tests for auth initialization, one-shot recovery, scan deduplication, and startup messaging.
- Measure initial route usability and request timing on a fresh load and reload.
- Check browser runtime, console, network, and build logs; verify sign-in persistence and Zoe recovery behavior.
