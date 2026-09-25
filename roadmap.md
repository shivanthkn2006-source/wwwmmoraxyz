# Current fixes

- [x] Disable every automatic reload from global and module failure boundaries; recovery is user-controlled only.
- [x] Prove through regression tests that the global failure screen has no timed navigation or automatic reload.
- [x] Remove the simulated login queue and never await invite redemption before entering Home.
- [x] Keep voice, calls, notifications, monitoring, and Zoe services off the authentication path.
- [x] Bound sign-in and stop Home's social-post request from holding the first screen.
- [x] Restore all due DHF cards from integration day through today before social posts.
- [ ] Verify sign-in persistence, Home latency, DHF/growth/planetary cards, and reload stability with an authorized preview session.
