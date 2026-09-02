/**
 * ATTACK RESPONSE PLAN — the published, human-readable version of what the
 * edge WAF, the Cloudflare rules and Sentinel actually enforce. Every row is
 * generated from the shared rule catalog, so the page cannot describe a
 * defence that is no longer running.
 */
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Cloud, Radar, ShieldAlert, ShieldCheck } from 'lucide-react';
import { WAF_RULES, type WafLayer, type WafRule } from '@/lib/security/wafRules';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageSeo from '@/components/seo/PageSeo';

const LAYERS: Array<{ id: WafLayer; label: string; icon: React.ComponentType<{ className?: string }>; blurb: string }> = [
  {
    id: 'cloudflare',
    label: 'Cloudflare edge',
    icon: Cloud,
    blurb: 'Reputation, bot management and geography, judged before a request ever reaches our functions.',
  },
  {
    id: 'edge',
    label: 'Edge WAF guard',
    icon: ShieldCheck,
    blurb: 'The shared guard in front of every public function: scanners, payloads, injection and rate limits.',
  },
  {
    id: 'sentinel',
    label: 'Sentinel',
    icon: Radar,
    blurb: 'Standing convictions. Once an address is blocked, every guarded function refuses it.',
  },
];

const SEVERITY_STYLE: Record<WafRule['severity'], string> = {
  medium: 'bg-muted text-muted-foreground',
  high: 'bg-primary/10 text-primary',
  critical: 'bg-destructive/10 text-destructive',
};

const ESCALATION = [
  ['0–5 min', 'Rule fires. The request is refused and a Sentinel threat event is written with the rule id, IP and Cloudflare signals.'],
  ['5–15 min', 'Repeat offences push the rolling severity score past the block budget; Sentinel auto-blocks the account and device.'],
  ['15–60 min', 'An admin reviews /admin/sentinel, confirms the pattern and promotes the block to a Cloudflare IP Access Rule.'],
  ['Same day', 'If the pattern is distributed, a Cloudflare rate-limit rule is added for the endpoint and the edge budget is tightened.'],
  ['Post-incident', 'The rule catalog is updated, a regression test is added, and this page regenerates from the catalog.'],
];

const AttackResponsePlanPage: React.FC = () => {
  const [layer, setLayer] = useState<WafLayer | 'all'>('all');
  const rules = useMemo(() => (layer === 'all' ? WAF_RULES : WAF_RULES.filter((r) => r.layer === layer)), [layer]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageSeo
        title="Attack response plan | mmora"
        description="Every threat the platform detects at the Cloudflare edge, in the shared WAF guard and in Sentinel, with the mitigation and escalation path for each."
      />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/platform-architecture">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Platform architecture
          </Link>
        </Button>

        <header className="mb-8">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
            Security
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">Attack response plan</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Three enforcement layers stand between a hostile request and member data. Each rule below is live in code:
            the detection, the automatic mitigation and the human escalation that follows it.
          </p>
        </header>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {LAYERS.map((entry) => (
            <Card key={entry.id} data-layer={entry.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <entry.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  {entry.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{entry.blurb}</p>
                <p className="mt-2 text-xs font-medium text-foreground">
                  {WAF_RULES.filter((rule) => rule.layer === entry.id).length} active rules
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {(['all', ...LAYERS.map((l) => l.id)] as Array<WafLayer | 'all'>).map((value) => (
            <Button
              key={value}
              size="sm"
              variant={layer === value ? 'default' : 'outline'}
              onClick={() => setLayer(value)}
            >
              {value === 'all' ? 'All rules' : LAYERS.find((l) => l.id === value)?.label}
            </Button>
          ))}
        </div>

        <section className="space-y-3" data-rule-list>
          {rules.map((rule) => (
            <Card key={rule.id} data-rule={rule.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground">{rule.threat}</h2>
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${SEVERITY_STYLE[rule.severity]}`}>
                    {rule.severity}
                  </span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    HTTP {rule.status}
                  </span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{rule.id}</span>
                </div>
                <dl className="mt-3 space-y-2 text-xs">
                  <div>
                    <dt className="font-medium text-foreground">Detection</dt>
                    <dd className="text-muted-foreground">{rule.detection}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Automatic mitigation</dt>
                    <dd className="text-muted-foreground">{rule.mitigation}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Response</dt>
                    <dd className="text-muted-foreground">{rule.response}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold text-foreground">Escalation timeline</h2>
          <ol className="mt-3 space-y-2">
            {ESCALATION.map(([when, what]) => (
              <li key={when} className="rounded-lg border border-border p-3 text-xs">
                <span className="font-medium text-foreground">{when}</span>
                <p className="mt-1 text-muted-foreground">{what}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
};

export default AttackResponsePlanPage;
