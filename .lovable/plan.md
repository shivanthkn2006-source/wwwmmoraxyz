# Repair and unify Zoe hands-free voice

## Goal
Make one platform-wide Zoe voice flow work from a connected headset: wake, listen, answer, interrupt, pause/resume, navigate, search, and run authorized actions. Zoe speaks only through Deepgram and the selected operating-system audio output.

## What will change

1. **One wake and conversation flow**
   - Make the existing hands-free listener the single wake entry point on every signed-in M'Mora page.
   - Support natural wake phrases including “Hey Zoe”, “Zoe”, “Hello Zoe”, “Zoe, are you there?”, and common Zoe/Zoey recognition variants.
   - After a wake-only phrase, play a short Deepgram acknowledgement and immediately listen for the user’s question.
   - When the wake phrase and question arrive together, send the question immediately.
   - Remove competing browser recognizers during handoff so the headset microphone is not silently taken by another Zoe listener.

2. **Deepgram-only Zoe voice**
   - Replace the direct browser voice inside the sovereign command path with the existing Deepgram `speakAsZoe` path.
   - Keep the existing voice arbiter, selected-headset routing, and one-voice-at-a-time behavior.
   - Surface a clear audio error/status when Deepgram fails instead of silently switching to the Mac browser voice.
   - Preserve the existing explicit browser-voice opt-in policy, but never enable it automatically.

3. **Natural turn-taking and controls**
   - Wire spoken “stop”, “pause”, “continue/resume”, and interruption phrases to Deepgram playback controls.
   - Add barge-in: user speech stops Zoe before the new question is processed.
   - Resume listening after Zoe finishes, without feedback loops where Zoe hears her own reply.
   - Keep the current on-screen pause/resume/stop controls working through the same voice state.

4. **Answers, identity, search, and live information**
   - Route all unmatched spoken questions through canonical `askZoe()` so voice uses the same memory, profile, DHF, page context, and current web/news grounding as chat and search.
   - Ensure “What’s my name?” reads the signed-in member’s real profile and “search/tell me about the new iPhone” returns a spoken live-grounded answer or the real service error.
   - Display the recognized words, processing state, last answer, Deepgram state, microphone state, selected input/output, and actionable failures on Zoe Audio for preview testing.

5. **Platform-wide command coverage**
   - Generate navigation matching from the canonical route/site-map registry so every member-facing page can be opened by natural name, including Home, Search, Growth, Vault, Settings, Zoe Audio, and Agasthya Vision.
   - Preserve existing feature-specific commands and route unsupported requests to conversational Zoe rather than dropping them.
   - Bridge typed, orb, headset-button, wake-word, and hands-free input into one command dispatcher.
   - Detect “Zoe, run God Mode scan” in voice input, but keep the server-verified root-admin gate; non-admin users receive a spoken denial and no privileged scan runs.

6. **Connection truth and browser limits**
   - Keep the headset LED truthful: selected, named external output only.
   - On Safari/macOS, show when audio is using the OS default because direct output selection is unavailable; AirPods can still receive Zoe when selected as the Mac output.
   - Do not claim Bluetooth profile access the browser cannot verify.

## Verification
- Add focused tests for wake phrase extraction, wake-plus-command handoff, pause/resume/stop/barge-in, Deepgram-only enforcement, profile-name queries, dynamic route navigation, and admin-only God Mode dispatch.
- Test the Deepgram function with the signed-in preview and inspect the actual status/body.
- Run signed-in preview flows for “Hey Zoe”, “What’s my name?”, an iPhone query, Agasthya Vision navigation, and God Mode authorization.
- Verify Zoe Audio reports real microphone, recognizer, Deepgram, input, output, and hands-free state.
- Run focused voice/audio tests, the project test suite, type checks, and confirm the preview build is clean.

## Boundaries
- No Home feed, dock, notification, or unrelated visual changes.
- Zoe Infinity remains separate.
- Physical AirPods microphone/output and locked-screen native operation will be reported as device-tested only if observable from an installed device; browser preview tests will not be presented as physical Bluetooth proof.
