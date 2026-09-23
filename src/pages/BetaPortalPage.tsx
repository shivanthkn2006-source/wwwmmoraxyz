/**
 * BETA PORTAL — the public front door for gated-beta testers.
 *
 * A tester arrives with an invite code (usually via /beta?code=…). The code is
 * checked server-side before any account work happens, then they either sign in
 * or create an account. On success the code is bound to their account and they
 * land on /platform-overview, which explains the platform.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import PageSeo from '@/components/seo/PageSeo';
import { supabase } from '@/integrations/supabase/client';
import {
  INVITE_REASON_COPY,
  normaliseInviteCode,
  redeemInviteCode,
  validateInviteCode,
} from '@/lib/betaInvites';

type Stage = 'code' | 'account';

export default function BetaPortalPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [stage, setStage] = useState<Stage>('code');
  const [code, setCode] = useState(() => normaliseInviteCode(params.get('code') ?? ''));
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmitCode = useMemo(() => normaliseInviteCode(code).length >= 6, [code]);

  const checkCode = useCallback(async (value: string) => {
    setChecking(true);
    setMessage(null);
    try {
      const { valid, reason } = await validateInviteCode(value);
      if (!valid) {
        setMessage(INVITE_REASON_COPY[reason] ?? INVITE_REASON_COPY.unknown);
        return false;
      }
      setStage('account');
      return true;
    } catch {
      setMessage('The invite service is unreachable right now. Try again in a moment.');
      return false;
    } finally {
      setChecking(false);
    }
  }, []);

  // A code arriving in the link is checked once, so the tester lands straight
  // on the account step instead of retyping what the email already gave them.
  useEffect(() => {
    const linked = normaliseInviteCode(params.get('code') ?? '');
    if (linked.length >= 6) void checkCode(linked);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = useCallback(async () => {
    const result = await redeemInviteCode(code);
    if (!result.ok && result.error && result.error !== 'sign in required') {
      setMessage(INVITE_REASON_COPY[result.error as keyof typeof INVITE_REASON_COPY] ?? 'Invite could not be applied.');
      return;
    }
    navigate('/', { replace: true });
  }, [code, navigate]);

  const submitAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        await finish();
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/beta?code=${encodeURIComponent(code)}` },
      });
      if (error) throw error;
      if (!data.session) {
        setMessage('Account created. Confirm your email, then return here to finish with the same code.');
        return;
      }
      await finish();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not complete sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-6 px-4 py-10">
      <PageSeo
        title="Beta access portal"
        description="Redeem your gated beta invite code and sign in to the platform."
      />

      <header className="space-y-2 text-center">
        <Badge variant="outline" className="mx-auto flex w-fit items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Gated beta
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight">Beta access portal</h1>
        <p className="text-sm text-muted-foreground">
          Invite codes are verified server-side. Nothing is created on your account until the code checks out.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {stage === 'code' ? <KeyRound className="h-4 w-4 text-primary" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            {stage === 'code' ? 'Step 1 — your invite code' : 'Step 2 — your account'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {stage === 'code' ? (
            <form
              className="space-y-3"
              onSubmit={(event) => { event.preventDefault(); void checkCode(code); }}
            >
              <div className="space-y-1">
                <Label htmlFor="beta-code">Invite code</Label>
                <Input
                  id="beta-code"
                  value={code}
                  autoComplete="one-time-code"
                  placeholder="MMORA-XXXX-XXXX-XXXX"
                  onChange={(event) => setCode(normaliseInviteCode(event.target.value))}
                  className="font-mono"
                />
              </div>
              <Button type="submit" className="w-full" disabled={!canSubmitCode || checking}>
                {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Verify code
              </Button>
            </form>
          ) : (
            <form className="space-y-3" onSubmit={submitAccount}>
              <p className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
                Code <span className="font-mono">{code}</span> accepted.
              </p>
              <div className="space-y-1">
                <Label htmlFor="beta-email">Email</Label>
                <Input id="beta-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="beta-password">Password</Label>
                <Input
                  id="beta-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {mode === 'signup' ? 'Create account and enter' : 'Sign in and enter'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <button
                type="button"
                className="w-full text-xs text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => setMode((current) => (current === 'signup' ? 'signin' : 'signup'))}
              >
                {mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Create one'}
              </button>
            </form>
          )}

          {message && (
            <p role="status" className="text-sm text-muted-foreground">{message}</p>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Curious what you are joining?{' '}
        <Link to="/platform-overview" className="underline underline-offset-4">Read the platform overview</Link>.
      </p>
    </main>
  );
}
