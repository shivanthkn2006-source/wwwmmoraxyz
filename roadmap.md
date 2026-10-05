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
