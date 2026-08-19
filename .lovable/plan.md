# Uniform Reels-style media frame, no blurred fill

Every post gets the same media frame, like Instagram Reels: one fixed portrait shape per screen, media filling that shape, no blurred backdrop behind it.

## What changes

1. **Remove the blurred fill** behind video and image posts. Background behind media is flat black.
2. **One uniform frame for all posts** — a 9:16 portrait box centered in the viewport, sized to the screen (full height on phones; capped by width so it never overflows). Every post uses the exact same box, so the feed looks even regardless of what was uploaded.
3. **Media fills the frame** (`object-cover`, centered) so there are no bars inside the frame and nothing looks stretched. Extreme-ratio uploads lose a little at the edges, exactly as Instagram Reels does.
4. **Overlays unchanged** — right action rail, top-right controls, author info/caption, left preview rail, search/camera all stay where they are, layered on top.
5. **One post per screen** on `/home` stays as is; no other page or layout touched.

## Technical notes

- File: `src/components/PostCard.tsx`, inside `[data-testid="post-media-frame"]`.
- Delete both `blur-2xl brightness-50` backdrop divs (video + image branches).
- Wrap media in a centered frame: `aspect-[9/16] h-full max-h-full w-auto max-w-full` inside a `flex items-center justify-center bg-black h-full w-full` parent, so the box is viewport-height-driven and never exceeds the width.
- `<video>` / `<img>` inside the frame: `h-full w-full object-cover object-center`.
- Text-only posts unchanged.
- Verify at 411x717, 390x844 and 1280x800: identical media box across posts, no blur layer, no stretch, controls still clickable.
