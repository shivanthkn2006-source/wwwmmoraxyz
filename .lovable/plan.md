# Place the member photo behind the connected Profile summary

## Goal
Keep the connected Home Profile panel’s current monochrome Liquid Glass design and all existing controls unchanged. Display the signed-in member’s real profile photo as the visual background behind the top profile area.

## Visual scope
- Start the photo directly below the divider under “Profile.”
- Extend the photo through the bottom edge of the rounded username, Posts, Friends, Tagged, status, and action-controls box.
- Keep that information box over the photo as frosted translucent glass with white borders, white text, and white icons.
- Preserve the existing photo crop behavior so it fills the available area without stretching.
- Use the existing saved profile-photo source, including the existing avatar fallback when the primary photo field is empty.
- Do not add the uploaded screenshot to the app; it is only the layout reference.

## Preserve exactly
- Keep every current profile component, icon, symbol, control, menu, section, action, data connection, and ordering.
- Do not change Profile functions, profile data, the Home avatar, or unrelated pages.
- Keep the profile panel’s remaining content in the established September 14 white-only Liquid Glass treatment: translucent surfaces, restrained white highlights, and no blue or opaque panels.

## Verification
- Open the connected profile from Home’s top-right profile photo using the signed-in account.
- Confirm the real member photo is visible from beneath the Profile header through the summary box, with the glass box visibly floating over it.
- Check that settings, logout, status, bio, edit, symbols, stats, and all existing profile controls remain visible and clickable.
- Visually verify phone, tablet, and desktop layouts for correct crop, readable white text, no covering layer, no overflow, and no hidden controls.
- Run the focused profile presentation checks and confirm the latest app health signal before completion.

## Technical details
- Limit implementation to the connected Profile photo region and narrowly scoped Profile presentation styles.
- Preserve the current `profile_photo_url || avatar_url` fallback and correct the profile viewer to use the same resolved image source if required.
- Add a stable marker for the summary glass only if needed for precise styling and regression checks.
