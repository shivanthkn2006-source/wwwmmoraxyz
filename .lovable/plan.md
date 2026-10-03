# Notifications repair, admin notification health page, VR chunks, store build

## What I found (real data, last 14 days)
- Only 5 kinds of alerts have ever reached members (likes, friend requests, DHF essays, uptime, comments) — about 41 in total.
- The alerts list only accepts a fixed set of kinds. Growth card alerts, comment replies and missed calls are not on it, so they are thrown away without any visible error. 664 growth alerts failed this way, all with the same "notification queue rejected" error.
- Direct messages never create an alert: likes, comments, tags, friend requests, badges and music each have an automatic sender, but messages don't. The bell only lights up while the chat is open.
- Email and Slack delivery are not set up (2 failures each).
- The bell, menu badges, panel and pop-up alerts each open their own live connection. The project rule says they should share one, otherwise they drop each other during sign-in reloads.

## 1. Permanent notification fixes
- Replace the fixed list with a single shared catalogue of alert kinds. Every sender (growth, LOL, DHF, calls, messages, replies, music, badges, admin) must use a kind from it, and a test fails the build if code uses a kind that isn't there.
- Add an automatic alert for new direct messages, plus missed calls and comment replies.
- Move the bell, menu badges, panel and pop-ups onto the one shared live connection, with catch-up on reconnect so nothing is missed while offline.
- Log every failed alert with a clear reason, and retry the ones that can be retried.

## 2. Admin page: Notification Health (admin only, inside the private vault)
- One row per feature (messages, likes, comments, replies, tags, friends, badges, music, calls, growth, DHF, LOL, admin notices, push, email). Each row shows whether it's connected, how many it sent in 24h/7d, how many failed and the last error, so you can see at a glance what works and what doesn't.
- A "Run end-to-end test" button sends one test alert per feature to your own account and reports pass/fail for each.
- Members online/offline now, how many devices have push turned on, and how many alerts are unread.

## 3. VR World chunks
- VR World already loads in ~200 m blocks as you walk, with lighter graphics on phones with 4 GB or less. I'll make the blocks smaller (city-block size), generate them in the background and unload blocks behind you, so memory stays flat. The look stays the same.

## 4. Store app (iPhone / Android)
- The phone-app settings currently point at the live editor preview, which app stores reject. Switch them to load the built app, use the warm brand colours for the splash screen and status bar, and set a proper app name.
- The actual store build has to happen on your computer (Xcode on a Mac for iPhone, Android Studio for Android). I'll give you the exact steps.

## Technical details
- Migration: drop `notifications_type_check`; add a `notification_kinds` table plus a validation trigger. Add an `AFTER INSERT` trigger on `messages`, and senders for `missed_call`/`comment_reply`.
- Shared `src/lib/notificationKinds.ts` and a vitest check over `type:` literals.
- Consumers move to the global realtime multiplexer.
- `admin-notification-health` edge function (has_role admin check), plus a `/admin/vault/notifications` page.
- VR: change the ProximityGate chunk size and add disposal on exit.
- Capacitor: remove `server.url` for production builds and set `appName` "M'Mora".

## Not possible from here
- Signing and submitting to the App Store / Play Store (needs your developer accounts and computer).
- Email/Slack delivery stays off until you choose to connect them.
