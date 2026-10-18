# Village camera: from "world spins" to a normal third-person camera

## How it works today
- The camera is the real player. The avatar is only a picture drawn 2.8 m in front of the camera, at your feet height. The camera sits at 2.4 m, angled down.
- Left/Right (and the look stick) turn the camera in a circle around that spot at about 140° per second. The avatar is fixed in the middle of the screen with no delay.
- So the avatar never moves on screen while the whole village sweeps past behind it. That is why it feels like the world is spinning.
- Moving, turning your body and looking around all use one shared direction. You cannot look around without turning, and nothing eases in or out.

## What normal games do
- The avatar is the player. The camera follows on a soft "arm" behind and a little to one side, over the shoulder.
- The look stick or mouse moves only the camera around the avatar. The avatar turns smoothly toward the way you walk.
- The camera eases into place, so turns feel like panning rather than snapping.

## Proposed change (village only)
1. Make the avatar's position the real player position. Collisions, doors and saves keep working the way they do now.
2. Add a camera that follows on a soft arm. It stays at the same 2.4 m height and 2.8 m distance you approved, with a small shoulder offset.
3. The look stick, mouse and right stick move only the camera. Movement is based on where the camera faces, and the avatar turns smoothly to face where it walks.
4. Smooth the camera with a short follow delay that does not depend on frame rate. Also add a slower turn speed that eases in.
5. Aiming with a weapon equipped keeps the avatar facing where the camera looks.
6. Leave first-person, the real map, Face view, stats, story and saves unchanged.

## Checks
- Small tests: moving forward follows the camera's facing direction, the camera stays at 2.4 m height and 2.8 m distance, and looking around does not move the player.
- Two preview screenshots taken during a turn, to confirm the camera pans and the avatar turns.

## Technical notes
- Today's behavior comes from `turnYaw`/`orbitAvatar` (`VROMEGAWorld.tsx`, `vrView.ts`) and `ThirdPersonAvatar` placing the body at `camera + forward*2.8`.
- The change separates `playerPos`/`bodyYaw` from `cameraYaw`/`pitch`, adds a spring-arm camera with `exp(-k*dt)` damping, and makes input relative to the camera. `resolveAvatarMove` will be fed the body position directly.
