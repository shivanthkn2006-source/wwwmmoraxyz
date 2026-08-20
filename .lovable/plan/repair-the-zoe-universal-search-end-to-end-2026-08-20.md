# Repair the Zoe universal search end to end

## Confirmed audit findings

- `zoe_universal_index` contains only **1 public loop**. Existing content was never backfilled: 51 posts, 11 profiles, 18 direct messages, and 633 Zoe messages are outside the index.
- Two matching profiles already exist (`Moksha` and `moksh`), but profiles are never sent to the universal index.
- Only Home loop upload and Webdrop call `indexEntity`; voice posts, drafts, offline replay, Zoe-created posts, profiles, chats, and DHF content bypass indexing.
- Browser-side fire-and-forget indexing has no durable retry, so a closed tab or provider/network error permanently loses index work.
- `zoe-index-ingest` currently accepts unverified requests while writing with elevated backend access. A caller can spoof ownership or overwrite another entity's index row.
- “Friends” records cannot actually be read by friends under the current index policy.
- Plain post results have an empty route, so clicking them does not open the post; ambient results use a different routing contract.
- The current “JWT propagation” test checks a mocked session separately and does not prove the function request is authenticated.
- There are no backend contract/RRF tests, no historical backfill test, and no durable production record of zero-result searches or failed ingests.

## Implementation

1. **Secure and validate ingestion**
   - Require an authenticated caller for `zoe-index-ingest`.
   - Derive the caller identity from the token rather than trusting `ownerId`.
   - Validate supported entity types, UUIDs, privacy values, input sizes, media URLs, and ownership before upsert.
   - Prevent cross-user overwrite and prompt-poisoning through arbitrary index records.

2. **Add durable indexing infrastructure**
   - Add an RLS-protected search indexing queue with status, attempts, retry time, and last error.
   - Add database triggers for searchable source changes so posts and profiles are queued regardless of which UI/function created them.
   - Add a protected queue processor that loads canonical source rows, builds safe searchable text/metadata, creates embeddings, upserts the universal index, and retries transient failures.
   - Remove dependence on scattered browser fire-and-forget calls for correctness; client calls may remain only as an optional fast path.

3. **Backfill all existing searchable content**
   - Add an idempotent, cursor-based backfill endpoint for profiles, posts/media/loops/images/quotes, eligible chats, and DHF/memory nodes.
   - Preserve source privacy: global content is public, personal posts are friends-only, and chats/DHF records are owner/private.
   - Run the backfill in bounded batches and verify source-versus-index counts, including searches for `moksh`.

4. **Correct retrieval and access rules**
   - Update index RLS so accepted friends can retrieve friends-only records while private records remain owner-only.
   - Remove misleading direct write grants from browser roles.
   - Harden `zoe_hybrid_search` inputs and preserve keyword-only fallback when embeddings are unavailable.
   - Return deterministic structured results even when synthesis providers fail; retrieval must not depend on Gemini/Groq availability.

5. **Unify frontend result behavior**
   - Give plain post results the same post route used by ambient results.
   - Normalize entity types and dispatch parsing in one tested module.
   - Keep the current floating search layout unchanged.
   - Make errors distinguish no indexed matches, provider degradation, authentication failure, and backend failure.
   - Restrict production debug traces to authorized developer/admin users rather than any `?searchdebug=1` visitor.

6. **Add observability and recovery**
   - Persist minimal search/ingest diagnostics: request ID, stage timings, result count/types, degraded stages, queue attempts, and sanitized errors.
   - Never persist private query context, chat text, embeddings, tokens, or secrets in debug logs.
   - Expose failed queue work for retry and make zero-result searches diagnosable.

7. **Test the real contracts**
   - Add unit tests for dispatch parsing, route normalization, stale-response handling, and failures.
   - Add edge-function tests for auth, ownership, malformed input, provider degradation, and response shape.
   - Add database integration tests for RRF/keyword retrieval and public/friends/private visibility.
   - Add an authenticated end-to-end search test proving the current user token reaches the endpoint, `moksh` returns profile/post/loop matches after backfill, and selecting a result navigates correctly.

## Verification

- Apply schema/policy changes and deploy the ingestion, queue processor, backfill, and ambient-search functions.
- Run the bounded production backfill and compare counts by source/entity/privacy.
- Query `moksh`, representative post text, loop captions/visual text, image/quote content, an owned chat, and an owned DHF record.
- Verify a non-friend cannot retrieve friends/private content and one user cannot overwrite another user's index records.
- Run focused frontend tests, edge tests, database checks, build diagnostics, and an authenticated browser flow without changing the current search layout.

## Technical scope

Likely touched areas: universal-index migrations/policies, new queue/backfill functions, `zoe-index-ingest`, `zoe-ambient-search`, embedding helpers, `useAmbientSearch`, `useHomeSearch`, dispatch parsing/routing, floating search tests, and source-write integration. Existing visual design remains unchanged.
