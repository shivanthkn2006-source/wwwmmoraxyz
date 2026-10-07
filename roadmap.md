# Roadmap

## VR World (2026-10-04)
- [x] Find why VR World doesn't load / is too slow; count what loads at start; fix
- [x] Memory palace: while inside, stop loading/rendering the outside world
- [x] Xbox + PlayStation controller support to spec (standard mapping, triggers, rumble, labels), tested with simulated pads
- [x] Small relic quests + 3D item bag; quest complete → bell alert
- [ ] Real-phone check of all of the above (needs the user's phone + a real controller)

## Real Map VR World (2026-10-04)
- [x] Stage 1: real OpenStreetMap neighbourhood as default VR spawn (3×3 blocks, phone cache), doorway ↔ M'Mora World, landscape guard, demo explorer, Map panel
- [ ] Stage 1 phone check at the owner's real location (needs the user's phone)
- [x] Fix: empty map/black sky — one map request per 3×3 area, auto-retry, shared backend block cache, daytime sky; "Memory Palace" loading labels removed
- [x] VR map privacy switch on the notification settings page (off by default)
- [x] Journey quest: walk your street → doorway → beacon in M'Mora World → Quest complete alert
- [x] Real map opens with a 500 m aerial view + "Land on my street"; memory bubbles/purple lights only inside M'Mora World
- [~] Photo-real buildings (Google tiles) — parked by user: no paid components for now
- [ ] Bell alerts: doorway entry, relic found on the real map (needs Stage 2 relics)
- [ ] Stage 2 next: road traffic on real streets (uploaded OSMRoadTrafficController), street relics, Zoe street hints, live nearby players (respecting the privacy switch)
- [ ] Stage 3: city pre-warming, players split by area for scale

## Real Map rework (2026-10-04, awaiting user's OK on understanding)
- [ ] Entry: 100 m above the player's street (or just above the tallest nearby building), smooth 2D→3D drop-in, replaces the 500 m view
- [ ] Street life: cars on real roads, walking people, street objects, building detail/labels (free sources only)
- [ ] Thermal governor: live frame-time/memory watch that lowers pixel ratio and car/people count on hot or slow phones
- [ ] Controls: every control on screen at once in its own slot, no overlap, each draggable (phones, tablets, desktop, app)
- [ ] Other members: real location per member (no Bengaluru fallback for everyone), nearby members shown only with privacy opt-in

## VR Stage 2 (2026-10-04)
- [x] Human walking: arrows/stick turn camera then walk; human speed; Run uses a stamina meter
- [x] Use button: nearest relic / member (one shared resolver)
- [x] Street relics on real roads + bell alert; doorway bell alert; "met a member" alert
- [x] Members see each other (default on, hide switch in chat), friend/follower/new tags, see-through chat
- [x] Glass "M'Mora world" loading screen; camera no longer asked at start
- [x] Cars, motorbikes and people on real roads (traffic file) + slow-phone protection
- [x] VR World search (top-left), portal invites, voice chat, M'Mora World opens beside its doorway
- [x] Camera never switches on by itself (Zoe vision is opt-in)
- [x] Building window/roof detail, building + street names, highlighted roads
- [ ] Real-device bell check for a street relic (needs member to sign in on phone)
- [x] South India region rollout plan approved
- [ ] Real iPhone + real controller check (needs the user's phone)
- [x] Places: malls, KFC/McDonald's, shops, fuel pumps on the real map (incl. Times Square)
- [x] VR voice uses the call relay for strict networks
- [x] GPS travel mode ("Follow my GPS": avatar follows phone, roadside friends alert, pauses at driving speed)
- [ ] (admin presses Start on notifications page) Pre-fill shared map store for Bengaluru, Chennai, Kochi, Thiruvananthapuram, Coimbatore, Madurai, Mysuru, Mangaluru

## VR game + cities (2026-10-05)
- [x] VR search "Cities and places" (free OSM place search from the phone) + "Back to my location"
- [x] Relics already count toward quests with bell alerts (relic hunter, memory keeper, rare eye, treasure seeker)
- [x] Quest rewards (karma, server-granted once per quest) on completion
- [x] Third-person avatar: walk / run / crouch animations, item pickup close-up (L / V switches view, Crouch button / C)
- [ ] Doors, notes, keys, locked rooms in M'Mora World + save point at the doorway; fuller bag screen
- [ ] Night mode: flashlight, fog, sound
- [ ] Health + stamina bars, optional rivals
- [ ] (needs admin's phone) Run "Prepare South India maps" and check the 8 cities
- [ ] Friends' tags while GPS-following at driving speed — blocked: following pauses above ~29 km/h for safety (user decision needed)
- [x] Doors, keys, notes, locked archive in M'Mora World + fuller bag (Items / Keys / Files / Quests, item close-up)
- [x] Night mode (local 18:00–06:00): fog, flashlight (Light / F), wind + cricket sounds
- [x] Admin's VR World auto-prepares the 8 South India cities in the background (once per device)
- [x] Doc: telemetry outbox, admin console, check button, traffic braking, landscape guard, on-phone map cache
- [ ] Doc: off-main-thread map worker; app-wide offline start (needs user OK)
- [ ] Save point at the doorway; health bar and rivals
- [x] Alerts panel scrolls on phones; tapping an alert opens its content (VR links, messages → chat)
- [x] Save point at doorway + health bar/respawn
- [x] Run end-to-end check button (relic bell, city jump, GPS)
- [ ] Landscape-locked install + offline map storage
- [ ] VR scoreboard / top players wired to Zoe/DHF
- [ ] (needs admin phone) confirm South India cities load

## Future: location-based offers (architecture note, not built)
- Merchants place offers on Real Map places (POIs from OSM); members see them only as they pass nearby (walk/vehicle/train), opt-in, using the existing privacy switch.
- Members redeem platform points with merchants; matching uses interests/likes the member chose, never hidden tracking.
- Alerts go through notifications (new kind), rate-limited, admin switch on /admin/notifications.

## VR World requests (2026-10-07)
- [ ] Clarify: which world is "the newly built M'Mora World" vs "the old VR Omega world" (portal target)
- [ ] Portals: explain why a city's portal doesn't lead to other cities (portals only go to M'Mora World and back)
- [ ] Old VR Omega world: transform to Real Map tech (merged meshes, load only nearby)
- [ ] Merge distant houses/trees/signs into single meshes, nearby-only loading
- [ ] Trees and metro ring, then market stalls: fewer batches
- [ ] M'Mora World: stick/drag must move the avatar, not just rotate
- [ ] Bench economy: sit to earn coins, build more benches
- [ ] PWA: VR World opens without stalling on "Finding your location" (12 s fallback added 2026-10-07; needs phone check)
- [ ] Two-device Chennai portal + herbs/coins/explored % match, then another city (needs user's two phones)
