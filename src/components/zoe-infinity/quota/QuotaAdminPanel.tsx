// Full quota admin panel — shows breakdown and exposes manual prune buttons.
// User locked: NEVER auto-delete. Every prune action is dry-run first.
import { useState } from "react";
import { useZoeInfinityQuota } from "@/hooks/zoe-infinity/quota/useZoeInfinityQuota";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Database, HardDrive, Users, Activity, RefreshCw } from "lucide-react";

const fmtBytes = (b: number): string => {
  if (b >= 1_073_741_824) return `${(b / 1_073_741_824).toFixed(2)} GB`;
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${b} B`;
};

type DryRunResult = {
  ok: boolean;
  dryRun: boolean;
  result: Record<string, { wouldDelete: number; deleted: number }>;
};

export const QuotaAdminPanel = () => {
  const q = useZoeInfinityQuota();
  const [running, setRunning] = useState(false);
  const [dry, setDry] = useState<DryRunResult | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (!q.isAdmin) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        Quota panel is admin-only.
      </Card>
    );
  }

  const refresh = async () => {
    setRunning(true);
    try {
      await supabase.functions.invoke("zoe-infinity-quota-monitor");
      await q.refresh();
    } finally {
      setRunning(false);
    }
  };

  const dryRun = async () => {
    setRunning(true);
    setDry(null);
    try {
      const { data } = await supabase.functions.invoke("zoe-infinity-quota-prune", {
        body: { confirm: false },
      });
      setDry(data as DryRunResult);
    } finally {
      setRunning(false);
    }
  };

  const confirmPrune = async () => {
    setConfirming(true);
    try {
      const { data } = await supabase.functions.invoke("zoe-infinity-quota-prune", {
        body: { confirm: true },
      });
      setDry(data as DryRunResult);
      await q.refresh();
    } finally {
      setConfirming(false);
    }
  };

  const totalDryDelete = dry
    ? Object.values(dry.result).reduce((s, r) => s + r.wouldDelete, 0)
    : 0;

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Supabase Quota — Zoe Infinity</h2>
          <p className="text-xs text-muted-foreground">
            Tier: <span className="font-medium uppercase">{q.tier}</span>
            {q.lastCheckedAt && ` · last checked ${new Date(q.lastCheckedAt).toLocaleTimeString()}`}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={refresh} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <QuotaRow icon={<Database className="h-4 w-4" />} label="Database"
          used={q.dbBytesUsed} limit={q.dbBytesLimit} percent={q.dbPercent} />
        <QuotaRow icon={<HardDrive className="h-4 w-4" />} label="Storage"
          used={q.storageBytesUsed} limit={q.storageBytesLimit} percent={q.storagePercent} />
        <QuotaRow icon={<Users className="h-4 w-4" />} label="Monthly Active Users"
          used={q.mauCount} limit={q.mauLimit} percent={q.mauPercent} isCount />
        <QuotaRow icon={<Activity className="h-4 w-4" />} label="Egress / month"
          used={q.egressBytesMonth} limit={q.egressBytesLimit} percent={q.egressPercent} />
      </div>

      {q.throttleActive && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <strong>Throttle active: {q.throttleLevel}</strong> — Zoe Infinity is auto-skipping
          {q.throttleLevel === "cache_off" && " response cache writes."}
          {q.throttleLevel === "memory_light" && " response cache + non-critical memory writes."}
          {q.throttleLevel === "hard" && " all non-essential writes."}
        </div>
      )}

      {q.lastError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          Supabase monitor warning: {q.lastError}
        </div>
      )}

      <div className="border-t pt-4 space-y-3">
        <h3 className="text-sm font-semibold">Manual Prune (no auto-delete)</h3>
        <p className="text-xs text-muted-foreground">
          Always runs as dry-run first. Confirm explicitly to delete. Targets: expired cache,
          behavioral events &gt; 90 days, ECN history &gt; 60 days.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={dryRun} disabled={running}>
            {running && !confirming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Run Dry-Run
          </Button>
          {dry && totalDryDelete > 0 && (
            <Button size="sm" variant="destructive" onClick={confirmPrune} disabled={confirming}>
              {confirming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm delete {totalDryDelete.toLocaleString()} rows
            </Button>
          )}
        </div>
        {dry && (
          <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1 font-mono">
            <div className="text-muted-foreground mb-1">{dry.dryRun ? "Dry-run preview:" : "Deleted:"}</div>
            {Object.entries(dry.result).map(([k, v]) => (
              <div key={k}>
                <span className="opacity-70">{k}:</span>{" "}
                {dry.dryRun ? `${v.wouldDelete.toLocaleString()} would delete` : `${v.deleted.toLocaleString()} deleted`}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

const QuotaRow = ({
  icon, label, used, limit, percent, isCount,
}: {
  icon: React.ReactNode; label: string; used: number; limit: number; percent: number; isCount?: boolean;
}) => {
  const tone =
    percent >= 90 ? "text-destructive"
    : percent >= 70 ? "text-amber-600 dark:text-amber-400"
    : "text-emerald-600 dark:text-emerald-400";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">{icon}{label}</span>
        <span className={`font-semibold ${tone}`}>{percent.toFixed(1)}%</span>
      </div>
      <Progress value={percent} className="h-1.5" />
      <div className="text-xs text-muted-foreground">
        {isCount
          ? `${used.toLocaleString()} / ${limit.toLocaleString()}`
          : `${fmtBytes(used)} / ${fmtBytes(limit)}`}
      </div>
    </div>
  );
};
