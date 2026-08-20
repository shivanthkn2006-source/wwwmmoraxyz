# Finish removing Lovable AI billing from the backend

## What the scan actually found

The earlier "60 functions still on the Lovable gateway" claim is out of date. A fresh scan of `supabase/functions` and `src` shows:

- Only **3 files** mention the gateway at all: `_shared/sovereign-ai.ts`, `_shared/astro-content.ts`, `_shared/motivation-content.ts`.
- **Zero** raw `fetch("https://ai.gateway.lovable.dev/...")` calls remain. The two content files call `sovereignFetch(...)`, which intercepts the gateway URL and reroutes to your own providers (Groq → Google AI Studio → OpenRouter, Pollinations for images).
- **64 functions** import the sovereign shim, so the routing is already in place platform-wide.

So the migration is effectively done; what is left is cleanup and a guarantee that it cannot regress.

## Plan

1. **Delete the leftover gateway URLs.** In `astro-content.ts` and `motivation-content.ts`, replace the `https://ai.gateway.lovable.dev/v1/chat/completions` argument with a neutral sentinel (`sovereign://chat/completions`) so no Lovable URL exists in the codebase. `sovereignFetch` accepts it unchanged.

2. **Turn the soft guard into a hard one.** `assertNoLovableGateway` currently only logs a warning. Change it to throw, and have `sovereignFetch` reject any `ai.gateway.lovable.dev` URL and any use of `LOVABLE_API_KEY` outright, with a clear error naming the file that tried it. Nothing can silently fall back to billed credits again.

3. **Add a repo-level tripwire.** A tiny check script (`scripts/check-no-lovable-ai.mjs`) that greps `supabase/functions` and `src` for `ai.gateway.lovable.dev` / `LOVABLE_API_KEY` and exits non-zero if found, so a future edit that reintroduces it is caught immediately.

4. **Verify provider keys.** Confirm `GROQ_API_KEY`, `GOOGLE_AI_STUDIO_KEY`, `OPENROUTER_API_KEY` are present in backend secrets and report which are missing — the fallback ladder degrades silently without them. No key values are read or printed.

5. **Live smoke test.** Invoke one text function (`generate-text`) and one image function (`generate-image` / `pollinations-image`) and read the actual responses, confirming they return content and that logs show the sovereign provider used, not the gateway.

## Scope guard

No changes to the homepage, feed, Zoe UI, astro dispatch logic, or any component. Backend shim and content helpers only — the prompt text and model behaviour stay exactly as they are.
