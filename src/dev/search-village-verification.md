# Search and Village verification — 19 October 2026

## Verified in authenticated gameplay, not a fixture
- Home search `village` returned **M'Mora Village**, described as Village inside M'Mora World, with the house symbol.
- Clicking the result opened the existing `/zoe-omega?vr=1` World entry and the actual saved Village.
- Upward/right mouse drag raised camera Y from **2.4** to **3.0048** and changed yaw from **−2.909866** to **−3.212853**.
- Reconstructed avatar position before: **[3.033394100798514, −1.8853800746802487]**; after: **[3.033394100798514, −1.8853800746802492]**. No movement keys, gear changes or progress injections were used.
- Village reload rendered normally: neither Startup failed nor Module offline was visible. An earlier text count included hidden recovery text; screenshots and visibility checks do not show a startup failure.

## Current verified blocker
The W-870 asset request returned HTML instead of its GLB bytes; the model loader raised `Unexpected token '<'`. The Village still rendered through its model error boundary, but the raised-hand pose had no visible W-870. No claim of verified grip, equip, clipping or ranged combat is made. Drowned spit at 3–8 m remains covered only by the previous automated range test, not observed here.

## Search root cause and scope
Home and Zoe modal share useHomeSearch, which previously searched only the legacy feature list plus cloud content/profiles. The Home menu independently discovered canonical routes, so new menu destinations were missing from search. Search now merges existing member route/menu destinations first and keeps them available during cloud failures. Privileged route exclusions are unchanged; the broad nexus/omega classifier was deliberately not weakened. Real geographic villages were not mapped to the fictional Village.

21 focused tests passed across feature discovery, camera direction/defaults, route consistency and existing menu search. Zoe modal independent click-through and DHF document recall are not visually verified. No whole-platform clean-bill-of-health is claimed.

Visual evidence captured during the run under `/tmp/browser/search-integration`: village-search.png, camera-before.png, camera-after.png, world-reload.png. These temporary captures may not persist across sessions.