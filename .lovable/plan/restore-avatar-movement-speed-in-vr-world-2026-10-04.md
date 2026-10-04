# Restore avatar movement speed in VR World

## Goal
Your avatar should move as fast as it did two updates ago when you use the MOVE stick, the pad or the arrow keys. Everything else in the last update stays as it is.

## What changes
- Walking goes back to the earlier speed: about 5 m per second, up from 1.4.
- Running goes back to the earlier speed: about 9 m per second, up from 3.8.
- Turning with left and right gets a little quicker so it keeps up with the faster walk.
- These stay the same: the camera turns first and then you walk where you face, Down turns you around, and Run still uses the stamina bar.

## How it will be checked
- An automated speed check confirms the new walking and running speeds.
- I'll hold forward on the MOVE stick in the test browser and compare the distance covered with the earlier version. The test browser runs slowly, so I'll compare speed per frame, not per second.

## Technical details
- In `src/lib/vrWalk.ts`: set `WALK_MPS` to 5 and `RUN_MPS` to 9 (the earlier `PlayerController` values), and `TURN_RAD_PS` to 2.4.
- `VROMEGAWorld.tsx` already reads these values, so nothing else needs to change.
- Add a test asserting the walk and run speeds.
