# Moving off the managed backend → your own Supabase + Cloudflare

The app is already 100% portable: `src/integrations/supabase/client.ts` reads
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the environment.
Point those at your project and every query, auth call, realtime channel and
edge-function invoke goes to **your** infrastructure.

## 1. Schema (289 migrations)

```bash
export TARGET_REF=<your-ref>
export TARGET_DB_URL="postgresql://postgres:<password>@db.$TARGET_REF.supabase.co:5432/postgres"
./scripts/migrate-to-own-supabase.sh schema
```

## 2. Data

From a machine with the source connection string:

```bash
pg_dump --data-only --schema=public --no-owner --no-privileges \
  "$SOURCE_DB_URL" > mmora-data.sql
psql "$TARGET_DB_URL" -f mmora-data.sql
```

Storage buckets (`zoe-identity`, post media, etc.) copy with:

```bash
supabase storage cp -r ss:///<bucket> ./backup/<bucket> --experimental
supabase storage cp -r ./backup/<bucket> ss:///<bucket> --experimental --project-ref $TARGET_REF
```

## 3. Edge functions (133)

```bash
./scripts/migrate-to-own-supabase.sh functions
supabase secrets set --project-ref $TARGET_REF \
  GROQ_API_KEY=... GOOGLE_API_KEY=... OPENROUTER_API_KEY=...
```

`supabase/config.toml` already carries the per-function `verify_jwt` settings.

## 4. Frontend on Cloudflare Pages

In Cloudflare Pages → Settings → Variables (Production **and** Preview):

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://<your-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | your anon key |
| `VITE_SUPABASE_PROJECT_ID` | `<your-ref>` |

Build command `bun run build`, output directory `dist`.
`public/_redirects` handles SPA routing; `public/_headers` sets caching and the
camera/mic/geolocation permissions policy the app needs.

Or from the CLI:

```bash
cp .env.selfhost.example .env.production   # fill in your values
./scripts/migrate-to-own-supabase.sh frontend
```

## 5. Auth settings to re-create in your project

- Site URL + redirect URLs: `https://myzoe.xyz`, `https://mmora.xyz`, `https://www.*`
- Providers: Email (confirm on), Google OAuth (client id/secret)
- WebAuthn/passkeys are handled by the `passkey-auth` edge function — no provider config needed.

## 6. Cost note

Once the frontend is served from Cloudflare Pages and all queries hit your
Supabase project, the managed backend is no longer in the request path.
No AI provider in this codebase routes through a Lovable gateway — chat, image
and embeddings go direct to Groq / Gemini / OpenRouter / NVIDIA NIM using your
own keys (enforced by `scripts/check-no-lovable-ai.mjs`).
