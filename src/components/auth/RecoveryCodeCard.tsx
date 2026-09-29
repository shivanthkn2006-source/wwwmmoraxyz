import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';

/** Optional account recovery code — a backup way back in if Google or a passkey device is lost. */
export const RecoveryCodeCard = () => {
  const [status, setStatus] = useState<{ exists: boolean; enabled: boolean }>({ exists: false, enabled: false });
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase.from('account_recovery_codes' as never).select('enabled').eq('user_id', u.user.id).maybeSingle();
    setStatus({ exists: !!data, enabled: !!(data as { enabled?: boolean } | null)?.enabled });
  };
  useEffect(() => { void load(); }, []);

  const call = async (operation: string, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('passkey-auth', { body: { operation, ...extra } });
      if (error || !data?.success) throw new Error(data?.error || 'Something went wrong');
      return data;
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    } finally { setBusy(false); }
  };

  const create = async () => {
    const data = await call('recovery_setup');
    if (data?.code) { setCode(data.code); await load(); }
  };
  const toggle = async (enabled: boolean) => {
    const data = await call('recovery_toggle', { enabled });
    if (data) { setStatus((s) => ({ ...s, enabled })); if (!enabled) setCode(null); }
  };

  return (
    <Card className="bg-card/40 backdrop-blur-xl border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5" /> Recovery code</CardTitle>
        <CardDescription>Optional. A backup way to reset your password if you lose your phone or Google login.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {status.exists && (
          <div className="flex items-center justify-between">
            <span className="text-sm">Recovery code {status.enabled ? 'on' : 'off'}</span>
            <Switch checked={status.enabled} disabled={busy} onCheckedChange={toggle} aria-label="Recovery code on or off" />
          </div>
        )}
        {code && (
          <div className="rounded-md border border-border p-3">
            <p className="font-mono text-base tracking-wider break-all select-all">{code}</p>
            <p className="text-xs text-muted-foreground mt-1">Write this down now. It won't be shown again.</p>
          </div>
        )}
        <Button variant="outline" disabled={busy} onClick={create}>
          {status.exists ? 'Make a new code (old one stops working)' : 'Create recovery code'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default RecoveryCodeCard;
