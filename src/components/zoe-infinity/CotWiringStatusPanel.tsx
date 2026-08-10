import { useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, CircleDashed, Loader2, WifiOff, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subscribeCotWiring, type CotServiceState } from '@/utils/cotWiringBus';

const relative = (ts: number | null, now: number): string => {
  if (!ts) return 'never';
  const diff = Math.max(0, now - ts);
  if (diff < 1000) return 'just now';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
};

const StatusIcon = ({ status }: { status: CotServiceState['status'] }) => {
  if (status === 'active') return <Loader2 className="h-3 w-3 animate-spin text-cyan-300" />;
  if (status === 'ok') return <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
  if (status === 'error') return <XCircle className="h-3 w-3 text-destructive" />;
  return <CircleDashed className="h-3 w-3 text-muted-foreground" />;
};

const PIPELINE_TONE: Record<CotServiceState['pipeline'], string> = {
  brain: 'text-purple-300 border-purple-400/30 bg-purple-500/10',
  chat: 'text-cyan-300 border-cyan-400/30 bg-cyan-500/10',
  voice: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  stream: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
};

const CotWiringStatusPanel = () => {
  const [rows, setRows] = useState<CotServiceState[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => subscribeCotWiring(setRows), []);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const active = useMemo(() => rows.find((r) => r.status === 'active') ?? null, [rows]);
  const lastRequestAt = useMemo(
    () => rows.reduce<number | null>((acc, r) => (r.lastRequestAt && (!acc || r.lastRequestAt > acc) ? r.lastRequestAt : acc), null),
    [rows],
  );
  const health = useMemo(() => {
    if (!online) return { label: 'Offline', tone: 'text-destructive' };
    if (active) return { label: 'Streaming', tone: 'text-cyan-300' };
    const anyError = rows.some((r) => r.status === 'error');
    if (anyError) return { label: 'Degraded', tone: 'text-amber-300' };
    if (rows.length === 0) return { label: 'Idle', tone: 'text-muted-foreground' };
    return { label: 'Healthy', tone: 'text-emerald-400' };
  }, [online, active, rows]);

  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          {online ? <Activity className="h-3.5 w-3.5 text-primary shrink-0" /> : <WifiOff className="h-3.5 w-3.5 text-destructive shrink-0" />}
          <div className="min-w-0">
            <p className="text-[11px] font-medium truncate">CoT wiring status</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {active ? `Active: ${active.label}` : 'No active pipeline'} · last request {relative(lastRequestAt, now)}
            </p>
          </div>
        </div>
        <span className={cn('text-[10px] font-semibold whitespace-nowrap', health.tone)}>{health.label}</span>
      </div>

      <div className="space-y-1">
        {rows.length === 0 && (
          <p className="py-3 text-center text-[11px] text-muted-foreground">
            No CoT traffic yet — send a message to see live pipeline health.
          </p>
        )}
        {rows.map((r) => (
          <div
            key={r.service}
            className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/30 px-2.5 py-1.5"
          >
            <StatusIcon status={r.status} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium truncate">{r.label}</span>
                <span className={cn('rounded-full border px-1.5 text-[9px] leading-4', PIPELINE_TONE[r.pipeline])}>
                  {r.pipeline}
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground truncate">
                {r.service} · {relative(r.lastRequestAt, now)}
                {r.lastLatencyMs != null ? ` · ${r.lastLatencyMs}ms` : ''}
                {` · ${r.okCount} ok / ${r.errorCount} err`}
              </p>
              {r.lastError && <p className="text-[9px] text-destructive truncate">{r.lastError}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CotWiringStatusPanel;
