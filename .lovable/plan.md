# Zoe hands-free reliability and latency hardening

## Goal
Make Zoe’s voice state understandable and reliable across desktop and mobile browsers, restore visible Home search results, and reduce weather/news response delay without changing the existing Home, feed, loops, or dock design.

## Work
1. Unify voice ownership so wake detection, hands-free conversation, and the realtime agent cannot compete for the microphone or stop each other.
2. Make startup and browser capability states truthful: active, muted, permission needed, unavailable, connected headset, or system audio fallback.
3. Keep muted speech private: ignore all content while muted, accept only “Zoe wake”, then visibly and audibly confirm listening resumed.
4. Route spoken search, weather, and news requests into the visible Home search surface and run platform, web, and DHF work concurrently.
5. Remove avoidable latency from foreground search, especially session checks, indexing, geolocation, and serial enrichment; retain cached cited news and honest fallbacks.
6. Add focused tests for wake/mute, microphone ownership, visual search events, and fast-path orchestration.
7. Run signed-in preview checks on Home, voice status, visible weather/news results, Orb history, and representative desktop/mobile browser profiles.

## Technical details
- Preserve Deepgram-only Zoe speech unless the existing explicit browser-voice opt-in is enabled.
- Browser/PWA background listening remains constrained by each operating system; expose that limitation instead of showing a false connected state.
- Physical AirPods and locked-screen native behavior can only be certified on real installed devices; browser automation will verify supported web behavior and failure states.
