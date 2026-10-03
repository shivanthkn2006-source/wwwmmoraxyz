# Fix the blank white preview on phone

## What I found
- In a phone-sized test browser, signed in as you, the preview loads. It shows Home, the sign-in page, and the permissions window.
- Your preview was open on the address `/index`, which isn't a real page in the app. It shows "Page not found" instead of Home.
- The app's own first screen is dark, never white. A fully white screen with the blue bar stuck halfway means the page itself never arrived in your phone's browser. The app didn't load and then crash.
- In the preview, the app loads about 270 separate files before anything appears. That takes about 3 seconds on a fast connection and can take much longer on mobile data, which explains the long wait. Your published site loads as a few bundled files and is much faster.

## Changes
1. **Send `/index` to Home.** Opening `/index` (or `/index.html`) goes straight to Home instead of "Page not found". Signed-out visitors are sent to sign-in as usual.
2. **Never show plain white while loading.** Paint the app's dark background and the circling symbols at a slow 24-second turn from the very first moment the page arrives, before anything else loads. If the page does arrive, you'll see the symbols. If it's still white, the preview itself isn't reaching your phone, which is outside the app.
3. **Startup failure note.** If loading stalls for more than 20 seconds, the startup screen shows a short "Still loading — tap to retry" button. The app's existing startup-error screen stays as it is.
4. **Check after building.** Reload `/index`, `/home` and `/auth` in a phone-sized browser, signed in and signed out. Confirm there's no white frame, the symbols show, and `/index` lands on Home.

## Technical details
- Add a `/index` and `/index.html` redirect to `/home` in the router, before the catch-all 404.
- Set an inline dark background on the page's opening tags in index.html. Put a small inline circle of symbols inside the startup screen, with its own 24-second animation that the battery-saving and reduce-motion rules can't speed up.
- Add a 20-second retry timer in the existing inline startup script. It's cleared when the app reports it has started.

## If it's still white afterwards
Your phone isn't receiving the preview page at all. Try the published site (mmora.xyz) on the same phone, or open the preview in a normal Chrome tab. If those work, the issue is with the preview connection, not your app.
