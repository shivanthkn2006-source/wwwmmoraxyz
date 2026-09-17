# Zoe Music Connect

## Goal

Build an additive personalization layer that lets Zoe understand each member’s music taste and immediately handle requests such as “play my favorite,” “play my song,” or “play music for my mood.” Preserve every existing Music page component, visual style, menu, upload flow, queue, provider, and feature.

## What will be added

### 1. Private music learning graph

- Add owner-scoped Music Connect records for durable taste signals and cached context.
- Learn only from real actions: plays, meaningful listening duration, skips, repeats, saves, playlist additions, reactions, searches, selected suggestions, and explicit profile preferences.
- Weight explicit preferences and repeated completed listens above passive impressions; apply recency decay and negative weight to rapid skips.
- Keep uploaded tracks private and never recommend another member’s private upload.
- Connect existing `music_profiles`, library/playlists, `music_listens`, reactions, uploads, and friend-play recommendations without duplicating their data.

### 2. Precise astrological context without hallucination

- Reuse the existing stored birth profile and the shared Swiss Ephemeris WASM path already used by Zoe.
- Compute current planetary positions, natal relationships, Lahiri sidereal values, nakshatra, Vimshottari maha/antar period, and supported transit signals from real calculations only.
- Cache a short-lived derived Music Connect context so focusing or typing in search never invokes AI or recalculates the full chart repeatedly.
- Treat astrology as one optional contextual signal, never as a factual diagnosis of emotion. The member’s explicit mood and learned listening behavior always outrank it.
- When birth time/place is incomplete, degrade honestly to available signals instead of inventing houses, ascendant, or sub-periods.

### 3. Five instant search suggestions

- On Music search focus, show exactly five personalized keyword suggestions using the current cached context, saved tastes, recent listening, time of day, and available planetary/dasha signals.
- Update the five suggestions deterministically as text is entered, with no model call per keystroke.
- Clicking a suggestion uses the existing Music search, provider aggregation, result list, queue, and player.
- Keep the current Music design intact; add only the suggestion behavior inside the existing search area using its current Liquid Glass styling.

### 4. Zoe conversational playback

- Extend the existing deterministic music intent parser for “my favorite,” “my song,” “my playlist,” “what I usually play,” and “music for my mood.”
- Resolve personalized commands locally from the Music Connect context before calling Zoe’s language model, saving tokens and reducing latency.
- Route typed Zoe chat and hands-free voice through one shared resolver and the existing singleton Music engine.
- Continue to support pause, resume, stop, next, previous, queue, uploads, radio, and provider fallback behavior.
- Give Zoe a compact taste summary for normal conversations so she can discuss genres, artists, tracks, and playlists naturally without exposing raw private history.

### 5. Feedback, safety, and reliability

- Record why a suggestion or track was chosen, whether playback started, and the member’s later response so ranking improves over time.
- Add bounded retries and honest offline/provider errors; never fabricate a playable result.
- Add database grants and owner-only row security for every new table, indexes for bounded reads, retention limits for event history, and no sensitive birth details in client storage or logs.
- Repair any Music Connect-related artwork/playback warning found during the signed-in journey without redesigning existing components.

## Technical details

- Add a dedicated Music Connect service that produces a normalized taste vector and ranked candidate seeds from existing profile/history signals.
- Add a protected edge function for Swiss-derived context and server-side taste summarization; reuse shared ephemeris modules rather than duplicating astronomy code.
- Store only derived labels/scores and calculation timestamps in the Music Connect cache; continue reading birth details from the existing canonical astro profile.
- Use deterministic scoring for the fast path. AI is reserved for conversational wording or ambiguous requests, not basic command parsing, suggestion generation, or queue selection.
- Extend the shared intent executor so Zoe chat and always-on voice cannot diverge.

## Verification

- Unit tests for taste weighting, recency decay, skip penalties, deduplication, five-suggestion limits, incomplete birth data, cache expiry, and intent false positives.
- Database tests for owner isolation and private-upload exclusion.
- Integration tests for: saved favorite → Zoe command → playable queue; mood request → five suggestions → search → play; play/skip/save → ranking update; expired upload URL → refresh and play.
- Signed-in preview checks on phone, tablet/iPad, and desktop for search suggestions, Zoe typed commands, queue controls, responsive layout, offline errors, and refresh persistence.
- Confirm the current Music design/components remain visually unchanged apart from the requested five suggestion choices.