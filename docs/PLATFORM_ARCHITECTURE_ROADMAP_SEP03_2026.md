# Platform Architecture Roadmap — 03 Sep 2026

## 1. Shape of the system
- **Client**: React 18 + Vite + Zustand. `src/App.tsx` declares ~89 routes, all `React.lazy()` loaded, wrapped by `PlatformLayout` (`src/layouts/PlatformLayout.tsx`).
- **Cross-cutting services** mounted once by `PlatformLayout`, each inside its own `AppErrorBoundary`: voice engine + thermal watchdog, `GrowthCardAlertHost`, `NotificationAlertHost`, `ZoeSpeechPauseBar`, `GlobalBugReporter`, `SentinelWatchHost`, `GlobalHomeDock`.
- **Backend**: Lovable Cloud (Postgres + PostgREST behind RLS, Auth, Storage, Realtime, ~142 edge functions, pg_cron).

## 2. Security in realtime
| Layer | Where | What it does |
|---|---|---|
| Auth gate | `src/components/ProtectedRoute.tsx` | Spinner while loading, redirect to `/auth` with no session |
| Device/DOM defenses | `src/components/security/SecurityShell.tsx` | VoidShell, DevTools trap, watermark, camera sentinel, session heartbeat |
| Live lockout | `SentinelWatchHost.tsx` | Renders a full-screen "Access suspended" when `sentinel_blocks` marks the fingerprint |
| Data boundary | Postgres RLS (~132 migrations) | Actual authorization; client gates are UX only |
| Sovereign admin | `/admin/vault` | Single admin (@moksh50), VPN tunnel + device attestation |

## 3. Menus — one shared source of truth
- `HomeGlassDock.tsx` = presentation only: 7×4 rounded-edge grid, usage-ordered (`src/lib/homeDockUsage.ts`), Home slot always reserved next to the trigger.
- `dockExtraActions.tsx` = the shared catalogue (`DOCK_EXTRA_DEFS`) every page pads its dock with, plus `DOCK_RESERVED_ROUTES` so a route never appears twice.
- `GlobalHomeDock.tsx` = the dock on all non-home routes (6 primary items + catalogue).
- `HomePage.tsx` = the feed-aware dock (16 primary items + catalogue).
- Every dock destination was cross-checked against the router: **no dead routes**.

## 4. Duplicate audit and resolution (this pass)
| Collision | Before | After |
|---|---|---|
| Label "DHF Neural Feed" used twice | `GlobalHomeDock` → Compass icon → `/compass`; `HomePage` → Radar icon → in-page panel | `/compass` is now "DHF Neural Feed" everywhere (Compass icon, incl. the shared catalogue, previously "Zoe's Daily Compass"); the in-page panel is renamed **"Neural feed panel"** |
| `Camera` icon used twice on Home | `selfie-city` and `camera` both rendered `Camera` | `selfie-city` now uses `ScanFace`; `camera` keeps `Camera` |
| Bug reporting had no destination | Floating dialog only | New `/bug-report` page + shared dock entry "Report a problem" (`Bug` icon) |

Result: labels and icons are identical for the same destination on every page.

## 5. Responsiveness
The dock is CSS-driven, not breakpoint-driven: `fixed`, `bottom-[calc(env(safe-area-inset-bottom,0px)+8px)] right-2`, `max-h-[70vh]` expanded vs `max-h-[64px]` collapsed. Same markup on mobile and desktop; input affordances are dual-mode (swipe/long-press for touch, Enter/Space/Escape for keyboard). `DeviceTierProvider` handles heavy-render scaling elsewhere (3D, media).

## 6. Bug reporting (now real)
- Table `platform_error_logs` gained `category`, `severity`, `status` (`open|triaged|in_progress|resolved|closed`) and `admin_note`; admins can update status/notes, users still read only their own rows.
- `/bug-report` (`src/pages/BugReportPage.tsx`): categorised form with severity, optional "where", and a list of your past reports with live status and team notes. Route, device profile and app state are attached silently.
- The floating bug icon still files a one-tap report and now links through to the full page.

## 7. Open items carried forward
- `exodus_quiz_questions.correct_option` and `exodus_puzzles.answer_hash` still client-readable.
- SECURITY DEFINER functions still executable by `authenticated` (57 linter warnings, pre-existing).
- No WAF/rate limiting in front of every public edge function; mega-files still awaiting extraction.
