# Fix the Agent Memory page against the real TencentDB API

The project is real — `github.com/TencentCloud/TencentDB-Agent-Memory` — but almost every route the current client calls is wrong. Verified against the repo source (`MemoryCore/src/gateway/server.ts`, `v2-router.ts`, `Dockerfile`, README).

## What's wrong today

| Current client call | Reality |
| --- | --- |
| `POST /v1/memory/chat` (one role per call) | Does not exist. Real: `POST /capture` taking a **user+assistant pair** per round |
| `POST /v1/memory/search` | Does not exist. Real: `POST /search/memories` (L1 facts) and `POST /search/conversations` (L0) |
| `GET /v1/memory/persona/:id` | Does not exist. Persona (L3) is read via `POST /v2/core/read` |
| no auth headers | Gateway requires `Authorization: Bearer <TDAI_GATEWAY_API_KEY>` and `x-tdai-service-id` on every route except `/health` |
| assumes pushed image `tencentcloud/tencentdb-agent-memory` | No official published image confirmed; README documents building locally as `memory-core:local` |

`GET /health` is the only call that is already correct. Port 8420 is correct. CORS is **off by default** and must be enabled with `server.corsOrigins` in `tdai-gateway.yaml`, otherwise the browser blocks every request.

## Changes

### 1. `src/services/memoryService.ts` — rewrite the transport
- Add stored settings for **API key** and **service id** alongside base URL; attach `Authorization: Bearer …` and `x-tdai-service-id` to all requests except `ping()`.
- `captureRound(sessionKey, userContent, assistantContent, userId)` → `POST /capture`, replacing the per-role `saveConversation`.
- `searchMemories(query, limit)` → `POST /search/memories` (L1 atoms).
- `getPersona()` → `POST /v2/core/read` for the L3 persona blob.
- Add `recall(query, sessionKey, userId)` → `POST /recall`, which is the purpose-built context-injection endpoint — use it as the primary grounding source, with `searchMemories` as fallback.
- Add `endSession(sessionKey)` → `POST /session/end` so L1/L2/L3 distillation flushes when the user leaves the page.
- Keep `normaliseAtoms` but widen it to the real response shape `{ results, total, strategy }`.
- Distinguish `401`/`403` from "offline" so the UI can say "auth required" instead of "gateway offline".

### 2. `src/components/memory/MemoryChat.tsx`
- Stop writing each turn separately. Buffer the user message, get Zoe's reply, then send **one** `/capture` with both halves; the round shows "stored" only after that succeeds.
- Ground replies via `recall()` first, falling back to `searchMemories()`.
- Fire `endSession()` on unmount.

### 3. `src/pages/AgentMemoryPage.tsx`
- Extend the settings panel with API key + service id fields (stored in localStorage, never in source).
- Status badge gains an "auth required" state.
- Add a short setup note with the correct local run instructions.

### 4. `src/components/memory/MemoryDashboard.tsx`
- Read persona from the `/v2/core/read` payload shape; render atoms from `{ results }`.

## What you'll need to run locally

```text
git clone https://github.com/TencentCloud/TencentDB-Agent-Memory
cd TencentDB-Agent-Memory/MemoryCore
docker build -t memory-core:local .
docker run -p 8420:8420 \
  -e TDAI_LLM_API_KEY=<any OpenAI-compatible key> \
  -e TDAI_LLM_BASE_URL=<provider base url> \
  -e TDAI_LLM_MODEL=<model> \
  -e TDAI_GATEWAY_API_KEY=<pick one> \
  -e TDAI_GATEWAY_HOST=0.0.0.0 \
  -v ./tdai-gateway.yaml:/data/config/tdai-gateway.yaml:ro \
  memory-core:local
```

In `tdai-gateway.yaml`, set `server.corsOrigins: ["http://localhost:8080"]` (or `["*"]` for dev) — without this the browser blocks the calls regardless of correct routes. Storage is SQLite + local files; no external database needed. An LLM key is mandatory because L1–L3 distillation is LLM-driven.

## Honest limits

- This stays a **local-dev-only** feature: `http://localhost:8420` is unreachable from the published https site (mixed content). Making it work in production would need a separate step — proxying through an edge function to a publicly hosted gateway.
- I can't run the container in this sandbox, so I'll verify by code-reading against the repo source and confirming the page degrades correctly (offline / auth-required states) rather than by a live round-trip.
