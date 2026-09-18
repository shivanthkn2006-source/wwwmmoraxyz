# Zoe DHF card image and layout repair

## Goal
Make every newly generated Zoe DHF card use an image that directly represents its category, headline, summary, practical action, and current astrological context; present that image as a vivid oil painting with discreet M'Mora / Zoe branding and no visible provider mark.

## What will change
- Keep the existing ten-slot schedule, DHF text generation, feed ordering, narration, sharing, reporting, essays, and time-based reveal logic unchanged.
- Replace the headline-only image instruction with a structured scene brief built from the exact card category, headline, short summary, story action, and astrological context.
- Add strict visual constraints: full-colour oil painting, one clear focal scene, concrete objects/actions from the card, no monochrome result, no embedded prose, no provider logo or watermark.
- Persist an image prompt fingerprint/version with each card so generation is auditable, repeatable, and mismatches can be identified without regenerating the card text.
- Keep durable private image storage, bounded attempts, and fallback delivery; improve image validation and diagnostics without blocking card availability.
- Cover any provider corner mark with a deterministic lower-right M'Mora / Zoe brand mark in the card image frame, while retaining `nologo=true` for future images.
- Recompose only the DHF card presentation: edge-to-edge image on one side, category/time/headline on the other, summary and story below. It will compact cleanly on phones, foldables, tablets, iPads, desktop, and PWA without changing surrounding feed design.

## Reliability and verification
- Add regression tests proving the image brief contains the exact headline, card meaning, action, colour/oil-painting direction, and branding/watermark rules.
- Add responsive card tests for image/headline pairing, branding, missing-image fallback, controls, and expanded story.
- Verify the live preview at phone, foldable, tablet/iPad, and desktop widths; check clipping, overflow, legibility, image loading, and existing controls.
- Run focused tests and confirm the preview build is clean.

## Technical boundaries
- No rewrite of Zoe/DHF orchestration, astrology calculations, schedules, feed composition, navigation, or existing actions.
- Existing historical cards remain readable. New cards use the precise image contract; old cards can adopt the new layout immediately without destructive data changes.
