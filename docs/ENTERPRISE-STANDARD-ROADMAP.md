# M'Mora / Zoe — Reaching Apple / Google Enterprise Standard
Companion to `docs/PLATFORM-AUDIT-2026-09-12.md`. Written 12 September 2026.

This is the engineering-standards report: what an Apple, Google, or OpenAI realtime-assistant
team would require before this platform is allowed near real users, measured against what
exists today (550k lines, 110 routes, 262 tables, 167 backend functions, 778 tests, 15 users).

---

## 0. The honest starting position

| Dimension | Big-tech bar | M'Mora today | Gap |
|---|---|---|---|
| Product surface | 10–20 screens at v1 | 110 routes | 5–7× too wide |
| Test coverage | 70–80% on critical paths, mandatory | ~14% of files carry tests | Severe |
| Latency budget | Written, enforced in CI, blocks release | None enforced | Missing |
| Voice first-token p95 | < 500 ms (Siri/Assistant bar) | unmeasured, observed multi-second | Unknown → must measure |
| Crash-free sessions | > 99.5% tracked per build | no crash reporting at all | Missing |
| Privacy review | Written data-flow doc, signed before code | not written | Missing |
| On-call / incident process | 24/7 rota, defined SLOs, postmortems | none | Missing |
| Rollback | one-click, < 5 min, per feature | redeploy only | Missing |
| Feature flags / kill switches | every risky subsystem | partial (toggles exist) | Partial |
| Access control review | quarterly, least-privilege audited | 707 policies, 5 known leaks | Close, fix the 5 |
| Device QA matrix | dozens of real devices, automated | zero hardware verified | Missing |
| Load proven | 10× expected peak | 0 users load-tested | Missing |
| Accessibility | VoiceOver/TalkBack certified | partial ARIA work | Partial |

The encouraging read: your **data layer is already near the bar** (every table protected,
707 policies, honest degraded states, no fabricated data). What is missing is almost entirely
**engineering discipline infrastructure**, not features. That is cheaper to add than features.

---

## 1. The five non-negotiables (do these before anything else)

Big-tech release engineering rests on five mechanical guarantees. Without all five, nothing else counts.

### 1.1 Measure before you promise
Nothing can be improved that is not on a dashboard. Instrument, in this order:
- Voice: wake-detected → first audio byte out (the number that decides if Zoe feels alive)
- Zoe answer: question sent → first token, and → last token
- Home: navigation → first meaningful paint
- Every backend function: p50/p95/p99 latency, error rate, timeout rate
- Sessions: crash-free rate, per build, per device class

Publish the p95 for each. **You cannot claim "Jarvis-level" until wake→first-audio p95 is under 500 ms and you can show the graph.**

### 1.2 Budgets that fail the build
Once measured, freeze them as CI gates. Apple's internal pattern: a perf regression is a build
break, not a bug ticket. Proposed opening budgets:

| Metric | Budget | Action on breach |
|---|---|---|
| Wake → first audio, p95 | 500 ms | block release |
| Zoe first token, p95 | 900 ms | block release |
| Home first paint, p95 | 1.5 s | block release |
| Backend function p95 | 2 s | block release |
| Crash-free sessions | ≥ 99.5% | halt rollout |
| Bundle size delta per PR | +50 KB | block merge |

### 1.3 Kill switch per subsystem
Every risky subsystem gets a server-side flag that disables it for all users in seconds without
a deploy: voice, always-on mic, DHF learning, feed ranking, media upload, 3D jobs, admin console,
each external provider. Google will not launch a feature that cannot be turned off remotely.

### 1.4 Staged rollout with automatic halt
Never 0→100%. Ship 1% → 5% → 25% → 100%, each stage held long enough to see a full day cycle,
with automatic rollback when crash-free or error rate crosses threshold. This alone converts most
launch disasters into a bad afternoon for 1% of users.

### 1.5 Written privacy data-flow document
An always-listening microphone plus learned personal preferences plus biometrics is the single
highest-scrutiny feature category in the industry. Before more voice work, write down: what is
captured, where it travels, how long it is kept, who can read it, how a user turns it off, how a
user deletes it. You already have the off switch and delete-my-data flow — the document is what
turns them into a defensible position.

---

## 2. Voice: what "Astra level" actually requires

The realtime-assistant bar (Astra, Siri, Assistant) is a pipeline discipline, not a model choice.

**Architecture required**
1. **Streaming everywhere, no request/response hops.** Audio in streams while tokens stream out while speech synthesises. Any step that waits for a previous step to *finish* is a lost second.
2. **Speculative start.** Begin retrieval and the first sentence of the answer before the user stops speaking, on the partial transcript. Discard if the ending changes the meaning.
3. **Backchannel within 300 ms.** A short "mm-hm" or breath while the real answer forms. Perceived latency, not actual latency, is what users judge.
4. **One microphone owner, ever.** Already fixed this cycle — keep it as an architectural rule, enforced by a test.
5. **Barge-in under 150 ms.** Speaking over Zoe must stop her mid-word. Anything slower feels like a machine.
6. **Prefetched credentials and warm connections.** Token, socket, and audio graph ready before the wake word, not after.
7. **On-device wake word.** Cloud round-trips for "hey Zoe" cannot hit 500 ms reliably. This requires the native app.
8. **Graceful degradation ladder,** written down: streaming → non-streaming → cached → text-only → honest "I can't right now". Never silence.

**What blocks you today:** browsers cannot listen with the screen locked or the app backgrounded — a hard platform limit, not a bug. The Capacitor shells exist but are unbuilt and uninstalled. Until they ship, "hands-free anywhere" is not a claim you can make.

---

## 3. Cut the surface area (the highest-leverage decision available)

110 routes across 15 users is the core structural problem. Every route is surface to test, secure,
translate, make accessible, and keep fast. Apple ships a v1 OS feature with a dozen screens.

**Proposal: freeze a beta surface of 15 routes.**
Keep: `/` landing, `/auth`, `/signup`, `/welcome`, `/home`, `/chat`, `/profile`, `/settings`,
`/zoe-audio`, `/astrology`, `/vault`, `/map`, `/help`, `/privacy`, `/terms`.
Everything else moves behind the earned-unlock gate you already built, or a flag. Nothing is
deleted — it becomes post-beta. This cuts test, QA, accessibility, and security work by roughly 80%
without losing a line of code.

---

## 4. Code health

- **Five files of 3,000–5,000 lines** (`ZoeOrbConversationPanel` 4,789, `ZoeAssistant` 4,437, `ZoeInfinityUnlocked` 4,090, `VROMEGAWorld` 3,313, `HomePage` 2,988). At Google these would not pass review; the limit is typically a few hundred lines per file. They are your top regression risk. Split each into a thin view plus tested logic modules.
- **Coverage from ~14% of files to 70% on the critical path**: auth, voice pipeline, mute/wake, feed visibility, payments-adjacent flows, RLS behaviour. Not 70% overall — 70% where a bug hurts.
- **One test per privacy rule.** Every access policy gets a test that asserts an unauthorised reader gets nothing. This is how the 5 open leaks stop recurring.
- **Route gating test.** Assert every route in the registry is either explicitly public or gated. Prevents a future ungated admin page.
- **Contract tests for all 167 backend functions**: authorised call succeeds, unauthenticated call is rejected, malformed input is rejected, timeout path returns an honest error.

---

## 5. Security and privacy to enterprise bar

**Immediate (this week)**
- Fix the 2 error-level leaks (private post tags, private video URLs) and 3 warnings (comment likes, post ratings, follower graph).
- Set the cron and crawler secrets; unauthenticated scheduled endpoints are the classic breach path.
- Move the public-schema extension.

**Before beta**
- External penetration test, plus an internal red team on the voice and admin surfaces specifically.
- Secret rotation policy and an owner per credential; 28 secrets with no rotation schedule is an audit finding.
- Abuse and rate limiting on every user-triggered external-provider call — cost abuse is the realistic attack on an AI product.
- Data retention policy with automatic expiry for voice transcripts and learned preferences.
- Audit log of every admin action, append-only, reviewed monthly.

**Before enterprise customers**
- SOC 2 Type I then Type II (9–15 months of evidence collection — start the clock early if this is a goal).
- GDPR/DPIA for the always-on microphone, data processing agreement, sub-processor list (you have ~18 AI and infrastructure providers — all must be listed).
- Regional data residency story.

---

## 6. Reliability and operations

- **Error tracking** with release tagging and user-impact counts. You currently learn about failures from users.
- **Uptime and synthetic checks** hitting the real signed-in flows every minute, not just the homepage.
- **SLOs, written**: e.g. 99.5% availability, voice success rate 99%, with error budgets that pause feature work when spent.
- **On-call rota and paging**, even if it is one person — an unpaged incident is an unresolved incident.
- **Blameless postmortems** for every user-visible incident, with one durable fix each.
- **Scaling**: partition the high-volume tables (feed events, assistant messages, DHF queue), add read replicas, cache aggressively. Then **prove it with a load test at 10× expected peak** — 5,000 users means test at 50,000.
- **Disaster recovery**: documented restore procedure, and an actual restore rehearsal. Untested backups are not backups.

---

## 7. Device and accessibility QA

- Build a real matrix and automate what can be automated: iPhone (2 generations), iPad, Android flagship + midrange, MacBook Safari + Chrome, Windows Chrome + Edge, PWA installed on both mobile platforms.
- Hardware audio: AirPods, one other Bluetooth headset, wired, and speaker — for each: wake, answer, barge-in, call interruption, disconnect mid-answer.
- Accessibility: full VoiceOver and TalkBack pass, keyboard-only navigation, contrast audit, reduced-motion support, captions on the greeting video.
- Localisation readiness even if you ship English only: no hardcoded strings, no text baked into images.

---

## 8. Twelve-month plan to a defensible public beta

**Months 1–2 — Foundations.** Fix the 5 privacy leaks and secrets. Add error tracking, latency instrumentation, feature flags and kill switches. Freeze the 15-route beta surface. Write the privacy data-flow document. *Exit: every metric in section 1.1 is on a dashboard.*

**Months 3–4 — Voice to the bar.** Streaming end to end, speculative start, backchannel, 150 ms barge-in, prefetched connections. Build and install the iOS and Android shells with on-device wake word and locked-screen listening. *Exit: wake→first-audio p95 under 500 ms on real hardware, demonstrated.*

**Months 5–6 — Hardening.** Split the five oversized files. Coverage to 70% on critical paths, one test per privacy rule, contract tests for all backend functions. CI budget gates turned on. *Exit: a red build actually blocks a release.*

**Months 7–8 — Scale and operate.** Table partitioning, read replicas, caching, CDN and HLS for video. Load test at 50,000 users. SLOs, on-call, DR rehearsal. *Exit: 10× peak sustained with budgets met.*

**Months 9–10 — Trust.** External pen test and red team, remediation. Accessibility certification. Retention and rotation policies live. Store submissions and review. *Exit: clean pen-test report, apps approved.*

**Months 11–12 — Staged beta.** 100 users → 1,000 → 5,000, staged with automatic halt, weekly bug bash, postmortems. *Exit: 5,000 users, crash-free above 99.5%, budgets held for four consecutive weeks. That is a public beta you can defend.*

---

## 9. What this costs

| Model | Team | Cost / 12 months |
|---|---|---|
| Minimum credible | 1 staff eng + 1 mobile eng + 1 SRE + 1 QA, fractional design/PM | **$650k–850k** |
| Comfortable | 6 eng (2 mobile, 2 platform, 1 SRE, 1 QA) + design + PM | **$1.4M–1.8M** |
| Big-tech equivalent | 40–120 people | **$25M–80M** |

Plus one-off: pen test $25k–60k, SOC 2 Type II $60k–150k, device lab $10k, load testing $5k–15k,
app store and legal $10k–25k.

**Infrastructure at 5,000 active users**, realistic monthly: database and hosting $500–1,500;
voice (speech-to-text and synthesis) $2,000–8,000 depending on minutes per user; language models
$1,500–6,000 with caching; news, maps, media, email, SMS $500–1,500. **Total $4,500–17,000/month**,
i.e. roughly **$1–3.50 per active user per month**. This is the number that decides your pricing —
an always-listening assistant is a genuinely expensive product to run, and caching, small models
for routine turns, and per-user quotas are not optimisations but requirements.

---

## 10. The three decisions that matter most

1. **Cut to 15 routes for beta.** Nothing else buys as much quality per unit of effort.
2. **Build the native apps.** The core promise — a voice assistant always there — is physically unavailable in a browser tab. Everything else in the voice plan is secondary to this.
3. **Instrument and gate before building more.** Once budgets fail the build, quality stops depending on anyone remembering to care.

Everything else in this report is execution.
