# Enterprise Music Audit, Hardening, and Live QA

## Current verified status

- Music is mounted globally, protected at `/music`, and survives route changes through a standalone singleton engine.
- Audius, Radio Browser, and Internet Archive endpoints responded live.
- Focused music/voice/route tests passed **25/25**.
- Full platform regression passed **784 tests**, with 6 existing integration tests skipped and no failures.
- Signed-in `/music` rendered without a blank screen; current platform logs end in `build OK`.
- Native source is present for iOS and Android, but physical Bluetooth, lock-screen, interruption, and store-build behavior cannot be truthfully certified in this sandbox.

## Fixes

1. **Unify playback ownership**
   - Prevent Zoe’s headset handlers and music handlers from overwriting each other in the browser Media Session API.
   - Route play, pause, next, previous, and stop to music only while a music track is active; preserve existing Zoe behavior otherwise.
   - Keep one Zoe voice at a time and one music player instance across all routes.

2. **Make mobile playback reliable**
   - Wire the existing audio unlock operation to real Music-page and global-control gestures.
   - Reject insecure `http` radio streams on secure pages and skip unplayable provider results instead of surfacing broken tracks.
   - Add provider fallback after a selected stream fails, with a bounded retry and honest final error.

3. **Correct native lifecycle behavior**
   - Add Android audio-focus handling for calls and competing media, including pause/duck/resume rules.
   - Release inactive iOS player resources and coordinate the shared audio session with Zoe.
   - Keep native controls additive; do not change existing Home, feed, loops, dock, or visual structure.

4. **Refine the enterprise player surface**
   - Keep the current monochrome aesthetic and semantic music symbols.
   - Add precise tooltips/state labels, semantic playback time, active queue indication, volume percentage, safe-area positioning, and clearer unavailable/loading states.
   - Preserve the standalone page structure while improving hierarchy, responsive queue behavior, and control consistency.

5. **Expand automated coverage**
   - Add engine tests for pause/resume, next/previous, repeat, shuffle, seeking, volume, failed-stream fallback, TTS ducking, and Media Session ownership.
   - Add provider tests for timeouts, insecure URLs, malformed payloads, and fallback ordering.
   - Add page tests for search, queue selection, controls, labels, and global-control persistence.
   - Add voice tests for play/pause/next/open commands without hijacking ordinary conversation.

6. **Run live end-to-end verification**
   - Test signed-in search → queue → play/pause → seek → next/previous → volume → shuffle/repeat.
   - Navigate between Music, Home, Profile, and another protected page while confirming the same global player remains available.
   - Check desktop and mobile viewports, console errors, failed requests, blank screens, dock overlap, and icon clarity.
   - Re-run focused tests, the full platform suite, route registry/crawl, type checks, and the production preview build.

7. **Deliver the audit report**
   - Create a dated report with working, partial, missing, blocked, and physically unverified matrices.
   - Include wiring paths, provider/API status, browser/native status, test totals, observed defects, applied fixes, screenshots, and remaining launch blockers.
   - Clearly separate web-preview proof from device-only iOS/Android claims.

## Technical architecture

```text
Zoe voice intents ─┐
Music page ────────┼─> MusicEngine singleton ─> browser audio + Media Session
Global control ────┘             │
                                 ├─> selected headset routing
                                 ├─> Zoe speech ducking
                                 └─> Capacitor bridge ─> iOS AVPlayer / Android playback service

Provider gateway: Audius → Internet Archive → Radio Browser
Only secure, direct, playable results enter the queue.
```

## Acceptance gates

- No Media Session handler collision between Zoe and music.
- No existing page or dock design is replaced or disturbed.
- Music actions work from the standalone page, voice, global control, and after route changes.
- No insecure radio stream is offered on HTTPS.
- All new tests pass; the full existing suite remains green.
- Preview checks show no blank screen, unhandled console error, or failed first-party request caused by music.
- Native physical-device behavior remains marked unverified until tested through Xcode/Android Studio on real hardware.
