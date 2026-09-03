# Zoe Search Algorithm — Completion Pass (Sep 03, 2026)

Scope: close the four gaps identified in the search/recall audit, then re-test.

## 1. Backend consolidation — DONE

Every Zoe backend now recalls through the single shared path
`supabase/functions/_shared/omni-recall.ts` (RLS-safe `zoe_hybrid_search`
under the caller's JWT, never the service role).

| Backend | Before | Now |
| --- | --- | --- |
| `zoe-infinity-brain` | omni-recall | omni-recall |
| `zoe-chat` | none | omni-recall block appended to the system prompt |
| `zoe-agent` | none | omni-recall block appended to the system prompt |
| `zoe-dhf-brain` | none | omni-recall hits returned in the response payload |
| `zoe-ambient-search` | direct `zoe_hybrid_search` | unchanged (same RPC) |

## 2. Realtime indexing — DONE

- `enqueue_zoe_search_entity` now accepts `dhf_post`, `dhf_video`,
  `growth_card`, `astro_prediction`, `wisdom_goal` (on top of the original
  post/loop/image/quote/profile/chat/dhf_node set).
- New generic trigger `queue_generic_for_zoe_search()` is attached to
  `dhf_daily_posts`, `dhf_videos`, `growth_feed_items`, `astro_predictions`
  and `wisdom_macro_goals` for INSERT/UPDATE/DELETE — content is queued the
  instant it is written and purged from the index on delete.
- Both helper functions are `SECURITY DEFINER` with EXECUTE revoked from
  `anon`/`authenticated` (service role only) — linter count stayed at the
  pre-existing 59 baseline.
- Drain cron `zoe-search-index-hourly` moved from hourly to `*/10 * * * *`,
  so worst-case searchability lag dropped from ~60 min to ~10 min.
- Verified live: touching a `dhf_videos` row produced a `pending` queue entry,
  and the drain pass completed it (queue back to zero non-completed rows).

## 3. Reranking, recency and diversity — DONE

Pure ranking maths extracted to `_shared/omni-rank.ts` (no Deno imports, so
the Vitest suite exercises the exact production code).

- Over-fetch `limit x 3` (cap 50) from the hybrid RPC, then rerank.
- Final score = hybrid RRF score x recency decay x type prior.
- Recency decay is exponential with a per-type half-life
  (astro prediction 1d, growth card 3d, feed post 21d, chat 30d, DHF essay 45d,
  DHF video 180d, wisdom goal 365d, profile ~never), floored at 0.2 so an old
  but highly relevant item is never eliminated.
- Type priors nudge first-party memory (DHF memory, past chats, profile) above
  incidental feed chatter on ties.
- Diversity cap: max 3 hits per entity type in the primary slice, overflow
  appended only if the limit is not yet filled.

## 4. Temporal validity and provenance — DONE

- `zoe_hybrid_search` now returns `created_at` (added column; existing callers
  select by name and are unaffected).
- Items past their validity window (astro prediction > 2 days, growth card
  > 7 days) are flagged `stale` and rendered in the prompt as
  `HISTORICAL, no longer current`, with an explicit instruction never to
  present them as today's content.
- Every recall line now carries a provenance ref
  (`ref:<entity_type>/<short id>`) plus its date, so Zoe can cite the source
  row instead of paraphrasing anonymously.

## Verification

- Vitest: 664 tests (658 passed, 6 skipped) across 82 files — includes the new
  `src/test/omniRank.test.ts` (6 ranking tests).
- `tsgo --noEmit`: exit 0. Vite build: OK.
- Deno check on the touched functions: `zoe-chat` and `zoe-agent` clean;
  `zoe-dhf-brain` retains 2 pre-existing supabase-js generic-typing errors
  unrelated to this pass (runtime unaffected — Deno Deploy does not typecheck).
- Live SQL: `zoe_hybrid_search(NULL, 'discipline habit morning', 5)` returns
  ranked growth cards and DHF essays with timestamps.
- Endpoint smoke (anon): `zoe-chat` 200, `zoe-infinity-brain` 200 with
  `omniRecallHits`, `zoe-dhf-brain` 401 as designed, `zoe-agent` 400 payload
  validation. No 5xx.
- Index size: 1,476 entities across 10 entity types.

## Still open (next pass)

1. **Authenticated end-to-end recall not exercised in CI.** Minting a session
   for a specific test user is blocked by workspace permissions here, so
   per-user RLS-scoped recall was validated by SQL and code review, not by a
   live signed-in call.
2. **No cross-encoder rerank.** Ranking is heuristic (RRF x decay x prior).
   A small rerank model over the top ~30 candidates would improve precision.
3. **No query understanding layer.** Queries go to embedding + websearch tsquery
   verbatim — no synonym/entity expansion, no time-intent parsing
   ("last week", "yesterday's compass").
4. **Citations are prompt-only.** The `ref:` provenance is not yet surfaced as
   clickable sources in the chat UI.
5. **Coverage gaps in the index.** `mmora_memories`, `messages`, and
   `post_comments` are still outside `zoe_universal_index`.
