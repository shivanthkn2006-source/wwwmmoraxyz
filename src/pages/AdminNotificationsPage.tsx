/**
 * Admin-only platform notifications control: every alert feature and delivery
 * channel with a platform-wide on/off switch (default on), plus live health.
 * Switches are enforced in the database, so turning one off stops that alert
 * everywhere (bell, badges, panel, pop-ups, push).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import IOSSwitch from '@/components/admin/IOSSwitch';
import NotificationHealthPanel from '@/components/admin/NotificationHealthPanel';

interface Kind { kind: string; feature: string; label: string; enabled: boolean }
interface ChannelRow { channel: string; label: string; enabled: boolean }

const FEATURE_LABELS: Record<string, string> = {
  messages: 'Messages', likes: 'Likes', comments: 'Comments', replies: 'Comment replies', tags: 'Tags & mentions',
  friends: 'Friends', posts: 'Posts & timelines', badges: 'Badges & challenges', music: 'Music', calls: 'Calls',
  growth: 'Growth cards', dhf: "Zoe's DHF", lol: "Zoe's LOL", zoe: 'Zoe suggestions', admin: 'Admin notices', system: 'General',
  analytics: 'Platform analytics (admin only)',
};

export default function AdminNotificationsPage() {
  const [kinds, setKinds] = useState<Kind[]>([]);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const db = supabase as any;

  const load = useCallback(async () => {
    const [k, c] = await Promise.all([
      db.from('notification_kinds').select('kind, feature, label, enabled').order('feature'),
      db.from('notification_channel_settings').select('channel, label, enabled').order('channel'),
    ]);
    if (k.error || c.error) { setError((k.error || c.error).message); return; }
    setError(null); setKinds(k.data ?? []); setChannels(c.data ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const features = useMemo(() => {
    const m = new Map<string, Kind[]>();
    kinds.forEach((k) => { if (!m.has(k.feature)) m.set(k.feature, []); m.get(k.feature)!.push(k); });
    return [...m.entries()];
  }, [kinds]);

  const setFeature = async (feature: string, enabled: boolean) => {
    setSaving(feature);
    const prev = kinds;
    setKinds((ks) => ks.map((k) => (k.feature === feature ? { ...k, enabled } : k)));
    const { data, error: e } = await db.from('notification_kinds').update({ enabled, updated_at: new Date().toISOString() }).eq('feature', feature).select('kind');
    setSaving(null);
    if (e || !data?.length) { setKinds(prev); toast.error('Could not save. Try again.'); return; }
    toast.success(`${FEATURE_LABELS[feature] ?? feature} alerts ${enabled ? 'on' : 'off'}`);
  };

  const setChannel = async (channel: string, enabled: boolean) => {
    setSaving(channel);
    const prev = channels;
    setChannels((cs) => cs.map((c) => (c.channel === channel ? { ...c, enabled } : c)));
    const { data, error: e } = await db.from('notification_channel_settings').update({ enabled, updated_at: new Date().toISOString() }).eq('channel', channel).select('channel');
    setSaving(null);
    if (e || !data?.length) { setChannels(prev); toast.error('Could not save. Try again.'); }
  };

  const allOn = kinds.length > 0 && kinds.every((k) => k.enabled);
  const setAll = async (enabled: boolean) => {
    setSaving('all');
    const { error: e } = await db.from('notification_kinds').update({ enabled }).neq('kind', '');
    setSaving(null);
    if (e) { toast.error('Could not save. Try again.'); return; }
    void load();
  };

  return (
    <div className="min-h-screen p-4 pb-24 text-foreground">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">M'Mora platform notifications</h1>
          <Button size="icon" variant="ghost" onClick={() => void load()} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></Button>
        </div>
        {error && <Card className="p-3 text-sm text-destructive">{error}</Card>}

        <Card className="p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">All platform notifications</p>
            <p className="text-xs text-muted-foreground">Turning a switch off stops that alert for every member, everywhere.</p>
          </div>
          <IOSSwitch label="All notifications" checked={allOn} disabled={saving === 'all'} onChange={(v) => void setAll(v)} />
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="p-4">
            <p className="mb-2 text-sm font-semibold">Features</p>
            <div className="divide-y divide-border/40">
              {features.map(([feature, list]) => {
                const on = list.every((k) => k.enabled);
                return (
                  <div key={feature} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0 pr-2">
                      <p className="text-sm">{FEATURE_LABELS[feature] ?? feature}</p>
                      <p className="truncate text-xs text-muted-foreground">{list.map((k) => k.label).join(' · ')}</p>
                    </div>
                    <IOSSwitch label={FEATURE_LABELS[feature] ?? feature} checked={on} disabled={saving === feature} onChange={(v) => void setFeature(feature, v)} />
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="p-4">
            <p className="mb-2 text-sm font-semibold">Delivery</p>
            <div className="divide-y divide-border/40">
              <div className="flex items-center justify-between py-2.5"><p className="text-sm">In-app bell, badges & pop-ups</p><span className="text-xs text-muted-foreground">Follows feature switches</span></div>
              {channels.map((c) => (
                <div key={c.channel} className="flex items-center justify-between py-2.5">
                  <p className="text-sm">{c.label}</p>
                  <IOSSwitch label={c.label} checked={c.enabled} disabled={saving === c.channel} onChange={(v) => void setChannel(c.channel, v)} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <NotificationHealthPanel />
      </div>
    </div>
  );
}
