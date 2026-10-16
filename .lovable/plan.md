# Headlamp for night walks + brighter moonlit mountains

Your screenshot shows the mountain/waterfall/forest area almost black at night. Plan: a buyable headlamp you wear from the case, plus a stronger moonlight on the mountain area. Nothing existing is moved or removed.

## What you'll get
1. **Headlamp item** — "Miner's Headlamp" (armour slot, no stat change), sold by villagers for **15 coins** (Use near any awake villager at daytime/evening: "Buy Headlamp · 15 coins"). Also listed in the hidden merchant shop.
2. **Wear it from the case** — appears under Files; tap Equip/Unequip. A small strap + lamp shows on the avatar's forehead.
3. **Real beam** — when worn and it is dark (street-lamp hours 17:00–05:54 local), a warm-white cone shines from the forehead in the direction you face, about 30 m reach with soft edges, lighting ground, trees, rocks, mountains and the waterfall. Toggle with **L** key or the case button. Click sound on/off.
4. **Moonlight on the mountains** — a soft blue-silver moon light aimed at the mountains/waterfall/forest band behind the village, so shapes read at night even without the lamp (still dark and moody, not daylight).
5. **Saved to your account** like other gear (owned + equipped), using the existing safe-save rules so it never disappears after sign-out.

## Technical details
- `src/lib/vrGear.ts`: add `{ id:'headlamp', kind:'armour', shop:true, price 15 }`; STAT none; sfx 'metal'.
- New `src/worlds/mmora/VillageHeadlamp.tsx`: one `spotLight` (angle 0.5, penumbra 0.55, distance 32, decay 1.5, color #fff1d8) parented to avatar head height, target placed ahead along camera yaw; intensity damped; only one light (fixed count, no material recompile — always mounted, intensity 0 when off). Forehead mesh on the player avatar.
- Villager purchase via `registerUse` in VillageVillagers (nearby awake villager, not hostile, coins ≥15 → spend via existing coin store).
- `VillageScenery.tsx`: add one directional moon light targeting mountain band (no fog change).
- Mount in VillageLook; also in M'Mora World only if the user later asks.
- Tests: buy deducts 15 coins once, equip toggles, beam off in daytime.
- Verify in the private dev preview at night with `?cam=` facing the waterfall: before/after screenshots with lamp on/off. Signed-in and phone tests remain blocked as before. Audit updated with separated evidence.
