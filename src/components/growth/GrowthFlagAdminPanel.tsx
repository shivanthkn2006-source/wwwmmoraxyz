/**
 * GROWTH FEATURE FLAG ADMIN PANEL
 *
 * Gradual rollout controls for every Growth Engine flag plus a one-click kill
 * switch that disables all of them at once. Every change is written to
 * growth_audit_log so a rollback can always be traced back to a person and a
 * timestamp. Row-level security enforces admin-only writes — this UI mirrors it.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Flag, ShieldAlert, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { invalidateGrowthFlags } from '@/hooks/useGrowthFlags';
import { logGrowthAudit, fetchGrowthAudit, type GrowthAuditRow } from '@/lib/growthAudit';

interface FlagRow {
  flag_key: string;
  enabled: boolean;
  rollout_percent: number;
  allow_user_ids: string[] | null;
  block_user_ids: string[] | null;
  description: string | null;
}

const idList = (value: string): string[] =>
  value.split(/[\s,]+/).map((v) => v.trim()).filter(Boolean);

export default function GrowthFlagAdminPanel() {
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [killOpen, setKillOpen] = useState(false);
  const [killing, setKilling] = useState(false);
  const [audit, setAudit] = useState<GrowthAuditRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { allow: string; block: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('growth_feature_flags')
        .select('flag_key, enabled, rollout_percent, allow_user_ids, block_user_ids, description')
        .order('flag_key');
      const rows = (data as FlagRow[] | null) ?? [];
      setFlags(rows);
      setDrafts(
        Object.fromEntries(rows.map((f) => [
          f.flag_key,
          { allow: (f.allow_user_ids ?? []).join(', '), block: (f.block_user_ids ?? []).join(', ') },
        ])),
      );
      setAudit(await fetchGrowthAudit(15));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const persist = async (flag: FlagRow, patch: Partial<FlagRow>) => {
    setSaving(flag.flag_key);
    try {
      const { error } = await supabase
        .from('growth_feature_flags')
        .update(patch)
        .eq('flag_key', flag.flag_key);
      if (error) throw error;
      invalidateGrowthFlags();
      await logGrowthAudit('flag_updated', { flag: flag.flag_key, patch });
      toast.success(`${flag.flag_key} updated`);
      await load();
    } catch (e) {
      toast.error((e as Error)?.message ?? 'Could not update the flag (admin only)');
    } finally {
      setSaving(null);
    }
  };

  const killSwitch = async () => {
    setKilling(true);
    try {
      const { error } = await supabase
        .from('growth_feature_flags')
        .update({ enabled: false })
        .in('flag_key', flags.map((f) => f.flag_key));
      if (error) throw error;
      invalidateGrowthFlags();
      await logGrowthAudit('flag_kill_switch', { flags: flags.map((f) => f.flag_key) });
      toast.success('Growth Engine disabled for everyone');
      setKillOpen(false);
      await load();
    } catch (e) {
      toast.error((e as Error)?.message ?? 'Kill switch failed');
    } finally {
      setKilling(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Flag className="h-4 w-4 text-primary" aria-hidden="true" />
          Feature flags &amp; rollout
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <p className="text-muted-foreground">
          Turn a capability on for named members, a percentage bucket, or everyone. Switching a flag
          off is an instant, global rollback — no deploy needed.
        </p>

        {loading && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Loading flags…
          </p>
        )}
        {!loading && flags.length === 0 && (
          <p className="text-muted-foreground">No flags visible — this panel is admin only.</p>
        )}

        {flags.map((flag) => (
          <div key={flag.flag_key} className="space-y-2 rounded-lg border border-border p-3" data-growth-flag={flag.flag_key}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{flag.flag_key}</p>
                {flag.description && <p className="text-muted-foreground">{flag.description}</p>}
              </div>
              <Switch
                checked={flag.enabled}
                disabled={saving === flag.flag_key}
                onCheckedChange={(v) => void persist(flag, { enabled: v })}
                aria-label={`Enable ${flag.flag_key}`}
              />
            </div>

            <div className="grid grid-cols-[1fr_auto] items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor={`pct-${flag.flag_key}`} className="text-[11px]">Rollout %</Label>
                <Input
                  id={`pct-${flag.flag_key}`}
                  type="number" min={0} max={100}
                  defaultValue={flag.rollout_percent}
                  onBlur={(e) => {
                    const next = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                    if (next !== flag.rollout_percent) void persist(flag, { rollout_percent: next });
                  }}
                />
              </div>
              <span className="pb-2 text-[10px] text-muted-foreground">stable per-user bucket</span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`allow-${flag.flag_key}`} className="text-[11px]">Always on for (user ids)</Label>
                <Input
                  id={`allow-${flag.flag_key}`}
                  value={drafts[flag.flag_key]?.allow ?? ''}
                  placeholder="uuid, uuid"
                  onChange={(e) => setDrafts((d) => ({
                    ...d, [flag.flag_key]: { ...d[flag.flag_key], allow: e.target.value },
                  }))}
                  onBlur={(e) => void persist(flag, { allow_user_ids: idList(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`block-${flag.flag_key}`} className="text-[11px]">Always off for (user ids)</Label>
                <Input
                  id={`block-${flag.flag_key}`}
                  value={drafts[flag.flag_key]?.block ?? ''}
                  placeholder="uuid, uuid"
                  onChange={(e) => setDrafts((d) => ({
                    ...d, [flag.flag_key]: { ...d[flag.flag_key], block: e.target.value },
                  }))}
                  onBlur={(e) => void persist(flag, { block_user_ids: idList(e.target.value) })}
                />
              </div>
            </div>
          </div>
        ))}

        {flags.length > 0 && (
          <Button
            variant="destructive" size="sm" className="w-full"
            onClick={() => setKillOpen(true)}
          >
            <ShieldAlert className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Kill switch — disable every Growth flag
          </Button>
        )}

        <div className="space-y-1.5 border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <p className="font-medium">Audit log</p>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => void load()}>
              <RotateCcw className="mr-1 h-3 w-3" aria-hidden="true" /> Refresh
            </Button>
          </div>
          {audit.length === 0 && <p className="text-muted-foreground">No recorded actions yet.</p>}
          {audit.map((row) => (
            <div key={row.id} className="rounded-lg border border-border p-2">
              <p className="font-medium">{row.action}</p>
              <p className="break-all text-muted-foreground">{JSON.stringify(row.details)}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(row.created_at).toLocaleString()} · actor {row.actor_id?.slice(0, 8) ?? '—'}
              </p>
            </div>
          ))}
        </div>
      </CardContent>

      <AlertDialog open={killOpen} onOpenChange={setKillOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable the Growth Engine for everyone?</AlertDialogTitle>
            <AlertDialogDescription>
              All Growth flags are switched off immediately: no new insights, alerts, pushes or
              emails for any member. Existing cards stay intact and flags can be re-enabled here at
              any time. The action is written to the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={killing}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={killing} onClick={(e) => { e.preventDefault(); void killSwitch(); }}>
              {killing ? 'Disabling…' : 'Disable everything'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
