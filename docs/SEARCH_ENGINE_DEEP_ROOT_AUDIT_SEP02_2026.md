# M'Mora / Zoe / DHF — Search Engine Deep-Root Architecture & Audit
Standalone audit · generated 2026-09-02 (07:30 UTC / 13:00 IST) · scope: the complete search
subsystem (icon → bar → dropdown → retrieval → synthesis → in-feed rendering), its security
envelope, its data plane and its integration history. Nothing outside the search surface was
modified in this pass.

---

## 0. Executive summary

| Area | Status |
|---|---|
| Search UI (icon, bar, dropdown) | Rebuilt to true Cyber-Night glassmorphism; responsive on every viewport |
| Retrieval (platform lanes) | Working — 6 internal lanes over `zoe_universal_index` + live tables |
| Retrieval (external lanes) | Working — 7 keyless lanes (web, image, video, news, music, shopping, weather) |
| Synthesis (Zoe) | Working with keyless local fallback when the AI lane is unreachable |
| In-feed rendering | Working — all results open inside M'Mora, never in an external tab |
| Security | RLS enforced on all indexed tables; secrets server-side only; `external-search` is public-by-design and rate-limited by the shared WAF |
| Lovable AI dependency | **None** — enforced by `scripts/check-no-lovable-ai.mjs` tripwire |
| Open items | 6 (section 9) |

---

## 1. Layer map (end-to-end circuit)

```text
                         ┌──────────────────────────────────────────┐
   USER GESTURE          │  DraggableHomeControl (glass pill, 36px) │
   tap / ⌘K / dock ─────▶│  storageKey mmora.home.search-position.v3│
                         └───────────────┬──────────────────────────┘
                                         │ setSearchOpen(true)
                                         ▼
                    ┌───────────────────────────────────────────────┐
                    │  GLASS QUERY BAR  (rounded-full, bg-white/6,  │
                    │  backdrop-blur-2xl + saturate-150)            │
                    │  width = min(freeSpace, 620 / 520 / fill)     │
                    └───────────────┬───────────────────────────────┘
                                    │ onQueryChange (controlled by HomePage)
                                    ▼
        ┌───────────────── DEBOUNCE / CLASSIFY ─────────────────────┐
        │ 250 ms UI debounce · 550 ms external debounce             │
        │ classifyQuery() → entity | media | shopping | weather |   │
        │                    semantic     (src/lib/searchSanitize)  │
        └───────┬───────────────────────────────┬───────────────────┘
                │                               │
      ┌─────────▼──────────┐          ┌─────────▼───────────────┐
      │ PLATFORM CORE      │          │ EXTERNAL CORE           │
      │ useHomeSearch()    │          │ fn: external-search     │
      │ • profiles         │          │ • DuckDuckGo/HTML web   │
      │ • posts + OCR      │          │ • Wikipedia / Archive   │
      │ • loops            │          │ • RSS news (sanitised)  │
      │ • zoe chats        │          │ • image lane            │
      │ • DHF nodes        │          │ • video lane            │
      │ • tags / creators  │          │ • Open-Meteo weather    │
      └─────────┬──────────┘          │ • shopping (price,      │
                │                     │   stock, rating, geo)   │
      ┌─────────▼──────────┐          └─────────┬───────────────┘
      │ SEMANTIC CORE      │                    │
      │ fn: zoe-ambient-   │                    │
      │ search (pgvector   │                    │
      │ over zoe_universal │                    │
      │ _index) + NIM/     │                    │
      │ Gemini/Cohere/Groq │                    │
      └─────────┬──────────┘                    │
                └────────────┬──────────────────┘
                             ▼
            ┌────────────────────────────────────────┐
            │ GLASS DROPDOWN (rounded-3xl, blurred)  │
            │ chips → insight lines → platform rows  │
            │ → Zoe synthesis → internet rows        │
            │ maxHeight = viewportH − top − 24px     │
            └───────────────┬────────────────────────┘
                            │ openInFeed()
                            ▼
     window event `mmora:feed-external-videos`  →  HomePage feed slides
     window event `mmora:exit-search-videos`    →  restore user feed
```

## 2. File-level inventory (deep-root scan)

### 2.1 Client
| File | Role |
|---|---|
| `src/components/home/HomeFloatingTools.tsx` | Search icon + glass bar + glass dropdown, chips, in-feed dispatch (the surface in production) |
| `src/components/home/DraggableHomeControl.tsx` | Draggable 36px control, logo safe-zone + sibling anti-overlap + viewport reclamp |
| `src/components/search/ZoeSearchModal.tsx` | Isolated dual-core console rendered only at `/search-preview` |
| `src/pages/SearchPreviewPage.tsx` | Sandbox route (light route allowlist) for design/QA iterations |
| `src/hooks/useHomeSearch.ts` | Platform retrieval, filter chips, counts, `recordHomeSearch` telemetry |
| `src/core/ports/useAmbientSearch.ts` | Synthesis port → `zoe-ambient-search`, intent + dispatch actions |
| `src/hooks/useSearchIndexHealth.ts` | Empty/stale index detector with auto-backfill |
| `src/hooks/usePlatformInsight.ts` | 5-line structural answers (routes, components, live counts) |
| `src/lib/searchSanitize.ts` | HTML/CDATA/entity stripping, favicon + host, relative time, intent classifier |
| `src/lib/feedSearchItems.ts` | Canonical `FeedSearchItem` shape, kind labels, product/portal tags |
| `src/lib/ambientDispatch.ts` | Entity/dispatch → route resolution |
| `src/components/home/SearchDebugPanel.tsx` | Admin-only retrieval trace |

### 2.2 Edge functions
| Function | JWT | Purpose |
|---|---|---|
| `external-search` | `verify_jwt = false` | Keyless outside-platform lanes; no secrets read, no DB writes |
| `zoe-ambient-search` | `verify_jwt = true` | pgvector retrieval + provider cascade synthesis |
| `zoe-search-indexer` | `verify_jwt = true` | Batch (re)index into `zoe_universal_index` |
| `zoe-index-ingest` | `verify_jwt = true` | Incremental single-entity ingest |
| `_shared/zoe-embeddings.ts` | — | Embedding helper (NVIDIA NIM → Gemini → Cohere cascade) |
| `_shared/zoe-search-auth.ts` | — | `requireSearchUser`, UUID + safe-URL guards |
| `_shared/waf.ts` | — | IP scoring / rate limiting for public functions |

### 2.3 Data plane
`zoe_universal_index` (pgvector) — one row per indexed entity (`entity_type`, `entity_id`,
`content`, `embedding`, `owner_id`, `visibility`), plus source tables `profiles`, `posts`,
`post_attachments`, `loops`, `zoe_chat_messages`, `dhf_feed_items`. Nine migrations
(2026-08-20 → 2026-08-21) created the index, GRANTs, RLS policies and the match RPC.

## 3. Security circuit (search-specific)

1. **Row-level isolation.** Every source table and `zoe_universal_index` has RLS enabled with
   explicit `GRANT`s. Private chats and unpublished posts are only matchable by their owner —
   verified by the `agent_interactions` RLS isolation suite pattern.
2. **Public lane containment.** `external-search` is intentionally unauthenticated (it must work
   before hydration), but it reads **no secrets**, writes **no rows**, and only proxies public
   endpoints with a fixed browser UA and 9s abort timeouts. Threat scoring/rate limiting comes
   from the shared WAF rules.
3. **Authenticated lanes.** `zoe-ambient-search`, `zoe-search-indexer`, `zoe-index-ingest` all
   require a JWT and re-resolve the caller with `requireSearchUser` before touching data.
4. **Injection / render safety.** All feed-provided strings pass `sanitizeText()` (script/style
   strip, tag strip, CDATA unwrap, entity decode) before rendering. URLs pass `safeHttpUrl()`.
5. **Key hygiene.** No provider key ever reaches the browser; the client only sees the backend
   URL and the publishable key. `scripts/check-backend-target.mjs` and
   `scripts/check-no-lovable-ai.mjs` fail the build if that changes.
6. **Telemetry.** `recordHomeSearch` stores query + chosen result under the caller's own row
   only; the Sentinel pipeline records probe/abuse behaviour separately.

## 4. Real-time metadata flow

- Indexing is event-driven: post/loop/chat inserts call `zoe-index-ingest`, which embeds the new
  content and upserts into `zoe_universal_index` within the same request.
- `useSearchIndexHealth` runs on search open; if the index is empty/stale it triggers a bounded
  auto-backfill and shows the "Zoe is rebuilding it now" notice instead of a silent zero-state.
- Platform counts, chips and insight lines recompute on every debounce tick, so a post created
  seconds earlier is findable without a reload.

## 5. Design audit — what was wrong and what changed

**Defect found (matches both screenshots):** the production search bar and dropdown used
`bg-background/80` and `bg-background/90`. On the dark theme those tokens resolve to a near-opaque
slab, so the blur was invisible — the result was the solid black pill and solid black dropdown in
the screenshots, not the glassmorphism specified.

**Fixed in this pass (search surface only):**
- Search icon is now a transparent glass pill: `border-white/15 bg-white/5 backdrop-blur-xl backdrop-saturate-150`.
- Query bar and dropdown share one `glassSurface` token: `bg-white/[0.06]`, `border-white/15`,
  `backdrop-blur-2xl backdrop-saturate-150`, soft outer shadow, `rounded-full` / `rounded-3xl`.
- Dropdown internals converted from `muted`/`border` tokens to white-alpha so text, chips, tags
  and hover states read correctly over a translucent panel.
- Responsiveness: a viewport listener (`resize` + `orientationchange`) drives the sizing.
  Bar width = `min(freeSpace, fill | 520 | 620)` by breakpoint; dropdown height =
  `viewportH − dropdownTop − 24`, so phones, iPads, laptops and ultrawides all fit without clipping.
- The bar and dropdown anchor to the right of the icon column, so they never cover the camera,
  feed, bug or Zoe controls, and `DraggableHomeControl` keeps the icon out of the logo safe zone.

## 6. Wiring verification (buttons / icons / events)

| Control | Wired to | Status |
|---|---|---|
| Search icon (tap) | `setSearchOpen(toggle)` | OK |
| Search icon (drag) | position persisted to localStorage, reclamped on resize | OK |
| Dock search icon | `mmora:open-home-search` event | OK |
| Escape key | close bar (global + input handler) | OK |
| ↑ / ↓ / Enter | active-row navigation + `handleSelect` | OK |
| Clear (X) in bar | `onQueryChange('')` | OK |
| Category chips | internal filter + external kind map | OK |
| Insight line | `navigate(line.route)` | OK |
| Platform row | `recordHomeSearch` → route or in-place filter | OK |
| Ambient record row | `routeForEntity` navigate | OK |
| "Open N in feed" | `mmora:feed-external-videos` | OK |
| Internet row | `openInFeed(items, item.id)` | OK |
| Feed exit icon | `mmora:exit-search-videos` | OK |

## 7. Integration timeline (search subsystem)

| Date | Delivery |
|---|---|
| 2026-08-20 | Decoupled Headless Retrieval Orchestrator: `zoe_universal_index`, pgvector RPC, indexer + ingest functions, NIM/Gemini/Cohere/Groq cascade |
| 2026-08-21 | RLS + GRANT hardening for the index, admin `/admin/search-index` panel, health/backfill hook |
| 2026-08-25 | Platform chips (profiles, posts, loops, chats, images, videos) + counts + telemetry |
| 2026-09-01 | Unified in-feed results: `FeedSearchCard`, parallel external lanes, no external tabs |
| 2026-09-02 (early) | RSS/HTML sanitisation, intent classifier, `/search-preview` dual-core console, local synthesis fallback |
| 2026-09-02 (this pass) | Glassmorphism restyle of the live icon/bar/dropdown + full-viewport responsiveness + this audit |

## 8. Coverage of the 70+ page surface

Indexed and reachable from search: profiles, posts (incl. OCR text on image posts), loops, Zoe
chat memory, DHF compass/feed nodes, growth insight cards, admin routes (admin-gated), and
structural platform answers from `usePlatformInsight` covering route/component inventory. Routes
that intentionally stay out of the index: auth screens, password recovery, the sovereign vault
console, and raw diagnostic/export endpoints.

## 9. Open items

1. `external-search` has no per-IP quota of its own beyond the shared WAF rules — add a
   function-local token bucket before public Beta traffic scales.
2. Shopping lane rating/review counts come from portal markup and can be stale; needs a freshness
   stamp on the card.
3. Image lane has no NSFW/spam classifier yet.
4. `zoe_universal_index` has no scheduled re-embedding job for edited content (only inserts).
5. Search telemetry has no retention job; it should join the weekly `prune_platform_telemetry()`.
6. No synthetic uptime probe dedicated to the search path (edge probe covers function boot only).

## 10. Restricted-component check

No Lovable AI Gateway calls, no Lovable-hosted inference, and no Lovable-managed keys exist in any
search file. Providers used are the project's own server-side keys (NVIDIA NIM, Gemini, Cohere,
Groq, Deepgram) plus keyless public endpoints. The `check-no-lovable-ai.mjs` tripwire enforces
this on every build.
