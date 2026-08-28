# Repair Home media, uploads, Growth onboarding, New tags, and live likes

## Outcome
Fix the existing shared feed paths rather than add duplicate systems, and verify the behavior in the signed-in preview.

## Changes
1. **Play-once media**
   - Remove the remote looping override from native feed videos and persist completed playback per signed-in user/post so remounts, tab changes, and scrolling back cannot autoplay the same video again.
   - Apply the same one-pass rule to embedded search/YouTube videos and keep manual tap-to-replay available.

2. **One upload for all supported content**
   - Replace the video-only wording and picker with one post composer accepting video, common images, PDF, and common document/text formats.
   - Keep current upload retry/progress behavior, store the correct media type, and render images/videos responsively without cropping; render PDFs/documents as responsive attachment previews with an explicit open/download action.
   - Keep videos eligible for Loops while images, documents, PDFs, and text posts appear in Home feeds.

3. **Growth re-onboarding**
   - Put the existing multi-step Growth onboarding modal directly on the standalone Growth Insights page and prefill it with the user’s saved categories, styles, and frequency.
   - Expand selectable categories, persist updates to the existing preferences row, refresh open feed/archive views in real time, and trigger the existing idempotent catch-up after save.

4. **Reliable New tags and diagnostics**
   - Correct the first-load baseline so it is established once, not repeatedly when storage history is empty.
   - Preserve unseen state across refresh/realtime races and dismiss each tag only after that exact card remains visible for the required interval.
   - Add structured client and backend diagnostics for snapshot decisions, badge rendering/suppression, storage failures, and view-once completion, attributed to the signed-in user and post.

5. **Creator-feed like animation**
   - Validate realtime payloads before animation, reconcile the authoritative like row/count, and add a bounded polling/focus fallback for missed events.
   - Deduplicate events so the liker and every open creator/feed/timeline card animate once per new like, never on unlike or initial hydration, with structured failure diagnostics.

6. **Verification**
   - Add focused tests for persistent play-once behavior, all upload types, responsive media classification, Growth re-onboarding persistence, New-tag lifecycle/logging, and remote-like fallback/deduplication.
   - Run the focused suite, inspect build diagnostics, and exercise `/home` and `/growth-insights` at the current mobile viewport.

## Technical notes
- Existing `posts`, `post_likes`, `growth_preferences`, `feed_diagnostics_log`, storage bucket, Growth worker, and shared feed components remain authoritative.
- No unrelated routing, branding, auth, or visual redesign changes.
