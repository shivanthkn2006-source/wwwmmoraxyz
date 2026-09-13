# Enterprise music completion

## Selected direction
Use the existing route-independent music engine as the single playback authority. Keep Audius as the primary real full-track source, with Internet Archive and secure live radio as transparent fallbacks. Do not add hidden YouTube playback; exact requests will use compliant searchable sources and report the actual matched title.

## Build steps
1. Make the standalone Music page adapt cleanly to short phones, tablets, iPad portrait/landscape, and desktop without clipping or oversized controls.
2. Upgrade the existing top-left global music control into a tiny five-control player: previous, play/pause, stop, next, and open Music. It appears only when a track exists and stays clear of bottom-right call controls.
3. Route typed messages in Zoe’s orb through the same deterministic music command path already used by voice, including play, pause, stop, resume, previous, next, and open Music.
4. Keep the queue truthful: real provider results populate it, the real title/artist/source are shown, and next/skip advance through those results. Tighten ambiguous command matching and add regression coverage.
5. Verify live preview behavior at phone, tablet, iPad, landscape tablet, and desktop sizes; check overflow, touch targets, labels, route persistence, title updates, queue advancement, console errors, focused tests, and the full test suite.
6. Update the enterprise audit with measured line counts, complete wiring/component status, security and compliance decisions, beta-cost assumptions, and remaining blockers.

## Technical details
- Reuse `MusicEngine`, `resolveMusicIntent`, and `resolveMusicQueue`; do not create a second player or duplicate audio ownership.
- Preserve the monochrome Liquid Glass appearance and existing page behavior.
- Keep third-party lookups HTTPS-only and display their true attribution.
- Provider-account playback remains an explicit integration boundary: Spotify or Apple Music requires official account credentials and SDK authorization before it can be added.
- Native background and lock-screen source wiring can be statically checked here. Physical iOS/Android interruption, Bluetooth, app-switch, and lock-screen validation will be delivered as a device QA checklist because this environment has no physical devices or Xcode/Android SDK runtime.
