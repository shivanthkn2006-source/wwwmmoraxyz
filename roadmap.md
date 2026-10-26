# Privacy repair — 26 October 2026
- [x] Reject discovery/export query errors; block login removal on configured cleanup errors, full storage pages and directories; truthful inline error states.
- [x] Twenty mock-only handler/UI tests passed; cache-bypassed current-source desktop/phone errors inspected, no logout/page errors/overflow.
- [x] Export pagination fixed: pages through all rows (1k pages), fails closed past 100k rows/table instead of silent 5,000-row truncation; 18 handler tests; account-data deployed (SHA 00089337…).
- [x] Offline draft autosave shipped: localStorage+IndexedDB drafts for Home post editor and joke page (600ms debounce, 7-day TTL, 25MB file cap, clear on publish/cancel); 9 tests; signed-in desktop/phone reload-restore visually verified.
- [x] Ads/monetization report delivered (MMora_Ads_Monetization_Report_2026-10-26.md): first-party sponsorship inventory, contextual zero-tracking networks vs AdSense, location-based legal duties, staged plan; no ad code added.
- [ ] Hosted deployment/rights-flow verification not performed (controlled mocks only). Recursive storage cleanup, shared-message policy and retention/vendor decisions remain blockers. Next code-safe stage: recursive paginated storage cleanup or #6 payments trace.

# M'Mora Village roadmap

## Oct 25 v14 — QA finding + audit reconciliation
- [x] Reconciled v13: nine of 11 audit groups still incomplete (#1/#2 bounded, #3/#4 partial, #5–#11 open); one open Project monitoring QA finding claimed and fixed.
- [x] Fixed Messages-list hover hiding name/last message: content raised to relative z-10, overlay hover fill changed from opaque accent to subtle foreground/5 tint in ChatUserCard and FriendCard. New regression test; 4 focused passes; full suite 1,698 passed / 0 failed / 6 skipped; build OK. Signed-in Playwright hover verified at 2x — name, username, last message all visible; zero page errors.
- [ ] Next code-safe stage unchanged: #5 privacy export/deletion caller and failure-handling trace with fake-data tests. Pixazo output contract, isolated privacy identities, devices/screen readers and operator/legal records remain external blockers.

## Oct 25 v12 continuation — remaining launch evidence
- [x] Reconcile all 20 public checklist items and 11 inherited audit groups in v13; nine groups remain incomplete, all 20 retain closure limitations. Restore omitted Pixazo output-contract blocker; do not sum superseded roadmap entries.
- [x] Remove dormant Infinity returned-URL downloader; harden Kaleido normalization and reject Kaleido/JustAPI/ImageNow download redirects. 70 focused / 1,697 full-suite passes, six hosted skips; 84 affected deployments acknowledged, no jobs/member writes.
- [x] Recheck seven public routes at desktop/phone (14 combinations); FAQ keyboard and cookie reopening work, no empty pages/errors/overflow. All screenshots inspected; build OK. v13 saved and collection membership pending upload.
- [ ] Next code-safe stage: trace #5 export/deletion pagination and partial-failure handling using fake data, not production deletion. Pixazo output destination contract and broader #4 aggregate/cancellation budgets remain open.
- [ ] Hosted privacy identities, physical devices/screen readers, authoritative provider contracts and operator/legal decisions remain external closure dependencies.

## Oct 25 isolated privacy continuation
- [x] Trace six live skips: zero of seven isolation settings present. Nine in-memory PostgreSQL migration/RLS tests pass with mocked identities/no HTTP; positive owner update/delete and B self-read gaps repaired in the still-skipped live fixture. No production policy change.
- [x] Document local SQL proof separately from hosted Auth/Data API proof in v11; full suite 1,666 passed / six skipped, build OK. Nine inherited audit groups remain incomplete.
- [ ] Hosted six-case proof still requires isolated non-application backend/two disposable identities; scheduler/source-owner race proof, device/screen-reader/legal/vendor evidence remain outside this local SQL stage.

## Oct 25 v9 launch continuation
- [x] Bound DHF direct download headers/body and fallback body consumption; 67 controlled focused passes, full suite 1,657 passed / six skipped, build OK; five runner importers deployed without jobs or writes.
- [x] Refresh all 20 checklist rows and inherited 11 audit groups in v10; include official-source documentation next steps and eight mocked desktop/mobile public preview states with no blank bodies/page exceptions/overflow.
- [ ] Outside closure remains: isolated privacy environment, provider contracts, operator/legal decisions, real screen readers/devices and successful hosted critical flows.

## Oct 25 accessibility follow-up
- [x] Repair confirmed keyboard gaps in social cards, comments, image viewer, post grid and attachment navigation.
- [x] Recheck 24 desktop/mobile pre-repair views and isolated updated-source keyboard/focus checks; full suite 1,646 passed, six skipped; all 20 rows refreshed in v9.
- [ ] Remaining coverage: live post-repair preview served stale modules; isolated viewer visual layering unverified, mobile member navigation cramped. Real assistive technology/devices, isolated identities, legal/operator/vendor records unavailable.

## Oct 25 public launch and accessibility recheck
- [x] Reconcile all 20 screenshot items in the version 8 Files report; source presence is not launch closure.
- [x] Classify image descriptions, repair shared avatars, informative previews, controls, keyboard attachment opening, headings and landmarks; sign-in handler unchanged.
- [x] Check 21 browser states on desktop/mobile public pages and signed-in member pages with function 503 mocks: zero axe violations/page exceptions/overflow. Keyboard password, Help/FAQ and consent controls exercised. Timed loader clears; no permanent blank reproduced.
- [x] Gate deferred member activity and its send/exit paths on consent; full suite 1,643 passes and six isolated-privacy cases skipped.
- [x] Separate observed coverage from country/legal/provider/device blockers in the report.
- [ ] External closure: isolated backend/two disposable identities, real VoiceOver/NVDA and physical devices, hosted Google/camera/voice/upload/payment/push tests, operator/legal/retention/vendor/country records. Not safe to simulate closure or use production members.

## Oct 24 Google explanation and controlled VR outage checks
- [x] Add concise basic-profile/password/Google-notice explanation beside Google sign-in without changing its handler.
- [x] Reproduce shared map 503 with controlled mocks; three new fallback/cooldown/recovery regressions plus three existing map regressions pass.
- [x] Open actual VR World via localhost harness; choose New York and land on the street. Nine concurrent initial shared-cache 503s open the cooldown; two controlled Overpass responses populate twelve chunks with roads/buildings, no page exceptions. With both services mocked unavailable, renderer/controls/portal remain visible during retry observation; no whole-screen blank confirmed, no map implementation change warranted.
- [x] Record observed results and limitations in docs/GOOGLE_NOTE_VR_503_CHECK_2026-10-24.md. Hosted signed-in Home→VR, physical devices, full outage exhaustion and final Google consent remain unverified; no paid jobs, internal destinations or live member writes invoked. Latest build OK.

## Oct 24 Google notice and edit-reference budgets
- [x] Explain uploaded Google notice using official guidance; no app-requested Gmail/Drive scopes found. Google notice cannot be rewritten; hosted scopes unverified and separate welcome sender blocked by workspace-admin setup permission. Working authentication unchanged.
- [x] Bound reference URL download to stream-counted 6 MiB / combined 45-second header/body deadline before inference; reviewed origins/redirects/MIME/provider sequence unchanged. Two image-field caller mismatches separately recorded, not changed.
- [x] 15 new controlled tests / 52 focused passes; full suite 1,626 passed, zero failed, six skipped; latest build OK. Only edit-image deployed, no internal requests/paid jobs/member writes. Version 5 checklist separates observed proof from unavailable hosted/provider/device/privacy/legal evidence.
- [ ] Next: upstream inline/API/overall limits and caller mismatches; DHF direct storage repaired in v10. Hosted successful editing/storage readback, isolated credentials, physical devices, provider contracts and admin sender setup remain blockers.

## Oct 24 download budgets and proprietary-security review
- [x] Trace non-reader budgets/callers; replace cascade URL whole-body allocation with stream-counted 6 MiB ceiling and 45-second combined header/body deadline; provider/auth/redirect behavior unchanged.
- [x] Map selected client/server security boundaries and staged prevention priorities in MMora_Global_Launch_Checklist_2026-10-24_v4.md; no hidden-client-code or exhaustive security guarantee.
- [x] 19 new tests, 203 focused passes; full suite 1,611 passed, zero failed, six skipped; latest build OK. All 84 transitive source importers deployed, no handlers/internal requests/paid jobs/member writes.
- [x] Edit-image URL reference and DHF direct-storage byte/deadline limits repaired in later stages; API/inline JSON, legacy passthrough/overall budgets remain open with provider/device/isolation/legal evidence unavailable.

## Oct 24 crawler and future recommendation launch request
- [x] Trace three crawler callers; restrict configured origin/root-relative routes, refuse redirects and cancel bodies. 63 new tests, 224 focused passes; crawler deployed without jobs.
- [x] Whole suite: 1,592 passed, zero failed, six skipped. Latest build OK. Hosted refusal-only request returned 401 before origin validation; authenticated hosted crawl not run.
- [x] Review entire uploaded list and deliver MMora_Global_Launch_Checklist_2026-10-24_v3.md with observed evidence, unverified results and external blockers.
- [x] Research private server-side protection, Swiss Ephemeris dual licensing and privacy-safe advertising; future country-scoped proposal only, no tracking/ads/engine added.
- [x] Inspect unchanged signed-out /auth preview with background function requests intercepted; controls visible and zero page errors. Not authenticated Home/crawler proof.
- [ ] Next scoped stage: Cloudflare/Kaleido destination/redirect contracts and callers, then non-reader budgets. Authenticated crawler/configuration, isolated privacy/member resources, physical devices, provider contracts and legal/organisational evidence remain blocked/unverified.

## Oct 23 Ironclad recheck and country-wise launch request
- [x] Re-run relay and reader controlled regressions: 161 cases pass; current relay uses checked-literal TCP and original-host TLS, not a second hostname fetch. No internal requests or paid jobs.
- [x] Reconcile remaining Ironclad evidence and section-wise technical release gates; deliver MMora_Global_Launch_Checklist_2026-10-23_v2.md with country/region starting points and explicit unverified legal coverage. Fresh full suite: 1,529 passed, zero failed, six skipped; no additional relay change warranted. Next code stage remains crawler review.
- [ ] External closure evidence remains required: isolated member/privacy accounts, physical devices, authoritative Pixazo contract and organisational/vendor/legal/assurance records. No fresh whole-platform inventory claimed.

## Oct 23 Ironclad connection and global-launch priorities
- [x] Trace relay callers/claims against audits; replace relay-only DNS-to-fetch handoff with checked-literal TCP, peer verification and original-host TLS; preserve member gate, request/response envelope and unrelated UI/reader/provider behavior. Exported direct wrapper now truthfully reports no relay hop; no active in-repository relay caller found.
- [x] 66 new controlled destination/redirect/method/body/header/socket/truthfulness cases; final suite 1,529 passed, zero failed, six skipped; deno check and latest build OK. Relay deployed; no live internal requests or paid jobs.
- [x] Deliver MMora_Ironclad_and_Global_Launch_Status_2026-10-23.md with section-wise pre-launch and Singapore/US/certification priorities; nine groups still incomplete.
- [ ] Hosted relay/member/device proof requires isolated accounts or physical devices; Pixazo contract and organisational records remain external blockers. DNS underlying cancellation, complete address-registry review, pre-existing falsy-payload semantics and broader privacy claims remain explicit follow-up limitations. Next buildable stage: crawler origin/caller review, then provider/download budgets and #5–#11.

## Oct 23 remaining stages and current status
- [x] Review live source/queue ownership, grants and triggers. Add canonical-owner checks before downstream author/parent/media/inference work and owner-filter missing-source index deletion; admin/scheduler behavior unchanged. Deployed indexer; controlled tests only, no live jobs/member writes.
- [x] Repair six privacy-test fixture safeguards: explicit isolated non-application backend, predetermined-ID-only cleanup, fail on partial configuration/auth/seed/backend errors. Eleven safeguard cases pass; live six remain skipped without isolated accounts/credentials.
- [x] Deliver MMora_Remaining_Stages_Status_2026-10-23.md; 54 focused and 1,463 full-suite passes, zero failures, six skipped, build OK. Nine of eleven reconciled groups still incomplete; no certification claim.
- [ ] Live member/scheduler isolation and privacy proof blocked by isolated backend/accounts; source-owner transfer/trigger and missing-source/race closure require further isolated proof. Pixazo contract, physical-device and organisational evidence remain externally blocked.

## Oct 23 uploaded priority-list continuation
- [x] Restrict shared DHF backfill to the existing verified administrator decision; members never query or enqueue shared videos, scheduler drains unchanged. Six new controlled cases; 21 focused passes; full suite 1,430 passed / six skipped / zero failures; build OK; indexer deployed.
- [x] Deliver MMora_Shared_Enqueue_Stage_2026-10-23.md with observed versus unverified evidence and remaining priorities; no live jobs or other-member writes.
- [ ] Ordinary-member live proof and six privacy checks await suitable isolated backend/accounts; device and organisational evidence require external inputs. Wider trigger/owner review and #4–#11 remain subsequent separately scoped stages, not universally closed.

## Oct 23 approved Pixazo review and original-audit reconciliation
- [x] Trace Pixazo outputs/callers/audits; official endpoint-specific image contract unverified. No guessed allowlist or reader-transport reuse; output destination repair explicitly blocked.
- [x] Independent one-line Pixazo API redirect refusal; existing output parsing/downloads/UI unchanged. 24 new controlled cases, 180 focused passes; full suite 1,424 passed / zero failed / six skipped; runtime check/build OK; 84 affected functions deployed without jobs.
- [x] Deliver MMora_Audit_Progress_and_Pixazo_2026-10-23.md: original 10/current 11 groups retain nine incomplete, 13 defined bounded repair entries (not defects), test deltas and three code-proposal versus broader audit distinction.
- [ ] Pixazo returned-image restriction awaits authoritative exact endpoint/output/destination contract or separately reviewed safe transport; six privacy cases await isolated backend/accounts plus safe fixture repair; wider #3/#4 and #5–#11 remain unfinished.

## Oct 22 approved next backup-provider boundary
- [x] Review DeepAI/Pixazo contracts and remaining API redirects against audits/callers; select DeepAI's documented output example as a bounded supported policy, not a guaranteed exclusive provider contract. Pixazo contract still unestablished.
- [x] DeepAI exact HTTPS origin + nonempty /job-view-file/ path and manual API/download redirects; 44 new tests, 156 focused passes, full suite 1,400 passed / zero failed / six skipped. Runtime compatibility check and preview build OK. No live generation/internal requests/member writes.
- [x] All 84 transitive source entrypoints deployed without invoking handlers. Files report MMora_Backup_Image_DeepAI_Audit_2026-10-22.md separates controlled proof from unverified live compatibility and remaining groups.
- [ ] Broader audit closure waits on separately reviewed Pixazo/provider/relay/crawler/budget repairs, authorized live provider tests, isolated privacy backend/accounts, ordinary-member/device checks and organisational/legal evidence; nine of eleven report groups remain incomplete.

## Oct 22 approved backup-image destination repair
- [x] Trace Horde/DeepAI/Pixazo outputs and 84 transitive source entrypoints; remove Horde's URL authority via documented inline WebP mode, validate job IDs and refuse Horde API redirects. Provider order/UI/unrelated providers unchanged.
- [x] 36 new mocked tests, 116 focused regressions; full suite 1,356 passed / zero failed / six skipped; all 84 source importers deployed. No live generation/internal requests/paid jobs or other-member content writes. Evidence report distinguishes source dependency count from active execution and mock verification from live provider proof.
- [ ] Remaining #4 DeepAI/Pixazo URLs and other provider redirects, relay, crawler and non-reader budgets; real Horde inline generation/rendering unverified (job deliberately not run). Six privacy checks await isolated backend/accounts and safe cleanup; #3 and #5–#11 remain open.

## Oct 22 approved reader connection-level repair
- [x] Trace second DNS resolution and unchanged source callers; checked literal native TCP + peer check + original-host TLS, established HTTP parser, no fetch fallback.
- [x] 22 controlled socket tests + 73 reader regressions pass; full suite 1,320 passed / six skipped / zero failed; native entrypoint check passes, deployed HTTPS/HTTP example.com readable and loopback literal 400. No internal requests, paid edits or other-member content writes. Report separates actual runtime proof from mocked DNS-switch/certificate/redirect boundaries.
- [ ] Remaining broader #4: cascade provider URLs, relay pinning, crawler origin and non-reader budgets; six privacy cases await isolated accounts/backend + safe fixture cleanup. Source DOM reads back but visual capture remains dark; complete citation-click visual proof unverified.

## Oct 22 approved web-reader destination checks
- [x] Trace caller/auth and earlier URL audit evidence; tighten only reader URL/DNS checks and redirect disposal. UI and shared URL helper unchanged.
- [x] 73 mocked reader checks and 153 focused regressions pass; full suite 1,298 passed / zero failed / six skipped. Deployed; three unsafe literal requests return 400, public example.com text reads back through signed-in source DOM. No internal requests or paid jobs.
- [x] Former reader second-resolution gap replaced by native literal TCP + original-host TLS in the next stage; broader #4 and full source-click visual proof remain incomplete as recorded above.

## Oct 22 approved remaining #4 URL fetchers
- [x] Trace DHF storage/cascade, reader/edit-image, relay and crawler; confirmed DHF unchecked redirects, reader/edit-image DNS checks absent, relay DNS-to-fetch gap and admin/cron crawler origin/redirect gap. Live DHF policy is SELECT-only despite table write grants; ordinary-member URL injection is not established.
- [x] Fix the audit's first DHF storage path: exact generated HTTPS origin/path before both attempts, reject direct redirects without invoking fallback, opt-in cascade image redirect rejection. Other cascade defaults, UI, schedules, prompts and storage ownership unchanged; deployed all three runner importers.
- [x] 32 new in-memory tests; 76 focused and 1,207 full-suite passes, zero failures, six isolation cases still skipped. No live storage/generation/cron execution, internal services or paid jobs invoked. Report separates deployed source from runtime/provider/DNS and remaining audit evidence; #4 and nine of eleven ranked groups remain incomplete.

## Oct 22 approved remaining #3 shared queue boundary
- [x] Trace foreground search, health recovery, admin batches and cron: live scheduler active every 10 minutes; wrapper not executable by members/anon. Nine of eleven audit groups still need work or closure evidence.
- [x] Owner-scope member queue selection and atomic claims; retain server-verified admin and existing scheduler shared processing. UI, search and backfill callers unchanged.
- [x] Ten in-memory handler tests; 23 focused passes; full suite 1,175 passed / 0 failed / 6 skipped. Deployed; authenticated stats 200, invalid-session processed=0. No live queue execution/paid jobs requested. Real non-admin and successful scheduled execution remain unverified; broader #3 is not universally closed.

## Oct 21 approved priority #4 and audit reconciliation
- [x] Trace growth-image-validate callers and close private/internal URL fetching using exact caller-origin restriction and rejection of all redirects; UI and unrelated endpoints unchanged.
- [x] Safe mocked destination/redirect tests: 30 new tests, 46 focused passes; full suite 1,165 passed / 0 failed / 6 skipped. Three authenticated deployed unsafe requests return 400; no internal services/paid jobs called.
- [x] Deliver versioned audit reconciliation: current 11 priority groups = 2 implemented bounded fixes, 2 partial, 7 open; six isolation tests skip because two dedicated test accounts are not configured. Broader #3 queue authority and #4 sibling egress remain open, along with live/provider/device/legal evidence.

## Oct 20 whole-platform read-only enterprise audit
- [x] Measure repository, live database, search/menu/route chains and outside-provider call sites with explicit count definitions; runtime counts are not inferred from file counts.
- [x] Revalidate available security signals and automated tests (1,110 passed, 6 skipped); inspect published auth and filtered authenticated Home. Full deployed endpoint/provider and unfiltered flow verification remain explicit limitations.
- [x] Research ISO 27001 and related privacy/security requirements from authoritative sources; distinguish readiness assessment from accredited certification.
- [x] Research Singapore Pte. Ltd. incorporation, foreign-founder eligibility, investor due diligence and PDPA obligations using official sources; visa/grant eligibility and legal/tax filings require founder details and professional review.
- [x] Deliver evidence-based inventory, strengths, root weaknesses, immediate build priorities and unresolved verification limits; preserve all application components. No certified status or precise failed-service total claimed.

## Oct 20 support-hand and grenade follow-up
- [x] Identify rendering sources before grip changes: only Shotgun initially equipped; knife/grenades are intentional one-handed low-ready poses. Thin rear waist accessory belongs to monolithic Zoe mesh; exact accessory identity unconfirmed, preserved.
- [x] Repair alternate-avatar reachable support contacts and one-handed arm relaxation; preserve textures/camera. 27 focused grip/grenade/camera tests pass; Zoe finger closure remains impossible without authored finger joints.
- [x] Correct villager bounded 3D game falloff and independent flash stun; game values unchanged, not real-world injury calculations. Live grenade-villager combat remains blocked by no owned grenades; Drowned/boss listeners still absent.
- [x] Save v4 weapon audit with inspected actual-world Zoe/Ready Player Shotgun and Ready Player pistol evidence; protected browser-local equip/readback, direct scene-only side rotation and cache-bypassed updated modules explicitly distinguished from normal deployment/full gameplay proof.
- [ ] Full remaining avatar/weapon gameplay matrix: rifle/W-870/grenades not owned; Zoe fingers not rigged; normal preview transform stale; combat/throw/movement and physical controller/touch checks not established.

## Oct 20 continuation: first-time panels and focused root scan
- [x] Add unique account claims to launch, film, home message, birth introduction, Genesis, world tutorial and permission introduction; manual news/story remain available. Unit checks pass; full live/cross-device verification still open.
- [x] Review uploaded camera proposal; preserve existing controller, 2.8 m arm, 2.4 m default and damping. Add optional O/icon inspection movement gate; 35 focused tests pass.
- [ ] Re-check both worlds and full live inspection: signed-in Village renders Zoe default with saved Shotgun; Home reload has no startup failure. Story note obstructs held pose; subsequent input test hangs. Real Map and live return remain unverified.
- [x] Save versioned focused integration audit with screenshots and explicit missing proof; counts are source inventory, not a claimed whole-platform failure total.

## Oct 20 real weapon models + grenades
- [x] Preview 3D-file delivery: dev server forwards /__l5e asset files to the published site; GLBs return model/gltf-binary, signed-in Village renders.
- [x] Real CC0 models in hands for all avatars: shotgun→W-870, pistol/Sentinel Nine→Poly Haven service pistol, Bolt Rifle→Poly Haven rifle, knife→Poly Haven dagger, grenades→CC0 Flat Grenades. Brown/black boxes gone; pickups show the same models.
- [x] Knife/grenades one-handed; uploaded rigs' support hand capped at measured arm reach.
- [x] Hand, Flash, Incendiary, Smoke grenades: pickups near the handgun (3 each), equip, Use/G throw on an arc, frag blast/sparks/smoke + villager damage, flash whiteout + 5 s stun, fire patch 7 s, smoke screen 14 s. Isolated screenshots inspected.
- [x] Signed-in Village: Zoe default + equipped Shotgun seen held at the shoulder; orbit keeps her still; reload clean.
- [ ] Not seen in signed-in play: W-870/pistol/knife/grenade equip (account doesn't own them; not added to avoid changing the account), Drowned spit, grenades vs Drowned/bosses (only villagers react).
- [ ] Support hand still short of the pump on uploaded rigs (short arms); Zoe has no finger joints.

## Oct 20 yellow/blue/red testing default
- [x] Uploaded Zoe is the temporary default through shared VillageAvatar in both worlds; one-time migration preserves subsequent manual switches. Two migration/save-preservation tests pass.
- [x] Fix uploaded palm versus wrist contact using bind geometry/world scale; Ready Player fingers curl on its own axes. Textures/camera/gameplay untouched.
- [ ] Fully human grip remains incomplete: Zoe has no finger joints; observed open fingers/clearance need original-rig authoring, not fabricated animation.
- [x] Full suite: 1,091 passed, six skipped; six isolated views inspected; audit saved with actual-world asset delivery blocker.
- [ ] Actual-world default/equip/walk/orbit verification blocked: normal localhost GLB returns HTML; authenticated route falls back. Reported to platform team.

## Oct 20 requested repairs
- [x] Alternate avatars receive existing weapon art and mapped CCD arms; six isolated renders inspected. Shotgun/pistol remain blocks; finger fit is incomplete. Default/camera/stats/saves unchanged.
- [x] Brain verifies authenticated claims before parsing/retrieval; six handler tests pass. Triage/audit retain caller gates and use sovereign cascade; both production guards pass.
- [ ] Hosted valid-session brain/provider and triage/audit checks: deployment/runtime not proved by gateway-level fake-token 401.
- [x] Isolate unrelated call signalling in voice/router fixture; 1,089 tests pass, six skip, no unhandled exception. Historical emitting service is not established.
- [x] Publish Oct 20 follow-up report and six isolated screenshots with gameplay blockers explicit.
- [ ] Full signed-in Village equip/spit and Home-ready reload: asset proxy returns HTML; current Home capture still shows loading, not a completed startup.

## Oct 19 platform audit continuation
- [x] Re-run full tests: 1,080 assertions passed, 6 skipped; run exits unsuccessfully with one unhandled WebSocket/Event error. Not a clean suite.
- [x] Re-check signed-in Home reload: no visible startup failure or page errors; greeting dismissed and Home visible behind permission prompt.
- [x] Re-check W-870 delivery: localhost returns HTTP 200 text/html, not GLB. Live grip and ranged-spit proof remain blocked/unperformed.
- [x] Review current security and integration code; publish revised evidence-separated report with stale-scan caveat and missing functionality.
- [ ] Verify/fix AI auth gate, cross-account findings, arbitrary fetches and private logging individually; current scanner findings date Oct 3 and require revalidation.
- [x] Oct 20 suite exits cleanly (1,089 passed, six skipped), paid-AI and public-auth guards pass; historical WebSocket source remains uncertain.
- [ ] Complete authenticated Zoe-modal/DHF retrieval, village equip/spit, saves/multiplayer and device-only audio checks; blockers and missing proof listed in revised report.

## Oct 19 search integration and camera follow-up
- [x] Connect existing member menu destinations to Home/Zoe platform search, including Village and matching symbols; preserve existing admin hiding. 21 focused tests pass.
- [x] Correct vertical Village drag direction without changing default height, distance, gear or saves.
- [x] Signed-in Home search → Village entry and reload verified. Upward right-drag camera Y 2.4→3.0048; avatar X/Z unchanged to floating-point tolerance. No visible startup/module failure on reload.
- [ ] W-870 visual gameplay verification blocked by preview asset URL returning HTML; actual Village still renders without this gun model. Drowned live spit remains unobserved.
- [ ] Independent Zoe modal click-through and DHF-content retrieval not exercised; shared search source covered by regression tests only.

## Oct 19 live verification request
- [x] Signed-in Home and village reload: no startup failure; earlier failed module URL was not logged, so cause unconfirmed.
- [x] Signed-in village orbit: body stayed at the same spot while camera yaw moved; wheel zoom 75→50; vertical drag measured.
- [ ] W-870 signed-in equip: blocked — account doesn't own it; preview model URL returns a page, not the 3D file.
- [ ] Drowned live 3–8 m spit: not observed in gameplay; covered by range test only.
- [ ] Isolated W-870/Drowned test copy (signed out, no account writes): didn't open the village, so nothing was measured there yet.

## Oct 18 equipped gun hold correction
- [x] Root cause found: Shotgun item (not W-870) drew a loose box + crossed-hands aim pose; W-870 stock frame sat 0.2 m behind shoulder; torso arched back; wrists/fingers used guessed axes. Fixed; isolated evidence grip_fix_before_after_v3.jpg.
- [ ] Signed-in village check of Shotgun/W-870 hold: blocked (no minted session; hosted 3D files return a page instead of the file on localhost).
- [x] Replace detached W-870 overlay with rig-connected grip and support-hand solve; keep skirt default and gameplay unchanged.
- [ ] Isolated rear/side before-after done; walking, firing and authenticated village checks remain; distinguish isolated evidence from authenticated gameplay.
- [ ] Report other weapon models, reload animation and enemy/combat gaps without claiming completion.

## Oct 18 avatar options and inventory repair
- [x] Repair inventory selection/equip interaction; isolated click→equip→unequip verified, 3 gear preservation tests; no item resets or herb colour changes.
- [x] Inspect all six GLBs; optional Zoe and Ready Player rigs (~4.6–4.9 MB) render in isolated poses; skirt remains default. None contains movement clips.
- [x] Wire visual walk/run/jump/stairs/sit/hand-reach telemetry to existing controller; camera/stats/story/saves unchanged. These are procedural poses, not motion capture.
- [x] Isolated inventory + avatar switch verified; render screenshots and evidence-separated report saved. Build OK, 8 focused tests passed.
- [ ] Authenticated village movement, weapon grip/finger contact and avatar-switch readback: blocked by localhost asset proxy returning HTML; isolated renders substitute exact uploaded GLB bytes.
- [ ] Motion-captured fighting, shooting/reload and stair animations: blocked by missing animation clips in uploads; optional rigs currently use basic procedural poses.

## Oct 18 weapon visual review
- [x] W-870 grip-pivot carry adjustment + signed-out fixture before/after evidence; 12 regression tests passed, no account writes.
- [ ] W-870 remaining stock/forearm, fingers, walking/aiming and village-clearance checks: isolated-account sign-in blocked by permission.
- [ ] Drowned 3–8 m spit bug confirmed: approach branch suppresses ranged attack; deferred outside W-870-only scope.
- [x] Upgrade only W-870 mesh/materials/proportions; preserve gameplay and saves.
- [x] Isolated authenticated fixture before/after evidence and honest visual gap report.
- [ ] W-870 authenticated grip/clipping/village lighting and hosted CDN delivery: unverified; fixture used exact GLB interception.
- [ ] Sentinel Nine and Bolt Rifle: unchanged, pending W-870 review.

## Oct 16 progression and collision request
- [ ] End Warden encounter permanently after defeat; auto-save completion and position.
- [ ] Diagnose save failures and verify signed-in restore without altering existing account items.
- [ ] Verify church medallion route and reachable pickup.
- [ ] Stop avatar at doors, signs and villagers; preserve camera distance, improve height.
- [ ] Realistic original enemy/weapon/ammo visuals and effects (not console-game parity).
- [ ] Evidence-separated audit and safe signed-in preview checks; no video.

## Done (automated build checks only)
- [x] Stage 1 survival basics, herbs, ammo, typewriter save
- [x] Varga radio auto-play per chapter
- [x] 64 lane supplies, golden-looking Golden Herbs, chapter auto-save
- [x] Stage 2 Hollow Warden (idle/stalk/lunge, noise-based)
- [x] Stage 3 fuse puzzle (shell + fluid → mixer → fuse → gate → antigen)
- [x] Stage 4 core defence + Verdant Colossus boss
- [x] Stage 5 merchant weapon upgrades + bigger case purchase

- [x] Clock tower: hands on all 4 faces, real local time

- [x] Generator fluid line step in fuse puzzle (code check only, not played)

- [x] Real-weather rain in M'Mora World + village (code check only)

## Open
- [x] Enemy wave at core (code check only)
- [x] Dropped-item pouches, cleared per chapter (code check only)
- [x] Spore fog + auto flashlight (code check only)
- [x] The Drowned at the shore (code check only)
- [x] Glove powers (code check only)
- [ ] Stage 6 team play
- [x] Stage 7 Watch Drill timed bonus mode
- [ ] Multiplayer gaps: own-avatar spacing, hidden-member slot counting, moving between groups
- [ ] Chapter 5+ storyline
- [x] Sync puzzle progress, upgrades, case rows to account (code + tests only)
- [ ] Coin logo (blocked: no file uploaded)
- [ ] Signed-in browser tests (blocked: preview signed out; needs member sign-in)
- [ ] Real phone / installed app tests (blocked: needs user's device)

## Oct 15 request (Marc)
- [x] Coins/rifle loss: device no longer uploads before reading account copy (code + tests)
- [x] Village lights on until 05:54 local (code + tests)
- [x] Villagers indoors/asleep 22:00–06:00 local (code only)
- [x] Clear roads/paths of props; move houses off roads (incl. castle road) (code + road test + preview screenshots; not walked signed-in)
- [x] Villagers walk only on lanes/roads (code + test)
- [x] Villager chores; milkers walk road → farm track → beside the cow, cow holds still (preview data: walked + milking held=true)
- [x] Lamp glow + colour grading + wet ground reflections while raining (preview screenshot)
- [x] Detailed house fronts: carved door arch, chimney, ivy, balcony flower box (preview screenshot)
- [x] More detailed people (code only) + pine forest and boulders on mountains (preview screenshot)
- [x] Village sounds: wind, river, waterfall, wet footsteps, crickets, creaks, crows/dogs (code only, not heard)
- [x] Real local rain/thunder: device location, any precipitation = rain, storm codes, visible rain + lightning bolt (tests + preview screenshots with test switch; not seen at user's real location)
- [ ] Trailer video (last)

## Oct 15 request (2) (Marc)
- [x] Village hanging: fixed light count via light pool (preview: 4 real lights before/after walking)
- [x] More lit windows: houses (back + attic), archive, church (outer face, tower), castle (towers, keep, walls)
- [x] Clock tower + bell tower top lanterns and spire light (preview screenshots)
- [ ] Signed-in walk of routes, coins/inventory across reloads and sign-outs (blocked: no safe signed-in session)

## Oct 22 #4 continued — edit-image reference download
- [x] Restricted member-supplied reference URL to own storage + Google avatars; 18 tests; 1,225 pass / 6 skipped; deployed. Live edit not run (paid).
- [ ] Remaining #4: web-reader DNS boundary, cascade provider-returned URLs, Ironclad relay pinning, crawler origin, size/time caps.

## Oct 25 — Launch checklist: FAQ + cookie consent (Marc)
- [x] FAQ section on Help page: 10 verified answers, 3 flagged for Marc's confirmation (paid tier, country list, app-store links)
- [x] Cookie consent: consent.ts (region lookup via /cdn-cgi/trace, fail-closed, deny-by-default in EU/EEA/UK/CH/BR), ConsentBanner (Accept/Reject/Customize, reopens via Cookie settings), visitTracker gated on consent (no replay, immediate stop on refusal, sign-in records stay essential)
- [x] Data Policy: "Cookies and measurement consent" section + Cookie settings button
- [x] 15 new tests (consent + tracker gating); full suite 1,641 passed / 6 skipped; build OK
- [x] Playwright: banner on /auth, customize, reject → 0 track-visit calls, accept → 3, cookie settings reopen, FAQ renders; zero page errors
- [x] Global launch checklist restored and updated through v10 in Files.
- [x] Image count corrected by later AST review: 106 JSX images, zero missing alt, 18 empty alternatives; bounded accessibility repairs and tests recorded in v9. Full-feature/screen-reader/device closure remains open above.

## 2026-10-25 — cascade API budgets + dock/edit fixes (done)
- [x] Bounded provider JSON/text reads (1 MiB/30s), Cloudflare inline-image cap, Kaleido root-relative path validation, abort-signal cascade stop; 12 new tests; 84 functions deployed
- [x] Fixed edit-image payload field (imageBase64) in PremiumImageGeneration + Webdrop
- [x] Home dock: dev harnesses excluded, 5-column phone layout (verified 390px, 5 cols, 279px panel, no errors)
- [x] Full suite 1,682 passed / 0 failed / 6 skipped (hosted RLS still needs isolated backend)
