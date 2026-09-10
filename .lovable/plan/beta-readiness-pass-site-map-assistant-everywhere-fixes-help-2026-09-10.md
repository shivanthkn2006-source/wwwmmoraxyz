# Beta-readiness pass: site map, assistant everywhere, fixes, help guides

Goal: get M'Mora from the sign-up page to the last feature page into a state a first
group of ~500 beta members can actually use and understand, without changing the
existing Home, feed, dock or overall look.

## What exists today (measured)

- 101 routes registered, 95 page files, one shared shell (`PlatformLayout`) that
  already mounts the dock, notifications, bug reporter and Zoe's speech bar on
  every route.
- The Zoe orb itself is mounted through `DeferredComponentLoader`, not through the
  shared shell — so it is not guaranteed on every page. That is the main gap for
  "AI assistant across the main pages".
- Latest build is green.

## Work, in order

### 1. Site map (visual + code)

- A generated site map from the existing route registry, grouped into member-facing
  areas: Start, Daily, Create, Connect, Zoe, Growth, Vault, Settings, Admin.
- Two outputs: a Mermaid diagram file for you and Gemini to read, and a real in-app
  page at `/map` showing the same groups as plain black-and-white cards, with a
  one-line "what this is for" under each entry.
- Each entry is tagged: `public` (open to everyone), `earned` (unlocks after some
  days of real use), or `admin`.

### 2. Age-appropriate user flow (10 to 50)

- One flow document mapping the 101 pages into four journeys: first hour, first
  week, first month, power user — using the cohort logic already in the codebase
  (Gen Z / Millennial / Gen X density and tone).
- No new gating logic invented; it reuses the existing cohort field.

### 3. Zoe on every page

- Move the orb mount into `PlatformLayout` (crash-isolated, same as the dock) so the
  assistant is present on all 101 routes instead of only where the deferred loader
  runs.
- Give Zoe page awareness: she already reads the route registry; add a short
  "what this page does and what you can ask here" line per group so an answer on
  `/astrology` differs from one on `/chat`.
- Keep the existing one-voice-at-a-time rule and Deepgram-only policy untouched.

### 4. Bug sweep across all pages

- Automated crawl of every static route signed in: record blank screens, console
  errors, failed network calls, dead links and render crashes into one report.
- Fix findings one at a time, re-crawling after each batch.
- Known items already on the list: React ref warnings, 17 remaining privileged
  database helpers, and the DHF failure some members reported.

### 5. Speed check, mobile and desktop

- Measure first paint and time-to-interactive on the heaviest routes at both sizes,
  plus how long Zoe takes to answer.
- Fix the slowest offenders: oversized eager imports, unthrottled subscriptions,
  and any Zoe call that waits on a provider with no timeout.

### 6. Help guides

- A `/help` page: short plain-language guides — "your first day", "how Zoe helps",
  "posting and loops", "your vault", "privacy and deleting your data".
- Written for a 10-year-old and useful to a 50-year-old; no jargon.

## Decisions I need from you

1. **Earned features** — my suggestion for what stays locked until someone has used
   the platform for a while: Digital Vault, Legacy messages, Astrology predictions,
   Zoe's autonomous cards, and VR. Everything else public from day one. Tell me if
   you want a different split.
2. **Unlock rule** — unlock by days active (e.g. 7 days), by actions (e.g. 10 posts
   or 20 Zoe conversations), or admin-approved per member?
3. **Admin pages** — hidden entirely from the site map for members, or shown greyed
   out?

I will start on the site map and the assistant mount while you answer; the rest
follows in the order above.

## Technical notes

- Site map data comes from `src/config/routeRegistry.generated.ts`, so it can never
  drift from the real routes.
- Orb relocation is a mount-point change inside `PlatformLayout`, wrapped in the
  same error boundary pattern as the dock — no change to orb behaviour or visuals.
- Crawl and speed runs use Playwright with the injected signed-in session, artifacts
  under `/tmp/browser/`.
- No changes to Home feed layout, dock position, or the bottom-right control zone.
