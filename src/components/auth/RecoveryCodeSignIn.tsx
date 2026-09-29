import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/** Reset a password with the member's optional recovery code, then sign in normally. */
export const RecoveryCodeSignIn = ({ open, onOpenChange, defaultEmail = '' }: { open: boolean; onOpenChange: (o: boolean) => void; defaultEmail?: string }) => {
  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('passkey-auth', {
        body: { operation: 'recovery_reset', email: email.trim().toLowerCase(), code, newPassword: password },
      });
      if (error || !data?.success) throw new Error(data?.error || "That recovery code didn't work.");
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (signErr) throw signErr;
      toast.success('Password reset. You are signed in.');
      onOpenChange(false);
      window.location.assign('/home');
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Use a recovery code</DialogTitle>
          <DialogDescription>Enter your email, your recovery code and a new password.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <Input placeholder="XXXXX-XXXXX-XXXXX-XXXXX" value={code} onChange={(e) => setCode(e.target.value)} required autoComplete="one-time-code" className="font-mono" />
          <Input type="password" placeholder="New password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" />
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Checking…' : 'Reset and sign in'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RecoveryCodeSignIn;
