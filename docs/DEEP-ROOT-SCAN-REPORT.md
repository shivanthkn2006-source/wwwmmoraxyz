# M'Mora / Zoe — Deep Root Scan Report

Scope: sign-up through every main page, Zoe's conversation and audio stack,
edge functions, database rules, and her memory (DHF).

## Verified working

| Area | Status | Evidence |
| --- | --- | --- |
| Build | OK | build log clean, two consecutive passes |
| Automated tests | 757 passed, 6 skipped, 0 failed | full suite run |
| Type safety | Clean | full typecheck, no errors |
| Page walk (signed in) | 12 main pages, 0 blank screens, 0 failed requests | Home, Chat, Astrology, Vault, Map, Help, Zoe Audio, Profile, Admin, Welcome, Signup, Demo |
| Zoe voice route | Working end to end | speech -> askZoe -> zoe-chat -> memory + live web |
| Zoe audio | Deepgram only, one voice at a time | audio router, arbiter, headset routing |
| Admin gate | Server-side, 403 for everyone else | God Mode and admin dashboard |

## Fixed in this scan

1. **Zoe's memory log was silently failing.** Every attempt to record where an
   answer came from errored out. Fixed at the database level; the trail now
   writes correctly and is no longer readable by signed-out visitors.
2. **Zoe could not see your saved dates, attachments or life details.** Photos,
   documents attached to posts, birthdays and remembered facts were never added
   to her searchable memory. They are now indexed automatically as they are
   created, and older ones were backfilled.
3. **Typed chat did not build memory.** Only spoken conversations taught Zoe
   about your life. Now every conversation does, typed or spoken.
4. **"What was I doing last week?" had no way to work.** Her memory searches by
   meaning, not by date. Added real timeline recall: ask about yesterday, last
   week, last month or "a few days ago" and she reads your actual posts,
   memories, saved dates and past conversations for that period — and says
   plainly when nothing is recorded rather than inventing it.
5. **Zoe's first spoken word took 5–6 seconds.** Reduced by reusing one sign-in
   check per reply, warming the voice service, and letting the opening sentence
   go first instead of competing with the rest.

## Known and honest gaps

- **Not a bug:** the ~390 console warnings on every page come from the Lovable
  preview editor's own tooling, which runs only inside the editor. They do not
  exist in the published app.
- **Second Zoe brain is parked.** An experimental live-streaming version of Zoe
  is loaded but cannot start — nothing switches it on. The working Zoe is the
  one described above. It is left off deliberately; turning it on would put two
  Zoes on the same microphone.
- **Wake word is off by default.** Passive "hey Zoe" listening must be enabled
  on the Zoe Audio page.
- **Image understanding is rate limited.** The provider is returning "quota
  exceeded", so descriptions of newly attached photos are skipped until the
  quota resets. The photos themselves are still remembered.
- **Cannot be verified here:** real AirPods/Bluetooth conversation, iPhone or
  Android installation, and locked-screen listening. These need a physical
  device and signing credentials that are not available in this environment.
- **Travel booking, some biometric signals and a real 3D generator** remain
  parked pending credentials.
