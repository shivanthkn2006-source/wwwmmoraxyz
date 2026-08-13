# Wire Chat + Memory Dashboard together (60/40)

## What already exists
- `src/services/memoryService.ts` — gateway client (health, L0 save, L3 persona, L1/L2 search) with timeout + configurable base URL.
- `src/components/memory/MemoryDashboard.tsx` — persona card + searchable atoms list.
- `src/pages/AgentMemoryPage.tsx` — 50/50 layout, gateway status badge, settings panel, and a chat box that only stores the *user* message (no assistant reply).

## What the two halves are for
- **Backend (the gateway + `memoryService`)**: the memory brain. Every chat turn is pushed to L0 (raw conversation). The gateway distills it into L1 atoms (facts), L2 scenarios (episodes), and L3 persona (a compressed "who this user is"). Retrieval is budget-capped so you inject a few relevant facts instead of a whole chat log.
- **Frontend (Chat + MemoryDashboard)**: the visible proof. Chat writes memory in real time; the dashboard reads it back so you can see persona and facts forming turn by turn. Together they are the test harness and the control panel for memory before it is used platform-wide.

## Changes
1. **Split the chat into its own component** — `src/components/memory/MemoryChat.tsx`, taking `userId` and `sessionId` props, owning the transcript, composer, and per-message "stored / not stored" badges.
2. **Add real assistant replies** — on send: store the user turn (L0), fetch relevant L1/L2 facts plus L3 persona for grounding, call the existing Zoe intelligence edge function with that context, render the reply, then store the assistant turn to L0 as well. If the gateway is offline, the chat still replies and marks the turn "not stored" (no errors, graceful degrade).
3. **60/40 layout** — `AgentMemoryPage` becomes a `lg:grid-cols-5` grid: chat spans 3 columns, dashboard spans 2. Stacks vertically on mobile.
4. **Auto-refresh** — dashboard refreshes after each stored turn (existing `refreshToken`) plus a light 15s poll only while the gateway is online, so an offline gateway never spams failing requests.
5. **Real auth, no hardcoded user** — keep `useAuth().user.id`, falling back to a stable per-browser guest id rather than `test_user`.
6. **Theming** — all colors stay on semantic tokens (no raw grays/blues), matching the rest of the app.

## Error safety
- Every gateway call already returns `{ success, error }` instead of throwing; UI renders offline/empty states.
- Assistant call wrapped so a failed LLM response shows an inline retry, not a crash.
- Verified after implementation with a typecheck and a Playwright load of `/agent-memory` with the gateway offline (expected steady state here, since the Docker container is not running in this environment).
