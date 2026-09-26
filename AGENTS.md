# Architecture rules

- Zoe's LOL uses Pollinations as its only image-generation provider, because provider consistency and cost control are product requirements.
- Scheduled and member-submitted jokes share `humor_drops`, reactions, comments, and feed rendering, because one content model prevents divergent behavior.
- Ambient joke speech is owned by one global Deepgram announcement host, because card mounts must not duplicate or prematurely mark announcements.
- Protected routes wait for definitive auth initialization after the UX loading budget, because slow Safari/cellular session hydration must not redirect valid members.
- Home orders due DHF, growth, social, Loop, and humor cards by their real scheduled timestamps, because fixed source blocks hide timely content.
- All Zoe's LOL consumers share the global realtime multiplexer, because independent channels race during auth reloads and can take Home offline.