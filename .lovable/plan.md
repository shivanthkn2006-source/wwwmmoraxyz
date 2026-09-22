# Live admin data, unified planning, and sub-second phone startup

## Build
- Walk the injected @moksh50 session on a phone-sized viewport, measuring sign-in hydration, Home usability, reload persistence, Zoe connection state, navigation count, and failing requests before and after the changes.
- Replace the admin overview’s content-library placeholders with live operational totals for users, active/recent sessions, activity events, Planner events, and Smart Reminders. Fetch these through one admin-only database function so counts are accurate without weakening row-level privacy.
- Use the existing `important_dates` records as the shared Planner event source. Keep profile birthday compatibility, but make Planner and Calendar read the same owner-scoped event records.
- Add create/edit/delete event controls to the existing Planner surface and make Reminder create/complete/delete plus Planner event changes broadcast immediate refreshes. Calendar will subscribe to the same records and update without reopening the page.
- Preserve all current layouts and styling; only data wiring, loading behavior, and existing controls will change.

## Phone performance
- Profile the signed-in `/home` critical path and remove or defer nonessential pre-interactive work still competing with session hydration.
- Keep authentication single-source, mount diagnostic providers only after interaction/idle time, and ensure Zoe reconnect runs only after a confirmed failed connection rather than during normal startup.
- Target under one second for the locally measurable Home/session restoration path; report the measured result honestly if network latency prevents the target.

## Technical details
- Apply a migration for the admin aggregate function with explicit authenticated/service-role grants and an internal `has_role(auth.uid(), 'admin')` check.
- Reuse existing `important_dates` and `reminders` tables; no duplicate calendar table.
- Add focused tests for admin live metrics, shared Planner/Calendar sources, realtime refresh events, reload protection, and startup messaging.
- Validate the build and repeat the signed-in phone walkthrough, including one reload and Zoe connection evidence.
