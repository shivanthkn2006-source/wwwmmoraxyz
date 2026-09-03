# Omni-Graph remediation — Stage 3 & 4 report (03 Sep 2026)

Follow-up to `OMNI_GRAPH_INTEGRATION_AUDIT_SEP03_2026.md`. Stages 1–2 (public-surface hardening, telemetry integrity, retention) were closed previously.

## Closed in this pass

| # | Audit finding | Fix | Verification |
|---|---|---|---|
| 6 | `useBehavioralTelemetry` computed typing rhythm and discarded it | New single writer `src/services/behavioralFingerprintService.ts`; `stopTracking()` folds each round into the user's fingerprint (EMA α = 0.7) | 5 unit tests (`src/test/behavioralFingerprint.test.ts`) |
| 7 | `behavioral_fingerprints` had 0 writers (dead table) | Same writer; upsert on `user_id`, versioned, `last_calibrated_at` stamped | tests + schema unique-constraint confirmed |
| 15 | Zoe's brain had no knowledge of the platform | `supabase/functions/_shared/platform-state.ts` — versioned capability/route registry injected into every brain call, plus `currentRoute` from the client | deployed; `platformStateVersion` returned in the response |
| 16 | Grounding asked an LLM to invent "plausible" URLs | `searchWebReal()` now retrieves through the platform's own `external-search` lanes first; LLM path is a marked fallback only | live call returns real YouTube/news URLs |
| 17 | Prompt hard-truncated at 5.8k with no priority | Priority-ordered assembly: identity → platform state → grounding → emotion → codex → personality → memory, trimming lowest-priority context last | deployed |
| 19 | Dead `tryLovableAI` tier appended to all 5 cascades | Removed from every provider chain | deployed |

## Platform working status after this pass

- Tests: **652 passed / 6 skipped** across 81 files.
- TypeScript: clean. Build: clean.
- Zoe brain: 4 live provider tiers (no dead tier), real citations, platform-aware, route-aware.
- Zoe health/interaction: behavioural signal now persists per user, so tone/adaptation has a real substrate instead of a discarded in-memory value.

## Still open — recommended next order

1. **Stage 5 — DHF memory recall (#8, #9):** `dhf_consciousness_memory` remains write-only; add server-side pgvector recall in the brain and retire/wire the remaining dead DHF tables.
2. **Stage 6 — temporal graph + lineage (#11–#14):** `valid_from`/`valid_to` on identity tables, `session_id`/IP lineage on `dhf_asset_logs`, one canonical device-fingerprint source, and the `S(t+1)` decay trajectory table.
3. **Stage 7 — Nexus search (#22–#25):** canonical route registry generated from one source (router + dock + SEO + index + prompt), route indexing into `zoe_universal_index`, search telemetry in `ZoeSearchModal`, pgvector memory lane.
4. **Stage 8 — scale (#26–#32):** move 6 per-client pollers to cron/realtime, route the 6 stray `supabase.channel()` sites through the multiplexer, lazy-load the ~20 eager providers, chunk-size budget in CI.
5. **Stage 9 — data volume (#33–#37):** health-log rollups, `behavioral_events` partitioning, `halfvec` embeddings, move inline post media into storage buckets.
6. **Carry-overs:** 59 pre-existing SECURITY DEFINER linter warnings, React forwardRef warnings, stale `verify_jwt=false` config entries for the deleted `edge-tts`/`zoe-voice`, unverified `mmora.xyz` sender blocking reporter emails.
