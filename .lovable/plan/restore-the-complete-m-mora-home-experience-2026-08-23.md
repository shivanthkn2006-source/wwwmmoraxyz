# Restore the complete M'Mora Home experience

## What will be restored
- Keep the current full-screen Shorts-style feed, but restore direct access to **Global feed**, **Friends feed**, and **Selfie City** from the existing bottom-right dock so no controls return near the M'Mora logo.
- Add today’s **motivation** as a persistent full-screen feed slide, independent from the one-time welcome overlay, with its generated image, message, action step, and quote.
- Keep today’s **astrology card** as a full-screen feed slide and ensure motivation and astrology are distinct entries.
- Restore the missing **people/interest recommendations** as a full-screen Home slide so users and connection actions are reachable again.
- Preserve and verify existing Loops, platform posts, searched videos, neural videos, friend requests, notifications, camera, Live, Zoe, and profile integrations.

## Stability fixes
- Fix the per-post realtime subscription collision currently throwing a runtime error and destabilizing Home cards.
- Make feed visibility checks account for restored motivation/recommendation slides so Home never incorrectly shows an empty state.
- Verify `/home` on the current mobile viewport: initial render, vertical scrolling through restored slide types, dock switching between feeds, and no overlap near the logo.

## Technical details
- Reuse the existing motivation hook and introduce a dedicated inline feed-card presentation rather than reusing the portal-based welcome overlay.
- Add feed destinations to the existing `HomeGlassDock` item list and switch the current `activeTab` state.
- Give each `PostCard` realtime channel instance a collision-proof identifier and clean it up on unmount.
