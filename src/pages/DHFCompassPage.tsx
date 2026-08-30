/**
 * DHF DAILY COMPASS — the member's own archive page.
 *
 * Read-only by construction: it never triggers generation (the cron pre-warms
 * every member, and the home feed owns the one "ensure" call per session), so
 * opening this page costs a single SELECT.
 *
 * Also hosts the referral surface (code + reward balance + redeem) and, for
 * admins only, the safe backfill / regenerate control.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Compass, Gift, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import PageSeo from '@/components/seo/PageSeo';
import DHFCompassCard from '@/components/dhf/DHFCompassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { duePosts, type DhfDailyPost } from '@/lib/dhfCompass';
import { resolveCompassImages } from '@/lib/dhfCompassImages';
import { deviceTimeZone } from '@/lib/growthSlot';

const SELECT =
  'id, post_date, slot_time, category, headline, short_summary, full_story_content, image_url, image_path, image_source, powered_by_badge, referral_cta, astrological_context, created_at';

const DHFCompassPage: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<DhfDailyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [referral, setReferral] = useState<{ code: string; points: number } | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUserId, setAdminUserId] = useState('');
  const [adminDate, setAdminDate] = useState('');
  const [adminBusy, setAdminBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const [{ data: rows }, { data: profile }, { data: roles }] = await Promise.all([
        supabase.from('dhf_daily_posts').select(SELECT).eq('user_id', user.id)
          .order('post_date', { ascending: false }).order('slot_time', { ascending: false }).limit(120),
        supabase.from('user_dhf_profiles').select('referral_code, reward_points').eq('id', user.id).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').limit(1),
      ]);
      setPosts(await resolveCompassImages((rows ?? []) as unknown as DhfDailyPost[]));
      if (profile) setReferral({ code: profile.referral_code ?? '', points: profile.reward_points ?? 0 });
      setIsAdmin(Boolean(roles && roles.length));
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  /** Only cards whose local slot has arrived — same rule as the feed. */
  const visible = useMemo(() => duePosts(posts, new Date(), deviceTimeZone()), [posts]);

  const grouped = useMemo(() => {
    const map = new Map<string, DhfDailyPost[]>();
    for (const post of visible) {
      const list = map.get(post.post_date) ?? [];
      list.push(post);
      map.set(post.post_date, list);
    }
    return Array.from(map.entries());
  }, [visible]);

  const redeem = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setRedeeming(true);
    try {
      const { data, error } = await supabase.functions.invoke('dhf-referral-redeem', { body: { code } });
      if (error) throw error;
      if (data?.already_redeemed) toast.info('This account already used a referral code.');
      else if (data?.credited) toast.success(`Reward credited — you earned ${data.referred.awarded} points.`);
      else toast.error(data?.error ?? 'Could not redeem that code.');
      setCodeInput('');
      void load();
    } catch (e) {
      toast.error((e as Error)?.message ?? 'Redeem failed.');
    } finally {
      setRedeeming(false);
    }
  };

  const runAdmin = async (action: 'backfill' | 'regenerate') => {
    setAdminBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-dhf-daily-feed', {
        body: { action, userId: adminUserId.trim(), date: adminDate || undefined },
      });
      if (error) throw error;
      if (data?.error) toast.error(String(data.error));
      else if (data?.cached) toast.info('Day already complete — nothing generated, nothing charged.');
      else toast.success(`${action} done — ${data?.generated ?? 0} cards, ${data?.vaultUsed ?? 0} fallback.`);
    } catch (e) {
      toast.error((e as Error)?.message ?? 'Admin action failed.');
    } finally {
      setAdminBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <PageSeo
        title="Daily Compass — your scheduled Zoe forecasts"
        description="Every Daily Compass card generated for you, in order, with your referral rewards and story archive."
      />
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <header className="mb-6">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <Compass className="h-5 w-5" aria-hidden="true" /> Daily Compass
          </h1>
          <p className="text-sm text-muted-foreground">
            Ten scheduled cards a day, generated once and kept forever.
          </p>
        </header>

        <section className="mb-6 rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Gift className="h-4 w-4" aria-hidden="true" /> Referral rewards
          </h2>
          <p className="text-sm text-muted-foreground">
            Your code: <span className="font-mono text-foreground">{referral?.code || '—'}</span> · Balance:{' '}
            <span className="font-medium text-foreground">{referral?.points ?? 0}</span> points
          </p>
          <div className="mt-3 flex gap-2">
            <Input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="Enter a friend's code"
              aria-label="Referral code"
            />
            <Button onClick={redeem} disabled={redeeming || !codeInput.trim()}>
              {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Redeem'}
            </Button>
          </div>
        </section>

        {isAdmin && (
          <section className="mb-6 rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Admin backfill
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={adminUserId} onChange={(e) => setAdminUserId(e.target.value)} placeholder="User id (uuid)" aria-label="Target user id" />
              <Input type="date" value={adminDate} onChange={(e) => setAdminDate(e.target.value)} aria-label="Target date" />
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" disabled={adminBusy || !adminUserId} onClick={() => runAdmin('backfill')}>Backfill (safe)</Button>
              <Button variant="destructive" disabled={adminBusy || !adminUserId} onClick={() => runAdmin('regenerate')}>Regenerate</Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Backfill skips days that are already complete, so it can never be charged twice.
            </p>
          </section>
        )}

        {loading && <p className="text-sm text-muted-foreground">Loading your compass…</p>}
        {!loading && visible.length === 0 && (
          <p className="text-sm text-muted-foreground">Your first cards arrive with the next scheduled window.</p>
        )}

        {grouped.map(([date, list]) => (
          <section key={date} className="mb-8" data-compass-day={date}>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">{date}</h2>
            <div className="space-y-4">
              {list.map((post) => <DHFCompassCard key={post.id} post={post} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default DHFCompassPage;
