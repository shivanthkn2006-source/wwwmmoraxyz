# Make Google sign-in match the addresses you saved

## What's actually wrong
Your Google settings are correct. The app is the part that doesn't match.
- You saved `https://mmora.xyz/~oauth/callback` and `https://www.mmora.xyz/~oauth/callback`. Those are the addresses your backend's Google settings tell you to use.
- My earlier change made the app send Google a different address, the backend's own callback. That address isn't on your list, so Google blocks it with "redirect_uri_mismatch".

## Fix (app change only, nothing more for you to do in Google)
1. Point the "Continue with Google" button at the sign-in path your backend settings expect, the one that returns through `/~oauth/callback` on mmora.xyz. It still uses your own Google Client ID and secret, and the sign-in page shows your mmora.xyz domain.
2. Keep what already works: after sign-in you come back to /auth and land on Home, and any error shows a clear message instead of a Google error page.
3. Make sure the app's offline cache never intercepts `/~oauth` pages, so the return from Google always completes.
4. Update the project notes to describe this sign-in path.

## Verify
- Live-check that Google accepts the address and shows the account picker, with no "Access blocked".
- Then you pick your account on mmora.xyz and confirm you land on Home.

## Technical details
- Switch `handleGoogleLogin` in AuthPage.tsx to `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth", extraParams: { prompt: "select_account" } })`, and handle `error` and `redirected`.
- Keep the stored return path `mmora_oauth_return_to`.
- Confirm `/~oauth` is in the service worker's navigation denylist.
- Google provider stays on BYOK credentials. Don't call configure_social_auth, because it would switch the provider to managed credentials.
