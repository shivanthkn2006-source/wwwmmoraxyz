# Fit post media to the screen like Instagram Reels

Right now each post's video/image uses `object-cover`, so tall/wide media gets zoomed and cropped — faces and captions get cut off at the edges. Instagram instead shows the whole frame, centered, filling the screen with a soft blurred version of the same media behind it.

## What changes

1. **Media fits, never crops**
   - Video and image switch from `object-cover` to `object-contain`, centered, inside the full-screen frame.
   - The entire uploaded frame is always visible, whatever the aspect ratio (9:16, 1:1, 16:9).

2. **Blurred backdrop fills the leftover space**
   - Behind the media, the same source is rendered scaled-up, blurred and dimmed, so there are no plain black bars — the screen looks full, exactly like the reference reel.
   - Images use the image itself; videos use their poster (or first frame) as the blurred layer.

3. **Overlays stay on top and unchanged**
   - Right action rail (like/comment/share/save/Zoe/follow), top-right rate/more/speaker, author info and caption at the bottom, and the left preview rail all keep their current positions, layered above the media.
   - Existing top/bottom readability gradients stay so text remains legible over lighter media.

4. **Full-viewport lock kept**
   - The card stays exactly one viewport tall (`100dvh` chain already scoped to `/home`), no gaps above or below, one post per screen.

## Technical notes

- File: `src/components/PostCard.tsx` — media layer inside `[data-testid="post-media-frame"]`.
- Add a `pointer-events-none` absolutely positioned blurred backdrop div (`scale-110 blur-2xl brightness-50`) before the `<video>` / `<img>`, both wrapped in a `relative h-full w-full` stack.
- Change `object-cover object-center` to `object-contain object-center` on `[data-testid="post-video"]` and `[data-testid="post-image"]`.
- Text-only posts keep their current gradient card.
- Verify at 411x717 (user's device), 390x844 and 1280x800 with Playwright: media box height equals viewport height, no black bars, controls still clickable.
