#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Move this app onto YOUR OWN Supabase project + Cloudflare Pages.
# Nothing here touches the managed backend; it only PUSHES to your project.
#
# Requirements: supabase CLI, wrangler, and your own Supabase project.
#
# Usage:
#   export TARGET_REF=abcdefghijklmnop          # your Supabase project ref
#   export TARGET_DB_URL="postgresql://postgres:<pw>@db.$TARGET_REF.supabase.co:5432/postgres"
#   ./scripts/migrate-to-own-supabase.sh schema     # push all 289 migrations
#   ./scripts/migrate-to-own-supabase.sh functions  # deploy all edge functions
#   ./scripts/migrate-to-own-supabase.sh frontend   # build + deploy to Cloudflare Pages
#   ./scripts/migrate-to-own-supabase.sh all
# ---------------------------------------------------------------------------
set -euo pipefail

STEP="${1:-all}"
: "${TARGET_REF:?Set TARGET_REF to your Supabase project ref}"

push_schema() {
  : "${TARGET_DB_URL:?Set TARGET_DB_URL (postgres connection string of YOUR project)}"
  echo "==> Applying $(ls supabase/migrations | wc -l) migrations to $TARGET_REF"
  supabase db push --db-url "$TARGET_DB_URL"
}

deploy_functions() {
  echo "==> Deploying edge functions to $TARGET_REF"
  for fn in supabase/functions/*/; do
    name="$(basename "$fn")"
    [ "$name" = "_shared" ] && continue
    echo "  - $name"
    supabase functions deploy "$name" --project-ref "$TARGET_REF" || \
      echo "    !! failed: $name (continuing)"
  done
  echo "==> Remember to set function secrets:"
  echo "    supabase secrets set --project-ref $TARGET_REF KEY=value  # GROQ_API_KEY, GOOGLE_API_KEY, OPENROUTER_API_KEY, ..."
}

deploy_frontend() {
  echo "==> Building frontend against $VITE_SUPABASE_URL"
  bun run build
  bunx wrangler pages deploy dist --project-name "${CF_PAGES_PROJECT:-mmora}"
}

case "$STEP" in
  schema)    push_schema ;;
  functions) deploy_functions ;;
  frontend)  deploy_frontend ;;
  all)       push_schema; deploy_functions; deploy_frontend ;;
  *) echo "unknown step: $STEP"; exit 1 ;;
esac
