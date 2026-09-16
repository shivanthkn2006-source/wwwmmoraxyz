# Compact Music player and lock the Liquid Glass surface

## Goal
Keep every existing Music icon, control, and behavior, while removing only the large player rectangle, reducing the player area to roughly half its current height, and making the search/current-song area fit every screen without clipping.

## Music-only changes
- Remove the progress/player panel’s rectangle background, edge, shadow, and blur so only its existing controls, sliders, times, and symbols remain visible.
- Compact the transport area to about half its current height through smaller spacing and responsive control dimensions; retain the same icons and functions.
- Constrain the current artwork/title group to the available width. Long song, artist, album, and credit text will truncate or wrap within the column and never push or hide the player.
- Make the search row use the viewport’s available width with a shrinking input and fixed icon, preventing horizontal clipping on narrow phones and installed-app safe areas.
- Keep all changes scoped to the Music page; no other page or shared visual component will be restyled.

## Glass calibration
- Measure representative unobstructed regions in the supplied reference screenshots and compare them with matching regions from the rendered Music page.
- Tune the Music-only semantic glass tokens for the warm background, translucent white film, edge highlight, saturation, and blur until the rendered color distribution and contrast closely match the references without producing a flat grey layer.
- Because a flattened screenshot does not contain its original CSS or separate foreground/background layers, document the calibrated RGBA/opacity/blur values as measured visual equivalents rather than claiming inaccessible source values or mathematical pixel identity across different scenes.

## Automated checks
- Add a dedicated Music visual regression test at phone/PWA, iPad, and desktop viewports.
- Assert edge-to-edge coverage, no horizontal overflow, search and title containment, transparent player-panel styling, and stable control bounds.
- Capture deterministic Music surface screenshots and compare them with committed viewport baselines using Playwright pixel-diff thresholds; mask dynamic track/time/result content so real data does not create false failures.
- Add color/contrast sampling assertions for the glass surface so a future black or neutral-grey regression fails even when geometry remains unchanged.

## Verification
- Run focused Music tests and the new visual suite.
- Inspect fresh desktop, iPad, and phone/PWA screenshots for glass consistency, readable white controls, unclipped titles, and a compact borderless player.
- Check current build and runtime diagnostics before completion.
