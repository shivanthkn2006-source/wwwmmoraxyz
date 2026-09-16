# Home menu fit and global mini-player placement

## Goal
Keep the existing Home-menu appearance and every existing destination, while ensuring labels appear only within the open panel, all seven icons fit each row on every supported screen, the Music mini-player stays off the Music page, and the Music-page headphones symbol no longer touches the search bar.

## Changes
- Make the open Home panel size itself from the available viewport width and safe areas, with a fixed seven-column grid that proportionally reduces icon, gap, and panel spacing on narrow phones, foldables, tablets, PWA, and desktop.
- Keep every menu name contained inside the panel by replacing browser/hover labels that can escape above, below, or beside the panel with an internal label layer; retain accessible names for screen readers.
- Preserve all current menu items and their existing navigation callbacks, and add coverage confirming key icons still open their intended pages.
- Hide the draggable compact Music player only on `/music`; retain it through the shared platform layer on all other authenticated pages, including VR routes.
- Move only the Music-page Zoe Audio/headphones shortcut slightly upward so it clears the search bar; do not change its icon, destination, or function.

## Verification
- Add focused Home-menu checks for seven items per row, panel containment, and label containment at narrow foldable, phone/PWA, iPad/tablet, desktop, and short landscape sizes.
- Verify the Music mini-player is absent on `/music`, present after playback on another platform route and a VR route, and retains working playback controls.
- Check the headphones shortcut/search-bar separation and inspect fresh responsive screenshots.
- Confirm the preview build and runtime logs remain clean.
