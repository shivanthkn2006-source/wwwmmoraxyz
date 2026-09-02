/**
 * DHF video link-health panel: shows the nightly sweep that deactivates dead
 * YouTube IDs, and lets an admin trigger the sweep on demand.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link2, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type LinkHealthRun = {
  id: string;
  checked: number;
  dead: number;
  deactivated: number;
  errors: number;
  detail: Array<{ youtube_video_id?: string; title?: string; status?: number; error?: string }> | null;
  started_at: string;
  finished_at: string | null;
};

const DhfLinkHealthPanel: React.FC = () => {
  const [runs, setRuns] = useState<LinkHealthRun[]>([]);
  const [activeVideos, setActiveVideos] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [runsResult, videosResult] = await Promise.all([
      supabase
        .from('dhf_link_health_runs')
        .select('id, checked, dead, deactivated, errors, detail, started_at, finished_at')
        .order('started_at', { ascending: false })
        .limit(5),
      supabase.from('dhf_videos').select('id', { count: 'exact', head: true }).eq('active', true),
    ]);

    if (runsResult.error) setError(runsResult.error.message);
    else {
      setError(null);
      setRuns((runsResult.data ?? []) as LinkHealthRun[]);
    }
    setActiveVideos(videosResult.count ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runNow = useCallback(async () => {
    setRunning(true);
    const { error: invokeError } = await supabase.functions.invoke('dhf-link-health', { body: {} });
    if (invokeError) setError(invokeError.message);
    await load();
    setRunning(false);
  }, [load]);

  const latest = runs[0];

  return (
    <Card data-testid="dhf-link-health-panel">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-4 w-4 text-primary" aria-hidden="true" />
            DHF video link health
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeVideos === null ? '—' : `${activeVideos} active videos`} · nightly sweep at 03:35 UTC
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void runNow()} disabled={running || loading}>
          {running ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
          )}
          Run sweep
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading link-health runs…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !latest ? (
          <p className="text-sm text-muted-foreground">No sweep has run yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-2xl font-semibold text-foreground">{latest.checked}</p>
                <p className="text-xs text-muted-foreground">checked</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{latest.dead}</p>
                <p className="text-xs text-muted-foreground">dead links</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{latest.deactivated}</p>
                <p className="text-xs text-muted-foreground">deactivated</p>
              </div>
            </div>

            {latest.detail && latest.detail.length > 0 ? (
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {latest.detail.slice(0, 8).map((entry, index) => (
                  <li key={entry.youtube_video_id ?? index}>
                    {entry.error
                      ? `Error: ${entry.error}`
                      : `${entry.title ?? entry.youtube_video_id} — HTTP ${entry.status}`}
                  </li>
                ))}
              </ul>
            ) : null}

            <p className="mt-3 text-xs text-muted-foreground">
              Last run {new Date(latest.started_at).toLocaleString()}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DhfLinkHealthPanel;
