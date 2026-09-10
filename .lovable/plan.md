# Repair M'Mora Zoe hands-free voice end to end

## What will change
- Consolidate platform wake listening around one signed-in Zoe listener, with “Hey Zoe”, “Zoe”, “Hello Zoe”, and “Zoe, are you there?” variants.
- Make wake-only activation acknowledge through Deepgram, then immediately listen for the user’s question; wake-plus-question will submit directly.
- Route spoken identity, current-news, search, and unmatched questions through canonical `askZoe()` with profile, page, memory, DHF, and live-web context.
- Remove the direct browser-TTS bypass from M'Mora’s sovereign command path. Browser TTS remains disabled unless the existing explicit user opt-in is enabled.
- Add spoken stop, pause, continue, and barge-in behavior, coordinated through the existing voice arbiter and selected headset sink.
- Derive navigation commands from the canonical route/site-map registry while retaining feature-specific commands, Agasthya entry points, and server-verified admin-only God Mode scans.
- Add truthful live diagnostics on `/zoe-audio`: recognized words, processing state, Deepgram status/errors, mic permission, recognizer owner, selected input/output, and last reply.
- Correct self-identity grounding so “What’s my name?” uses the signed-in profile instead of web search.

## Validation
- Add focused tests for wake-only handoff, wake-plus-command, stop/pause/resume, browser-TTS prohibition, identity grounding, route commands, and admin scan gating.
- Run focused and full project tests, TypeScript checks, build checks, and a signed-in browser preview on Zoe Audio and representative platform routes.
- Report physical AirPods/Bluetooth and locked-screen behavior as unverified unless actual device evidence is available.

## Boundaries
- Do not change Home, feed, dock, notification, or unrelated visual components.
- Keep Zoe Infinity isolated; it is never a M'Mora fallback.
- Preserve existing Deepgram models, AudioRouterService, `askZoe()`, native bridges, and server-side authorization.
