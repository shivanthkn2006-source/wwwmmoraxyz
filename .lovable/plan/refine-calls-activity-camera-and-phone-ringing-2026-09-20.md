# Refine Calls activity, camera, and phone ringing

## What will change
- Keep the work limited to Calls, its shared activity picker, and incoming-call notifications.
- Add a custom activity message option that saves per user, appears beside a plain activity icon, updates live for other callers, and remains available to Zoe context.
- Make the activity menu fully transparent and white-only, removing the grey surface.
- Move the default self-video to a small top-left window beneath the participant name and keep it draggable.
- Hide the global Camera ON / Mic ON banner only while a Calls screen is active; browser privacy indicators remain unaffected.
- Rename and move the idle Calls heading to the top-left as “Zoe Calls”.
- Expose camera flip in the in-call controls on phones, tablets, and supported multi-camera devices, using the existing front/back camera path.
- Validate the sleeping-phone push chain and report physical-device wake testing honestly; it cannot be claimed without an enrolled phone.

## Data and wiring
- Store the selected predefined activity separately from an optional short custom message, because the current online-presence field only accepts online, away, or offline.
- Keep updates owner-only and visible through the existing profile privacy rules.
- Continue polling as a fallback when live updates are delayed.

## Verification
- Test custom activity save, validation, rollback, and live rendering.
- Test the hidden Calls-only media banner, top-left self-view, Zoe Calls heading, camera-flip control, and transparent picker.
- Preview Calls at phone, tablet, and desktop sizes with simulated cameras.
- Test the notification function and service-worker payload; mark real sleeping-device wake as blocked unless a physical subscribed phone is available.
