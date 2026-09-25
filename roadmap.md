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
