/**
 * INVITE APPROVAL (admin only)
 *
 * Every invite code has to be approved here before it lets anyone in.
 * Row-level security already limits writes to admins — this page is the
 * console for it: create a code, approve (activate) it, or revoke it.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Loader2, Check, Ban, Plus, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import useIsAdmin from '@/hooks/useIsAdmin';
import { referralLink, shareTargets } from '@/lib/referral';

interface InviteRow {
  id: string;
  code: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number | null;
  used_by: string | null;
  used_at: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  metadata: Record<string, unknown> | null;
}

const randomCode = () =>
  `MMORA-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

export default function AdminInvitesPage() {
  const isAdmin = useIsAdmin();
  const { toast } = useToast();
  const [rows, setRows] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [newCode, setNewCode] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newUses, setNewUses] = useState('1');
  const [copied, setCopied] = useState<string | null>(null);

  const copyLink = async (code: string) => {
    try {
      await navigator.clipboard.writeText(referralLink(code));
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 2000);
    } catch {
      toast({ title: 'Copy failed', description: 'Select the link and copy it manually.', variant: 'destructive' });
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('invite_codes')
      .select('id, code, is_active, created_at, expires_at, max_uses, current_uses, used_by, used_at, revoked_at, revoked_reason, metadata')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) toast({ title: 'Could not load invites', description: error.message, variant: 'destructive' });
    setRows((data as InviteRow[] | null) ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (isAdmin) void load();
    else if (isAdmin === false) setLoading(false);
  }, [isAdmin, load]);

  const setActive = async (row: InviteRow, active: boolean) => {
    setBusy(row.id);
    const { data: sessionData } = await supabase.auth.getSession();
    const payload = active
      ? { is_active: true, revoked_at: null, revoked_reason: null, revoked_by: null }
      : { is_active: false, revoked_at: new Date().toISOString(), revoked_reason: 'revoked by admin', revoked_by: sessionData.session?.user?.id ?? null };
    const { error } = await supabase.from('invite_codes').update(payload).eq('id', row.id);
    setBusy(null);
    if (error) toast({ title: 'Change refused', description: error.message, variant: 'destructive' });
    else void load();
  };

  const createCode = async () => {
    const code = (newCode.trim() || randomCode()).toUpperCase();
    setBusy('new');
    const { data: sessionData } = await supabase.auth.getSession();
    const uses = Math.max(1, Math.min(500, Number.parseInt(newUses, 10) || 1));
    const { error } = await supabase.from('invite_codes').insert({
      code,
      is_active: false, // waits for your approval
      max_uses: uses,
      current_uses: 0,
      created_by: sessionData.session?.user?.id ?? null,
      metadata: { kind: 'referral', label: newLabel.trim() || null },
    });
    setBusy(null);
    if (error) toast({ title: 'Could not create the code', description: error.message, variant: 'destructive' });
    else {
      setNewCode('');
      setNewLabel('');
      setNewUses('1');
      toast({ title: 'Code created', description: `${code} is waiting for your approval.` });
      void load();
    }
  };

  const pending = useMemo(() => rows.filter((r) => !r.is_active && !r.revoked_at).length, [rows]);

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">This page is for administrators only.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Invite approvals | M'Mora admin</title>
        <meta name="description" content="Approve or revoke invite codes before new members can join M'Mora." />
      </Helmet>

      <div className="mx-auto max-w-3xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/home" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create an invite or referral code</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="Leave blank for a random code"
              className="flex-1 min-w-[180px]"
            />
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Who is this for? (optional)"
              className="flex-1 min-w-[160px]"
            />
            <Input
              value={newUses}
              onChange={(e) => setNewUses(e.target.value)}
              inputMode="numeric"
              placeholder="Uses"
              className="w-24"
            />
            <Button onClick={() => void createCode()} disabled={busy === 'new'}>
              {busy === 'new' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="ml-2">Add</span>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Invites · {rows.length} total · {pending} waiting for approval
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!loading && rows.length === 0 && <p className="text-sm text-muted-foreground">No invite codes yet.</p>}
            {rows.map((row) => {
              const state = row.revoked_at ? 'Revoked' : row.used_at ? 'Used' : row.is_active ? 'Approved' : 'Waiting';
              return (
                <div key={row.id} className="flex items-center justify-between gap-3 border border-border rounded-md px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm truncate">{row.code}</p>
                    <p className="text-xs text-muted-foreground">
                      {state} · used {row.current_uses ?? 0}/{row.max_uses ?? 1} · created {new Date(row.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {!row.is_active && (
                      <Button size="sm" variant="outline" onClick={() => void setActive(row, true)} disabled={busy === row.id}>
                        <Check className="h-4 w-4" />
                        <span className="ml-1 hidden sm:inline">Approve</span>
                      </Button>
                    )}
                    {row.is_active && (
                      <Button size="sm" variant="outline" onClick={() => void setActive(row, false)} disabled={busy === row.id}>
                        <Ban className="h-4 w-4" />
                        <span className="ml-1 hidden sm:inline">Revoke</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
