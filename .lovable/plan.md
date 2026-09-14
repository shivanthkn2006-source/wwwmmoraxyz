# Refine MMora Music into black Liquid Glass

## Goal
Keep the Music page’s black foundation and current layout, but replace its flat blue-and-white treatment with translucent Apple-style glass matching the Home navigation and the supplied references.

## Visual changes
- Keep the black page background so the glass remains visible and readable.
- Give the main Music shell, search field, player panel, sidebars, result rows, and compact controls translucent white glass surfaces with backdrop blur.
- Add restrained white edge highlights and soft internal sheen rather than solid outlines or opaque panels.
- Keep text and icons white, using softer white opacity for secondary information.
- Replace solid-blue selected tabs, play/search buttons, progress fills, reaction states, and current-track highlights with translucent white glass states.
- Retain blue only as a very subtle enabled-status tint where necessary; it will no longer dominate the page.
- Keep the existing compact structure, content, controls, search behavior, queue, library, reactions, and page wiring unchanged.

## Responsive and interaction checks
- Verify the glass remains legible and unclipped on phone, tablet, and desktop sizes.
- Check selected, hover, focus, disabled, and currently-playing states for consistent translucent styling.
- Confirm search, play/pause, previous/next, sliders, tabs, result selection, and queue controls still work.
- Confirm no horizontal overflow, bottom strip, opaque inherited button fill, or control overlap appears.

## Technical scope
- Update only the Music page’s scoped semantic styling and, if required, its Music-specific class assignments.
- Reuse the Home navigation’s translucent white treatment as the visual reference.
- Preserve reduced-motion behavior and accessible focus visibility.
- Run focused Music tests, check the preview health, and visually inspect signed-in phone and desktop screenshots before completion.
