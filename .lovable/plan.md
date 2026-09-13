# Repair and complete Music search

## Goal
Make search visibly available and reliable inside the standalone Music page. A search will immediately play the best verified result and also show the full result list so the member can choose another track or station.

## What will change

1. **Repair the search path**
   - Trace the live request from the Music page through Audius, Internet Archive, and Radio Browser.
   - Fix browser/network failures, loading-state dead ends, and playback errors without changing the existing monochrome Liquid Glass design.
   - Keep one route-independent playback queue so Music page, Zoe chat/voice, and the compact player remain synchronized.

2. **Show real results inside Music**
   - Add a responsive results area inside the existing Music page for songs, artists, albums where providers supply them, genres/languages, and internet radio stations.
   - Auto-play the highest-confidence playable match, while retaining the returned alternatives for one-tap playback.
   - Show the provider-returned title, artist, artwork, attribution, and live status. Never invent unavailable metadata.
   - Distinguish no results, provider unavailable, playback permission, and broken-stream states.

3. **Add safe spelling and query correction**
   - Normalize punctuation, whitespace, Unicode accents, and common spoken-search wording.
   - Correct close matches for bounded terms such as genres, moods, languages, and common devotional/music vocabulary.
   - Retry typo-tolerant query variants for song titles, lyric fragments, singer/artist names, and album names, but accept only metadata returned by a real provider.
   - Display the interpreted query when a correction was applied.

4. **Harden provider aggregation**
   - Search all currently connected legal sources rather than stopping after one source: Audius tracks, Internet Archive audio, and secure Radio Browser internet stations.
   - Deduplicate results, rank exact title/artist matches above broad matches, reject insecure or malformed streams, and isolate a failing provider so others still return.
   - Preserve transparent source attribution. “Radio satellites” will be represented by the real internet-radio station directory currently connected; no satellite feed will be claimed unless a verified provider exists.

5. **Verification**
   - Add unit tests for normalization, spelling variants, ranking, deduplication, provider partial failures, empty results, and queue/play synchronization.
   - Live-test searches for exact songs, misspelled titles, artists, albums, genres, languages, lyric-like phrases, and radio stations.
   - Test result selection, best-match autoplay, next/previous/stop/play, Zoe-triggered searches, compact-player synchronization, and route persistence.
   - Verify the Music page at phone, tablet/iPad, landscape tablet, and desktop sizes, including loading, empty, error, and populated states.
   - Check preview console/network errors and the final build signal, then update the music audit with proven provider status and remaining external limitations.

## Technical details

- Introduce pure query-normalization and ranking helpers beside the existing music provider layer.
- Expand the provider contract to return aggregated, source-labelled results and correction metadata while retaining the current playable `MusicTrack` queue contract.
- Keep direct provider calls only where browser access is reliable; route incompatible calls through the existing backend-function pattern if live CORS testing proves it necessary.
- Do not add paid spelling services, fabricated provider credentials, hidden YouTube playback, or any change to unrelated pages/components.
