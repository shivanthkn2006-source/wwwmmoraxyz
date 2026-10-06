# Clean VR World controls for phones (landscape and portrait)

## What's wrong today (seen in your screenshot)
- The left side stacks R, Chat, the move stick, Crouch and Light on top of each other, so touching the stick often hits another button and the avatar doesn't move.
- The right side puts Jump / Zoe / Run / Use under the round map, so they overlap.
- The big map's Close button sits below the screen edge in landscape, so the big map can't be closed.
- There's no on-screen guide showing which button is where.

## New layout (one fixed layout, nothing overlapping)

```text
 [Search] [Chat]            [time | compass] [v strip]          [round map]
                                                                 (tap = big map)
 [L] [Crouch] [Light]                                         

                                                                   [R]
   ( MOVE STICK )                                    [Jump]
   bottom-left, big,                          [Zoe] (  o  ) [Run]
   nothing else near it                              [Use]
                                         [ 360 ]  bottom-right,
                                                  under the map, not over it
```

- **Left half, bottom:** only the move stick, larger, with a clear zone around it. Drag anywhere in the bottom-left quarter to move, so a slightly off touch still works.
- **Left, top (under Search/Chat):** L, Crouch and Light in one small row.
- **Right, bottom:** Jump / Zoe / Run / Use diamond, with the 360 turn pad just to its left and R just above it.
- **Right, top:** the round map shrinks a little in landscape so it always ends above the buttons.
- **Arrow keys** on laptops keep working as now; on phones the arrows sit on the 360 pad.
- **Big map:** the Close (X) button moves to the top corner of the big map, inside the screen. Tapping outside the big map or pressing Back also closes it.

## Control guide
- A new "Controls" button in the top strip opens a one-screen picture of the layout, with every button labelled ("Move", "Turn", "Jump", "Use = open doors, pick up items", and so on).
- It shows automatically the first time someone enters VR World, then only when tapped.

## How it will be checked
- Open VR World in a test browser at phone sizes (landscape 852x393 and portrait 393x852) and take screenshots. Confirm no buttons overlap, and that dragging the move stick actually moves the avatar.
- Open the big map, close it with X, and confirm it's gone.
- Open the Controls guide and confirm it matches the real layout.
- Send you the screenshots.

## Technical details
- `VRGamepadHUD.tsx`: reposition the groups with safe-area-aware anchors, plus a landscape media query (short screen height) that tightens spacing. The move stick gets its own exclusive bottom-left zone, with no other buttons inside it.
- `VRMiniMap.tsx`: in landscape, cap the size to about 40% of screen height. Put the big map's close button in its top-right corner, close on outside tap or Escape, and cap the big map at 85% of the screen height including its controls.
- Use the existing `/vr-harness` test page for the checks; it needs no sign-in.
- New `VRControlsGuide.tsx`, opened from the top strip, with a seen-once flag saved on the device.
- No change to what any button does, only where it sits.
