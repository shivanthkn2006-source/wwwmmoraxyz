# Current fixes

- [x] Restore the fixed warm Zoe window/menu surfaces, simplify the voice stop control, and select one newest DHF-or-LOL auto announcement.
- [x] Stabilize Zoe orb/chat rendering, remove the dark Latest pill and inner borders, and reduce both icon rails and typing area without changing actions or history.
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
- [x] Complete subagent code audit and signed-out desktop/mobile visual QA without altering existing features or design.

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
- [x] Fix Zoe's LOL delivery in the default Global feed with auth-ready, focus, and scheduled refreshes
- [x] Replace Zoe's LOL image generation with Pollinations only and match each skit's actual scene
- [x] Move scheduled LOL announcements into shared Deepgram voice delivery and show schedules on the calendar
- [x] Add humor categories, filtering, recent-engagement trending, and duplicate-safe Global feed placement
- [x] Add secure member joke submission with title, text, category, optional image, and feed engagement
- [ ] Verify Zoe's LOL end to end in signed-in desktop and phone previews
- [x] Stabilize authenticated sign-in, landing, and Home loading before feature QA.
- [ ] Verify one persisted Zoe LOL card across Global, Friends, LOL, calendar, voice, reactions, and comments.
- [ ] Verify admin/@moksh50 authenticated preview without exposing credentials.
- [ ] Backfill three remaining LOL images (blocked by Pollinations HTTP 429; do not switch providers or duplicate cards).
- [x] Put every due LOL card into Home's real timestamp order and include jokes in Home's non-empty rendering decision.
- [x] Expand Zoe's LOL into a saved-history browser with humor type, rating, date, most-viewed, most-commented, followed, and own-submission filters.
- [x] Prevent reload/sign-in crashes by giving every Zoe's LOL surface one shared realtime subscription instead of duplicate channels.

## Shared picture cascade (2026-09-26)
- [x] Cascade built and each provider live-tested (Pollinations, placeholdr, Kaleido, JustAPI, ImageNow; Free.ai has no API)
- [x] Joke, member-joke, general picture, and daily-card engines wired; 3 missing joke pictures filled
- [x] 10 more features switched via cascadeFetch (Zoe tools, avatars, video preview stills, assistants, text-image)
- [ ] Cloudflare / DeepAI / Pixazo keys — waiting on user
- [ ] Not switchable to the cascade: photo editing + hairstyle (need an editor that keeps the face), video clips, DHF card links (saved as live links)
- [ ] Signed-in 4-screen visual check — blocked: preview signed out, admin session minting denied

## Sep 26 (evening)
- [x] Daily card pictures: save once to storage with cascade fallback; background backfill of member's own cards (6/day per browser)
- [x] Home forecast card (career/money/love/family, "What about <next month>?") with today's sky-shift notice inside it
- [ ] Signed-in phone/mobile-data walkthrough — blocked: preview signed out, session minting denied
- [ ] Cloudflare / Pixazo keys — waiting on user

# Sep 26 (evening)
- [x] Dev (velvet rope) icon moved under the left bug icon
- [x] Home menu icon for the Home loading report
- [x] Jokes "Most popular" ranking on Zoe's LOL page
- [x] Per-part load times + phone/tablet/desktop filter in the Home loading report
- [ ] Picture backfill to storage (blocked: user waiting on more storage)
- [ ] Cloudflare picture service (blocked: user's Account ID + Workers AI key)
- [ ] 8 older backend setup warnings
- [ ] Real-phone check over mobile data (needs the user's phone)

## Zoe spec follow-up (Sep 28)
- [x] Action chips under Zoe replies open M'Mora pages
- [x] On-device MediaPipe camera backup
- [x] SiliconFlow + Zhipu added to text/vision backups
- [x] Private answer check (review) wired into askZoe
- [ ] Google Vision: needs billing enabled on the Google Cloud project
- [ ] SiliconFlow: account balance empty; Zhipu vision: no free balance
- [ ] Groq/OpenRouter model list outdated (404s)
- [ ] Answer check often exceeds its 11s wait on long replies

- [ ] Profile page: one form for name, gender, birth date/time/place, location, email; on save build + store ephemeris-based life report (tomorrow/month/year, love, career) answered by Zoe via Deepgram; hide data sources from everyone except @moksh50
- [x] Sign-in greeting (notifications, messages, newest DHF card) — built, not heard signed-in
- [x] Voice weather/umbrella from device location — verified with Mumbai test location
- [ ] Vision journal: periodic camera looks saved to DHF so Zoe can answer "what was I doing" (not started)
