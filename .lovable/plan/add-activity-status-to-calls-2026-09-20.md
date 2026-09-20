# Add activity status to Calls

## What will change
- Add the complete existing profile activity list to the Calls experience, without changing any other page or design.
- Show each activity with a plain white line icon and transparent glass styling only.
- Place the compact activity control directly below the KBPS indicator at the top-left of the full-screen call.
- Let the signed-in caller change their saved profile activity from the call screen.
- Show the other participant’s saved activity there and keep it updated during the call.

## Wiring
- Reuse the existing `profiles.status` value so Profile and Calls always share the same status for every user.
- Read both participants’ statuses when the call opens and listen for status updates while the call remains active.
- Keep activity status outside the media/signalling path so it cannot interrupt audio, video, PiP, or call controls.

## Verification
- Add focused checks for every existing status, plain monochrome icons, transparent styling, persistence, and remote updates.
- Verify the full-screen Calls view at phone and desktop sizes, including the exact top-left placement below KBPS.
- Confirm the current build and runtime logs remain clean.
