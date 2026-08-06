import { useCallback, useEffect, useMemo, useState } from 'react';
import { Brain, RefreshCw, AlertTriangle, Gauge, Timer, ShieldQuestion } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface LogRow {
  id: string;
  created_at: string;
  confidence_score: number | null;
  threshold: number | null;
  withheld: boolean;
  parse_ok: boolean;
  parse_error: string | null;
  fast_pass: boolean;
  deep_mode: boolean;
  latency_ms: number | null;
  mode: string | null;
  monologue_regions: unknown;
  uncertain_claims: unknown;
  clarifying_question: string | null;
  prompt_excerpt: string | null;
}

const REGIONS = ['PREFRONTAL_CORTEX', 'AMYGDALA', 'HIPPOCAMPUS', 'ACC'] as const;

const asArray = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

const Stat = ({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Brain;
  label: string;
  value: string;
  tone?: 'good' | 'warn' | 'bad';
}) => (
  <div className="rounded-lg border border-border/60 bg-card/40 p-3">
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
    <div
      className={cn(
        'mt-1 text-lg font-semibold tabular-nums text-foreground',
        tone === 'good' && 'text-emerald-500',
        tone === 'warn' && 'text-amber-500',
        tone === 'bad' && 'text-destructive',
      )}
    >
      {value}
    </div>
  </div>
);

/** Live metrics for Zoe's metacognition gate: confidence, withholding, parser health. */
export const MetacognitionMetricsPanel = ({ className }: { className?: string }) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('zoe_metacognition_log')
      .select(
        'id,created_at,confidence_score,threshold,withheld,parse_ok,parse_error,fast_pass,deep_mode,latency_ms,mode,monologue_regions,uncertain_claims,clarifying_question,prompt_excerpt',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) console.error('[metacognition-metrics]', error);
    setRows((data as LogRow[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const n = rows.length || 1;
    const withConf = rows.filter((r) => typeof r.confidence_score === 'number');
    const avgConf = withConf.length
      ? withConf.reduce((s, r) => s + (r.confidence_score ?? 0), 0) / withConf.length
      : 0;
    const withheld = rows.filter((r) => r.withheld).length;
    const parseFail = rows.filter((r) => !r.parse_ok).length;
    const latencies = rows.map((r) => r.latency_ms ?? 0).filter(Boolean);
    const avgLatency = latencies.length
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;
    const fastPass = rows.filter((r) => r.fast_pass).length;
    const regionCounts = REGIONS.map((region) => ({
      region,
      count: rows.reduce(
        (s, r) => s + asArray(r.monologue_regions).filter((x) => x.includes(region)).length,
        0,
      ),
    }));
    const maxRegion = Math.max(1, ...regionCounts.map((r) => r.count));
    return {
      total: rows.length,
      avgConf,
      withheldPct: (withheld / n) * 100,
      parseFailPct: (parseFail / n) * 100,
      avgLatency,
      fastPassPct: (fastPass / n) * 100,
      regionCounts,
      maxRegion,
    };
  }, [rows]);

  return (
    <div className={cn('space-y-4 rounded-xl border border-border/60 bg-background/60 p-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Brain className="h-4 w-4 text-primary" />
          Metacognition Metrics
          <span className="text-xs font-normal text-muted-foreground">last {stats.total} responses</span>
        </h3>
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Stat
          icon={Gauge}
          label="Avg confidence"
          value={`${Math.round(stats.avgConf * 100)}%`}
          tone={stats.avgConf >= 0.7 ? 'good' : stats.avgConf >= 0.5 ? 'warn' : 'bad'}
        />
        <Stat
          icon={ShieldQuestion}
          label="Withheld"
          value={`${stats.withheldPct.toFixed(0)}%`}
          tone={stats.withheldPct > 40 ? 'warn' : undefined}
        />
        <Stat
          icon={AlertTriangle}
          label="Parse failures"
          value={`${stats.parseFailPct.toFixed(0)}%`}
          tone={stats.parseFailPct > 10 ? 'bad' : 'good'}
        />
        <Stat icon={Timer} label="Avg latency" value={`${stats.avgLatency} ms`} />
        <Stat icon={Brain} label="Fast pass" value={`${stats.fastPassPct.toFixed(0)}%`} />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Brain region activity</p>
        {stats.regionCounts.map(({ region, count }) => (
          <div key={region} className="flex items-center gap-2">
            <span className="w-40 shrink-0 text-[11px] text-muted-foreground">{region}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${(count / stats.maxRegion) * 100}%` }}
              />
            </div>
            <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">{count}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Recent gated turns</p>
        <div className="max-h-52 space-y-1 overflow-y-auto">
          {rows.slice(0, 20).map((r) => (
            <div
              key={r.id}
              className="flex items-start gap-2 rounded-md border border-border/40 bg-card/30 px-2 py-1.5 text-[11px]"
            >
              <span
                className={cn(
                  'mt-0.5 rounded px-1 font-mono tabular-nums',
                  r.withheld ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/15 text-emerald-500',
                )}
              >
                {Math.round((r.confidence_score ?? 0) * 100)}%
              </span>
              <span className="flex-1 truncate text-muted-foreground">
                {r.clarifying_question || r.prompt_excerpt || '—'}
              </span>
              {!r.parse_ok && <AlertTriangle className="h-3 w-3 shrink-0 text-destructive" />}
            </div>
          ))}
          {!loading && rows.length === 0 && (
            <p className="py-3 text-center text-xs text-muted-foreground">No metacognition logs yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetacognitionMetricsPanel;
