# Finish Zoe projection and personalize Home

## Build
- Move same-day life-forecast cache lookup ahead of Zoe’s heavy recall and web preparation, preserving complete history for uncached answers.
- Add tappable career, money, love, family, health, year, month, week, and date follow-ups to Zoe chat responses; tapping sends a normal user message.
- Keep sky-shift guidance silent by default to save Deepgram usage, surface it as a Home/feed card plus notification, and use voice only after an explicit user action.
- Verify the life-projection page at desktop and phone sizes.

## Home feed reliability
- Keep the last successful post snapshot in session storage and render it immediately when returning from the drawer.
- Replace the blocking five-second loading gate with independent background refreshes; a slow Loops request cannot hold native posts hostage.
- Preserve the existing empty/error behavior when no usable snapshot exists.

## Life-projection ranking
- Rank global posts using observed interest feedback, relationship closeness, upcoming friend birthdays, recency, and current personal planetary/DHF signals.
- Keep ranking bounded and explainable: relationship and explicit likes/dislikes outweigh planetary affinity; no random or deterministic predictions.
- End the finite loaded feed with a borderless “You’re caught up” state instead of simulating endless content.

## Quiet Zoe guidance
- Infer inactivity only from privacy-safe on-device signals already available: no taps/typing, tab visibility, current M’Mora surface, and real measured behavior.
- Do not silently activate the camera or upload imagery. Optional visual understanding remains user-initiated and permission-gated.
- When a member is visibly idle long enough, add one lightweight Zoe guidance card/notification directing them to the relevant Home timeline; dedupe and rate-limit it.
- The guidance card uses cached DHF/life-projection data and does not call voice or an AI model.

## Validation
- Add focused ranking, cache, finite-feed, and idle-trigger tests.
- Check the signed-in Home and life-projection/chat flows in the live preview on desktop and mobile dimensions.
- Check build/runtime logs and deploy the updated Zoe function.
