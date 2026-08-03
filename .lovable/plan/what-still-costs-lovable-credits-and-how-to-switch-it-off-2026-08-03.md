# What still costs Lovable credits, and how to switch it off

## Findings (verified against the codebase and usage logs)

Three separate things bill credits on this project:

1. **Build/plan messages** — every prompt you send me. Unavoidable.
2. **Lovable Cloud** (database, auth, storage, edge functions) — this is the backend the whole app runs on. It cannot be disabled without rebuilding the app on an external backend, so it stays.
3. **Lovable AI Gateway** — this is the one you thought was gone. It is **not** gone. The gateway log shows **142 requests in the last 7 days**, most recently 2026-08-01 09:14 UTC (e.g. log_id `019fbc9a-5b12-742f-a509-2c0e3bd6ed5e`, `google/gemini-2.5-flash`, chat_completions). Cost per call is small (0.001–0.01 credits) but it is continuous.

### Where the Lovable AI calls still live

**60 edge functions** still call `ai.gateway.lovable.dev` / read `LOVABLE_API_KEY`. The earlier cleanup only covered Zoe's chat/brain path (`zoe-agent`, `zoe-infinity-chat`, `zoe-infinity-brain`, `zoe-core-executor`) — everything else was left untouched.

Grouped by what they do:

- **Shared helpers (highest priority — many functions route through these):** `_shared/ai-telemetry.ts`, `_shared/cascading-provider.ts`
- **Zoe subsystems:** `zoe-infinity-vision`, `zoe-infinity-image-gen`, `zoe-infinity-deep-research`, `zoe-omega-vision`, `zoe-perception`, `zoe-multiagent`, `zoe-pentarchy-core`, `zoe-god-mode`, `zoe-dreamer-agent`, `zoe-self-awareness-core`, `zoe-truth-scribe`, `zoe-silent-scribe`, `zoe-session-summariser`, `zoe-walk-talk`, `zoe-neet-tutor`, `zoe-service-ai`, `zoe-profile-analyzer`, `zoe-quantum-anka`, `zoe-document-xray`, `zoe-artifact-generator`, `zoe-video-anchor`, `zoe-image-verify`, `zoe-universal-architect`, `zoe-external-sync`, `zoe-realtime-voice`, `zoe-health-check`
- **Media / vision:** `generate-text`, `generate-image`, `generate-video`, `apply-ai-filter`, `analyze-face-emotion`, `ai-video-transform`, `process-live-video`, `generate-regional-avatar`, `selfie-city-vision`, `selfie-city-search`, `selfie-value-calculator`, `transcribe-audio`
- **Platform/ops jobs (these can run on schedules, so they bill quietly):** `platform-diagnostics`, `provider-health`, `run-ai-audit-job`, `pce-agent-nightly`, `verify-regression`, `visual-regression-check`, `raa-code-debugger`, `raa-conversion-audit`, `evolution-sandbox`, `ecn-analysis-processor`, `process-zoe-thought`, `process-dhf-asset`, `dhf-visualization`, `dream-foundry`, `moderate-content`, `mail-sentinel`, `lisa-assistant`, `analyze-legal-doc`, `analyze-youtube`, `parent-zoe-executor`, `quantum-pentarchy-swarm`, `realtime-voice`
- **Frontend references:** `src/components/zoe-infinity/ProviderHealthPanel.tsx`, `src/hooks/useZoeDiagnostics.ts`, `index.html`

Your own keys are already in place and can cover all of it: `GROQ_API_KEY`, `GOOGLE_AI_STUDIO_KEY`, `OPENROUTER_API_KEY`, `POLLINATIONS_API_KEY`, `DEEPGRAM_API_KEY`, `ASSEMBLYAI_API_KEY`, `OLLAMA_ENDPOINT`.

## Proposed work

Because this is 60 functions, I'd do it in ordered passes so each prompt stays cheap and verifiable.

**Pass 1 — kill the shared path + add a hard guard**
- Rewrite `_shared/cascading-provider.ts` and `_shared/ai-telemetry.ts` so the provider chain is Groq → Google AI Studio → OpenRouter → Ollama, with the Lovable branch removed entirely.
- Add a shared `assertNoLovableGateway()` guard so any future call to `ai.gateway.lovable.dev` throws instead of silently billing.
- Every function that already routes through these helpers stops billing immediately.

**Pass 2 — chat/text functions**
Direct-rewrite the remaining text/chat functions to Groq (primary) with Google AI Studio fallback. Model mapping: `google/gemini-2.5-flash` → `gemini-2.5-flash` on AI Studio; `gpt-*`/reasoning calls → `llama-3.3-70b-versatile` on Groq.

**Pass 3 — vision, image, video, audio**
- Vision → Google AI Studio `gemini-2.5-flash` / `gemini-2.5-pro` direct.
- Image generation/edit → Pollinations, with Google AI Studio image model as fallback.
- Transcription → Deepgram (primary), AssemblyAI (fallback).

**Pass 4 — scheduled/ops jobs**
These are the quiet credit burners. For each: repoint to your keys, and where the job is purely diagnostic (`run-ai-audit-job`, `pce-agent-nightly`, `visual-regression-check`, `verify-regression`, `evolution-sandbox`), gate it behind an explicit opt-in flag so it never runs unattended.

**Pass 5 — frontend + verification**
- Clean the three frontend references so health panels report your providers, not Lovable.
- Repo-wide grep to confirm zero `ai.gateway.lovable.dev` / `LOVABLE_API_KEY` hits.
- Re-read the AI Gateway log after 24h to confirm request count drops to zero.

## Technical notes

- `LOVABLE_API_KEY` is a managed secret and can't be deleted from the secrets panel; removing all code references is what stops the billing. The guard in Pass 1 makes that enforceable.
- Lovable Cloud usage (Postgres, storage, function invocations) will still show on the credit ledger after this work. That is the app's backend, not AI.
- No database schema changes are needed for any of this.

## What I need from you

Confirm the pass order, or tell me to compress it. If you want the absolute minimum spend, Pass 1 + Pass 4 alone removes the large majority of recurring, unattended calls.
