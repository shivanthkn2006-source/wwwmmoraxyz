/**
 * BETA INVITE PANEL — sovereign console for issuing gated-beta access.
 *
 * Mint one or many codes with a use limit and expiry, copy the ready-made
 * /beta link for the welcome email, and withdraw a code at any time. Every
 * operation runs server-side through the `beta-invite` edge function.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, Link2, Loader2, RefreshCw, Ticket, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  type InviteCodeRecord,
  inviteLink,
  inviteStatus,
  issueInviteCodes,
  listInviteCodes,
  revokeInviteCode,
} from '@/lib/betaInvites';

const STATUS_TONE: Record<ReturnType<typeof inviteStatus>, string> = {
  active: 'border-emerald-500/40 text-emerald-500',
  revoked: 'border-destructive/40 text-destructive',
  expired: 'border-muted-foreground/40 text-muted-foreground',
  used: 'border-primary/40 text-primary',
};

export default function BetaInvitePanel() {
  const [codes, setCodes] = useState<InviteCodeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [count, setCount] = useState('1');
  const [maxUses, setMaxUses] = useState('1');
  const [expiresInDays, setExpiresInDays] = useState('30');
  const [label, setLabel] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCodes(await listInviteCodes());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load invite codes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const stats = useMemo(() => {
    const active = codes.filter((c) => inviteStatus(c) === 'active').length;
    const redeemed = codes.reduce((sum, c) => sum + (c.current_uses ?? 0), 0);
    return { total: codes.length, active, redeemed };
  }, [codes]);

  const issue = async () => {
    setIssuing(true);
    try {
      const issued = await issueInviteCodes({
        count: Math.max(1, Number(count) || 1),
        maxUses: Math.max(1, Number(maxUses) || 1),
        expiresInDays: Math.max(0, Number(expiresInDays) || 0),
        label: label.trim(),
      });
      toast.success(`Issued ${issued.length} invite code${issued.length === 1 ? '' : 's'}`);
      setLabel('');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not issue invite codes');
    } finally {
      setIssuing(false);
    }
  };

  const copy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1600);
    } catch {
      toast.error('Clipboard unavailable');
    }
  };

  const revoke = async (row: InviteCodeRecord) => {
    try {
      await revokeInviteCode(row.id, 'withdrawn from the sovereign console');
      toast.success(`${row.code} withdrawn`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not withdraw code');
    }
  };

  return (
    <Card data-testid="beta-invite-panel">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Ticket className="h-4 w-4 text-primary" /> Beta invites
        </CardTitle>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{stats.active} active · {stats.redeemed} redeemed · {stats.total} issued</span>
          <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-5">
          <div className="space-y-1">
            <Label htmlFor="invite-count" className="text-xs">Codes</Label>
            <Input id="invite-count" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="invite-uses" className="text-xs">Uses each</Label>
            <Input id="invite-uses" inputMode="numeric" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="invite-days" className="text-xs">Expires (days)</Label>
            <Input id="invite-days" inputMode="numeric" value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="invite-label" className="text-xs">Cohort label</Label>
            <Input id="invite-label" value={label} maxLength={120} placeholder="wave one" onChange={(e) => setLabel(e.target.value)} />
          </div>
        </div>

        <Button onClick={() => void issue()} disabled={issuing} className="w-full sm:w-auto">
          {issuing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ticket className="mr-2 h-4 w-4" />}
          Issue invite codes
        </Button>

        <div className="divide-y divide-border/60 rounded-lg border border-border/60">
          {loading && codes.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">Loading invite codes…</p>
          )}
          {!loading && codes.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No invite codes issued yet.</p>
          )}
          {codes.map((row) => {
            const status = inviteStatus(row);
            return (
              <div key={row.id} className="flex flex-wrap items-center gap-3 p-3">
                <code className="font-mono text-sm">{row.code}</code>
                <Badge variant="outline" className={STATUS_TONE[status]}>{status}</Badge>
                <span className="text-xs text-muted-foreground">
                  {(row.current_uses ?? 0)}/{row.max_uses ?? '∞'} used
                  {row.expires_at ? ` · expires ${new Date(row.expires_at).toLocaleDateString()}` : ''}
                  {row.metadata?.label ? ` · ${row.metadata.label}` : ''}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => void copy(row.code, `c-${row.id}`)} aria-label={`Copy ${row.code}`}>
                    {copied === `c-${row.id}` ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void copy(inviteLink(row.code), `l-${row.id}`)} aria-label={`Copy invite link for ${row.code}`}>
                    {copied === `l-${row.id}` ? <Check className="h-4 w-4 text-emerald-500" /> : <Link2 className="h-4 w-4" />}
                  </Button>
                  {status === 'active' && (
                    <Button variant="ghost" size="sm" onClick={() => void revoke(row)} aria-label={`Withdraw ${row.code}`}>
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
