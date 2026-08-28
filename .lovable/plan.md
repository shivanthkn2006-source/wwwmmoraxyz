# Mixed uploads and true chronological Home/Loops feed

## What I found

- The composer accepts only one `File`, and each post stores only one `media_url`/`media_type`, so selecting mixed files in one post is not currently possible.
- Growth cards are sorted only against other Growth cards. The app then groups regular posts, Loops, motivation, and DHF videos into separate arrays and inserts Growth after every three items. That is why the Night card is fourth rather than occupying its real timestamp position.
- The authenticated preview reproduces the issue: three user posts appear before Night Review, and the Growth status reports `Delivered 0/5` for the new local day.

## Implementation

1. **One mixed upload picker**
   - Change the Home/Loops composer to accept multiple images, videos, and PDFs from one picker.
   - Show removable per-file previews: image thumbnails, playable video thumbnails, and PDF tiles.
   - Use a responsive preview grid/rail that fits mobile and desktop without covering feed controls.
   - Show per-file validation and upload progress; keep files that succeed visible if another file fails.

2. **Durable mixed attachments**
   - Add an owner-protected `post_attachments` table with explicit authenticated/service grants and row-level policies.
   - Upload each selected file through the existing authenticated `posts` storage path, create video posters where possible, then create ordered attachment rows linked to the post.
   - Preserve compatibility with all existing single-media posts and the Zoe/DHF indexing triggers by retaining the first attachment in the legacy post media fields.
   - Render mixed attachments in an accessible swipe/step gallery inside `PostCard`, including full-size images, one-pass video playback, and PDF open/download controls.

3. **True time-based feed composition**
   - Give every feed item one effective timestamp: `created_at` for posts/Loops/DHF items and local scheduled date+slot time for Growth cards.
   - Merge and sort the combined Home and Friends feeds newest-first instead of concatenating content-type groups and inserting Growth at a fixed ordinal.
   - Include the most recent prior-day Growth card after midnight when it is newer than surrounding posts; do not treat saved cards or the Growth status panel as chronological content.
   - De-duplicate a native video post so it is not emitted both as a post and a Loop in the same composed feed.

4. **Verification and hardening**
   - Add unit tests for cross-type timestamp ordering, midnight/prior-day Growth placement, stable ties, and de-duplication.
   - Add component tests for mixed selection/removal, previews, validation, and responsive layout.
   - Run focused tests and use the authenticated preview at desktop and mobile sizes to verify actual DOM order, picker behavior, no overlap, and no runtime/build errors.

## Technical notes

- Existing single-media rows require no migration or backfill.
- Mixed-post publishing will be failure-safe: if attachment persistence fails, uploaded objects are cleaned up and the incomplete post is not presented as successful.
- The feed will use one deterministic comparator with stable tie-breaking, avoiding separate “Growth order” and “post order” rules that can contradict each other.
