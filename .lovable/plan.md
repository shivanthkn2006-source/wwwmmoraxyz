## Teleprompter-Style Word Highlighting for Zoe Infinity

Add karaoke/teleprompter-style word highlighting synced to Zoe's spoken response in the Zoe Infinity chat panel — words highlight as Zoe reads them, and the container auto-scrolls to keep the active word visible.

### Scope

- **Where:** Zoe Infinity chat surface only — `src/components/ZoeOrbConversationPanel.tsx` (and `ZoeChat.tsx` if it shares the same render path). Not applied to `TypewriterText` intro or other Zoe surfaces.
- **What syncs:** The currently-speaking assistant message bubble.
- **When active:** Only while Zoe is actually speaking that specific message. Idle messages render as normal text.

### How word timing is derived

Zoe uses `speakAsZoe` → `SpeechSynthesisUtterance` (Web Speech API), which natively emits `onboundary` events with `charIndex` + `charLength` per word. That is the source of truth — no guessing, no estimating.

Fallback path (when boundary events are not fired — some Chromium builds on Android, or non-native audio playback via the audio bus): compute an even-timed schedule from `audio.duration` (or an estimate: `words * ~350ms`) and advance via `requestAnimationFrame` synced to `audio.currentTime` when an HTMLAudioElement is available on `zoeTTSAudioBus`.

### Implementation

1. **New hook `src/hooks/useSpokenWordSync.ts`**
   - Input: the message id + text currently being spoken.
   - Subscribes to a new lightweight event bus emitting `{ messageId, charIndex, charLength }` frames.
   - Returns `{ activeWordIndex, words }` where `words` is the pre-tokenized array (preserving whitespace/punctuation offsets so indices map back to the original text).

2. **Wire boundary events in `src/utils/zoeVoice.ts`**
   - Extend `speakAsZoe` signature to optionally accept `{ messageId }`.
   - Attach `utterance.onboundary` and publish `{ messageId, charIndex, charLength, chunkOffset }` to the new bus. Track cumulative `chunkOffset` across the chunked utterance queue so char indices map to the full message text, not the current chunk.
   - Publish `end` on `utterance.onend` for the final chunk.

3. **New bus `src/utils/zoeSpokenWordBus.ts`** — minimal publish/subscribe (mirrors `zoeTTSAudioBus` style already used in the project).

4. **New component `src/components/zoe-infinity/SpokenTranscript.tsx`**
   - Renders the message text as a sequence of `<span>` tokens.
   - The active token gets a highlight class (soft yellow background like the reference, but tuned to Zoe's dark aesthetic — semantic tokens only, no hard-coded colors).
   - Recently-spoken tokens dim slightly; unspoken tokens are muted; active token pops.
   - Uses `IntersectionObserver` (or `scrollIntoView({ block: 'center', behavior: 'smooth' })` throttled) inside the message's scroll container to keep the active word centered.
   - Respects `prefers-reduced-motion` — disables smooth scroll and pulse animation.

5. **Message rendering integration**
   - In `ZoeOrbConversationPanel.tsx` (and `ZoeChat.tsx` if applicable), swap the plain-text render of assistant messages for `<SpokenTranscript messageId={m.id} text={m.content} />`.
   - Pass `messageId` into every `speakAsZoe(...)` call site in those components so the bus knows which message is active.

6. **Design tokens (in `index.css`)**
   - Add `--zoe-transcript-active-bg`, `--zoe-transcript-active-fg`, `--zoe-transcript-spoken`, `--zoe-transcript-unspoken` mapped to existing HSL tokens (no hard-coded hex). Highlight uses a subtle glow, not the loud yellow from the reference, to match Zoe's design system.

### Technical details

- **Tokenization:** split by whitespace but retain a `[start, end)` char range per token so `charIndex` from the boundary event lands in the right token via a binary search.
- **Chunk offset math:** `zoeVoice.ts` already splits long text into multiple utterances. Before enqueuing chunk N, record `chunkStart = sum(lengths of chunks 0..N-1) + separatorLength`. The bus publishes `absoluteCharIndex = chunkStart + event.charIndex`.
- **Fallback estimator:** if no boundary fires within 400ms of `onstart`, switch to time-based advance using `words.length` and utterance start timestamp; recover to boundary-driven mode if a real event later arrives.
- **Stop/cancel:** on `stopZoeSpeech`, bus publishes `{ messageId, ended: true }` so highlight clears.
- **Multi-message safety:** only the message whose id matches the last-published event highlights; all others render flat.

### Acceptance criteria

- Speaking a long Zoe reply on desktop Chrome/Safari: each word highlights in sync with speech; container auto-scrolls to keep the active word centered.
- On Android Chrome (where `onboundary` is unreliable): the estimator drives smooth, roughly-in-sync highlighting instead of nothing.
- Stopping Zoe mid-sentence clears the highlight immediately.
- Non-speaking messages render as normal text with no layout shift when a message starts/stops speaking.
- Reduced-motion users get instant scroll and no pulse.
- No changes to Zoe brain/backend; no new credits or API calls.

### Risks

- Some browsers fire `onboundary` per sentence, not per word — the fallback estimator covers this but sync will be approximate.
- If the TTS path ever shifts off `SpeechSynthesisUtterance` (e.g., server-side audio), only the estimator applies — sync remains visually acceptable but not exact.
