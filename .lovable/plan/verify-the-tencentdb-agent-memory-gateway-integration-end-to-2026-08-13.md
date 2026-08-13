# Verify the TencentDB Agent Memory gateway integration end-to-end

The local gateway is running on `http://localhost:8420`. Now we need to confirm the React client actually talks to it, writes memory, and displays distilled memories back.

## What we will verify

1. **Settings persistence & health probe** — the `/agent-memory` page reads the saved API key/service id and the badge flips to "Gateway online".
2. **Auth handshake** — with `TDAI_GATEWAY_API_KEY=mmora-local-gateway-key-2026` and a chosen service id, requests are accepted (not 401/403).
3. **Round-trip memory write** — sending a message in the chat calls `/capture` with the user+assistant pair and marks the turn "stored".
4. **Grounding read-back** — the dashboard loads L3 persona and L1 atoms via `/v2/core/read` and `/search/memories` after a captured round.
5. **Session flush** — leaving the page calls `/session/end` so distillation runs.
6. **No runtime regressions** — browser console is free of CORS/auth errors; typecheck stays clean.

## Steps

1. Open `/agent-memory` in the preview.
2. Enter in Settings:
   - Base URL: `http://localhost:8420`
   - API key: `mmora-local-gateway-key-2026`
   - Service id: any value, e.g. `mmora-local`
3. Click **Save & test**. Confirm badge shows "Gateway online".
4. Send a short test message in the chat (e.g. "I love hiking in the mountains").
5. Wait for Zoe's reply, then confirm the turn shows "stored".
6. Watch the right-hand dashboard for newly distilled L1 atoms and L3 persona.
7. Check browser console for any CORS, 401, or network errors.
8. Run `bunx tsc --noEmit` (or the project's typecheck command) to confirm no type regressions.

## Expected honest outcomes

- If CORS is configured in `tdai-gateway.yaml` for `http://localhost:8080`, all calls succeed.
- If CORS is missing, the browser blocks requests and the badge stays "Gateway offline" despite the container running — the fix is to add the origin to `server.corsOrigins`.
- If the LLM key is missing/invalid, `/capture` may succeed (L0 stored) but L1-L3 distillation may be delayed or empty until the gateway can call the LLM.

## Fallback if local gateway misbehaves

- Add a small proxy Edge Function (`supabase/functions/agent-memory-proxy`) so the published HTTPS app can reach a remote gateway, or
- Keep the page local-dev-only and improve the offline/degraded-UI messaging.
