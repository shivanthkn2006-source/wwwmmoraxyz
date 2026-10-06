# Move the 360 turn pad left of the Home button

- In VR World, the 360 turn pad in the bottom-right corner moves left, so it sits just to the left of the round Home button and doesn't touch it.
- It stays at the same height and size, and works the same way.
- Nothing else changes. The move stick, L/R, the dropdowns and the map stay where they are.

## How it will be checked
- Open the VR test page at phone size in landscape (852x393) and portrait (393x852). Take screenshots to confirm the pad and Home button don't overlap, and that the pad doesn't hit R or the dropdown above it.

## Technical details
- `src/components/vr/features/VRControlSystem.tsx`, `.vr-look-pad`: change `right-5` to a right offset that clears the Home dock button (about `right-[5.5rem]`).
