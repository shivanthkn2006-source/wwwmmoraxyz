# M'Mora Village roadmap

## Oct 20 requested repairs
- [x] Alternate avatars receive existing weapon art and mapped CCD arms; six isolated renders inspected. Shotgun/pistol remain blocks; finger fit is incomplete. Default/camera/stats/saves unchanged.
- [x] Brain verifies authenticated claims before parsing/retrieval; six handler tests pass. Triage/audit retain caller gates and use sovereign cascade; both production guards pass.
- [ ] Hosted valid-session brain/provider and triage/audit checks: deployment/runtime not proved by gateway-level fake-token 401.
- [x] Isolate unrelated call signalling in voice/router fixture; 1,089 tests pass, six skip, no unhandled exception. Historical emitting service is not established.
- [x] Publish Oct 20 follow-up report and six isolated screenshots with gameplay blockers explicit.
- [ ] Full signed-in Village equip/spit and Home-ready reload: asset proxy returns HTML; current Home capture still shows loading, not a completed startup.

## Oct 19 platform audit continuation
- [x] Re-run full tests: 1,080 assertions passed, 6 skipped; run exits unsuccessfully with one unhandled WebSocket/Event error. Not a clean suite.
- [x] Re-check signed-in Home reload: no visible startup failure or page errors; greeting dismissed and Home visible behind permission prompt.
- [x] Re-check W-870 delivery: localhost returns HTTP 200 text/html, not GLB. Live grip and ranged-spit proof remain blocked/unperformed.
- [x] Review current security and integration code; publish revised evidence-separated report with stale-scan caveat and missing functionality.
- [ ] Verify/fix AI auth gate, cross-account findings, arbitrary fetches and private logging individually; current scanner findings date Oct 3 and require revalidation.
- [x] Oct 20 suite exits cleanly (1,089 passed, six skipped), paid-AI and public-auth guards pass; historical WebSocket source remains uncertain.
- [ ] Complete authenticated Zoe-modal/DHF retrieval, village equip/spit, saves/multiplayer and device-only audio checks; blockers and missing proof listed in revised report.

## Oct 19 search integration and camera follow-up
- [x] Connect existing member menu destinations to Home/Zoe platform search, including Village and matching symbols; preserve existing admin hiding. 21 focused tests pass.
- [x] Correct vertical Village drag direction without changing default height, distance, gear or saves.
- [x] Signed-in Home search → Village entry and reload verified. Upward right-drag camera Y 2.4→3.0048; avatar X/Z unchanged to floating-point tolerance. No visible startup/module failure on reload.
- [ ] W-870 visual gameplay verification blocked by preview asset URL returning HTML; actual Village still renders without this gun model. Drowned live spit remains unobserved.
- [ ] Independent Zoe modal click-through and DHF-content retrieval not exercised; shared search source covered by regression tests only.

## Oct 19 live verification request
- [x] Signed-in Home and village reload: no startup failure; earlier failed module URL was not logged, so cause unconfirmed.
- [x] Signed-in village orbit: body stayed at the same spot while camera yaw moved; wheel zoom 75→50; vertical drag measured.
- [ ] W-870 signed-in equip: blocked — account doesn't own it; preview model URL returns a page, not the 3D file.
- [ ] Drowned live 3–8 m spit: not observed in gameplay; covered by range test only.
- [ ] Isolated W-870/Drowned test copy (signed out, no account writes): didn't open the village, so nothing was measured there yet.

## Oct 18 equipped gun hold correction
- [x] Root cause found: Shotgun item (not W-870) drew a loose box + crossed-hands aim pose; W-870 stock frame sat 0.2 m behind shoulder; torso arched back; wrists/fingers used guessed axes. Fixed; isolated evidence grip_fix_before_after_v3.jpg.
- [ ] Signed-in village check of Shotgun/W-870 hold: blocked (no minted session; hosted 3D files return a page instead of the file on localhost).
- [x] Replace detached W-870 overlay with rig-connected grip and support-hand solve; keep skirt default and gameplay unchanged.
- [ ] Isolated rear/side before-after done; walking, firing and authenticated village checks remain; distinguish isolated evidence from authenticated gameplay.
- [ ] Report other weapon models, reload animation and enemy/combat gaps without claiming completion.

## Oct 18 avatar options and inventory repair
- [x] Repair inventory selection/equip interaction; isolated click→equip→unequip verified, 3 gear preservation tests; no item resets or herb colour changes.
- [x] Inspect all six GLBs; optional Zoe and Ready Player rigs (~4.6–4.9 MB) render in isolated poses; skirt remains default. None contains movement clips.
- [x] Wire visual walk/run/jump/stairs/sit/hand-reach telemetry to existing controller; camera/stats/story/saves unchanged. These are procedural poses, not motion capture.
- [x] Isolated inventory + avatar switch verified; render screenshots and evidence-separated report saved. Build OK, 8 focused tests passed.
- [ ] Authenticated village movement, weapon grip/finger contact and avatar-switch readback: blocked by localhost asset proxy returning HTML; isolated renders substitute exact uploaded GLB bytes.
- [ ] Motion-captured fighting, shooting/reload and stair animations: blocked by missing animation clips in uploads; optional rigs currently use basic procedural poses.

## Oct 18 weapon visual review
- [x] W-870 grip-pivot carry adjustment + signed-out fixture before/after evidence; 12 regression tests passed, no account writes.
- [ ] W-870 remaining stock/forearm, fingers, walking/aiming and village-clearance checks: isolated-account sign-in blocked by permission.
- [ ] Drowned 3–8 m spit bug confirmed: approach branch suppresses ranged attack; deferred outside W-870-only scope.
- [x] Upgrade only W-870 mesh/materials/proportions; preserve gameplay and saves.
- [x] Isolated authenticated fixture before/after evidence and honest visual gap report.
- [ ] W-870 authenticated grip/clipping/village lighting and hosted CDN delivery: unverified; fixture used exact GLB interception.
- [ ] Sentinel Nine and Bolt Rifle: unchanged, pending W-870 review.

## Oct 16 progression and collision request
- [ ] End Warden encounter permanently after defeat; auto-save completion and position.
- [ ] Diagnose save failures and verify signed-in restore without altering existing account items.
- [ ] Verify church medallion route and reachable pickup.
- [ ] Stop avatar at doors, signs and villagers; preserve camera distance, improve height.
- [ ] Realistic original enemy/weapon/ammo visuals and effects (not console-game parity).
- [ ] Evidence-separated audit and safe signed-in preview checks; no video.

## Done (automated build checks only)
- [x] Stage 1 survival basics, herbs, ammo, typewriter save
- [x] Varga radio auto-play per chapter
- [x] 64 lane supplies, golden-looking Golden Herbs, chapter auto-save
- [x] Stage 2 Hollow Warden (idle/stalk/lunge, noise-based)
- [x] Stage 3 fuse puzzle (shell + fluid → mixer → fuse → gate → antigen)
- [x] Stage 4 core defence + Verdant Colossus boss
- [x] Stage 5 merchant weapon upgrades + bigger case purchase

- [x] Clock tower: hands on all 4 faces, real local time

- [x] Generator fluid line step in fuse puzzle (code check only, not played)

- [x] Real-weather rain in M'Mora World + village (code check only)

## Open
- [x] Enemy wave at core (code check only)
- [x] Dropped-item pouches, cleared per chapter (code check only)
- [x] Spore fog + auto flashlight (code check only)
- [x] The Drowned at the shore (code check only)
- [x] Glove powers (code check only)
- [ ] Stage 6 team play
- [x] Stage 7 Watch Drill timed bonus mode
- [ ] Multiplayer gaps: own-avatar spacing, hidden-member slot counting, moving between groups
- [ ] Chapter 5+ storyline
- [x] Sync puzzle progress, upgrades, case rows to account (code + tests only)
- [ ] Coin logo (blocked: no file uploaded)
- [ ] Signed-in browser tests (blocked: preview signed out; needs member sign-in)
- [ ] Real phone / installed app tests (blocked: needs user's device)

## Oct 15 request (Marc)
- [x] Coins/rifle loss: device no longer uploads before reading account copy (code + tests)
- [x] Village lights on until 05:54 local (code + tests)
- [x] Villagers indoors/asleep 22:00–06:00 local (code only)
- [x] Clear roads/paths of props; move houses off roads (incl. castle road) (code + road test + preview screenshots; not walked signed-in)
- [x] Villagers walk only on lanes/roads (code + test)
- [x] Villager chores; milkers walk road → farm track → beside the cow, cow holds still (preview data: walked + milking held=true)
- [x] Lamp glow + colour grading + wet ground reflections while raining (preview screenshot)
- [x] Detailed house fronts: carved door arch, chimney, ivy, balcony flower box (preview screenshot)
- [x] More detailed people (code only) + pine forest and boulders on mountains (preview screenshot)
- [x] Village sounds: wind, river, waterfall, wet footsteps, crickets, creaks, crows/dogs (code only, not heard)
- [x] Real local rain/thunder: device location, any precipitation = rain, storm codes, visible rain + lightning bolt (tests + preview screenshots with test switch; not seen at user's real location)
- [ ] Trailer video (last)

## Oct 15 request (2) (Marc)
- [x] Village hanging: fixed light count via light pool (preview: 4 real lights before/after walking)
- [x] More lit windows: houses (back + attic), archive, church (outer face, tower), castle (towers, keep, walls)
- [x] Clock tower + bell tower top lanterns and spire light (preview screenshots)
- [ ] Signed-in walk of routes, coins/inventory across reloads and sign-outs (blocked: no safe signed-in session)
