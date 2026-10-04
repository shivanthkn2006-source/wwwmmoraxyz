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
- [ ] Stage 2 next: road traffic on real streets (uploaded OSMRoadTrafficController), street relics, Zoe street hints, live nearby players (respecting the privacy switch)
- [ ] Stage 3: city pre-warming, players split by area for scale
