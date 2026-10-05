# Make streets and buildings appear in VR World again

## What's happening
VR World starts and draws the doorway and the demo walker. Neither needs map data. Streets and buildings only appear once the free map service answers, and on the published site that answer seems never to arrive. Nothing is blocking the request on our side (the site has no rule that blocks it), so the most likely cause is the way we ask:
- When you enter, about 25 blocks are bundled into one big map request.
- The phone gives up after 15 seconds, but the map service is allowed up to 25 seconds for a big area. Busy map servers often go past 15 seconds, so every server gets cut off and the map stays empty.
- After a failure there's no automatic retry, so the street stays blank until you reload.

This is the leading explanation. Step 1 confirms it before anything changes.

## Steps
1. **Confirm the cause.** Open the published VR World in a test browser, read the map status line (Downloaded / Failed), and time how long the map servers take for the starting area.
2. **Load your own block first.** Ask for the block you're standing on (plus its direct neighbours) in a small, fast request. Then fill in the outer blocks in small groups, nearest first.
3. **Match the waiting times.** The phone waits a little longer than the map service's own limit, so answers that are slow but valid are no longer thrown away.
4. **Retry on its own.** Blocks that failed are retried automatically after a short pause, getting slower each time. A blank street never needs a reload.
5. **Show progress honestly.** While your street is loading, a small "Loading your street…" note shows. If the map service is down, it says "Map service busy, retrying". No silent empty world.
6. **Test.** Check Times Square and Bengaluru on the published site, empty the phone's saved copy, and confirm buildings and roads appear. Add tests for small-batch loading and retry.

## Technical details
- `src/worlds/realmap/osm.ts`: split `flushBatch` so the first flush covers at most the 3×3 blocks around you, then groups of no more than 6 blocks. Raise the client abort above the Overpass `[timeout:25]` (or lower the server timeout per small query). Add a per-key retry queue with backoff (5s, 15s, 45s), and make sure shared-cache misses fall through to download.
- The status line reads the existing `loaderStats` and shows the loading/busy note through the existing overlay.
- No change to look, controls or layout.
