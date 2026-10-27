# M'Mora Launch Checklist v23 (27 Oct 2026)

## Observed locally (controlled mocks, outside services blocked)
- All 5 notices opened on desktop 1280x1800 and phone 390x844: 5/5 "Draft for review", contact wording incl. 2 "unverified placeholder" lines (support, safety), officer named in 4 jurisdiction notices; 0 page errors, 0 sideways overflow.
- Real-money checkout: none. Fixed gap: Zoe "pay" tool (zoe-matter-bridge) recorded fake "payment_executed" events; it now refuses (PAYMENTS_DISABLED). Deployed.
- Scheduled-credential tests: scheduledAuthority.test.ts, 12 mock guard tests pass.
- Deep-link matrix: launchDeepLinkMatrix.test.ts (7 pass) — /documents, /terms, /data-policy, /auth declared; every document link resolves; notices stay drafts.

## Hosted checks still unverified
- Scheduler jobs actually sending credentials on the live backend.
- Canonical tags/redirects on www.mmora.xyz and myzoe.xyz (myzoe still redirects to mmora).
- Six hosted privacy tests (need isolated backend + 2 test accounts).

## Legal approvals (counsel)
- Review all 5 notices before removing "Draft".
- DMCA agent registration at dmca.copyright.gov.

## Operator decisions (Marc)
- Dedicated support/safety inboxes.
- AI budget amounts and OpenRouter price ceilings.
- Whether/when to add paid checkout; separate documents domain go-ahead.
