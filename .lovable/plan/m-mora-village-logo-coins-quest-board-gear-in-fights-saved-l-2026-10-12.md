# M'Mora Village: logo coins, quest board, gear in fights, saved looks

## What already exists (no rebuild)
- Fights already use your Attack and Defence; the avatar already shows the helmet, vest and weapon.
- The quest board already has gold markers over items still to find.

## 1. Logo on the three coins (needs your logo)
No M'Mora logo file has been uploaded, only the earlier coin pictures. Once you upload it:
- Put the logo in the centre of the gold (50), blue (10) and yellow (1) coin faces, with "M'MORA" and the value in the case's italic serif lettering.
- Use the same metal rim and engraved look as the Church Medallion, so coins and quest items match.
- Send you the finished logo and coin pictures in Files.

## 2. A real quest board
- Board gets a parchment map of the village: church, castle, shore, square, with a pin per quest item and a "you are here" dot.
- Active mission highlighted; finished missions stamped "Done".
- In the world: marker beam shows the distance in metres ("Medallion · 42 m"), and a small arrow at the screen edge points to the active mission's item.
- Only the next unfinished mission is "active", so missions run in order (map → medallion → crest).

## 3. Gear matters while fighting
- Weapon choice changes the fight: knife hits fast and close, handgun hits from 6 m, shotgun hits hard but slowly.
- Armour shows a brief shield flash when it blocks part of a hit; helmet and vest each reduce damage.
- Quest items give small bonuses while carried: Map shows markers further away, Medallion slowly restores health, Crest adds +5 Attack.
- A small Attack/Defence/health strip appears only while you're fighting.
- Swing/shot animation on the avatar's right arm when attacking.

## 4. Your look saved to your account
- Save face (hair style/colour), skin tone and outfit colours to your account, and load them on any device, like level and items.
- Simple "Look" section in the case to change them; the newest saved choice wins.

## Technical details
- New table `vr_player_look` (user_id PK, skin, hair, hair_color, outfit jsonb, updated_at) with own-row RLS; store in `src/lib/vrLook.ts` mirroring `vrGear` sync; `ThirdPersonAvatar` reads it.
- Combat changes in `VillageVillagers.tsx` (per-weapon range/cooldown table in `vrGear.ts`).
- Board map as Html inside `VillageQuestBoard.tsx`; edge arrow in HUD.
- Coins: edit existing coin images with the logo via image editing; `vrCoinLook.ts` unchanged.
- Order: 2 → 3 → 4, then 1 as soon as the logo arrives. No changes to other worlds.
