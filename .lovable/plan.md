# Personal Growth Engine — isolated habit & content pipeline

## What this is, and why it helps at day one

Today a brand-new M'Mora account is empty: no posts, no loops, no signal for Zoe/DHF to
personalise from. The proposal fixes exactly that cold-start problem. Instead of guessing
a user's psychology from a birth chart, it **asks them** during onboarding (Deepstash-style)
and then fills their feed with 5 structured insights a day from the moment they sign up.

Concrete first-run benefits:
- Sign-up → onboarding modal → the feed is already populated on first render (no empty state).
- The explicit choices (focus areas, style, frequency) become the first DHF preference vector,
  so Zoe has real grounding instead of cold-start noise.
- Daily delivery windows create a return habit — the retention loop the platform lacks.
- Swiss Ephemeris is used only as a **timing/telemetry layer** (which local window is active,
  day archetype tag), never as a predictor of psychological state. That keeps claims honest.

## Isolation guarantee (nothing existing gets rewired)

The engine is a separate namespace end to end: own tables (`growth_*`), own edge function,
own cron row, own components. Existing home feed, loops, astro dispatch, DHF brain and
search are untouched — the home feed only gains one extra read-only hook that renders
growth cards alongside what it already renders. If the engine is off, paused, or errors,
the home feed behaves exactly as it does today.

```text
[Onboarding modal]
      v
[growth_preferences] ---> [pg_cron every 15 min] ---> [growth-dispatch edge fn]
                                                            |
                                       sovereign AI (own keys) + template vault
                                                            v
                                                   [growth_feed_items]
                                                            v
                                     useGrowthFeed() (read-only) -> HomePage cards
```

## Phase 0 — pre-flight scan and fix (before any new code)

Run first and report findings one by one:
- Backend reachability + `supabase--linter` for RLS/policy gaps on existing tables.
- Full vitest suite and the two tripwires (`check-no-lovable-ai`, `check-backend-target`).
- Build + Safari chunk sanity (the recent `react-vendor` fix stays in place).
- Any finding that blocks the new engine is fixed before Phase 1 starts.

## Phase 1 — data layer

New tables, each with GRANTs + RLS scoped to `auth.uid()`:
- `growth_preferences` — focus_areas[], reflection_style, delivery_frequency (1..5),
  paused, timezone, quiet hours, updated_at. One row per user.
- `growth_feed_items` — user_id, slot, local_date, title, category, content,
  actionable_step, source ('llm' | 'vault'), status ('published' | 'shadow'),
  correlation_id. UNIQUE (user_id, local_date, slot) = idempotency key.
- `growth_dispatch_state` — singleton: lease owner + expiry, paused reason, last run,
  counters. Mirrors the proven `astro_dispatch_state` contract.

## Phase 2 — background worker (`supabase/functions/growth-dispatch`)

Reuses the hardened shape already shipped in `astro-dispatch`:
bounded batch per run, single-flight DB lease, idempotent slot key, circuit breaker
(402/403 pause + probe, repeated 429 park), paused guard at every entry point,
evergreen template vault so a slot never publishes empty, shadow mode for first rollout.

AI calls go through `sovereignFetch` (project's own provider keys) — the no-Lovable-AI
tripwire stays green. Prompts are fully parameterised: user text is passed as data,
never concatenated into the system prompt, and outputs are schema-validated and length-capped.

5 local windows: morning focus, midday strategy, afternoon recharge, evening reflection,
night review. A user with frequency < 5 gets the highest-priority subset.

## Phase 3 — onboarding + settings UI

- `PersonalGrowthOnboarding.tsx` — 3 steps (focus areas → style → frequency), shown once
  after first sign-in, skippable, writes `growth_preferences`. Uses existing design tokens
  and shadcn components (the pasted Tailwind greys/blues are replaced by project tokens).
- Settings panel section: change focus areas, frequency 1–5, pause/resume, delete data.

## Phase 4 — read-only feed integration

- `useGrowthFeed()` — fetches today's published items for the current user, realtime
  subscribe with the same debounce the home feed already uses.
- `CuratedInsightCard.tsx` — new card component only; no change to `PostCard`,
  loops, or feed layout logic. Cards are interleaved by the existing feed composer.
- Cached by day+slot: refreshing reads rows, never triggers generation.

## Phase 5 — hardening and verification

- Unit tests: slot resolution across the 11-timezone matrix, frequency subsetting,
  idempotency, prompt-injection sanitisation, vault fallback.
- Integration test: RLS isolation (user A cannot read user B's preferences or items).
- Edge tests: lease contention, 402/403 pause + probe recovery, 429 park.
- E2E: sign-up → onboarding → cards visible; engine paused → feed unchanged.
- Ships in shadow mode, then flipped on after a clean audit run.

## Technical notes

- No changes to `HomePage` data flow beyond mounting one hook and one card renderer.
- No new secrets required; reuses existing sovereign provider keys.
- Cost control: at most `frequency` generations per user per day, deduped by the unique
  key; a re-run of the same slot is a no-op.
- Future scaling: batch size, window count and providers are config rows, not code, so
  the engine scales without touching business logic.
