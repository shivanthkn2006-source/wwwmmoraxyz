# Roadmap

- [x] Fix home/loops media autoplay to play once per user/post.
- [x] Expand the existing single upload flow for videos, images, PDFs, and supported documents with responsive rendering.
- [x] Restore Growth Insights re-onboarding with expanded categories and durable live preference updates.
- [x] Harden New badge view-once behavior and add client/server diagnostics.
- [x] Validate realtime like events and creator-feed animation with fallbacks and logging.
- [x] Add focused automated tests and verify the preview build.
- [x] Verify video completion clears the exact per-user/per-post New marker in unit/rendered tests; authenticated browser coverage is committed and runs when a test session is available.
- [ ] Replace the Home/Loops single-file composer with one mixed multi-file picker and responsive per-file previews.
- [ ] Persist and render mixed image, video, and PDF attachments for every authenticated user.
- [ ] Merge posts, Loops, and Growth cards by one effective timestamp so the visible feed is truly newest-first.
- [ ] Add regression tests and verify upload selection, responsive previews, chronological feed order, and runtime health in the authenticated preview.
