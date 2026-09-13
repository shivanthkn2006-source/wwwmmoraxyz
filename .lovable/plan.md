# Harden music queue, full-track results, and Home loading

## Goal
Make Music use one reliable multi-source queue, show its current position in the compact player, fill the available page height without the bottom strip, and stop Home from repeatedly returning to its loading state.

## Changes
1. **Queue behavior**
   - Keep every playable search result in the shared route-independent queue.
   - Make Next, “next song,” and “skip this” advance to a different queued item and recover past broken streams without looping back to the failed item.
   - Show `current / total` beside the compact music symbols without adding a panel or border.

2. **Full-track search integrity**
   - Prefer full-length Audius and Internet Archive tracks, then live internet-radio stations.
   - Keep official Apple results clearly labelled as previews; never describe or rank them as full songs when only a preview URL exists.
   - Search album/song catalog metadata while displaying album names where supplied.
   - Represent “satellite” requests through verified live radio directory results only; do not claim access to private satellite-radio feeds.

3. **Music page sizing**
   - Remove the bottom strip by making the page and inner shell fill the usable viewport.
   - Preserve the existing monochrome Liquid Glass layout and controls.

4. **Home loading reliability**
   - Prevent changing hook/function identities from restarting the initial Home fetch cycle.
   - Reserve the full-screen loading state for first load and explicit refresh, while background live updates remain non-blocking.
   - Fix the current health-monitor render warning if it contributes to repeated errors, without redesigning it.

5. **Verification**
   - Add focused queue/provider tests covering advancement, broken-stream recovery, source ordering, and preview labelling.
   - Run focused automated tests and inspect current build/runtime signals.
   - Live-test signed-in Music and Home on phone and desktop viewports, including search, Next/Skip, mini-player position, full-page fill, and repeated-loading behavior.

## Boundaries
- No hidden YouTube player, fabricated provider account, or claim of unlicensed full-track access.
- No unrelated UI or design changes.
- Physical satellite feeds and subscription catalogs require licensed provider integrations and are not fabricated.
