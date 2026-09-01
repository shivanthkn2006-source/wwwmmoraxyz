# M'Mora / Zoe / DHF — YouTube, TikTok & Instagram integration audit
Date: 1 September 2026

## 1. Tools used

| Tool | Purpose |
| --- | --- |
| ripgrep code sweep | Locate every YouTube/TikTok/Instagram touch point in `src/` and `supabase/functions/` |
| Supabase read_query | Inspect `content_reports` schema and live rows |
| Supabase migration + security linter | Add the spam flag; re-run the RLS/definer linter |
| Vitest | Roster and growth-figure regression tests |
| tsgo type check + build log | Confirm no type or build regressions |

## 2. Where the platforms are wired

| Surface | Direction | File | Status |
| --- | --- | --- | --- |
| YouTube search → home/Loops feed | inbound | `supabase/functions/zoe-dhf-brain/index.ts` | Wired. Server-side key only (`YOUTUBE_API_KEY`, falling back to `GOOGLE_API_KEY`), `safeSearch=moderate`, quota errors classified as retryable vs fatal. |
| YouTube playback card | inbound | `src/components/home/ExternalVideoCard.tsx` | Wired. `youtube-nocookie.com` embed, one active player at a time via the iframe API, captions forced to the browser locale. |
| YouTube "Zoe watches" analysis | inbound | `supabase/functions/analyze-youtube/index.ts` | Wired. `verify_jwt = true`; only a validated 11-char video id ever reaches an outbound fetch. |
| Instagram / Facebook / LinkedIn / Spotify sync | outbound + inbound | `supabase/functions/zoe-external-sync/index.ts`, `src/hooks/useZoeExternalSync.ts` | Auth-gated (`verify_jwt = true`). TikTok is **not** an ingestion source anywhere. |
| TikTok / Instagram / YouTube share targets | outbound only | `src/components/ExternalShareBridge.tsx`, `src/components/mmora/ImageShareActions.tsx`, `src/hooks/useViralContentEngine.ts` | Share-out only: intent URLs, every field `encodeURIComponent`-escaped, all windows opened `noopener,noreferrer`. No tokens, no scraping. |

**Key conclusion:** there is no TikTok or Instagram *ingestion* path. Only YouTube content enters the feed, and it enters exclusively through a JWT-protected edge function that holds the API key server-side.

## 3. Findings and fixes

| # | Severity | Finding | Resolution |
| --- | --- | --- | --- |
| 1 | Medium | Moderation "spam" state was inferred by regex over the report reason — nothing was persisted, so two moderators could disagree and nothing survived a reload. | Added a real `is_spam` column (plus `review_note`) to `content_reports`; the panel now writes the flag, records `reviewed_by`/`reviewed_at`, and auto-moves an open report to `reviewing` when flagged. Regex is now only a grey "looks like spam" hint. |
| 2 | Low | Moderation queue had no supporting index; a growing queue would scan the table. | Added `(status, created_at desc)` and a partial index on `is_spam`. |
| 3 | Low | `analyze-youtube` calls the InnerTube transcript endpoint with YouTube's own public web key hardcoded. It is a published constant, not a secret, but it is a third-party literal in our source. | Left in place (removing it disables transcripts) and documented. It grants no access to our project. |
| 4 | Informational | Growth roster was dominated by a small set of names in generated cards. | Roster expanded from 151 to **181** figures across science, mathematics, engineering, medicine, philosophy, letters, arts, leadership, social change, exploration and sport; 30 accidental duplicates removed during the merge. |

## 4. Hacker-gate posture (what is closed)

- **No key ever reaches the browser.** YouTube, Cohere, Gemini and NVIDIA keys live only in edge-function environment variables. The client calls `supabase.functions.invoke` and receives results, never credentials.
- **Every video/social function requires a JWT** (`verify_jwt = true` in `supabase/config.toml`) — anonymous callers cannot burn our YouTube quota.
- **No open redirect / SSRF.** Inbound URLs are reduced to an 11-character video id by regex before any fetch; outbound share links are fixed intent hosts with escaped parameters.
- **Third-party frames are cookie-free** (`youtube-nocookie.com`) with `referrerPolicy="strict-origin-when-cross-origin"`, so viewing history does not leak member identity.
- **Row-level security everywhere.** `content_reports` stays admin/moderator-only; a non-admin loading `/admin/control-panel` gets empty result sets and an explicit refusal message rather than a broken page.
- **Sentinel remains live**: session fingerprinting, devtools/source-probe detection, rolling severity scoring and automatic block-out are unchanged by this pass.

## 5. Known open items (pre-existing, not introduced here)

- Database linter still reports one extension in `public` and 59 `SECURITY DEFINER` functions executable by signed-in/anonymous roles. These predate this work; tightening `EXECUTE` grants is the next security pass.
- Leaked-password protection in auth settings is still off.
