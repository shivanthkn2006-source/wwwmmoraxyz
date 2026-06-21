# /home Blank-Screen Smoke Test

Automated Playwright check that loads `/home` in the live preview and fails if
the page renders blank, fully black, or stuck on a loading-only screen.

## Run

```bash
# Install browser binaries (one-time)
npx playwright install chromium

# Run against the default preview URL
bun run test:e2e:home

# Or override the target
PLAYWRIGHT_BASE_URL="https://www.mmora.xyz" bun run test:e2e:home
```

## What it checks

1. **DOM**: `#root` is visible, body has text and >= 8 visible elements.
2. **Pixels**: screenshot is not >97% black, has >= 6 distinct color buckets.
3. **Console**: captures `pageerror` / `console.error` for diagnostics.

Screenshots land in `test-results/home-screenshots/` and on failure Playwright
also writes a trace under `test-results/`.
