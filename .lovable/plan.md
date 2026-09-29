# Fix Google "403 That's an error" screen

## What is happening
- The Google button no longer uses Lovable's Google plugin. It goes straight to Google using the Google key saved in your backend.
- The 403 also shows up on mmora.xyz, so the main cause is that key. It is incomplete: only 20 characters, not a full Web Application ID. Google rejects unknown IDs with this bare "403, that's all we know" page.
- Inside the Lovable editor preview there is a second problem. Google also refuses to open inside a frame.

## Fix order
1. Done: your Client ID and Secret are saved in the backend Google sign-in settings.
2. You confirm these settings in Google Cloud:
   - JavaScript origins include https://mmora.xyz, https://www.mmora.xyz, https://myzoe.xyz and https://www.myzoe.xyz.
   - The redirect URI matches the callback address shown in your backend Google settings.
3. I apply the code changes below and test on mmora.xyz.

## Changes
1. On the sign-in page, detect when the app is running inside a frame (editor preview). In that case open Google sign-in in a new tab/window instead of inside the frame, so Google's page loads normally.
2. Outside a frame (mmora.xyz, myzoe.xyz, installed app, Safari), keep the current full-page direct redirect with no Lovable helper.
3. If Google returns an error (for example invalid client), show a clear message on the sign-in page instead of a blank or Google error page.

## What you need to provide
- Your complete Google Web Application Client ID and Client Secret, saved in the backend Google sign-in settings (or send them and I will open a secure form to save them).

## Validation
- Confirm the button opens a new tab when inside the preview and redirects full-page on the published site.
- Once the real Client ID is saved, test the Google redirect URL on the published domain.

## Technical details
- `src/pages/AuthPage.tsx`: call `supabase.auth.signInWithOAuth` with `skipBrowserRedirect: true` when `window.self !== window.top`, then `window.open(data.url, '_blank')`; otherwise keep default redirect to `${origin}/auth`.
- Read `error`/`error_description` from the `/auth` URL on return and show a toast.
