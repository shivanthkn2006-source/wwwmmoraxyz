# Clean VR World controls for phones (your exact layout)

## What's wrong today (seen in your screenshot)
- On the left, R, Chat, the move stick, Crouch and Light are stacked on top of each other. Touches land on the wrong button, so the avatar doesn't move.
- On the right, Jump / Zoe / Run / Use sit under the round map.
- The big map's Close button is below the screen edge in landscape, so the big map can't be closed.

## New layout

```text
 [Search] [Chat]          [time | compass] [v strip]            [round map]

 [L] [▾ Crouch/Light]                               [▾ Jump/Zoe/Run/Use] [R]
      (L and R are at exactly the same height, mirrored on each side)

   ( MOVE STICK )                                              ( 360 PAD )
   medium size, clear area around it                          bottom-right
```

- **Left bottom:** the move stick at medium size, with nothing else near it.
- **Left top:** L, then just to its right a small dropdown button. Tapping it opens Crouch and Light; tapping again closes it.
- **Right bottom:** the 360 turn pad on its own.
- **Right, above the 360 pad:** a small dropdown button with Jump, Zoe, Run and Use inside. R sits just to its right, at exactly the same height and edge distance as L on the left, so the two sides mirror each other.
- **Right top:** stays as it is, with the round map kept clear of the buttons below.
- **Big map:** the Close (X) button moves to its top corner, inside the screen. Tapping outside the map also closes it.
- Nothing else changes, and every button still does what it does now.

## How it will be checked
- Open VR World in a test browser at phone sizes (landscape 852x393 and portrait 393x852) and take screenshots.
- Confirm L and R are at the same height, no buttons overlap, and the move stick area is clear.
- Drag the move stick and confirm the avatar actually moves.
- Open each dropdown and use a button from it.
- Open the big map and close it with X.
- Send you the screenshots.

## Technical details
- `VRGamepadHUD.tsx`: reposition the groups with shared top offsets and matching left/right edge offsets, so L and R mirror exactly. Two small dropdown groups hold Crouch/Light and Jump/Zoe/Run/Use, and the move stick gets its own clear zone.
- `VRMiniMap.tsx`: put the big map's close button in its top corner, close on outside tap or Escape, and keep the big map's height within the screen in landscape.
- Checks run on the existing `/vr-harness` test page, which needs no sign-in.
