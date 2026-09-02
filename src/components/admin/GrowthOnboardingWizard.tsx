/**
 * Growth onboarding wizard.
 *
 * Members without a growth_preferences row receive no growth cards at all.
 * This wizard lists them and seeds starter preferences so delivery begins,
 * while leaving onboarded_at NULL so each member still sees the in-app
 * onboarding flow and can override every choice.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Sparkles, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type MissingUser = {
  user_id: string;
  username: string | null;
  display_name: string | null;
};

const invokeBackfill = async (body: Record<string, unknown>) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Sign in again to run the onboarding backfill.');
  const { data, error } = await supabase.functions.invoke('growth-onboarding-backfill', {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw error;
  return data as { missingCount?: number; notOnboardedCount?: number; users?: MissingUser[]; seeded?: number };
};

const GrowthOnboardingWizard: React.FC = () => {
  const [users, setUsers] = useState<MissingUser[]>([]);
  const [notOnboarded, setNotOnboarded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invokeBackfill({ action: 'list' });
      setUsers(result.users ?? []);
      setNotOnboarded(result.notOnboardedCount ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load onboarding gaps.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const apply = useCallback(async () => {
    setApplying(true);
    setError(null);
    setMessage(null);
    try {
      const result = await invokeBackfill({ action: 'apply' });
      setMessage(`Seeded starter preferences for ${result.seeded ?? 0} member(s).`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backfill failed.');
    }
    setApplying(false);
  }, [load]);

  return (
    <Card data-testid="growth-onboarding-wizard">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            Growth onboarding wizard
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {loading ? 'Checking coverage…' : `${users.length} member(s) with no growth preferences`}
            {notOnboarded !== null ? ` · ${notOnboarded} started but not finished` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading || applying}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => void apply()} disabled={applying || loading || users.length === 0}>
            {applying ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <UserPlus className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
            )}
            Seed starter preferences
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
        {message ? <p className="mb-2 text-sm text-foreground">{message}</p> : null}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground">Every member has growth preferences.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {users.slice(0, 25).map((user) => (
              <li key={user.user_id} className="rounded-md border border-border px-3 py-2">
                <span className="font-medium text-foreground">{user.display_name ?? 'Unnamed'}</span>
                <span className="ml-2 text-muted-foreground">@{user.username ?? 'unknown'}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default GrowthOnboardingWizard;
