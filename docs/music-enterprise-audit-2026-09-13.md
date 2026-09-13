# M'Mora Music Enterprise Audit

**Audit date:** 13 September 2026  
**Scope:** Web music engine, responsive standalone Music page, typed and spoken Zoe commands, compact global/feed controls, provider safety, accessibility, browser media controls, and native playback scaffolding.

## Executive status

**Web status: PASS**

- Signed-in Music page renders on desktop and mobile.
- Live Audius search returned 18 tracks and playback started successfully.
- Music persisted during client-side navigation from Music to Profile.
- Global control exposed labelled Open Music and Pause Music actions.
- Mobile viewport had no horizontal overflow at 390 × 844.
- Latest preview build completed successfully.
- Phone, tablet, iPad portrait, tablet landscape, and desktop checks all had zero horizontal overflow.
- The compact player persisted through in-app navigation and exposed exactly five labelled actions.
- Queue next/previous advanced between distinct real queue entries.
- Typed Zoe chat now executes the same deterministic music commands as voice.

**Native status: PARTIALLY VERIFIED**

- iOS and Android native playback code, media controls, interruption handling, and Android audio-focus handling are present.
- Android compilation reached dependency configuration, but this environment lacks the Android SDK.
- iOS compilation requires macOS and Xcode.
- Physical Bluetooth/AirPods, lock-screen, phone-call interruption, and resume behavior still require real-device QA.

## Fixes applied

1. Removed the stale Media Session setup call that blocked typechecking.
2. Consolidated browser hardware-media action ownership through the shared audio router.
3. Routed media keys to music when a track exists and preserved Zoe behavior otherwise.
4. Added playback recovery that advances past failed streams and reports honest terminal errors.
5. Rejected insecure HTTP radio streams and malformed stream URLs.
6. Wired audio unlocking to real user playback and queue gestures.
7. Added tooltips, accessible labels, active queue state, semantic playback time, and volume percentage.
8. Added safe-area positioning for the global control.
9. Added Android audio-focus duck, pause, resume, and focus-release behavior.
10. Added iOS observer/player cleanup and lock-screen metadata cleanup on stop.
11. Removed the short-screen 620px minimum and capped artwork against dynamic viewport height.
12. Increased phone/tablet transport touch targets to 44–48px while retaining compact icon scale.
13. Added a five-action monochrome Liquid Glass mini-player at top-left, clear of bottom-right call controls.
14. Added one shared typed-chat command executor for play/pause/stop/resume/next/previous/open.
15. Tightened ambiguous “play …” parsing so common conversational phrases do not hijack Zoe chat.
16. Replaced first-provider-only Music search with provider-isolated aggregation, result ranking, deduplication, visible alternatives, and safe bounded-vocabulary correction.

## Architecture and measured scope

The music subsystem contains **1,210 lines** across the standalone page, global mini-player, intent/parser, provider gateway, shared command executor, singleton engine, and iOS/Android native playback implementations. It deliberately has one playback authority (`MusicEngine`) and multiple subscribing controls; no React page owns or duplicates the audio element.

| Layer | Status | Wiring |
|---|---|---|
| Route-independent playback and queue | Complete | `MusicEngine` singleton |
| Real title, artist, source attribution | Complete | Provider result → engine state → page/chat/OS metadata |
| Spoken Zoe commands | Complete | Voice intent router → provider queue → engine |
| Typed Zoe commands | Complete | Orb conversation → shared command executor → same engine |
| Standalone Music page | Complete | Protected `/music` route, adaptive layout and queue |
| Feed/global mini-player | Complete | Platform-wide mount; previous/play-pause/stop/next/open |
| Browser media keys and route persistence | Complete | Shared audio router and Media Session |
| iOS/Android native background source | Present | AVPlayer/MediaPlayer, lock-screen controls, audio focus |
| Spotify/Apple Music account catalogs | Not connected | Requires official provider credentials and SDK authorization |
| Hidden YouTube playback | Intentionally omitted | Non-transparent playback is fragile and non-compliant |

## Verification evidence

| Check | Result |
|---|---|
| Focused music, routing, and intent tests | 27/27 passed |
| Complete automated regression | 786 passed, 6 skipped, 0 failed |
| Registered route test | Passed; registry contains 111 routes |
| Live signed-in Music search | Passed |
| Live browser playback | Passed with Audius |
| Client-side route persistence | Passed |
| Desktop visual check | Passed |
| Mobile visual and overflow check | Passed |
| 390×844 phone | Passed; no horizontal overflow |
| 768×1024 tablet | Passed; no horizontal overflow |
| 820×1180 iPad portrait | Passed; no horizontal overflow |
| 1024×768 tablet landscape | Passed; no horizontal overflow |
| 1280×1800 desktop | Passed; no horizontal overflow |
| Mini-player persistence and five controls | Passed |
| Queue next/previous state advancement | Passed |
| Preview build/typecheck | Passed |
| Runtime error log | No current runtime errors |
| Android compilation | Blocked by unavailable Android SDK |
| iOS compilation | Blocked by unavailable macOS/Xcode |
| Physical-device audio QA | Pending |

## Remaining risks

- Provider availability, catalog content, CORS behavior, and individual stream health remain external dependencies.
- Native claims cannot be certified until tested on physical iOS and Android devices.
- A complete visual crawl of all 111 routes remains pending; music persistence was directly verified on Music and Profile.
- Existing Zoe ref warnings appeared during live testing. They are unrelated to the music changes and did not break playback, but should be handled in a separate platform-wide cleanup.
- Live public-provider search depends on the member’s network and external provider availability. A later live probe returned no result although the same Audius path passed earlier; the UI reported that honestly and did not substitute a fake title.

## Beta cost and release gates

- **Current open-source provider mode:** no per-track platform API fee. Capacity and availability remain best-effort external dependencies.
- **Infrastructure impact:** one client-side singleton, no new database table, no new paid backend function, and no duplicated audio stream.
- **Credentialed catalog option:** Spotify Premium or Apple Music is a separate official integration with provider developer-account, OAuth/SDK, catalog-entitlement, regional, and listener-subscription requirements. It cannot be truthfully costed or enabled until that provider is selected and authorized.
- **Beta blockers:** physical iOS/Android device certification, store-build validation, and any chosen licensed catalog integration. Browser beta is not blocked by these items.

## Physical-device QA checklist

For both iOS and Android: install a native build, start a two-track queue, lock the phone, verify title/artwork and play/pause/previous/next, switch to another app for five minutes, return via the global music control, connect/disconnect Bluetooth, receive and end a call, invoke Zoe speech, and verify music resumes at the expected position and volume. Record OS/device/version, timestamps, screenshots, and pass/fail per step.

## Release recommendation

The browser feature is suitable for staged release. Native release should remain gated until Android Studio and Xcode builds pass and the physical-device matrix is completed. Account-backed commercial catalogs remain a separate licensed integration, not a hidden playback shortcut.