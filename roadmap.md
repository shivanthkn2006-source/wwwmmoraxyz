# Music roadmap

## M’Mora Zoe calling — staged integration
- [x] Repair the Preview `/calls` 404 and promote a distinct audio/video Calls icon into the first Home menu group
- [x] Stage 1: authenticated short-lived relay credentials, TURN fallback, bounded ICE restart, and reconnect telemetry
- [x] Stage 2: isolated full-screen remote video, draggable local PiP, and white-only transparent Music-style drop-up controls
- [x] Stage 3: authenticated Calls destination in the Home menu with real participant selection and audio/video start paths
- [x] Stage 4: WebRTC-encrypted Zoe data channel and call-scoped worker without changing the existing peer-to-peer media path
- [ ] Stage 5: focused unit, integration, RLS, network-recovery, accessibility, and phone/tablet/desktop visual QA (automated checks complete; signed-in two-device media QA awaits a Preview session and TURN credentials)
- [x] Restore the Home destination inside the icon panel and keep recent shortcuts clickable beside the Home trigger
- [x] Replace competing M'Mora call listeners with one shared call engine and a global incoming-call surface
- [x] Show the caller's real connecting state immediately after the receiver accepts
- [x] Ultra-low-data “send words, not pixels” mode: suspend media, exchange bounded text through the call worker, and auto-engage on severe loss/latency
- [ ] Finish and preview the Music-style incoming call glass panel and ring animation
- [ ] Add call history and in-app call notifications without changing unrelated screens
- [ ] Complete Zoe inbox delivery through the signed-in private channel
- [ ] Complete call-scoped Zoe/DHF worker prompts, whisper subtitles, and in-call chat
- [ ] Complete Zoe mood-song and birth-chart call/VR commands with real playback
- [ ] Complete sleeping-phone push call notifications (requires a push service connection and physical-device permission test)
- [ ] Genuine Moksh↔Asha phone/desktop call, PiP, speech, hang-up, network switch, ICE recovery, and synchronized-state QA (blocked until two signed-in sessions are available)
- [ ] TURN relay validation across networks (deferred by user; relay provider URL and shared secret are not configured)

- [x] Automatically wire every registered static page into the Home icon menu
- [x] Keep the first-time VR tap/drag tutorial with persistent dismissal and unchanged panel visuals

- [ ] Zoe Music Connect: deterministic taste graph from profile, library, playlists, reactions, and listening history
- [ ] Zoe Music Connect: verified Swiss Ephemeris context from stored birth details, current transits, and dasha
- [ ] Music search: five personalized mood/planet/taste suggestions on focus, with no AI call per keystroke
- [ ] Zoe chat and hands-free: “my favorite/song/mood music” resolves locally before any model call
- [ ] Music learning: record play, skip, completion, save, reaction, search, and explicit preference feedback
- [ ] Privacy/RLS, bounded caching, telemetry, regression tests, and signed-in responsive preview QA

- [ ] Song size limit 50 MB (bucket + client guard)
- [ ] Fix upload compression (reliable MP3 encoder, no main-thread stall for already-compressed files)
- [ ] Verify upload -> appears in Music search with art -> real play
- [ ] Music profile page: favourite genres, moods, artists, favourite tracks
- [x] Recommendations page from my listening history + friends' plays + profile (glass design, responsive)
- [x] Link recommendations from the Home feed
- [ ] Tests + phone-size preview verification; never change existing design/components
- [x] Agasthya Vision page: transparent liquid-glass like Music, white text/fonts, edge-to-edge, search/type bars and results sections restyled; verify in preview

## VR + Music integrations (this session)
- [x] VR music panel: search, play, queue — plays record in listening history and Home shelf (verified: Adele_Hello logged)
- [x] VR Ask Zoe panel: typed questions answered in-world; music requests resolved locally, no token guess
- [x] VR friends' music panel: real alerts from notifications, tap to play
- [x] VR upload panel: song + album art through the existing private upload pipeline
- [x] Music dashboard at /music/dashboard: history, favourites, Zoe's picks (in Home menu)
- [x] Playlists page, own uploads + chart sections in recommendations, parallel loading
- [ ] Physical phone voice QA ("play my mood song" spoken) — needs a real device microphone

## 2026-09-17 — Music suggestions + VR world usability
- [x] Music search: 5 keyword suggestions now render outside the clipped search pill, stay open while typing, keyboard selectable.
- [x] VR "Upload a song": stages, pre-checks (50 MB / type / offline), 3-minute limit, Cancel + Retry, optional album, typing no longer stolen by drag.
- [x] VR panels: own resting slots, consistent depth order, only essentials open on first entry (:v2 default), Show all / Hide all / Reset layout, position re-clamped on rotate/resize, content scrolls, drag from header only.
- [ ] Multi-device/foldable/PWA sweep of today's + yesterday's pages — blocked: no signed-in preview session available to the agent (all Music/VR routes require sign-in).

## 2026-09-18 — Zoe DHF image fidelity
- [x] Ground every new DHF image in the exact category, headline, summary, story action, and astrological context.
- [x] Require full-colour oil-painting art and reject generic portraits, monochrome output, text, logos, and provider marks.
- [x] Persist the image brief version and fingerprint for audits without changing DHF scheduling or feed logic.
- [x] Present the image beside the headline and summary, with the story below and a trusted M'Mora / Zoe corner mark.
- [x] Deploy both DHF generation entry points and verify phone, tablet, and desktop previews.
- [x] Repair older cards' artwork once per session without spending any model tokens.

## 2026-09-18 — Faith, planetary and in-world wiring
- [x] Faith / religion section on the member's own profile page (saves to the same taste row Music, Zoe and recommendations read).
- [x] Today's planetary mood shown on the profile page, recalculated hourly from the real Swiss Ephemeris reading.
- [x] Devotional word lists widened (4-6 real genres per faith, client and server) and the devotional recommendation row now uses four keywords.
- [x] In-world "Planetary mood" panel: ruling planet, planetary hour, Moon, life period, faith words.
- [x] In-world "Zoe's cards" panel: each card opens full-screen with its oil painting and full text.
- [x] Spoken music commands inside the VR world resolve through the same intent resolver and play a real track, recorded to history.
- [x] Verified under real row-level security that a shared playlist is visible to the friend and creates their alert.
- [ ] Blocked: signed-in preview walkthrough (no preview session can be minted for this project right now — sign in once in the preview).
- [ ] Blocked: real microphone walkthrough on a physical phone (must be done on the device).
- [ ] Publish needed for the new artwork and playlist sharing to be live outside the preview.

## 2026-09-19 — Calling: words-only, Zoe in-call thinking, group, ringing
- [x] Words-only mode: bad line automatically drops to short text over the private channel, with a manual switch.
- [x] Zoe's in-call thinking runs inside the call worker (off the main thread) and shows a quiet suggestion line during the call.
- [x] Call history screen (/calls/history) plus a missed-call alert for the person who was not reached.
- [x] Group call screen (/calls/group): pick up to 5 people, one direct connection per member, even tile grid, leave call.
- [x] Sleeping-phone ringing: device registration, background ring handler, and a protected ring service for the person being called.
- [x] Calls activity status: all Profile activities shown with plain icons below KBPS, editable by the user and refreshed for the other participant.
- [ ] Blocked: real Moksh-to-Asha two-device call (needs both people signed in on their own devices).
- [ ] Blocked: relay (TURN/Twilio) — deferred by request, so calls across strict networks may still fail.

## 2026-09-20 — Calls activity, self-view and device controls
- [x] Custom personal activity messages: owner-editable, 80-character validation, live refresh, group tiles, and Zoe context.
- [x] Calls activity menus use transparent monochrome glass without the grey panel.
- [x] Idle title is “Zoe Calls” at the top-left, with phone spacing that avoids existing alert overlays.
- [x] Local camera preview defaults below the participant name at top-left and remains draggable.
- [x] Front/back camera switching is exposed in the call controls and uses the existing live track replacement.
- [x] The app Camera/Mic banner is suppressed only while the Calls overlay is visible; browser privacy indicators remain unchanged.
- [x] Focused tests, type validation, and phone/tablet/desktop preview checks pass.
- [ ] Blocked: sleeping-phone wake confirmation requires a physical subscribed phone on the published app; preview service workers are intentionally disabled.

## 2026-09-21 — Home menu search, contained labels, call voice and wake ringing
- [x] Add an unframed Home-menu search field in the panel’s bottom row, filtering every wired menu destination.
- [x] Keep each menu label inside its existing icon tile without changing tile dimensions.
- [x] Route one elected Zoe Deepgram voice stream through the group WebRTC mesh with shared captions.
- [x] Harden published-PWA call subscription readiness and preserve the push worker during recovery refreshes.
- [ ] Connect APNs/FCM and verify sleeping-phone wake on physical native devices; external credentials and devices required.
- [x] Finish phone/tablet/desktop visual verification; focused tests and type validation pass.

## 2026-09-21 — Home panel mobile fit correction
- [x] Fill the mobile panel to the left safe-area edge with equal compact tile gaps and unchanged icon artwork size.
- [x] Keep the four-row panel height while search results are filtered.
- [x] Keep every menu name below its symbol inside the same tile.
- [x] Verify opening, search height, label placement, and destination wiring in phone/PWA preview.

## 2026-09-21 — Main M’Mora Profile transparency and profile-wiring audit
- [ ] Restyle only the main Profile page shown in the supplied screenshots as an edge-to-edge transparent, white-only Music/Calls-style surface.
- [ ] Preserve every existing Profile section, image, field, control, action, order, and behavior unchanged.
- [ ] Document concrete strengths and verified gaps across birth details, faith, location, profile data, and Zoe relationship context.
- [ ] Add focused visual safeguards and verify signed-in phone, tablet, and desktop previews.
- [ ] Produce a concise QA and integration audit report.
