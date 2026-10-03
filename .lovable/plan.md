# Why mmora.xyz and the preview show a white screen on your Android phone

## What the evidence shows

**Your live site is up and serving the current version.**
- mmora.xyz, www.mmora.xyz, myzoe.xyz and wwwmmoraxyz.lovable.app all answer within half a second and send the same latest version.
- In phone-sized test browsers (Android Chrome and iPhone Safari), signed in and signed out, mmora.xyz opens the sign-in page and Home within 2–3 seconds.

**Your own Android phone is the one failing.**
- Your app's visit log identifies your phone by its graphics chip and screen size.
- In the last 3 hours, it has recorded no successful visit to mmora.xyz from that phone. The app never got far enough to log one.
- The only visits from that phone are to the editor preview, and they took about 25 seconds to load.
- The startup monitor sent two reports from that phone, at 12:11 and 12:47 UTC: "App did not mount within 30 seconds".
- Your iPhone did open mmora.xyz today (10:23 and 12:25 UTC), but slowly: 2 seconds and then 18 seconds.

**About the 2:32 change.** That request (VR World loading) only changed how VR World loads its distant areas. It didn't touch the startup files that every page uses. The white screen is very unlikely to come from that change itself. It most likely shows up because each new publish forces your phone to download the whole app again (see cause 1).

## The most likely causes (in order)

1. **The app's offline copy is far too big.** Each time you publish, your phone is told to download and store 638 files, including VR World, the music player, admin pages and 3D models, before the new version can run. On mobile data the old copy is swapped out while the new one is only half downloaded, so the page has nothing to show. This fits "it was fine, then after an update it went white" and only some devices being affected.
2. **Two outside font files block the very first paint.** The page waits for Google Fonts to download before it draws anything, even the dark loading screen. On a slow or filtered mobile network, the browser shows plain white with its loading bar stuck halfway. That's exactly what your screenshot shows.
3. **A broken leftover file.** The live page asks for a file named `main-….tsx`, which the server sends as the wrong type. The browser rejects it on every load. It's harmless but wasted work, and it shows up as an error every time.

Not yet confirmed on your actual phone: which of causes 1 or 2 is doing it on your network. Step 4 below makes the next white screen report itself so this is no longer a guess.

## Fixes

1. **Make the offline copy small and safe.**
   - Store only the startup essentials offline, not all 638 files.
   - Pages like VR World and Music download only when you open them.
   - Always fetch the newest page first when online, and fall back to the saved copy only when offline.
2. **Self-repair on a stuck start.** If the app hasn't started after about 12 seconds, the loading screen throws away the saved offline copy and reloads once by itself. A "Still loading — tap to retry" button stays as a backup.
3. **Draw the dark loading screen before anything else.** Put the dark background and circling dots at the very top of the page. Fonts load in the background and never block the first paint. Remove the broken leftover file request.
4. **Startup tracking from your phone.** The loading screen sends small notes to your admin error log: page arrived, styles loaded, app code loaded, app started. The next time a phone stalls, the log shows the exact step where it stopped and on which address.
5. **Verify.** In phone-sized test browsers, check mmora.xyz-style builds with slow mobile data simulated and Google Fonts blocked. Confirm the dark screen appears immediately and the app opens. Confirm an old offline copy is replaced cleanly after a new version.

After this ships you need to **publish once**. On your Android phone, open mmora.xyz in Chrome. If it's still white, clear the site's stored data once (Chrome menu, Site settings, mmora.xyz, Clear and reset), or remove and re-add the home-screen app. From then on the self-repair handles it.

## Technical details
- `vite.config.ts` VitePWA: narrow `globPatterns` to `index.html`, entry and vendor chunks, CSS, icons and offline.html. Drop the `**/*.js` precache. Add a NetworkFirst navigation route (3s timeout) and StaleWhileRevalidate for `/assets/*.js` at runtime. Keep `push-handler.js` and `cleanupOutdatedCaches`.
- `index.html`: move `#__startup_shell__` styles and the inline dark background into `<head>` before any `<link rel=stylesheet>`. Load the Google Fonts as `rel=preload as=style` with an onload swap to stylesheet, plus a `<noscript>` fallback in `<head>`. Remove `<link rel="modulepreload" href="/src/main.tsx">` and the `/src/index.css` preload.
- Boot script: a 12s stall handler that runs once per session. It unregisters service workers and deletes caches, then calls `location.reload()`, guarded by a sessionStorage flag. Stage beacons go to the existing `log-platform-error` function with `source: 'boot_stage'`, sent only when the boot stalls or fails, to avoid noise.
- No change to the VR World work, page designs, or any member-facing feature.
