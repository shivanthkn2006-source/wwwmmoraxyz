# Next: search and visit other cities from VR World

Streets and buildings now load. This is stage 1 of the order suggested earlier.

## What you'll get
- The top-left search in VR World gets a "Cities and places" section. Type "Kochi", "Times Square" or "California" and pick a result.
- VR World then jumps you there: your starting spot moves to that place, its streets and buildings load (your own block first), and you land just above the rooftops as you do now.
- A "Back to my location" result takes you home again.
- Nothing else changes: look, controls and layout stay the same.

## Technical details
- Use the free OpenStreetMap place search (Nominatim), called from the member's phone. Wait 400 ms after the last keystroke, require at least 3 letters, show at most 5 results, and send a clear app name with each request.
- Add a `cities` source in `src/worlds/search/worldSearch.ts`, results of kind `city`.
- Choosing one calls `chooseStartCity()` in `worldMode.ts`, which resets the origin. The loaded map blocks are dropped and reload around the new spot. "Back to my location" calls `resolveOrigin()` again.
- Tests: debounce, result mapping and the origin reset.
