# Repair Growth preferences, feed badges, and live likes

## Outcome
Make the existing features work through one shared data path instead of adding duplicate UI or state.

## Changes
1. **Growth Insights standalone page**
   - Embed the existing Growth settings editor on `/growth-insights` and add a clear “Change my Growth plan” control.
   - Reload archive/feed state after preferences save and request an idempotent catch-up so changed categories/styles/frequency affect the next due insight immediately.
   - Expand the approved focus-area choices while preserving existing saved values.

2. **Growth card labels and feed placement**
   - Give every Growth card visible category, delivery-window/time, and selected-plan context tags.
   - Keep the same card component across archive, global feed, personal feed, and Loops.
   - Compose Growth cards directly into each feed sequence, including sparse feeds, with deterministic ordering and no duplicate cards.

3. **Reliable “New” labels**
   - Repair the Loops empty-snapshot and refresh paths so a realtime post cannot lose unseen state.
   - Keep first-ever load quiet, but mark later unseen posts/loops across sessions until that exact card has remained visible long enough.
   - Preserve the remote kill switch and add regression coverage for a newly inserted loop.

4. **Live like animation for viewer and creator**
   - Subscribe cards to `post_likes` events in addition to aggregate post updates.
   - Trigger a bounded heart burst for a new like on both the liker’s card and any open creator/feed/timeline card, while avoiding animation on unlike or initial load.
   - Keep optimistic counts and reconcile with backend events without double increments.

5. **Verification**
   - Add focused unit/component tests for preference reselection, card labels, Growth interleaving, unseen loop persistence, and remote like animation.
   - Run the relevant tests, inspect build diagnostics, and exercise `/home` and `/growth-insights` in the browser at the current mobile viewport.

## Technical notes
- Existing `growth_preferences`, `growth_feed_items`, `post_likes`, Growth worker actions, RLS, feature flags, and shared card components remain authoritative.
- No unrelated design, route, authentication, media playback, or database-schema changes.
