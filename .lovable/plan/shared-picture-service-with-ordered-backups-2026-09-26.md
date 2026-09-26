# Shared picture service with ordered backups

## Goal
Every part of M'Mora that creates pictures goes through one shared picture service. Each picture is made once, saved, and reused everywhere (Home/Global, Zoe's LOL page, calendar). If one service fails, the next one is tried, in this order:

1. **Pollinations** (current, no account)
2. **ImageNow** (AI generator, free account key)
3. **Free.ai** (AI generator, only if it offers a usable API; skipped if it has none)
4. **KaleidoImages** (stock library, used only when its keywords match the content)
5. **JustAPI photos** (stock library, keyword-matched only)
6. **placeholdr.dev** (simple filler picture closest to the keywords, last resort)

## Steps (each one built, then tested before moving on)
1. Check each service's real documentation and test it live. Services with no working API are reported and skipped.
2. Build the shared picture service. It tries each service in order, records which one worked, and saves the picture to storage one time.
3. Add each backup one by one, with a live test after each (Pollinations first, then 2 to 6).
4. Ask you for account keys only for the services that need one, one secure form each.
5. Switch Zoe's LOL to the shared service, then fill in the 3 older joke cards that are missing pictures.
6. Find every other part of the app that creates pictures and switch it to the shared service. Nothing else about those features changes.
7. Check that Home/Global and the Zoe's LOL page show the same saved joke and picture. Nothing gets generated twice.
8. Test signed in as @moksh50 on desktop, phone, tablet and installed-app screen sizes, with screenshots.
9. Write the final Zoe's LOL audit: what works, missing pieces, duplicates, what's left.

## Rules kept
- One saved picture per card, never regenerated after it's stored.
- Stock and filler pictures are only used when their keywords match the content.
- No service logos or watermarks shown.
- The rule that Pollinations is the only provider gets replaced with the new ordered backup rule.

## Technical section
- New `supabase/functions/_shared/imageProviders.ts`: cascade with per-provider adapters, timeout-free fetches, 429/5xx fall-through, keyword-match check for stock tiers, upload to the existing bucket, returns `{url, provider}`.
- A new `image_generations` table (prompt hash, provider, storage path, entity reference) makes each result idempotent, so the same prompt and card never create a second picture.
- `generate-humor-drops` and the other image-producing edge functions import the shared module.
- Secrets: `IMAGENOW_API_KEY`, `KALEIDO_API_KEY` (only if required), requested via the secure form.
- The rule in AGENTS.md is updated. Vitest covers cascade order, keyword gating and single-generation. Playwright takes screenshots at 4 viewports.
