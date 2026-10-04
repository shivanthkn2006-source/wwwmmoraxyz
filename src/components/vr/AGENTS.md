# VR World rules

- VR world distant/heavy areas (mountains, highway, cycling trail, heritage train) mount via ProximityGate (camera-distance with hysteresis, smaller radius on low-memory phones) and city systems are lazy chunks, because loading the whole world at once froze basic phones.
- VR World on-screen panels are wrapped in <VRFeature id> and hidden while VRTopDock is mounted (body[data-vr-clean]); the dock's icon strip reveals them one by one, because the always-on HUD made VR unusable on phones.
- VR World buttons and physical game controllers go through src/lib/vrInput.ts, which reuses the world's existing key/event wiring, because a second movement system would drift out of sync.
- Heavy VR models (>5 MB) are never preloaded at import time and load only when used (e.g. the detailed bike only while riding, never on ≤4GB phones) behind an error boundary with a procedural fallback, because a 57 MB preload stalled and crashed VR World start.
- Repeated VR scenery (rails, sleepers, gravel) uses instanced meshes and moving fleets (metro trains) use distance LOD, because thousands of separate meshes exhausted phone memory.
- While VR World is active (src/lib/vrSession.ts), AfterAuthIdle hosts marked pauseInVR unmount, because background helpers outside the world compete with the 3D scene on phones.
- VR relic quests and the item bag live in src/lib/vrQuests.ts (vr_bag_items, vr_quest_progress; own-row RLS), and quest completion alerts go through notifySelf as vr_quest_complete, because one store keeps the world, bag panel and bell in sync.
- VR World spawns on the Real Map (src/worlds/realmap, OpenStreetMap chunks keyed in lat/lng, cached in IndexedDB) and the existing city is "M'Mora World" behind a doorway; src/worlds/worldMode.ts mounts only one world at a time, because both worlds together would exceed phone memory.
