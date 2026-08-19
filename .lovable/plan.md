# Plain fit-to-screen media, like Instagram Reels

Remove the blurred backdrop behind post media and keep only the media itself, fitted whole inside the screen on a plain black background — never cropped, never stretched.

## What changes

1. Delete the blurred/dimmed backdrop layer behind both video and image posts.
2. Keep `object-contain` centering so the entire frame is visible at its true aspect ratio.
3. Background behind the media stays flat black (matches the Reels reference).
4. All overlays (right action rail, top-right controls, author info, left preview rail, search/camera) stay exactly where they are, on top of the media.
5. Card stays exactly one viewport tall on `/home`; no other page or layout is touched.

## Technical notes

- File: `src/components/PostCard.tsx`, inside `[data-testid="post-media-frame"]`.
- Remove the two `pointer-events-none absolute inset-0 scale-110 ... blur-2xl brightness-50` divs (video branch and image branch).
- Video/image keep `h-full w-full object-contain object-center` inside the existing `relative h-full w-full bg-black` wrapper.
- Text-only posts unchanged.
- Verify at 411x717, 390x844 and 1280x800 that the media box height equals the viewport height, no zoom/crop, and controls remain clickable.
