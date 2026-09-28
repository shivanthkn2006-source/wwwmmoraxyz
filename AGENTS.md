# Architecture rules

- All image features fetch art through `supabase/functions/_shared/image-cascade.ts` (Pollinations → placeholdr → AI Horde → Cloudflare → DeepAI → Pixazo → Kaleido keyword stock → JustAPI → ImageNow); legacy Pollinations URL callers use `cascadeFetch`, because one ordered cascade keeps cards from blanking.
- Scheduled and member-submitted jokes share `humor_drops`, reactions, comments, and feed rendering, because one content model prevents divergent behavior.
- Ambient joke speech is owned by one global Deepgram announcement host, because card mounts must not duplicate or prematurely mark announcements.
- Protected routes wait for definitive auth initialization after the UX loading budget, because slow Safari/cellular session hydration must not redirect valid members.
- Home orders due DHF, growth, social, Loop, and humor cards by their real scheduled timestamps, because fixed source blocks hide timely content.
- All Zoe's LOL consumers share the global realtime multiplexer, because independent channels race during auth reloads and can take Home offline.
- Liquid Universe detection stays outside root boot; enhancement must never blank auth/Home.
- DHF pictures are copied once into dhf-compass and served from storage, preventing provider outages from blanking cards.
- Zoe orb drift updates Framer motion values without React state updates, and Zoe glass avoids live backdrop filters, because frame-by-frame tree repaints cause orb/chat flicker over Home.
- Home menu panel uses a fixed warm surface without backdrop-filter, because live blur over the moving feed flickers.
- DHF and LOL automatic speech offer candidates to one newest-generated selector, because separate announcers can speak multiple old cards.
- Zoe listening is free-first: browser recognition first, sticky switch to Deepgram Nova on failure (localStorage zoe-listen-mode=deepgram-first flips order), because it saves Deepgram cost while never losing hearing.
- Exact repeat questions use each member's private DHF answer cache before AI recall.
