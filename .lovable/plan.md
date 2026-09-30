# Fix growth session 401

## What will change
- Harden the shared growth request helper so sign-out, token refresh, and account-switch races resolve as a quiet signed-out result.
- Make authenticated growth actions return a non-crashing signed-out response when credentials are absent or rejected, while still performing no protected work.
- Update every growth caller to recognize that signed-out result rather than treating it as a failed engine run.
- Add focused regression checks for missing, stale, and refreshed sessions.

## Validation
- Run the focused growth/session checks.
- Confirm the project compiles cleanly and Home remains rendered when the session changes during a growth request.
