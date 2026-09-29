# Fix Google "403 That's an error" screen

## What is happening
- The Google button no longer uses Lovable's Google plugin. It already sends you straight to Google with your own backend Google settings.
- The 403 screen appears because you tapped it inside the Lovable editor preview (address bar shows lovable.dev/projects/...). The preview runs the app inside a frame, and Google refuses to show its sign-in page inside a frame. That is the 403.
- Separately, the Client ID saved in your backend is still incomplete (too short), so even outside the editor Google will reject it until the full ID ending `.apps.googleusercontent.com` and its secret are saved.

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
