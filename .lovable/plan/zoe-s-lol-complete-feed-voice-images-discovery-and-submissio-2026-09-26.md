# Zoe’s LOL: complete feed, voice, images, discovery, and submissions

## Goal
Make Zoe’s LOL a dependable part of the default Global feed, with scheduled announcements, Pollinations-only content-matched images, social engagement, filtering, trending, and member joke submissions—without changing unrelated pages or controls.

## What will change

1. **Fix Global feed delivery first**
   - Make the humor feed query independent of slow birth-chart loading and refresh it when sign-in becomes ready, when a scheduled drop is created, and when Home regains focus.
   - Keep LOL cards Global-only, insert them into the existing chronological feed, and preserve the existing DHF-first order.
   - Add cached last-successful drops so a temporary network/auth delay cannot make existing jokes disappear.

2. **Use Pollinations only for images**
   - Remove the current Lovable image gateway call entirely.
   - Build a precise Pollinations prompt from the generated headline and dialogue, requesting the actual scene, characters, actions, mood, no text, no logos, and no watermark.
   - Save the resulting image URL with each card; keep the card usable if Pollinations is temporarily unavailable and retry missing images on a later scheduled run.

3. **Make scheduling and Zoe voice reliable**
   - Keep the existing scheduled joke generation jobs and verify every scheduled slot creates all expected humor variants idempotently.
   - Move automatic announcement ownership out of individual cards into one signed-in voice host shared by Home and the Zoe voice experience.
   - Announce each newly due joke once per member/device through Deepgram, respect the one-voice-at-a-time arbiter and device volume, and never request microphone permission or interrupt an active call/chat/search voice.
   - Show the scheduled jokes on the existing calendar view with their due time and category.

4. **Add categories and trending**
   - Add a validated humor category to generated and member-submitted jokes.
   - Add category filters and a Trending view to Zoe’s LOL; rank trending jokes from recent likes and comments with recency decay.
   - Surface eligible trending jokes in the default Global feed while preventing duplicates.

5. **Add member joke submissions**
   - Add a signed-in submission page for title, joke text, category, and optional image.
   - Store member ownership and publish status securely; members may edit/delete only their own submissions, while published jokes are readable by signed-in members.
   - Accept a member image or generate a matching Pollinations image when they leave it blank.
   - Render submitted jokes through the same transparent feed card, reactions, comments, and sharing flow.

6. **Validation**
   - Add focused tests for auth-ready reload, Global-only feed insertion, chronological/trending ordering, category filters, Pollinations-only generation, one-time voice announcements, and ownership rules.
   - Deploy and invoke the joke generator, verify scheduled records and images, then use the injected signed-in preview on desktop and phone sizes to confirm Home, Zoe’s LOL, calendar visibility, reactions/comments/share, submission, and voice behavior.
   - Check current build/runtime/network logs and keep unrelated components unchanged.

## Technical details
- Extend `humor_drops` for category, origin, author, body, scheduled time, and publication state rather than creating a disconnected feed type.
- Keep `humor_reactions` and `humor_comments`, adding indexes needed for recent/trending queries.
- Enforce ownership and visibility in backend access rules; scheduled generation remains service-only.
- Pollinations is the only image-generation provider for this feature. Existing non-image text fallback remains so scheduled cards never blank.