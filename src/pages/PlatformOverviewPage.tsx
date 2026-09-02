/**
 * PLATFORM OVERVIEW — the standalone public "about the platform" page.
 *
 * One page that explains the whole system to a beta participant: the platform
 * itself, mmora, Zoe and the Digital Human Fingerprint engine, plus what the
 * gated beta actually asks of a tester. Static presentation only — no data
 * fetching, no gating, safe to link from an invite email.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Brain, Fingerprint, Globe2, Shield, Sparkles, Bug, Languages, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PageSeo from '@/components/seo/PageSeo';

interface Pillar {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
}

const PILLARS: Pillar[] = [
  {
    icon: Fingerprint,
    eyebrow: 'DHF',
    title: 'The Digital Human Fingerprint engine',
    body:
      'The DHF is the archive layer: it captures, processes and preserves the shape of your digital persona — your writing, your rhythms, the ideas you return to — and turns it into something that keeps working for you.',
    points: [
      'Pre-computed delivery: a nightly dispatch job builds your cards and essays before you wake, so a morning session opens instantly instead of waiting on generation.',
      'A living library: daily compass cards, long-form essays and a real video feed drawn from the thinkers, scientists and philosophers matched to your focus areas.',
      'Deterministic scheduling: every card is bound to your local-time window, so morning content is morning content wherever you are.',
    ],
  },
  {
    icon: Brain,
    eyebrow: 'Zoe',
    title: 'Autonomous agentic intelligence',
    body:
      'Zoe is the platform’s voice and its navigator — a persistent companion rather than a chat box you open and close.',
    points: [
      'Relationship-aware: Zoe tracks tone, intimacy stage and context across sessions, so conversation continues rather than restarts.',
      'Multilingual: English, Malayalam, Tamil and Hindi, by voice or text.',
      'Agentic reach: document analysis, song identification, universal search, image and post tooling — reachable from the orb without leaving the page you are on.',
    ],
  },
  {
    icon: Globe2,
    eyebrow: 'Spatial web',
    title: 'Resilient WebGL environments',
    body:
      'VROMEGA 3D runs directly in the browser, with the failure modes engineered out rather than hidden.',
    points: [
      'Isolated crash recovery: a 3D failure is caught by its own boundary and shows a fallback — the app never goes white.',
      'Multiplexed realtime: one shared WebSocket serves the whole tab, so many open sessions do not saturate the backend.',
      'Device-tier aware rendering that scales down instead of monopolising memory.',
    ],
  },
  {
    icon: Shield,
    eyebrow: 'Security',
    title: 'Sentinel and the edge guard',
    body:
      'Every public entry point sits behind a rate limiter and a WAF guard, with a live operator view of what is hitting the platform.',
    points: [
      'Row-level security on every table: your data is scoped to your account at the database, not at the UI.',
      'CAPTCHA-gated signup and per-IP rate limits on public functions.',
      'Sentinel logs threat events and auto-blocks abusive sources.',
    ],
  },
];

const BETA_STEPS = [
  {
    icon: Sparkles,
    title: 'Access the platform',
    body: 'Sign in with the invite code from your welcome email. The code binds your account to the gated beta cohort.',
  },
  {
    icon: Clock,
    title: 'Test the extremes',
    body: 'Talk to Zoe, walk the 3D boundaries, and watch how your DHF content lands across the day — morning, midday, evening, night.',
  },
  {
    icon: Bug,
    title: 'Report anomalies',
    body: 'Any glitch, stutter or 3D crash: use the in-app bug reporter. It captures device state and network telemetry with the report so it can be fixed without a back-and-forth.',
  },
];

const PlatformOverviewPage: React.FC = () => (
  <div className="min-h-screen bg-background pb-24">
    <PageSeo
      title="About the Platform — mmora, Zoe & the DHF Engine"
      description="How mmora works: the Digital Human Fingerprint engine, Zoe's agentic intelligence, resilient WebGL environments and the security model behind the gated beta."
    />

    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
        <Link to="/">
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back
        </Link>
      </Button>

      <header className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Vanguard Beta</p>
        <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
          A universal platform of life, not another feed
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          mmora is an agentic, voice-first ecosystem built around persistence. Where legacy platforms monetise
          attention, this one preserves identity: what you make, how you think and the record of both are treated as
          the product you keep — not the product being sold.
        </p>
      </header>

      <div className="mt-10 space-y-6">
        {PILLARS.map((pillar) => (
          <Card key={pillar.title} className="border-border/60">
            <CardHeader className="pb-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-primary">{pillar.eyebrow}</p>
              <CardTitle className="flex items-center gap-2 text-lg">
                <pillar.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                {pillar.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-relaxed text-muted-foreground">{pillar.body}</p>
              <ul className="space-y-2">
                {pillar.points.map((point) => (
                  <li key={point} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-foreground">Your role in the beta</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          For the first fourteen days the architecture is under deliberate stress. Three things help most:
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {BETA_STEPS.map((step) => (
            <div key={step.title} className="rounded-xl border border-border/60 bg-card p-4">
              <step.icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">{step.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-xl border border-border/60 bg-muted/30 p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Languages className="h-4 w-4 text-primary" aria-hidden="true" />
          Where to go next
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/compass">Daily Compass</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/growth-insights">Growth insights</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/dhf-dashboard">DHF dashboard</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/platform-architecture">Platform architecture</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/about">Terms &amp; privacy</Link>
          </Button>
        </div>
      </section>
    </div>
  </div>
);

export default PlatformOverviewPage;
