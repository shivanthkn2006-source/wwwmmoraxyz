# Restore notifications and add Zoe card narration

## Goal
Make platform notifications visibly and audibly reliable, make the bottom-right dock understandable on hover and touch, and add Zoe narration controls to feed cards using the existing Deepgram voice path without changing the overall visual design or using Lovable AI.

## Implementation

### 1. Repair the global notification surface
- Replace the deliberately hidden/no-op Sonner wrapper with a real top-center notification renderer styled like a compact mobile system banner.
- Keep alert content structured as date/time, source feature, actor, and content; handle missing actor/content safely.
- Keep the global alert host mounted across authenticated routes and harden realtime with the existing polling/wake recovery path.
- Add explicit delivery diagnostics for subscription state, sound blocked/unlocked state, and poll failures without exposing secrets.

### 2. Make sound behavior honest and reliable
- Fix AudioContext state handling so “initialized” is not treated as “audible”; unlock/resume only after a real user gesture and preserve full-volume default unless the user changes it.
- Add a small, non-blocking “Tap to enable alerts” recovery action only when the browser has blocked sound; browsers do not permit guaranteed audio before first interaction.
- Preserve cue-first timing, quiet hours, mute, and volume settings; ensure unsupported notification types receive a default sound instead of silently returning.
- Verify notification generation paths for posts, likes/comments, messages, Growth, Loops/content, and Zoe’s DHF; add only missing event-to-notification wiring needed for these requested surfaces.

### 3. Fix dock badge styling and discoverability
- Change the home-trigger badge from red/white to black/white and keep per-feature unread badges black/white.
- Keep accessible names and desktop hover titles.
- On touch/coarse-pointer devices, show compact menu names with expanded dock icons so users do not have to guess their meaning; retain the unobstructed bottom-right safe area and responsive horizontal scrolling.

### 4. Add one shared Zoe card narration controller
- Build one reusable controller around the existing Deepgram Aura voice with browser speech fallback, not a new AI provider.
- Give every supported card Play, Pause/Resume, and Repeat controls with clear accessible labels and stable mobile/desktop sizing.
- Centralize queue ownership so only one card speaks at a time, navigation/unmount stops safely, pause can resume the same card, and errors fall back without crashing the feed.
- Persist one-time completion per signed-in user/card so automatic narration does not repeat after reload or another sign-in; manual Repeat always remains available.

### 5. Wire the requested speaking order
- After the first genuine post-login user interaction unlocks audio, queue the one-time welcome, then today’s five Growth/Morning Focus cards, then today’s ten Zoe’s DHF cards.
- Add manual narration to regular Home, Loops, and timeline/social cards using their visible text/captions.
- Do not autoplay every ordinary social/video card while scrolling; that would conflict with media audio. Those cards receive manual controls, while the requested daily Growth/DHF sequence is the one-time automatic sequence.
- Pause narration when the user pauses it, starts conflicting media/voice, backgrounds the app, or navigates away; allow explicit resume.

### 6. Verify end to end
- Add unit tests for toast visibility, alert-copy fallbacks, sound state/default tone, badge colors, touch labels, narration queue order, per-user one-time persistence, pause/resume/repeat, and cleanup.
- Add rendered tests covering Growth, DHF, Home/Loops, and timeline card controls.
- Run an authenticated desktop and mobile preview flow: unlock audio, create/observe a live notification, confirm top banner + cue/main sound instrumentation + home total badge + per-feature badge, then exercise card play/pause/resume/repeat and one-time sequence behavior.
- Run focused tests, strict TypeScript checks, full relevant regression tests, and confirm the preview build and runtime logs are clean.

## Technical notes
- Deepgram remains the primary voice provider through the existing protected `deepgram-tts` backend function; browser Web Speech remains the hardware-compatible fallback.
- No Lovable AI key or Lovable AI generation route will be introduced.
- Browser/OS policy prevents any web app from forcing audible playback before the user’s first gesture. The implementation will surface and recover this state instead of silently pretending sound played.
