# Make the Music profile edge-to-edge transparent

## Goal
Keep every Music profile section, word, control, and action unchanged while making the whole page edge-to-edge transparent with white-only text, icons, fields, and states.

## Visual changes
- Apply the existing Music page’s transparent surface from edge to edge on `/music/profile`.
- Remove any inherited colored, grey, or opaque fills from the artist field, chips, buttons, notices, favourites, and planetary section.
- Keep all typography and icons white, using white opacity only for secondary text.
- Preserve current spacing, section order, control sizes, page content, and interactions.

## Wiring audit
- Trace and document how profile birth date, birth time, birth place, faith, city/location, listening taste, and favourites are stored and consumed.
- Record concrete strengths in the current Zoe relationship path: saved profile identity, persistent memory, location-aware context, planetary context, faith-aware suggestions, and learned listening signals.
- Identify genuine gaps without inventing integrations or changing unrelated profile behavior.

## Verification
- Add focused checks that the Music profile remains edge-to-edge, transparent, white-only, and fully interactive.
- Verify load, faith/genre/mood selection, artist entry, favourites, save state, planetary refresh, and back navigation.
- Inspect signed-in phone, tablet, and desktop previews for overflow, clipping, colored remnants, and opaque panels.
- Deliver a concise integration and QA audit report with verified strengths, gaps, and test results.

## Technical scope
- Change only Music-profile-specific presentation code and focused tests.
- Do not redesign or alter the main Profile page, shared components, database behavior, recommendation logic, Zoe behavior, or other Music pages.
