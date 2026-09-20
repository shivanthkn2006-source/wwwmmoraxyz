# Home panel search and real call audio

## Goal
Use the Home panel’s empty bottom space for a minimal icon search, keep every menu name inside its existing tile, make Zoe audible to everyone in a group call, and complete supported background incoming-call ringing without changing unrelated design.

## Changes
- Add a borderless search input inside the open Home panel’s bottom row: cursor at the left, small search symbol near the right, and the existing Home trigger at the far right.
- Filter all real Home destinations by their visible names while preserving existing navigation, ordering, badges, and icon/tile sizes. Show each real destination name beneath its symbol inside the same tile; do not label filler slots.
- Connect group-call Zoe responses to the existing Deepgram-only voice pipeline and distribute the resulting call-safe voice output to participants through the group call’s existing peer connections.
- Harden incoming-call background notifications using the existing protected push service and published-app worker path; add native wake/ring support only where the current mobile project can securely receive it.

## Verification
- Add focused tests for search filtering, label containment, navigation, and unchanged tile sizing.
- Verify the open panel at phone/PWA, tablet, and desktop sizes against the supplied screenshots.
- Test group-call Zoe audio signalling/playback and background-ring registration paths without substituting browser speech.
- Run type checks and focused tests, then inspect the preview and current error logs.

## Device limitation
A real sleeping-phone wake can only be confirmed on the published app after that physical phone grants notification permission. Implementation and automated checks can be completed here; the final wake confirmation requires the user’s device.

## Technical details
- Keep the seven-column icon grid and current CSS size variables.
- Keep Deepgram as Zoe’s only voice source and respect the one-voice-at-a-time audio lock.
- Do not introduce simulated device results, a second call engine, or unrelated page changes.
