import { useCallback, useEffect, useState } from 'react';
import { Database, HardDrive, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { getZoeMemoryStatus, type ZoeMemoryStatus } from '@/services/zoeMemoryBridge';

const KIND_LABEL: Record<string, string> = {
  online: 'Connected',
  cors: 'Blocked by CORS',
  unauthorized: 'Auth failed (401/403)',
  unreachable: 'Unreachable',
  timeout: 'Timed out',
  gateway: 'Gateway error',
};

/** Compact memory health strip: sovereign memory + TencentDB gateway. */
const ZoeMemoryStatusPanel = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<ZoeMemoryStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await getZoeMemoryStatus(user?.id));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const dot = (ok: boolean) =>
    cn('h-2 w-2 shrink-0 rounded-full', ok ? 'bg-emerald-400' : 'bg-destructive');

  return (
    <div className="space-y-2 rounded-md border border-primary/10 bg-background/60 p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-foreground">Persistent memory</span>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded p-1 text-muted-foreground hover:text-foreground"
          aria-label="Refresh memory status"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
        </button>
      </div>

      <div className="space-y-1.5 text-[10px]">
        <div className="flex items-start gap-2">
          <HardDrive className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className={dot(!!status?.sovereign.connected)} />
              <span className="text-foreground">Sovereign memory (DHF)</span>
              {status?.sovereign.connected && (
                <span className="text-muted-foreground">
                  · {status.sovereign.rows} rows
                </span>
              )}
            </div>
            {status?.sovereign.error && (
              <p className="mt-0.5 break-words text-destructive">
                {status.sovereign.error}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Database className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className={dot(!!status?.gateway.connected)} />
              <span className="text-foreground">TencentDB gateway</span>
              <span className="text-muted-foreground">
                · {status ? KIND_LABEL[status.gateway.kind] ?? status.gateway.kind : 'checking…'}
              </span>
            </div>
            {status && (
              <p className="mt-0.5 truncate text-muted-foreground">{status.gateway.url}</p>
            )}
            {status?.gateway.error && (
              <p className="mt-0.5 break-words text-destructive">{status.gateway.error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoeMemoryStatusPanel;
