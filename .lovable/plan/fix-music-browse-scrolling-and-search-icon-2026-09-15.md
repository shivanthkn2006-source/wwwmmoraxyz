# Fix Music browse scrolling and search icon

## Changes
- Make the Genres, Radio, Artists, and Playlists column an independent vertical scroller on desktop, PWA, iPad, tablet, and mobile layouts.
- Preserve the existing independent Results/Library/Community scrolling and all Music page styling.
- Remove the visible search placeholder text while retaining the accessible search label and search icon.

## Verification
- Check touch and mouse-wheel scrolling at phone, tablet, PWA-sized, and desktop viewports.
- Confirm both side columns scroll independently without moving the player area or causing horizontal overflow.
- Confirm the search control shows only the search symbol and still submits searches.
