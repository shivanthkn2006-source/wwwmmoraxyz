# M’Mora Zoe video/audio calling — staged integration

## Goal
Build the call experience one stage at a time on the existing private peer-to-peer engine. The remote participant fills the screen, the caller appears in a small movable preview, and one tiny icon opens the complete control set upward. Calling alone adopts the Music page’s transparent Liquid Glass and white-only visual language; every other page, design, feature, and component remains unchanged.

The uploaded desktop and mobile images are composition references only. Their multicolour styling, editor controls, outer device frames, and decorative layers will not be copied.

## Stage 1 — authorization, relay, and reconnect reliability
- Keep the existing authenticated call signalling and peer-to-peer media path.
- Add a protected server function that returns short-lived TURN credentials only to a verified signed-in member. Keep relay secrets server-side and apply strict origin, expiry, and request validation.
- Load STUN/TURN configuration before creating a call, with the current public STUN list retained as a safe fallback.
- Add bounded ICE restart for temporary disconnections and Wi-Fi/mobile-network changes. Reuse the existing connection rather than replacing tracks or rebuilding the call UI.
- Exchange restart offers/answers through the existing private signalling channel, buffer candidates as today, prevent restart storms, and end cleanly after a measured retry limit.
- Extend live call diagnostics with ICE state, relay/direct path, restart count, last recovery result, bitrate, packet loss, round-trip time, codec, and actionable errors. Never expose credentials or private session data.
- Test authorization rejection, credential expiry, direct and relayed negotiation, candidate ordering, reconnect success/failure, cleanup, and unchanged audio/video behavior before proceeding.

## Stage 2 — isolated monochrome call screen
- Replace only the active call presentation with one responsive full-screen remote video using `object-cover` and `playsInline`.
- Place the local caller video in a small draggable PiP constrained to the safe viewport, with remembered position and automatic re-clamping after rotation or resizing.
- Remove the sphere/classic selector, coloured glows, coloured states, decorative backgrounds, outer icon outlines, and unrelated call-screen decorations.
- Use only transparent Music-style glass, white icons, white text, and white opacity levels. No blue, purple, green, amber, red, grey panels, gradients, borders around individual icons, or additional visual systems.
- Keep all existing functions available: mute, camera, camera flip, speaker/audio state, low-data mode, native PiP/full screen where supported, Zoe vision for AI calls, quality/status, and end call.
- Put those functions in a compact transparent drop-up panel opened by one tiny icon. Controls are icon-first with accessible names and tooltips; destructive intent is communicated by symbol and placement rather than colour.
- Provide the same compact participant/status treatment for both callers without covering faces or the Home dock’s reserved bottom-right zone.

## Stage 3 — Home-menu access and real call entry
- Add one dedicated Calls icon to the authenticated Home menu and route it to a focused call launcher.
- Reuse the existing member/profile data to choose a real recipient and start audio-only or video calling; do not create demo contacts or simulated call states.
- Preserve existing chat and Zoe call entry points and prevent duplicated call-engine instances.
- Keep auth, recovery, admin, Zoe Infinity standalone, Music, VR, and every unrelated route visually and functionally untouched.

## Stage 4 — Zoe private in-call channel
- Add an authenticated, encrypted WebRTC data channel to the existing peer connection for Zoe text/metadata and low-data semantic messages.
- Run call-scoped Zoe processing in a worker where supported, with a lightweight fallback for low-tier devices.
- Keep media peer-to-peer, make Zoe participation explicit, preserve the Deepgram-only voice policy, and ensure user speech outranks any Zoe narration.
- Do not introduce an SFU or headless Zoe media peer in this phase; group calling remains outside this request.

## Stage 5 — QA and release gates
- Add focused tests for call authorization, signalling ownership, TURN response redaction, ICE restart negotiation, retry limits, data-channel lifecycle, media cleanup, and duplicate-engine prevention.
- Add UI tests for every control, keyboard/focus behavior, touch targets, collapsed/expanded panel states, draggable PiP bounds, orientation changes, safe areas, and reduced motion.
- Verify at narrow phone, standard phone/PWA, tablet, foldable portrait/landscape, desktop, and short landscape sizes. Confirm full-screen remote video, visible local PiP, no overlap, no clipped labels, and white-only transparent styling.
- Exercise permission denial, audio-only calls, camera-off calls, blocked autoplay, poor network, relay-only network, Wi-Fi-to-mobile recovery, background/foreground transitions, remote hang-up, and repeated calls.
- Check live stats, console/runtime/network telemetry, focused test suites, and the preview build after each stage. A stage advances only when its tests pass.

## Technical boundaries
- Primary files are the existing call hook/modal/video UI plus small call-specific helpers, tests, and one protected backend function for relay credentials.
- Use `RTCRtpSender.setParameters()` for live quality changes; avoid renegotiation except the standards-required ICE restart offer/answer.
- No uploaded screenshot is embedded in the product.
- A TURN service credential is required to complete real relay testing; it will be stored as a protected project secret, never in browser code.