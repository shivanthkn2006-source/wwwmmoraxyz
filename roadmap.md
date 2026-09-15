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
- [x] Harden queue advancement and broken-stream recovery; show mini-player queue position.
- [x] Prefer full-length music sources, retain clearly labelled previews/live radio, and remove the Music page bottom strip.
- [x] Stop Home from repeating its initial loading cycle (friendship arrival no longer restarts the load/realtime cycle).
- [ ] Signed-in responsive preview QA of Music/Home — managed preview session is now available; rerun after the glass redesign.

## Music + social reactions stack (Sep 14)
- [x] Compact transparent glass Music page: no big header, white text, white/blue rounded controls, current artwork directly under the search bar.
- [x] Universal borderless music-note icon before the headphones icon on every page dock.
- [x] Route Home music searches into the Music page (added Music/Mosaic/Selfie City search entries).
- [x] Music library: save songs with album art, shown in a Library tab.
- [x] Music page sidebar for browsing genres, radio and playlists.
- [x] Animated reactions on music (happy / cool / loved it) with loved / recommended / shared / most listened lists.
- [x] Friend-listening notifications in the normal notification stream with sound and profile photo.
- [ ] Signed-in phone + desktop QA of Music and Home (queue advancement, full-length sources, no repeated Home loading).
- [ ] Licensed full-track account (Spotify/YouTube Music) — blocked: needs a paid subscription plus their official player SDK; cannot be fabricated.
- [ ] Verify the managed signed-in account is @moksh50/admin; never create or elevate a different account.
- [ ] Add compliant generated fallback artwork for tracks with no provider artwork; avoid regenerating saved covers.
- [ ] Add most-viewed video metrics and friend mentions to Music community data.
- [x] Replace all Music-page blue states with monochrome translucent Liquid Glass and white highlights; verify signed-in phone/desktop behavior.
- [x] Remove Music page dark gutters and top band, fill every viewport with glass, and strip search-field/search-icon outlines.
- [x] Unify Music into one transparent surface, align browse/results with search, and anchor the mini-player after “MMora music”.
- [x] Keep the desktop Music page fixed while only the Results, Library, or Community column scrolls.
