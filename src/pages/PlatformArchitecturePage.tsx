/**
 * PLATFORM ARCHITECTURE MAP — standalone reference surface
 * Route: /platform-architecture
 *
 * Living documentation of the M'Mora / Zoe / DHF runtime: layer diagrams,
 * security circuit, realtime + AI routing, cron schedule and audit status.
 * Data below is a snapshot recorded at the timestamp in SNAPSHOT.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Shield, Layers, Radio, Cpu, Database, Clock, AlertTriangle,
  CheckCircle2, Workflow, Bug,
} from 'lucide-react';

const SNAPSHOT = {
  takenAt: '2026-09-01T08:49Z',
  sourceFiles: 1599,
  sourceLines: 440996,
  routes: 93,
  edgeFunctions: 141,
  migrations: 330,
  tables: 229,
  policies: 661,
  tablesWithoutRls: 0,
  cronJobs: 9,
  dbSize: '267 MB',
  unitTests: 578,
  skippedTests: 6,
};

type SectionId = 'layers' | 'security' | 'realtime' | 'ai' | 'data' | 'cron' | 'audit';

const SECTIONS: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: 'layers', label: 'System layers', icon: Layers },
  { id: 'security', label: 'Security circuit', icon: Shield },
  { id: 'realtime', label: 'Realtime & feed', icon: Radio },
  { id: 'ai', label: 'AI routing', icon: Cpu },
  { id: 'data', label: 'Data layer', icon: Database },
  { id: 'cron', label: 'Scheduled jobs', icon: Clock },
  { id: 'audit', label: 'Audit status', icon: Workflow },
];

const Diagram: React.FC<{ title: string; children: string }> = ({ title, children }) => (
  <Card className="p-4 overflow-x-auto bg-card/60 border-border">
    <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
    <pre className="text-[11px] leading-[1.35] text-muted-foreground font-mono whitespace-pre">
      {children}
    </pre>
  </Card>
);

const Stat: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <Card className="p-3 bg-card/60 border-border">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-lg font-semibold text-foreground">{value}</div>
  </Card>
);

const PlatformArchitecturePage: React.FC = () => {
  const [active, setActive] = useState<SectionId>('layers');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 py-6">
        <h1 className="text-2xl font-bold">Platform Architecture Map</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Runtime topology, security circuit and integration status. Snapshot {SNAPSHOT.takenAt}.
        </p>
      </header>

      <div className="px-4 py-5 grid grid-cols-2 md:grid-cols-6 gap-3">
        <Stat label="Source files" value={SNAPSHOT.sourceFiles} />
        <Stat label="Routes" value={SNAPSHOT.routes} />
        <Stat label="Edge functions" value={SNAPSHOT.edgeFunctions} />
        <Stat label="Tables" value={SNAPSHOT.tables} />
        <Stat label="RLS policies" value={SNAPSHOT.policies} />
        <Stat label="DB size" value={SNAPSHOT.dbSize} />
      </div>

      <nav className="px-4 flex flex-wrap gap-2 pb-4">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            size="sm"
            variant={active === id ? 'default' : 'outline'}
            onClick={() => setActive(id)}
          >
            <Icon className="w-4 h-4 mr-1.5" />
            {label}
          </Button>
        ))}
      </nav>

      <main className="px-4 pb-16 space-y-4">
        {active === 'layers' && (
          <>
            <Diagram title="End-to-end request path">{`
 ┌─────────────────────────── CLIENT (React 18 + Vite) ───────────────────────────┐
 │  App.tsx  →  AppErrorBoundary  →  PlatformLayout                               │
 │     ├── GlobalRealtimeProvider    (ref-counted realtime channels)              │
 │     ├── SecurityShell             (VoidShell / DevToolsTrap / Fortress)        │
 │     ├── SentinelWatchHost         (threat probes + scorched-earth lockout)     │
 │     ├── GlobalHomeDock            (nav, notifications, Zoe orb)                │
 │     └── <Route> lazy pages (93)   Home · Loops · DHF · Zoe · Admin             │
 └──────────────┬─────────────────────────────────────────────────────────────────┘
                │ supabase-js (anon key, JWT session, brokered preview storage)
 ┌──────────────▼──────────────── LOVABLE CLOUD (backend) ────────────────────────┐
 │  PostgREST  →  RLS (661 policies / 229 tables / 0 without RLS)                 │
 │  Auth       →  email+password, Turnstile CAPTCHA on sign-up, user_roles/has_role│
 │  Storage    →  media, documents, growth imagery                                │
 │  Realtime   →  postgres_changes multiplexed by GlobalRealtimeProvider          │
 │  Edge fns   →  141 Deno functions (verify_jwt on all AI surfaces)              │
 │  pg_cron    →  9 jobs (growth dispatch, DHF prewarm, essays, audits, prune)    │
 └──────────────┬─────────────────────────────────────────────────────────────────┘
                │ server-side keys only (never shipped to the browser)
 ┌──────────────▼──────────────── EXTERNAL PROVIDERS ─────────────────────────────┐
 │  Gemini / Google AI · Cohere · NVIDIA NIM · Groq · Deepgram (TTS)              │
 │  Pollinations (imagery) · YouTube Data API · Open-Meteo · ipwho.is (GeoIP)     │
 │  Cloudflare Turnstile · TencentDB memory gateway                               │
 └────────────────────────────────────────────────────────────────────────────────┘`}</Diagram>

            <Diagram title="Feature domains">{`
  M'MORA (social)        ZOE (assistant)          DHF (astro/growth)
  ─────────────────      ────────────────         ────────────────────
  Home feed              Orb conversation panel   Swiss-ephemeris day-lord
  Loops (9:16)           Capability router        Daily Compass cards
  Mixed uploads          Document X-ray           Growth insight engine
  Comments / likes       Song identification      181-figure roster
  Live channels          Provider health          Essay scheduler + reader
  Notifications          Narration (Deepgram)     Astro audit + trace
  Moderation queue       Universal search (pgvector)`}</Diagram>
          </>
        )}

        {active === 'security' && (
          <>
            <Diagram title="Security circuit (defence in depth)">{`
   visitor
     │
     ▼
 ┌───────────────┐  blocked?   ┌──────────────────────────────┐
 │ SentinelWatch │────────────▶│ sentinel-guard (edge)        │
 │ devtools /    │  heartbeat  │  · GeoIP via ipwho.is        │
 │ view-source / │◀────────────│  · device fingerprint + HW   │
 │ page-save     │  verdict    │  · severity score ≥ 12 = ban │
 └──────┬────────┘             └───────┬──────────────────────┘
        │ signed out + locked           │ writes
        ▼                               ▼
   /auth gate                sentinel_sessions · sentinel_threat_events
        │                               · sentinel_blocks
        ▼                               (admin-only RLS + explicit GRANTs)
 ┌───────────────────────────────┐
 │ Sign-up: Cloudflare Turnstile │──▶ signup-security (server verify, fail-closed)
 └──────────────┬────────────────┘
                ▼
 ┌───────────────────────────────────────────────────────────────┐
 │ Session (JWT)  →  ProtectedRoute  →  RLS on every read/write   │
 │ Roles: user_roles + has_role('admin')  (never on profiles)     │
 │ Admin surfaces: /admin/sentinel · /admin/control-panel · …     │
 │ Immutable-column triggers on profiles + messages               │
 │ Edge functions: verify_jwt on AI routes, service_role writes   │
  └───────────────────────────────────────────────────────────────┘`}</Diagram>

            <Card className="p-4 bg-card/60 border-border">
              <p className="text-sm text-muted-foreground">
                Every rule enforced by the Cloudflare edge, the shared WAF guard and Sentinel — with its detection,
                automatic mitigation and escalation path — is published on the attack response plan.
              </p>
              <Link
                to="/attack-response"
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                Open the attack response plan →
              </Link>
            </Card>



            <Diagram title="Secret handling">{`
  browser  ─── never sees ───▶  GOOGLE_API_KEY, COHERE_API_KEY, NVIDIA_*,
                               DEEPGRAM_*, TURNSTILE_SECRET, service_role
  browser  ─── may see ─────▶  VITE_SUPABASE_URL, publishable anon key,
                               Turnstile site key (public by design)
  guard:   scripts/check-backend-target.mjs · scripts/check-no-lovable-ai.mjs`}</Diagram>

            <Card className="p-4 bg-card/60 border-border">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" /> Open findings (scan {SNAPSHOT.takenAt})
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li><Badge variant="destructive" className="mr-2">error</Badge>exodus_quiz_questions — correct_option readable by clients</li>
                <li><Badge variant="destructive" className="mr-2">error</Badge>exodus_puzzles — answer_hash readable by clients</li>
                <li><Badge variant="secondary" className="mr-2">warn</Badge>messages — receiver UPDATE is not column-restricted</li>
                <li><Badge variant="secondary" className="mr-2">warn</Badge>notifications — INSERT target user is unconstrained</li>
                <li><Badge variant="secondary" className="mr-2">warn</Badge>SECURITY DEFINER functions executable by authenticated</li>
              </ul>
            </Card>
          </>
        )}

        {active === 'realtime' && (
          <Diagram title="Realtime and feed composition">{`
 postgres_changes ─┐
                   ├──▶ globalRealtime.ts (single socket, ref-counted topics)
 presence ─────────┘            │
                                ├──▶ useGrowthFeed        (growth cards, poll fallback)
                                ├──▶ notifications        (badge + cue-first audio)
                                ├──▶ likes / comments      (heart burst, reconciliation)
                                └──▶ sentinel sessions     (admin live tab)

 Feed assembly (src/pages/home):
   posts + post_attachments
        + loops
        + growth cards  ──▶ composeChronologicalFeed() ──▶ orderGrowthByTime()
        + YouTube search results          │
        + DHF compass cards               └──▶ interleaveGrowthCards(every 3rd item)
   playback: muted-by-default, play-once (playedOnceRef), New-badge clears on completion`}</Diagram>
        )}

        {active === 'ai' && (
          <Diagram title="Sovereign AI routing (no Lovable gateway)">{`
  request ──▶ sovereign-ai.ts cascade
                ├─ 1. Google Gemini (text, vision, compass narration)
                ├─ 2. Cohere        (embeddings, relevance scoring)
                ├─ 3. NVIDIA NIM    (vision/text fallback tier)
                ├─ 4. Groq          (low-latency retrieval synthesis)
                └─ circuit breaker + provider-health endpoint

  Imagery  : Pollinations → growth-image-validate (subject/face match) → cached
  Voice    : Deepgram TTS, Web Speech API fallback
  Search   : zoe_universal_index (pgvector) ← loops · chats · DHF nodes
  Orb tools: orbCapabilities.ts → zoe-document-xray · identify-song ·
             score-post-relevance · provider-health (silent fallback to brain)`}</Diagram>
        )}

        {active === 'data' && (
          <>
            <Diagram title="Core data domains">{`
  identity      profiles · user_roles · sentinel_sessions
  social        posts · post_attachments · loops · comments · likes · notifications
  moderation    content_reports (is_spam, review_note) · platform_error_logs
  dhf           dhf_profiles · compass cards · dhf_essay_schedules · astro logs
  growth        growth_preferences · growth_feed_items · saved items · dispatch runs
  zoe           zoe_universal_index (pgvector) · memory · black-box ledger
  security      sentinel_threat_events · sentinel_blocks · security/audit logs`}</Diagram>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Tables" value={SNAPSHOT.tables} />
              <Stat label="Policies" value={SNAPSHOT.policies} />
              <Stat label="Tables without RLS" value={SNAPSHOT.tablesWithoutRls} />
              <Stat label="Migrations" value={SNAPSHOT.migrations} />
            </div>
          </>
        )}

        {active === 'cron' && (
          <Diagram title="Scheduled jobs (pg_cron, 9 active)">{`
  02:00–04:00  DHF prewarm — generate next-day compass material
  05:00–18:30  growth-dispatch — five local-time delivery windows per user
  every 15m    deliver_due_dhf_essays() — idempotent essay delivery + notification
  nightly      astro slot audit — missing-morning alerting (Slack + email)
  nightly      growth reconciliation — missing preferences / backfill
  weekly       prune_platform_telemetry() — telemetry retention (513MB → 267MB)`}</Diagram>
        )}

        {active === 'audit' && (
          <>
            <Card className="p-4 bg-card/60 border-border">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" /> Shipped and verified
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Sentinel surveillance stack (sessions, threats, blocks, hardware intel)</li>
                <li>Turnstile CAPTCHA on both sign-up flows, server-verified fail-closed</li>
                <li>Moderation queue with spam flag, status filter and post deep-links</li>
                <li>DHF essay scheduling, delivery cron, reader page and notifications</li>
                <li>Orb capability router (document X-ray, song ID, relevance, health)</li>
                <li>Growth roster expanded to 181 figures with anti-repetition</li>
                <li>Realtime multiplexing, WebGL boundary, managed intervals</li>
              </ul>
            </Card>
            <Card className="p-4 bg-card/60 border-border">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Bug className="w-4 h-4 text-destructive" /> Still open
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Two exodus tables leak quiz answers / puzzle hashes to clients</li>
                <li>messages UPDATE and notifications INSERT policies need narrowing</li>
                <li>SECURITY DEFINER execute sweep for unused functions</li>
                <li>Mega-files (4.6k / 4.4k / 4.1k lines) awaiting pure extraction</li>
                <li>No APM / uptime alerting; ~21 dormant edge functions</li>
                <li>{SNAPSHOT.skippedTests} skipped tests = agent_interactions RLS integration suite
                  (needs two live test accounts in env; skips by design so CI stays green)</li>
              </ul>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default PlatformArchitecturePage;
