# Fix Music suggestions, the VR song-upload window, and the whole VR world layout

Nothing existing gets redesigned or removed. Every item below is either a bug fix in
already-shipped behaviour or an arrangement change, done one at a time with a preview check
after each step.

## 1. Music search: the 5 keyword suggestions never appear

What happens now: the suggestion row is drawn *inside* the rounded search pill, and that pill
clips anything that falls outside it, so the chips are created but never visible. Typing
"ganapathy" also has no visible result for the same reason.

Fix:
- Move the suggestion row out of the clipped pill so it floats under the search bar, above
  the artwork and results, on every screen size.
- Keep it open while typing (it must not close on the first keystroke) and close on pick,
  submit, Escape, or tapping elsewhere.
- Always show exactly five: personal keywords from Zoe Connect when available, otherwise
  the deterministic mood/planet keywords, plus "ganapathy …"-style completions of what was
  typed. No extra model calls per keystroke.
- Keyboard support: arrow keys and Enter select a suggestion.

## 2. VR "Upload a song" window (from the screenshot: stuck on "Uploading…")

Faults found: the panel starts uploading with no time limit and no progress, so a long or
uncompressed file can sit on "Uploading…" forever; there is no album field; no size or
offline check before starting; and a failed conversion gives no readable reason.

Fix (the Music uploads page stays untouched):
- Show real stages: preparing → uploading → saved, with a visible progress state and a
  Cancel control.
- Check file size (50 MB), file type and connection *before* starting, with a plain message
  if something is wrong.
- Hard time limit on preparing and uploading; on timeout the panel says what happened and
  offers Retry instead of hanging.
- Add the optional album field, keep title/artist, and clear the form only after success.
- On success it stays in the same pipeline as today: appears in Music search with its album
  art, counts as a real play, and shows on the Home listening shelf.
- Make the whole window usable while dragging is active (typing and file pickers must not be
  swallowed by the drag handle).

## 3. VR world: windows and controls are unusable

Cause: ten panels are pinned to only four corners at overlapping depths, so they stack on top
of each other and cover the world and each other. Panel contents also keep their own sizes,
which overflow small landscape screens.

Fix, one panel at a time, without changing any panel's own design:
- Give every panel its own resting slot so nothing overlaps on first entry, and keep the
  bottom-right call/return controls completely clear.
- One consistent depth order: world → panels → Panels hub → guide/tutorial → return button.
- Only the essentials open on first entry (badge, Panels hub, guide); everything else stays
  one tap away in the hub, so the world is readable immediately.
- Panels hub gets a scrollable list with an "on/off" state per panel plus "Show all" and
  "Hide all", and a "Reset layout" that restores default slots and clears saved positions.
- Every panel: dragging stays inside the screen, saved position is re-clamped on rotation and
  on smaller screens, header stays tappable at 44px, and the content area scrolls instead of
  spilling off the screen in landscape.
- Landscape auto-entry keeps working; if the device refuses fullscreen, the rotate hint shows
  instead of a broken layout.

## 4. Device and display pass for everything added today and yesterday

Checked in preview, with fixes only where something breaks:
- Phones 320/375/390/430 wide, portrait and landscape.
- Foldables: Galaxy Z Flip cover 720×748 and open 1080×2640; Z Fold cover 904×2176 and open
  2208×1768; Pixel Fold open 2208×1840 — verified at their CSS sizes, both folded and
  unfolded, including the tall/narrow cover screens.
- iPad 768×1024 and 820×1180, tablet 1024×1366, desktop 1440 and 1920, PWA standalone.
- Pages covered: Music, Music uploads, Music profile, Recommendations, Playlists, Music
  dashboard, Agasthya Vision, Home menu, VR world.
- For each: no sideways scrolling, readable white text on the glass, loading states visible
  rather than blank, menus/hidden panels reachable, overlays not covering controls.

## 5. Report

A short status list at the end: what is fixed and verified, and anything that still needs your
own phone (microphone voice commands, native lock-screen playback), with the reason.

## Technical notes

- Suggestions: relocate the dropdown out of `.music-search-control`'s clipping context in
  `MusicPage.tsx`, keep `filterMusicSuggestions` as the single source of the five values.
- VR upload: state machine in `VRMusicUploadPanel.tsx` with `AbortController` + timeouts,
  calling the existing `uploadMyMusic`/`compactAudio` helpers unchanged.
- VR layout: default slot map + depth tokens in `ZoeOmegaPage.tsx`, clamping/reset and
  pointer-event handling in `VRDraggablePanel.tsx`, hub list changes in `VRControlsGuide.tsx`.
- Verification: existing Vitest music/VR suites, `tsgo` typecheck, build, and Playwright runs
  at each viewport above.
