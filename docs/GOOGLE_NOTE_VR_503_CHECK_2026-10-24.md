# Google sign-in explanation and controlled VR 503 verification

## Changes
- Added accessible explanatory text immediately below Continue with Google: “Mmora receives your name, email and profile photo—never your Google password. Google may send its own security notice.”
- Google handler, callback, credentials and requested parameters unchanged.
- Added three controlled map regression tests; no map loader or edge function changes warranted by the observed 503 behavior.

## Observed evidence
- `bunx vitest run src/test/osmSharedFallback.test.ts src/test/vrMapLoading.test.ts src/test/osmTrimShare.test.ts`: six passed, zero failed. Each response fixture is fresh (reusing consumed Response bodies initially caused a test-only timeout, corrected without changing production).
- New cases: shared-cache HTTP 503 resolves via Overpass without rejecting, skips shared reads/writes while its 60-second circuit is open, then reads the shared cache again; thrown network errors also fall through.
- Actual VR World opened at localhost `/__vr-harness`, selected New York using the visible city button, and landed using Land on my street. All backend function requests intercepted, websocket connections closed, all non-asset outside requests mocked/blocked; no paid functions or member writes sent.
- Initial nine concurrent shared reads returned the exact degraded-service 503 envelope. These already-started requests precede the cooldown; the cooldown does not cancel them.
- Two controlled Overpass answers (synthetic, clearly named street/building) populated twelve chunks. Loader: network=2, shared=0, failures=0, pending=0, retrying=0, sharedCacheDown=true. Street-level renderer: 26,360 triangles; visible avatar, building, road/lights, controls; zero page exceptions.
- With both shared cache and Overpass returning controlled 503s, at the sampled point eighteen Overpass attempts had occurred, three blocks were pending, no map blocks loaded, renderer had 1,852 triangles and controls/portal/sky/ground were visible; zero page exceptions. This is an empty map during retries, not a confirmed whole-screen blank.
- Google explanation independently element-screenshotted and legible. Whole-page auth captures briefly showed the existing global loading overlay; the element capture confirmed the note, not a completed Google account flow.
- Latest available preview build signal: build OK.

## Unverified / scope limits
- The localhost VR harness uses the actual world but bypasses sign-in. These are not authenticated Home→VR or production outage checks.
- No real Google selection/consent, real cloud outage, real map-service availability, physical phone/Safari/WebXR session, long-duration retry exhaustion or all-country map coverage tested.
- A previous preview telemetry record reports a failed module import. This is separate from the controlled osm-tile outage and was not reproduced here; no cause or fix claimed.
- Existing broader launch gates, isolated privacy tests and vendor/legal/certification evidence remain unchanged. These checks do not close the wider launch audit.