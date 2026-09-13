# Current roadmap

- [x] Consolidate Zoe microphone ownership and remove duplicate wake listeners.
- [x] Enforce mute privacy with a clear “Say Zoe wake” state and wake confirmation.
- [x] Restore visible spoken weather/news/search results and automatic Deepgram reply.
- [x] Reduce foreground search and canonical voice response latency.
- [x] Add focused regression tests and run signed-in desktop/mobile preview QA.
- [x] Document browser/PWA limits and any physical-device-only verification gaps.

- [x] Complete the enterprise global music engine and provider gateway.
- [x] Wire Zoe music intents, the standalone Music page, and global controls.
- [x] Add Capacitor iOS/Android background music and OS media controls.
- [x] Complete signed-in Music-page preview, route persistence checks, and full automated regression after enterprise hardening.
- [x] Verify shared Media Session ownership, secure provider fallback, and music accessibility controls.
- [ ] Complete the full 111-route visual crawl and native build QA (Android SDK and macOS/Xcode required).
- [ ] Verify AirPods/Bluetooth, lock-screen controls, calls/interruptions, and resume behavior on physical iOS and Android devices.
- [x] Restyle the complete Music page and global control in monochrome Liquid Glass without changing playback behavior.
- [x] Complete the best-practice music expansion: adaptive Music page, compact feed-safe controls, typed Zoe commands, compliant provider matching, full web QA, and an updated enterprise audit.
- [x] Make the compact music controls draggable on every page, default them after the MMora wordmark, remove the outer line, and verify controls and screen bounds.
- [x] Remove all pressed/focus layers from the mini-player symbols and keep the player mounted after Stop.
- [x] Repair Music page search, aggregate and rank playable providers, show results, add safe query correction, and complete live responsive QA.
- [x] Add official Katy Perry catalog results and route explicit Home/Feed music searches into the Music page; verify live preview.
- [ ] Harden queue advancement and broken-stream recovery; show mini-player queue position.
- [ ] Prefer full-length music sources, retain clearly labelled previews/live radio, and verify Music page full-height layout.
- [ ] Stop Home from repeating its initial loading cycle and complete signed-in responsive preview QA.
