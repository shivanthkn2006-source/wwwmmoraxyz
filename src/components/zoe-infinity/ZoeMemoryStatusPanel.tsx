import { useCallback, useEffect, useState } from 'react';
import { Database, HardDrive, Loader2, RefreshCw, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getZoeMemoryStatus,
  listZoeMemories,
  deleteMemory,
  clearAllMemory,
  type StoredZoeMemory,
  type ZoeMemoryStatus,
} from '@/services/zoeMemoryBridge';
import {
  clearMemoryAudit,
  subscribeMemoryAudit,
  type MemoryAuditEntry,
} from '@/services/zoeMemoryAudit';


const KIND_LABEL: Record<string, string> = {
  online: 'Connected',
  cors: 'Blocked by CORS',
  unauthorized: 'Auth failed (401/403)',
  unreachable: 'Unreachable',
  timeout: 'Timed out',
  gateway: 'Gateway error',
};

const INTERVAL_KEY = 'mmora_zoe_memory_poll_ms';
const ALLOWED_ORIGINS_KEY = 'mmora_tdai_allowed_origins';

const INTERVALS = [
  { label: '10s', value: 10_000 },
  { label: '30s', value: 30_000 },
  { label: '1m', value: 60_000 },
  { label: '5m', value: 300_000 },
  { label: 'Off', value: 0 },
];

const readInterval = (): number => {
  if (typeof localStorage === 'undefined') return 30_000;
  const raw = Number(localStorage.getItem(INTERVAL_KEY));
  return INTERVALS.some((i) => i.value === raw) ? raw : 30_000;
};

const readAllowedOrigins = (): string[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(ALLOWED_ORIGINS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((o) => typeof o === 'string') : [];
  } catch {
    return [];
  }
};

type ConfirmMode = 'single' | 'all';

interface ConfirmState {
  open: boolean;
  mode: ConfirmMode;
  targetId: string | null;
  text: string;
}

/** Compact memory health strip: sovereign memory + TencentDB gateway. */
const ZoeMemoryStatusPanel = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<ZoeMemoryStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [pollMs, setPollMs] = useState<number>(readInterval);
  const [audit, setAudit] = useState<MemoryAuditEntry[]>([]);
  const [memories, setMemories] = useState<StoredZoeMemory[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    mode: 'single',
    targetId: null,
    text: '',
  });

  const loadMemories = useCallback(async () => {
    setMemories(await listZoeMemories(user?.id));
  }, [user?.id]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await getZoeMemoryStatus(user?.id));
      await loadMemories();
    } finally {
      setLoading(false);
    }
  }, [user?.id, loadMemories]);

  const requestDelete = (id: string) => {
    const memory = memories.find((m) => m.id === id);
    setConfirm({
      open: true,
      mode: 'single',
      targetId: id,
      text: memory?.text ? memory.text.slice(0, 120) : 'this memory',
    });
  };

  const requestClearAll = () => {
    setConfirm({
      open: true,
      mode: 'all',
      targetId: null,
      text: `${memories.length} stored memory${memories.length === 1 ? '' : 'ies'}`,
    });
  };

  const executeConfirmedAction = async () => {
    setConfirm((prev) => ({ ...prev, open: false }));
    if (confirm.mode === 'single' && confirm.targetId) {
      const id = confirm.targetId;
      setBusyId(id);
      const res = await deleteMemory(id);
      if (res.ok) setMemories((prev) => prev.filter((m) => m.id !== id));
      setBusyId(null);
    } else if (confirm.mode === 'all') {
      setBusyId('all');
      const res = await clearAllMemory(user?.id);
      if (res.ok) setMemories([]);
      setBusyId(null);
    }
  };

  const closeConfirm = () => setConfirm((prev) => ({ ...prev, open: false }));

  useEffect(() => subscribeMemoryAudit(setAudit), []);


  // Initial probe + configurable periodic health check so the badge flips
  // automatically when the TencentDB container comes online or goes offline.
  useEffect(() => {
    void refresh();
    if (!pollMs) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, pollMs);
    return () => window.clearInterval(id);
  }, [refresh, pollMs]);

  const changeInterval = (value: number) => {
    setPollMs(value);
    try {
      localStorage.setItem(INTERVAL_KEY, String(value));
    } catch {
      /* ignore */
    }
  };

  const dot = (ok: boolean) =>
    cn('h-2 w-2 shrink-0 rounded-full', ok ? 'bg-emerald-400' : 'bg-destructive');

  const gw = status?.gateway;
  const allowedOrigins = readAllowedOrigins();
  const showCorsBlock = !!gw && !gw.connected;

  return (
    <div className="space-y-2 rounded-md border border-primary/10 bg-background/60 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-foreground">Persistent memory</span>
        <div className="flex items-center gap-1">
          <select
            aria-label="Health polling interval"
            value={pollMs}
            onChange={(e) => changeInterval(Number(e.target.value))}
            className="rounded border border-primary/20 bg-background/80 px-1 py-0.5 text-[10px] text-foreground"
          >
            {INTERVALS.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
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
              <span className={dot(!!gw?.connected)} />
              <span className="text-foreground">TencentDB gateway</span>
              <span className="text-muted-foreground">
                · {status ? KIND_LABEL[gw!.kind] ?? gw!.kind : 'checking…'}
              </span>
            </div>
            {gw && <p className="mt-0.5 truncate text-muted-foreground">{gw.url}</p>}
            {gw?.error && (
              <p className="mt-0.5 break-words text-destructive">{gw.error}</p>
            )}

            {showCorsBlock && (
              <dl className="mt-1 space-y-0.5 rounded border border-destructive/20 bg-destructive/5 p-1.5 text-[9px] text-muted-foreground">
                <div className="flex gap-1">
                  <dt className="shrink-0">Reason:</dt>
                  <dd className="break-words text-foreground">
                    {gw.detail || gw.summary || 'Unknown failure'}
                  </dd>
                </div>
                <div className="flex gap-1">
                  <dt className="shrink-0">Request Origin:</dt>
                  <dd className="break-all font-mono">{gw.origin || 'unknown'}</dd>
                </div>
                <div className="flex gap-1">
                  <dt className="shrink-0">Preflight URL:</dt>
                  <dd className="break-all font-mono">{gw.requestUrl || gw.url}</dd>
                </div>
                <div className="flex gap-1">
                  <dt className="shrink-0">Allowed origins:</dt>
                  <dd className="break-all font-mono">
                    {allowedOrigins.length
                      ? allowedOrigins.join(', ')
                      : 'unknown — open /agent-memory and load tdai-gateway.yaml'}
                  </dd>
                </div>
                <div className="flex gap-1">
                  <dt className="shrink-0">Required headers:</dt>
                  <dd className="break-all font-mono">
                    {(gw.requiredHeaders ?? []).join(', ') || '—'}
                  </dd>
                </div>
                <div className="flex gap-1">
                  <dt className="shrink-0">Probes:</dt>
                  <dd>
                    health {gw.healthOk ? 'ok' : 'failed'} · auth{' '}
                    {gw.authOk ? 'ok' : 'failed'} · {gw.attempts ?? 1} attempt(s)
                  </dd>
                </div>
              </dl>
            )}

            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="mt-1.5 rounded border border-primary/20 px-2 py-1 text-[10px] text-foreground hover:bg-primary/10 disabled:opacity-60"
            >
              {loading ? 'Testing…' : 'Test gateway connection'}
            </button>
            {status && (
              <p className="mt-1 text-[9px] text-muted-foreground">
                {pollMs ? `Auto-checked every ${pollMs / 1000}s` : 'Auto-check off'} · last{' '}
                {new Date(status.checkedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-primary/10 pt-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-foreground">
            Stored memories{memories.length ? ` (${memories.length})` : ''}
          </span>
          <button
            type="button"
            onClick={() => void handleClearAll()}
            disabled={!memories.length || busyId === 'all'}
            className="rounded border border-destructive/30 px-2 py-0.5 text-[9px] text-destructive hover:bg-destructive/10 disabled:opacity-40"
          >
            {busyId === 'all' ? 'Clearing…' : 'Clear All'}
          </button>
        </div>
        {memories.length === 0 ? (
          <p className="mt-1 text-[9px] text-muted-foreground">No stored memories.</p>
        ) : (
          <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto pr-1">
            {memories.map((m) => (
              <li key={m.id} className="flex items-start gap-1.5 text-[9px] leading-tight">
                <div className="min-w-0 flex-1">
                  <span className="text-muted-foreground">
                    {new Date(m.createdAt).toLocaleString()}
                  </span>
                  <span className="block break-words text-foreground/90 line-clamp-2">
                    {m.text}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(m.id)}
                  disabled={busyId === m.id}
                  aria-label="Delete memory"
                  className="rounded p-0.5 text-muted-foreground hover:text-destructive disabled:opacity-40"
                >
                  {busyId === m.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>



      <div className="border-t border-primary/10 pt-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-foreground">Last actions</span>
          <button
            type="button"
            onClick={clearMemoryAudit}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label="Clear memory audit log"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
        {audit.length === 0 ? (
          <p className="text-[9px] text-muted-foreground">No memory activity yet.</p>
        ) : (
          <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto pr-1">
            {audit.slice(0, 12).map((row) => (
              <li key={row.id} className="text-[9px] leading-tight">
                <span className="text-muted-foreground">
                  {new Date(row.at).toLocaleTimeString()}
                </span>{' '}
                <span
                  className={cn(
                    'font-medium',
                    row.outcome === 'ok'
                      ? 'text-emerald-400'
                      : row.outcome === 'fallback'
                        ? 'text-amber-400'
                        : 'text-destructive'
                  )}
                >
                  {row.action}
                </span>{' '}
                <span className="text-muted-foreground">
                  → {row.target ?? 'none'}
                  {row.attempts && row.attempts > 1 ? ` (${row.attempts} tries)` : ''}
                </span>
                {row.detail && (
                  <span className="block break-words text-muted-foreground/80">
                    {row.detail}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ZoeMemoryStatusPanel;
