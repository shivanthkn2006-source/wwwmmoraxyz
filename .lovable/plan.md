# Unify the Music page into one transparent surface

## Goal
Make the entire Music page one clean, edge-to-edge transparent layer with no grey fill, panel shading, divider edges, or separate-looking genre, player, and results blocks.

## Layout changes
- Keep the three functional areas on larger screens, but remove their individual backgrounds, borders, shadows, and blur layers so they read as one continuous page.
- Place Genres at the left, the search/player area in the center, and Results/Library/Community at the right on one shared aligned content row below the MMora music label.
- Move the results tabs and their text down to align with the search bar rather than the headphones/logo line.
- Preserve responsive stacking on phones and tablets without overflow.
- On the Music page, anchor the compact draggable player immediately after the final “c” in “MMora music”; retain its draggable behavior elsewhere.

## Verification
- Check phone, tablet, and desktop layouts for one continuous transparent surface, correct alignment, no grey blocks, and no overlap between the mini player and title.
- Confirm search, tabs, playback controls, and dragging still work.
