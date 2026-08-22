# VR World dock button opens the VR environment directly

Today the dock's VR World icon navigates to `/zoe-omega`, which lands on the Bi-Cameral Consciousness dashboard (screenshot 1). The immersive VR environment (screenshot 2) is not a separate page — it is a mode of that same page, reached by pressing the "VR" toggle and then entering immersive mode.

So the rewire is: make the dock button land on the same page already in VR mode.

## Changes

1. `src/pages/HomePage.tsx` — the `vr-world` dock item navigates to `/zoe-omega?vr=1` instead of `/zoe-omega`.
2. `src/pages/ZoeOmegaPage.tsx` — read the `vr` query param on mount. When `vr=1`, initialize `isVRMode = true` and `vrStasisActive = false`, so the page opens straight into the immersive Memory Palace / VR Test Suite view instead of the dashboard and the stasis placeholder.

Nothing else changes: the existing VR/EXIT toggle, stasis placeholder, audio gate, and the plain `/zoe-omega` route (no param) all behave exactly as they do now.

## Notes

Only the two initial state values are derived from the query param; the toggle keeps full control afterwards, and exiting VR stays on the page as before. No UI, styling, or component changes.
