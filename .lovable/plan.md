# Enterprise global music integration

## Recommendation
Use **Choice B as the foundation**, strengthened with Choice A’s explicit global-state contract and testing matrix.

The production architecture will be:

```text
Zoe voice / Music page / Global symbol / OS controls
                         |
                  Music command bus
                         |
          Global music engine + persistent queue
               /                     \
       Web Media Session       Capacitor native bridge
                              iOS AVAudioSession
                              Android MediaSession/service
                         |
              Legal playable providers
```

Do not use React Native or Flutter in this React/Capacitor project. Do not use a hidden YouTube player: it is not a reliable or policy-safe background music source. Use full streams only where providers explicitly permit playback, and show an honest unavailable state otherwise.

## What will be built
- Complete the route-independent music engine already started: one player, queue, position, volume, shuffle/repeat, auto-advance, selected-headset routing, Zoe speech ducking, OS metadata, and hardware media controls.
- Add a provider gateway for Audius, Radio Browser, and Internet Archive with normalized results, bounded requests, source attribution, fallback ordering, and no fabricated tracks.
- Add deterministic Zoe music intents for named tracks, mood, genre, devotional music, radio, pause/resume/stop/next/previous, without hijacking ordinary conversation or the existing mute/wake rules.
- Add a standalone `/music` control page synchronized to the same engine, with artwork, scrubber, queue, playback controls, search, loading, empty, unavailable, and error states.
- Add one minimal symbol-only global control through `PlatformLayout`, crash-isolated and visible only when music exists. Keep the bottom-right call-control zone clear.
- Add one Music destination to the existing shared dock definitions so Home and all eligible authenticated pages use the same route without rewriting old page components.
- Extend the existing Capacitor bridges for real iOS/Android background playback, interruption handling, lock-screen controls, Bluetooth routing, and foreground restoration.

## Wiring and working-status audit
Verify each layer one by one:
1. Provider search returns a real playable URL and truthful source.
2. Engine plays, pauses, seeks, advances, repeats, shuffles, and survives route changes.
3. Zoe commands reach the engine from Home, Feed/Loops, Mosaic, Friends, and representative deep pages.
4. Standalone page and global symbol reflect the same state instantly.
5. Zoe speech ducks music; calls/interruption events pause and safely resume.
6. Selected headset routing and hardware media controls work where the browser/OS supports them.
7. Authentication, route exclusions, error boundaries, and Zoe Infinity separation remain intact.
8. Native declarations and bridges synchronize cleanly for iOS and Android.

## Testing and QA
- Unit tests: intent false positives, provider normalization/fallbacks, queue transitions, repeat/shuffle, errors, and state subscriptions.
- Integration tests: Zoe-to-engine events, page/global-control state sync, speech ducking, and route persistence.
- Browser end-to-end tests: signed-in desktop plus mobile viewport across representative route groups, with console, network, layout-overlap, and accessibility checks.
- Platform-wide route smoke: crawl the authenticated route registry and confirm the global host mounts without blank screens or runtime failures.
- Native contract tests: interruption, headset/media buttons, background/foreground, metadata, and denied-permission/error states.
- Final gates: focused tests, complete test suite, typecheck, route-registry generation, build log, and preview screenshots.

## Boundaries and honest limitations
- Existing Home, feeds, Loops, dock behavior, Zoe voice UI, and visual design stay unchanged except for the requested Music destination and symbol.
- Browser/PWA background playback is best-effort and OS-controlled. Reliable locked-screen playback requires the native iOS/Android wrapper.
- Commercial songs cannot be promised from free APIs. Availability follows provider rights and catalog coverage; no bypasses, fake URLs, or preview-as-full-track claims.
- Physical AirPods/Bluetooth, phone-call interruption, and locked-screen behavior require final testing on real devices after native synchronization.
