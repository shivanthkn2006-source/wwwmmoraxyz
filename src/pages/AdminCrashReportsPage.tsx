import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";

interface Crash {
  id: string; user_id: string | null; error_type: string; message: string; stack: string | null;
  url: string | null; user_agent: string | null; severity: string; source: string; created_at: string;
}

function device(ua: string | null) {
  if (!ua) return "Unknown";
  if (/iPhone|iPad/.test(ua)) return "iPhone/iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "Other";
}

/** Admin-only list of real crashes reported from members' phones and browsers. */
export default function AdminCrashReportsPage() {
  const [rows, setRows] = useState<Crash[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [days, setDays] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await supabase.from("platform_error_events")
      .select("id,user_id,error_type,message,stack,url,user_agent,severity,source,created_at")
      .gte("created_at", since).order("created_at", { ascending: false }).limit(300);
    setRows((data as Crash[]) ?? []);
    setLoading(false);
  }, [days]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const ch = supabase.channel("crash-reports")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "platform_error_events" },
        (p) => setRows((r) => [p.new as Crash, ...r].slice(0, 300)))
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  const groups = useMemo(() => {
    const m = new Map<string, { sample: Crash; count: number; users: Set<string> }>();
    for (const r of rows) {
      const k = `${r.error_type}|${r.message.slice(0, 120)}`;
      const g = m.get(k) ?? { sample: r, count: 0, users: new Set<string>() };
      g.count++; if (r.user_id) g.users.add(r.user_id);
      m.set(k, g);
    }
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [rows]);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Crash reports</h1>
        <div className="flex gap-2">
          {[1, 7, 30].map((d) => (
            <Button key={d} size="sm" variant={days === d ? "default" : "secondary"} onClick={() => setDays(d)}>{d === 1 ? "24h" : `${d} days`}</Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => void load()} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {loading ? "Loading…" : `${rows.length} reports, ${groups.length} distinct problems. New crashes appear live.`}
      </p>
      {groups.map(({ sample, count, users }) => (
        <Card key={sample.id} className="p-3">
          <button className="w-full text-left" onClick={() => setOpen(open === sample.id ? null : sample.id)}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={sample.severity === "critical" || sample.severity === "high" ? "destructive" : "secondary"}>{sample.severity}</Badge>
              <span className="font-medium">{sample.error_type}</span>
              <span className="text-xs text-muted-foreground">×{count} · {users.size} member(s) · {device(sample.user_agent)} · {new Date(sample.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm">{sample.message}</p>
          </button>
          {open === sample.id && (
            <div className="mt-2 space-y-1 text-xs">
              <div>Page: {sample.url ?? "—"}</div>
              <div>From: {sample.source}</div>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-muted p-2">{sample.stack ?? "No stack"}</pre>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
