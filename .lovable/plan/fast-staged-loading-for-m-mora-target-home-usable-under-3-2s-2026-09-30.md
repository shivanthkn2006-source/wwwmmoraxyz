# Fast staged loading for M'Mora (target: Home usable under 3.2s)

## What the deep audit found (measured on a real production build)

Every visitor downloads about **6.9 MB of code (2.0 MB compressed) before the first screen**, even on the sign-in page. The page list itself is already loaded one-by-one, so pages are not the issue. The weight comes from these pieces being pulled in up front:

| Piece forced into startup | Size | Needed at startup? |
|---|---|---|
| 3D engine (VR, globe, orb effects) | 2.6 MB | No |
| Zoe Infinity bundle (separate project) | 2.2 MB | No, never for M'Mora |
| PDF maker | 0.6 MB | No (only reports download) |
| Charts | 0.4 MB | No (only insights pages) |
| Core app + sign-in + libraries | ~1.1 MB | Yes |

Why: the build rules glue ~25 shared helpers (language, nickname, voice) into the Zoe Infinity bundle, so anything that uses one small helper drags the whole 2.2 MB in. The same happens with 3D, PDF and charts through ~30 always-on background helpers mounted at the very top of the app (monitors, sentinels, voice hosts, tracker, self-healers), which all start on every page including /auth.

Why errors "keep coming back": those same always-on helpers fire backend calls immediately at sign-in/sign-out, before the new login is settled. Each one that isn't guarded produces a fresh 401 banner. We've patched them one at a time; the root fix is to not start them until sign-in has finished.

Rough comparison (mid phone, 4G, first visit): Instagram/Facebook web ~2–3s to usable, X ~2.5s. M'Mora today is likely 6–10s. After this plan: ~1.5–2.5s for sign-in, Home cards within ~3s.

## Staged loading (applied everywhere)

```text
Stage 1  /auth           core + sign-in only          (~350 KB compressed)
Stage 2  after sign-in   Home shell + feed/DHF cards  (loaded instantly)
Stage 3  motivation overlay shows; behind it, Zoe orb + voice hosts load
Stage 4  idle (after ~1 min / overlay dismissed): notifications, camera, device scan, monitors
Stage 5  on click only:  VR, globe, charts, PDF, music, admin, Zoe Infinity
```

## Steps (one at a time, each verified by build size + timed browser load)

1. Build rules: stop gluing shared helpers into the Zoe Infinity bundle; stop forcing 3D/PDF/charts as startup pieces. Check the startup download drops below ~500 KB compressed.
2. App top level: move the ~30 background helpers behind one "after sign-in, when idle" loader (Stage 3/4). Nothing starts on /auth.
3. Any remaining direct uses of 3D/PDF/charts in shared code become load-on-click.
4. Home: render the shell and first cards first; defer lower cards, images and Zoe until after the first paint.
5. Measure with a timed browser run: /auth, sign-in → Home, overlay, and report real seconds vs the 3.2s target.
6. Health report: provider status (Deepgram, NVIDIA, SerpAPI, SiliconFlow/Zhipu, Google Vision quota, image cascade), open security findings, and test results, delivered in chat + a downloadable report.

No visual or feature changes: orb, voice, cards, profile editing all stay the same — they just arrive in order.

## Technical details
- `vite.config.ts` manualChunks: remove hook entries from the `zoe-infinity-sovereign` group; drop forced vendor grouping for three/pdf/recharts so Rollup keeps them in lazy chunks; add no `modulepreload` for them.
- `src/App.tsx`: convert static imports of hosts/providers (MoraZoeGlobalHost, HumorAnnouncementHost, ZoeDeviceScanHost, ZoeVisionJournalHost, security shells, phantom, harvest, self-healers, monitors, GenesisCinematicIntro, etc.) to `lazy()` inside a `PostAuthIdleHost` gated on `user && authHydrated` + `requestIdleCallback`. Providers whose context is required by pages keep a thin static provider.
- Verify with `index.html` preload list and gzip totals; Playwright timings with the injected session.
