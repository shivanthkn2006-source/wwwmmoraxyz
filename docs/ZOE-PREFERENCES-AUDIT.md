# Zoe: tastes, allergies, search, resume and 3D — audit

Date: 2026-09-11 · Scope: preference memory, mute/wake discipline, visible Home
search, silent resume, 3D asset status, menu coverage.

## 1. Getting to know the person (likes, dislikes, allergies)

**Working.** Zoe does not interrogate anyone on arrival.

- `src/services/zoePreferenceProbe.ts` — one small question, and only once the
  conversation is already running (turn 3 onward), at most once per
  conversation and once per 20 hours. It never asks about something already
  stored, and never stacks a question onto a reply that already ends in one.
  Order of topics: allergies first, then food likes/dislikes, music, work,
  where they live, weekends.
- The answer to that question is captured explicitly on the next turn
  (`capturePreferenceAnswer`) because a bare "eggs" has no pattern to match.
- Wired into the canonical path `src/services/zoeEngine.ts`, so it applies to
  typed **and** spoken conversation equally.
- `supabase/functions/zoe-life-context/index.ts` now also recognises
  "allergic to X", "I have an egg allergy", "my allergies are X", "I can't eat
  X", vegan/vegetarian/diabetic, "my favourite drink is X", and accepts
  explicit facts from the probe. Facts are owner-scoped and mirrored to DHF.
- `supabase/functions/_shared/life-profile.ts` folds those facts into every
  Zoe reply, health facts first, marked non-negotiable. She uses one detail in
  passing; she never recites the list or says "according to my records".

So "Asha is allergic to egg" said once is remembered, and from the next sign-in
Zoe steers around eggs on her own.

Tests: 5/5 (`src/services/__tests__/zoePreferenceProbe.test.ts`).

## 2. Mute and wake discipline

**Working.** `src/features/zoe-handsfree/muteGate.ts` sits in front of recall,
the backend and speech. While muted, every transcript is dropped — questions,
commands, even "hey Zoe". Only the exact phrase **"Zoe wake"** (or "wake up
Zoe") lifts it. Tests: 5/5.

## 3. Home search you can see

**Working.** A spoken "Zoe, search for X" now resolves to a `search` intent and
opens the same Home search bar the member uses, with the words filled in and
the results rendered on screen — she does not answer invisibly.
`ZoeSearchModal` no longer uses the browser's built-in voice; it speaks through
Deepgram like everywhere else.

## 4. Resume and 3D

- Resume: spoken request builds the PDF in memory from real profile fields and
  remembered facts and downloads silently — nothing is invented for blanks.
- 3D: `zoe_asset_jobs` (owner-scoped) plus `zoe-asset-job`. Real generation runs
  only when a Meshy key is configured; without one the job is honestly closed as
  **unavailable** rather than faked. `ZoeAssetStatusCard` shows the true state.

## 5. Menus Zoe can answer about

The site map registry groups every canonical route into Start, Daily, Create,
Connect, Zoe, Growth, Vault, Settings and Admin, each with a plain-language
purpose. Zoe reads the same registry for page awareness, so her description of
a page and the `/map` page cannot drift apart.

## 6. Checks run

- Typecheck: clean.
- New tests: 23/23 passing.
- Build: OK.
- Preview crawl: `/map` and `/help` render fully; `/home` and `/zoe-audio`
  correctly redirect a signed-out visitor to sign-in.
- The ~330 React ref warnings are Lovable's development preview tooling, not
  app components, and do not appear in the published build.

## 7. Not verified — needs you

Signing in as the admin account is not possible from here, so the following were
built and typechecked but **not** exercised end to end:

- resume download and 3D status card inside the admin Orb chat
- a live spoken conversation over AirPods / Bluetooth
- native phone lock-screen listening
- real 3D generation (no Meshy key configured)

Sign in on the preview once and these can be walked through for real.
