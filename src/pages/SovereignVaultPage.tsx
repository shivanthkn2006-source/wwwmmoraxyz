/**
 * SOVEREIGN VAULT — /admin/vault
 *
 * Standalone, single-occupant admin console. Renders nothing until three
 * independent gates pass: sovereign identity (server-side), a live Ironclad
 * (VPN) tunnel, and device attestation. Every attempt is written to an
 * append-only black-box log.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Radar,
  Fingerprint,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSovereignAdmin } from '@/hooks/useSovereignAdmin';
import VaultUserDirectory from '@/components/admin/VaultUserDirectory';
import BetaInvitePanel from '@/components/admin/BetaInvitePanel';
import {
  closeVaultTunnel,
  deviceSignature,
  digestFingerprint,
  logVaultAccess,
  openVaultTunnel,
  resolveVaultVerdict,
  tunnelRemainingMs,
  type VaultTunnel,
} from '@/lib/security/sovereignVault';

interface AccessRow {
  id: string;
  verdict: string;
  reason: string | null;
  tunnel_active: boolean;
  device_fingerprint: string | null;
  created_at: string;
}

const CAPABILITIES: { group: string; items: { label: string; to: string; note: string }[] }[] = [
  {
    group: 'Command',
    items: [
      { label: 'Admin overview', to: '/admin/overview', note: 'Counts, roles, surfaces' },
      { label: 'Control panel', to: '/admin/control-panel', note: 'Moderation queue' },
      { label: 'Platform health', to: '/admin/health', note: 'Cron + provider health' },
      { label: 'Sentinel', to: '/admin/sentinel', note: 'Threats, blocks, hardware' },
    ],
  },
  {
    group: 'Engines',
    items: [
      { label: 'DHF generation', to: '/admin/dhf-generation', note: 'Card + essay dispatch' },
      { label: 'Growth runs', to: '/admin/growth-runs', note: 'Reconciliation events' },
      { label: 'Growth delivery', to: '/admin/growth-delivery', note: 'Per-user delivery audit' },
      { label: 'Search index', to: '/admin/search-index', note: 'Vector index coverage' },
      { label: 'Feed debug', to: '/admin/feed-debug', note: 'Feed diagnostics' },
      { label: 'Zoe preview', to: '/admin/zoe-preview', note: 'Response preview harness' },
    ],
  },
  {
    group: 'Reference',
    items: [
      { label: 'Platform overview', to: '/platform-overview', note: 'M\u2019Mora / Zoe / DHF pillars' },
      { label: 'Platform architecture', to: '/platform-architecture', note: 'System map' },
      { label: 'Attack response plan', to: '/attack-response', note: 'WAF + mitigation catalog' },
      { label: 'Compatibility report', to: '/compatibility-report', note: 'Device + browser matrix' },
      { label: 'Birth details', to: '/zoe-astro/birth', note: 'Compass birth data editor' },
    ],
  },
];

export default function SovereignVaultPage() {
  const { isSovereign, userId } = useSovereignAdmin();
  const [tunnel, setTunnel] = useState<VaultTunnel | null>(null);
  const [opening, setOpening] = useState(false);
  const [device, setDevice] = useState<string>('');
  const [log, setLog] = useState<AccessRow[]>([]);
  const [tick, setTick] = useState(0);
  const loggedDenial = useRef(false);

  const { verdict, reason } = useMemo(
    () => resolveVaultVerdict({ isSovereign, tunnel }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSovereign, tunnel, tick],
  );

  useEffect(() => {
    void digestFingerprint(deviceSignature()).then(setDevice);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Log denials once per identity resolution.
  useEffect(() => {
    if (isSovereign === false && !loggedDenial.current) {
      loggedDenial.current = true;
      void logVaultAccess(userId, {
        verdict: 'denied',
        reason: 'not the sovereign administrator',
        tunnelActive: false,
      });
    }
  }, [isSovereign, userId]);

  const loadLog = useCallback(async () => {
    const { data } = await supabase
      .from('sovereign_vault_access_log')
      .select('id, verdict, reason, tunnel_active, device_fingerprint, created_at')
      .order('created_at', { ascending: false })
      .limit(25);
    setLog((data ?? []) as AccessRow[]);
  }, []);

  const handleOpen = useCallback(async () => {
    if (!userId) return;
    setOpening(true);
    try {
      const next = await openVaultTunnel(userId);
      setTunnel(next);
      await logVaultAccess(userId, {
        verdict: 'granted',
        reason: 'tunnel established',
        tunnelActive: true,
        tunnelFingerprint: next.fingerprint,
        deviceFingerprint: device || undefined,
      });
      await loadLog();
    } finally {
      setOpening(false);
    }
  }, [userId, device, loadLog]);

  const handleClose = useCallback(async () => {
    await closeVaultTunnel(tunnel);
    await logVaultAccess(userId, {
      verdict: 'revoked',
      reason: 'tunnel closed by operator',
      tunnelActive: false,
      tunnelFingerprint: tunnel?.fingerprint,
    });
    setTunnel(null);
    await loadLog();
  }, [tunnel, userId, loadLog]);

  if (isSovereign === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Verifying sovereign identity…</p>
      </main>
    );
  }

  if (!isSovereign) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-sm rounded-xl border border-destructive/40 bg-card p-8 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-destructive" aria-hidden />
          <h1 className="mt-4 text-lg font-semibold text-foreground">Vault sealed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This console is bound to a single sovereign administrator. The attempt has been
            recorded.
          </p>
          <Link to="/home" className="mt-6 inline-block text-sm text-primary underline">
            Return home
          </Link>
        </div>
      </main>
    );
  }

  const live = verdict === 'granted';
  const remaining = tunnelRemainingMs(tunnel);
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return (
    <main className="min-h-screen bg-background px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            {live ? (
              <ShieldCheck className="h-8 w-8 text-primary" aria-hidden />
            ) : (
              <Lock className="h-8 w-8 text-muted-foreground" aria-hidden />
            )}
            <div>
              <h1 className="text-xl font-semibold text-foreground">Sovereign Vault</h1>
              <p className="text-sm text-muted-foreground">
                Single-occupant admin console · Private Nexus AES-256-GCM
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {live ? (
              <button
                type="button"
                onClick={() => void handleClose()}
                className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground"
              >
                <Unlock className="h-4 w-4" aria-hidden /> Close tunnel
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleOpen()}
                disabled={opening}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                <Radar className="h-4 w-4" aria-hidden />
                {opening ? 'Establishing…' : 'Open private nexus'}
              </button>
            )}
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Gate status</p>
            <p className="mt-1 text-sm font-medium text-foreground">{verdict}</p>
            <p className="text-xs text-muted-foreground">{reason}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Tunnel</p>
            <p className="mt-1 font-mono text-sm text-foreground">
              {tunnel ? `${tunnel.fingerprint.slice(0, 12)}…` : 'not established'}
            </p>
            <p className="text-xs text-muted-foreground">
              {tunnel ? `expires in ${minutes}m ${seconds}s` : 'AES-256-GCM · session scoped'}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
              <Fingerprint className="h-3 w-3" aria-hidden /> Device
            </p>
            <p className="mt-1 font-mono text-sm text-foreground">
              {device ? `${device.slice(0, 12)}…` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">bound to this handshake</p>
          </div>
        </section>

        {!live ? (
          <section className="rounded-xl border border-dashed border-border bg-card/60 p-8 text-center">
            <Lock className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
            <h2 className="mt-3 text-base font-semibold text-foreground">
              Capabilities locked behind the nexus
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Identity alone is not sufficient. Open the encrypted tunnel to unseal admin
              capability links; the tunnel auto-expires after 30 minutes.
            </p>
          </section>
        ) : (
          <>
            <VaultUserDirectory />
            <BetaInvitePanel />

            {CAPABILITIES.map((group) => (
              <section key={group.group} className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.group}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary"
                    >
                      <p className="flex items-center justify-between text-sm font-medium text-foreground">
                        {item.label}
                        <ExternalLink
                          className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary"
                          aria-hidden
                        />
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
                    </Link>
                  ))}
                </div>
              </section>
            ))}

            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Black-box access log</h2>
                <button
                  type="button"
                  onClick={() => void loadLog()}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="h-3 w-3" aria-hidden /> Refresh
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Append-only. Updates and deletes are rejected at the database level.
              </p>
              <ul className="mt-4 space-y-2">
                {log.length === 0 ? (
                  <li className="text-sm text-muted-foreground">No entries loaded.</li>
                ) : (
                  log.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs"
                    >
                      <span className="font-medium text-foreground">{row.verdict}</span>
                      <span className="text-muted-foreground">{row.reason ?? '—'}</span>
                      <span className="font-mono text-muted-foreground">
                        {row.device_fingerprint?.slice(0, 8) ?? '—'}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
