# Current fixes

- [x] Disable every automatic reload from global and module failure boundaries; recovery is user-controlled only.
- [x] Prove through regression tests that the global failure screen has no timed navigation or automatic reload.
- [x] Remove the simulated login queue and never await invite redemption before entering Home.
- [x] Keep voice, calls, notifications, monitoring, and Zoe services off the authentication path.
- [x] Bound sign-in and stop Home's social-post request from holding the first screen.
- [x] Keep the Home icon panel fitted to its seven-column icon grid so its glass layer cannot cover other pages.
- [x] Render the requested page before loading optional voice, calls, monitoring, music, and Zoe services.
- [x] Restore all due DHF cards from integration day through today before social posts.
- [ ] Verify sign-in persistence, Home latency, DHF/growth/planetary cards, and reload stability with an authorized preview session.
- [ ] Verify the one-time universal permission action across signed-in desktop and mobile views.
- [ ] Confirm phased Home loading renders real feed content before background DHF and planetary work.
- [ ] Complete subagent code audit and visual QA without altering existing features or design.

# Sep 25 requests
- [x] Launch notice: admin-only (members cannot broadcast to everyone — spam/abuse risk)
- [x] Paid search / auto-mail writer: already sign-in + rate limited
- [x] Transcription: add per-member rate limit + size cap
- [x] Chat history page exists at /zoe/history
- [ ] Physical-phone walkthrough (needs the user's own device)
- [ ] Remaining scanner findings: continue next turns
- Declined: IP / hardware-ID tracking (surveillance)

# Sep 26 requests
- [x] Location setup page after sign-up (/setup/location) saving timezone + offset + city
- [x] DHF video lookup: refresh-and-retry on 401 instead of erroring
- [x] Real YouTube videos play inside M'Mora (in-app player)
- [x] Daily card builder: today's 60 cards already built at 00:02 UTC (no duplicate run)
- [ ] Test sign-up + signed-in walk of Home/Zoe voice/DHF (blocked: preview not signed in; sign-up needs captcha + email confirmation)
- [ ] Physical-phone check (needs the user's device)
- [x] Keep frequent menus ordered by usage inside the Home panel; never render Calls or other menu icons outside it
- [x] Restore welcome-card scheduling so remote DHF/astrology checks cannot prevent signed-in cards from appearing
- [x] Keep today's welcome motivation available in both Global and Friends feeds
- [x] Audit incidental provider labels across platform surfaces; preserve required map/video credits, creator content, legal disclosures, and admin diagnostics
- [ ] Fix Zoe's LOL delivery in the default Global feed with auth-ready, focus, and scheduled refreshes
- [ ] Replace Zoe's LOL image generation with Pollinations only and match each skit's actual scene
- [ ] Move scheduled LOL announcements into shared Deepgram voice delivery and show schedules on the calendar
- [ ] Add humor categories, filtering, recent-engagement trending, and duplicate-safe Global feed placement
- [ ] Add secure member joke submission with title, text, category, optional image, and feed engagement
- [ ] Verify Zoe's LOL end to end in signed-in desktop and phone previews
