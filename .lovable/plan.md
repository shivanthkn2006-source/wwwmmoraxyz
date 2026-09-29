# Direct Google sign-in repair

## Goal
Use the Google Client ID and Secret already saved in the backend, remove the built-in Lovable sign-in helper from the Google button, and make sign-in use a full-page redirect that Safari and installed apps allow.

## Changes
- Replace the current popup-style managed Google call with the backend auth provider's direct Google OAuth redirect.
- Return Google to the public `/auth` page, then let the existing authenticated session send the member to Home.
- Preserve the requested destination safely during the redirect.
- Keep OAuth callback paths out of offline/PWA navigation caching.
- Update the architecture rule to document direct Google OAuth with project-owned credentials.

## Validation
- Confirm the Google button starts a top-level redirect rather than opening a blocked popup.
- Inspect the generated authorization URL for the correct provider, callback, and current domain without exposing credentials.
- Verify `/auth` handles the returned session and redirects to Home.
- Check the preview build, browser console, network failures, and Safari-sized rendering.

## Limitation
The final Google account selection and consent cannot be completed automatically unless an interactive Google account session is available. If Google rejects the saved Client ID or callback URL, the exact Google configuration error will be reported.
