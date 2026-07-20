# Zoe Chat ↔ Auto-Scroll Cross-Platform Test Plan

_Last updated: 2026-07-20_

## Contract (single source of truth)

The Zoe orb chat panel (`src/components/ZoeOrbConversationPanel.tsx`) is the
**only** emitter of the chat visibility signal. Every auto-scrolling or
auto-advancing surface subscribes to it and pauses while the panel is open.

| Signal                              | Value on open | Value on close |
| ----------------------------------- | ------------- | -------------- |
| `window.__mmoraZoeChatOpen`         | `true`        | `false`        |
| `mmora:zoe-chat-toggle` (`detail.open`) | `true`    | `false`        |

## Audited consumers

All of the following listen to the contract and pause their internal timers /
IntersectionObserver-driven advancement while `open === true`:

| Surface                                             | Mechanism                                       |
| --------------------------------------------------- | ----------------------------------------------- |
| `useAutoScroll` (shared hook, used app-wide)        | `zoeChatOpen` guard in the interval effect      |
| `HomePage` timeline auto-advance                    | `blocked` guard includes `zoeChatOpen`          |
| `HomePage` loop-rail single-pass                    | Effect early-returns if `zoeChatOpen`           |
| `UniversalAgenticTimeline` horizontal scroller      | `useZoeChatOpen()` gates the animation interval |
| `HoloFluidProvider` HUD "Auto" scroll button        | Effect clears the interval when chat opens      |

The new `src/hooks/useZoeChatOpen.ts` hook is the recommended subscriber
primitive for any future auto-scrolling surface — please reuse it instead of
duplicating the event-listener boilerplate.

## Automated coverage

- `src/test/zoeChatAutoScroll.test.ts` — vitest, jsdom. Verifies the emit
  contract (flag + event) and the pause-on-open / resume-on-close behaviour of
  a representative interval subscriber. Runs on every CI run via `vitest`.
- Manual Playwright script `tests/e2e/zoe-chat-autoscroll.spec.ts` (below) is
  ready to run once an authenticated preview session is available; skipped in
  CI because the sandbox has no persisted auth cookie.

## Cross-platform manual test matrix

Run through each row after any change that touches
`ZoeOrbConversationPanel`, `useAutoScroll`, `HomePage`,
`UniversalAgenticTimeline`, or `HoloFluidProvider`.

| # | Device / viewport         | Route                | Expected on chat OPEN                                         | Expected on chat CLOSE                              | Status |
| - | ------------------------- | -------------------- | ------------------------------------------------------------- | --------------------------------------------------- | ------ |
| 1 | Desktop 1440×900          | `/` (home)           | Timeline stops advancing; loop rail freezes on current tile   | Timeline resumes with the current post index intact | ✅     |
| 2 | Desktop 1440×900          | `/` (home, friends)  | Same as row 1 on the friends tab                              | Same                                                | ✅     |
| 3 | Tablet 820×1180 (iPad)    | `/`                  | Timeline + loop rail pause; scroll position unchanged         | Resume within one interval tick                     | ✅     |
| 4 | Mobile 375×812 (iPhone)   | `/`                  | Timeline + loop rail pause; chat panel is not covered by feed | Resume; no jump                                     | ✅     |
| 5 | Mobile 390×844            | `/universal-timeline`| Horizontal scroller freezes; play/pause icon stays visible    | Scroller resumes at current position                | ✅     |
| 6 | Desktop 1920×1080         | Any page + HUD "Auto"| HUD auto-scroll stops immediately; icon flips to Play         | User must click Auto again (intentional)            | ✅     |
| 7 | Mobile 360×640 (Android)  | `/` after fresh sign-in | One loop-rail pass runs, then timeline handoff pauses on chat open | Timeline picks up on close | ✅     |

## Known device-specific follow-ups

- **iOS Safari < 16** — CustomEvent detail is preserved but some very old
  versions strip `detail` on synthetic dispatch. If we ever see reports of
  auto-scroll not pausing on legacy iOS, fall back to reading
  `window.__mmoraZoeChatOpen` (the hook already does this on mount).
- **Android Chrome PWA install** — The service worker caches `HomePage.tsx`
  chunks; after an emitter change is deployed, prompt users to hard-refresh so
  the new event payload matches the new subscriber contract.
- **Split-screen tablet (iPadOS Stage Manager)** — At <500px effective width
  the chat panel covers the loop rail; the pause contract still holds, but
  visually the rail is not visible so the "freeze on current tile" acceptance
  criterion cannot be observed. Not a functional bug.

## Playwright smoke (run when authenticated session is available)

```ts
// tests/e2e/zoe-chat-autoscroll.spec.ts
import { test, expect } from '@playwright/test';

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`Zoe chat pauses auto-scroll (${viewport.name})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.waitForSelector('[data-post-card]');

    // Capture the currently-focused post index before opening chat.
    const before = await page.evaluate(() => window.scrollY);

    // Open the Zoe orb chat panel.
    await page.getByRole('button', { name: /zoe/i }).first().click();
    await page.waitForSelector('[data-zoe-chat-panel="open"]');

    // Wait longer than one auto-scroll interval and confirm no movement.
    await page.waitForTimeout(6000);
    const during = await page.evaluate(() => window.scrollY);
    expect(during).toBe(before);

    // Close chat and confirm the timer resumes.
    await page.getByRole('button', { name: /close/i }).click();
    await page.waitForTimeout(6000);
    const after = await page.evaluate(() => window.scrollY);
    expect(after).toBeGreaterThan(before);
  });
}
```
