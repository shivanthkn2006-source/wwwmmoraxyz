# Make the main M’Mora Profile transparent and white-only

## Goal
Restyle the existing main Profile page shown in the supplied screenshots—not the Music taste page—so it matches the edge-to-edge transparency and white typography of Music and Calls.

## Visual changes
- Keep the profile photo and every existing section, word, control, icon, order, size, and action unchanged.
- Make the Profile page edge-to-edge transparent, removing grey, black, purple, colored, and opaque section fills.
- Use white-only text, icons, borders, active states, fields, tabs, cards, dialogs, and buttons, with white opacity for hierarchy.
- Scope the treatment to the main Profile page so no shared component changes visually elsewhere.

## Wiring audit
- Trace and document how birth date, birth time, birth place, faith, city/location, identity, interests, and activity data are stored and read.
- Record the concrete personalization strengths connecting Profile data to Zoe, planetary context, Music recommendations, location-aware context, long-term memory, and relationship learning.
- Record real gaps or drift risks without changing profile content or functionality in this visual task.

## Verification
- Add focused checks for edge-to-edge transparency and white-only presentation while preserving Profile content and controls.
- Verify Profile loading, edit access, tabs, planner, reminders, calendar, faith controls, settings, and navigation remain present and usable.
- Inspect signed-in phone, tablet, and desktop previews for overflow, clipping, colored remnants, opaque panels, or unreadable text.
- Deliver a concise integration and QA audit report with verified strengths, gaps, and test results.

## Technical scope
- Change only the main Profile page’s scoped wrapper styling and focused tests.
- Do not alter Music Profile, Profile data, child component behavior, database logic, Zoe behavior, or unrelated pages.
