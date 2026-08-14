# Diagnose Agent Memory and restore Zoe replies

## Build
- Upgrade the gateway client with a combined health + authenticated probe and structured failure categories: CORS/preflight, unauthorized, unreachable, timeout, and gateway error.
- Show the browser Origin, requested URL, required request headers, exact browser-visible failure, and configured allowed origins in Settings after **Save & test**.
- Add one-click origin assistance: copy the exact YAML block and, where the browser supports local file access, select and update `tdai-gateway.yaml` without exposing API keys.
- Add a safe restart control that copies the exact Docker restart command and clearly reports that browsers cannot execute Docker directly; if the gateway exposes a restart endpoint, use it, otherwise do not pretend a restart occurred.
- Trace and fix the Zoe chat provider cascade causing the hardcoded “brief moment” response, then verify the active provider path and error handling.

## Technical details
- A web page cannot silently modify arbitrary Mac files or execute Docker commands. File System Access API support will provide the closest safe one-click YAML update; unsupported browsers get a copy-ready YAML patch.
- CORS failures intentionally hide response details from JavaScript, so diagnostics will distinguish them by comparing the unauthenticated health probe with the authenticated preflight-triggering probe and report the browser’s exact exception plus actionable headers/origin.
- Keep gateway credentials only in existing browser storage and never include them in diagnostics or logs.
