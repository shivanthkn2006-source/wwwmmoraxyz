/**
 * /privacy — the member's own data rights page.
 *
 * Download everything M'Mora holds about you, or erase the account entirely.
 * Both actions run server-side against the signed-in caller only; deletion is
 * irreversible and removes rows, uploaded files and the login itself.
 */
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const PrivacyDataPage: React.FC = () => {
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const [confirm, setConfirm] = useState('');

  const exportData = async () => {
    setBusy('export');
    try {
      const { data, error } = await supabase.functions.invoke('account-data', { body: { action: 'export' } });
      if (error || !data?.ok) throw new Error(error?.message ?? 'Export failed');

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mmora-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Your data file has been downloaded.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setBusy(null);
    }
  };

  const deleteAccount = async () => {
    if (confirm !== 'DELETE') {
      toast.error('Type DELETE to confirm.');
      return;
    }
    setBusy('delete');
    try {
      const { data, error } = await supabase.functions.invoke('account-data', {
        body: { action: 'delete', confirm: 'DELETE' },
      });
      if (error || !data?.ok) throw new Error(error?.message ?? data?.error ?? 'Deletion failed');
      toast.success('Your account and data have been erased.');
      await supabase.auth.signOut();
      window.location.href = '/auth';
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Deletion failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground px-5 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Your data</h1>
          <p className="text-sm text-muted-foreground">
            Download a copy of everything stored under your account, or remove it permanently.
          </p>
        </header>

        <section className="space-y-3 rounded-lg border border-border p-5">
          <h2 className="text-base font-medium">Download my data</h2>
          <p className="text-sm text-muted-foreground">
            A single file with your profile, posts, memories, messages and activity.
          </p>
          <Button variant="outline" onClick={exportData} disabled={busy !== null}>
            {busy === 'export' ? 'Preparing…' : 'Download'}
          </Button>
        </section>

        <section className="space-y-3 rounded-lg border border-border p-5">
          <h2 className="text-base font-medium">Delete my account</h2>
          <p className="text-sm text-muted-foreground">
            This erases your profile, posts, uploads, memories and sign-in. It cannot be undone.
            Type <span className="font-mono">DELETE</span> to confirm.
          </p>
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="DELETE"
            aria-label="Type DELETE to confirm"
            className="max-w-xs"
          />
          <Button variant="destructive" onClick={deleteAccount} disabled={busy !== null || confirm !== 'DELETE'}>
            {busy === 'delete' ? 'Erasing…' : 'Delete everything'}
          </Button>
        </section>
      </div>
    </main>
  );
};

export default PrivacyDataPage;
