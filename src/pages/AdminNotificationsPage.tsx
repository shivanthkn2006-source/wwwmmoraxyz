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
import { RefreshCw, ChevronDown, Send } from 'lucide-react';
import { toast } from 'sonner';
import IOSSwitch from '@/components/admin/IOSSwitch';
import NotificationHealthPanel from '@/components/admin/NotificationHealthPanel';
import { notifySelf } from '@/lib/notifySelf';

interface Kind { kind: string; feature: string; label: string; enabled: boolean }
interface ChannelRow { channel: string; label: string; enabled: boolean }

const FEATURE_LABELS: Record<string, string> = {
  messages: 'Messages', likes: 'Likes', comments: 'Comments', replies: 'Comment replies', tags: 'Tags & mentions',
  friends: 'Friends', posts: 'Posts & timelines', badges: 'Badges & challenges', music: 'Music', calls: 'Calls',
  growth: 'Growth cards', dhf: "Zoe's DHF", lol: "Zoe's LOL", zoe: 'Zoe suggestions', admin: 'Admin notices', system: 'General',
  analytics: 'Platform analytics (admin only)', vr: 'VR World',
  monitoring: 'Live platform monitoring (admin only)', vr_live: 'VR World live activity (admin only)',
};

export default function AdminNotificationsPage() {
  const [kinds, setKinds] = useState<Kind[]>([]);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState(false);
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
    void notifySelf('analytics_setting_changed', 'Notification switch changed', `${FEATURE_LABELS[feature] ?? feature} turned ${enabled ? 'on' : 'off'}`, { feature: 'monitoring' });
  };

  // Sub-switch: one alert type, for every member (new and existing). Never touches the feature or main switch rows.
  const setKind = async (kind: Kind, enabled: boolean) => {
    setSaving(kind.kind);
    const prev = kinds;
    setKinds((ks) => ks.map((k) => (k.kind === kind.kind ? { ...k, enabled } : k)));
    const { data, error: e } = await db.from('notification_kinds').update({ enabled, updated_at: new Date().toISOString() }).eq('kind', kind.kind).select('kind');
    setSaving(null);
    if (e || !data?.length) { setKinds(prev); toast.error('Could not save. Try again.'); return; }
    void notifySelf('analytics_setting_changed', 'Notification switch changed', `${kind.label} turned ${enabled ? 'on' : 'off'}`, { feature: 'monitoring' });
  };

  const testPush = async () => {
    setTesting(true);
    const { data, error: e } = await supabase.functions.invoke('notification-push', { body: { action: 'test' } });
    setTesting(false);
    if (e) { toast.error('Phone test failed. Try again.'); return; }
    if (data?.delivered > 0) toast.success(`Test alert sent to ${data.delivered} device${data.delivered > 1 ? 's' : ''}`);
    else if (data?.reason === 'push_switched_off') toast.error('Phone push or the main switch is off.');
    else toast.error('No phone is set up yet. Allow notifications on your phone first.');
  };

  const setChannel = async (channel: string, enabled: boolean) => {
    setSaving(channel);
    const prev = channels;
    setChannels((cs) => cs.map((c) => (c.channel === channel ? { ...c, enabled } : c)));
    const { data, error: e } = await db.from('notification_channel_settings').update({ enabled, updated_at: new Date().toISOString() }).eq('channel', channel).select('channel');
    setSaving(null);
    if (e || !data?.length) { setChannels(prev); toast.error('Could not save. Try again.'); return; }
    const name = channel === 'all' ? 'All platform notifications' : (channels.find((c) => c.channel === channel)?.label ?? channel);
    void notifySelf('analytics_setting_changed', 'Notification switch changed', `${name} turned ${enabled ? 'on' : 'off'}`, { feature: 'monitoring' });
  };

  // Master switch is its own setting: sub-switches never flip it.
  const master = channels.find((c) => c.channel === 'all');
  const allOn = master ? master.enabled : true;
  const deliveryChannels = channels.filter((c) => c.channel !== 'all');
  const setAll = (enabled: boolean) => setChannel('all', enabled);

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
            <p className="text-xs text-muted-foreground">{allOn ? 'Main switch. Feature switches below turn single alerts off without touching this.' : 'All alerts are paused for every member. Feature switches keep their own settings.'}</p>
          </div>
          <IOSSwitch label="All notifications" checked={allOn} disabled={saving === 'all' || !master} onChange={(v) => void setAll(v)} />
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="p-4">
            <p className="mb-2 text-sm font-semibold">Features</p>
            <div className="divide-y divide-border/40">
              {features.map(([feature, list]) => {
                const onCount = list.filter((k) => k.enabled).length;
                const on = onCount === list.length;
                const isOpen = !!open[feature];
                const name = FEATURE_LABELS[feature] ?? feature;
                return (
                  <div key={feature} className="py-2.5">
                    <div className="flex items-center justify-between">
                      <span
                        role="button" tabIndex={0} aria-expanded={isOpen} aria-label={`Show ${name} alerts`}
                        onClick={() => setOpen((o) => ({ ...o, [feature]: !isOpen }))}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((o) => ({ ...o, [feature]: !isOpen })); } }}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 pr-2"
                      >
                        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        <span className="min-w-0">
                          <span className="block text-sm">{name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{onCount === list.length ? `All ${list.length} on` : `${onCount} of ${list.length} on`} · {list.map((k) => k.label).join(' · ')}</span>
                        </span>
                      </span>
                      <IOSSwitch label={name} checked={on} disabled={saving === feature} onChange={(v) => void setFeature(feature, v)} />
                    </div>
                    {isOpen && (
                      <div className="mt-2 ml-5 divide-y divide-border/30 border-l border-border/40 pl-3">
                        {list.map((k) => (
                          <div key={k.kind} className="flex items-center justify-between py-2">
                            <p className="min-w-0 pr-2 text-xs">{k.label}</p>
                            <IOSSwitch label={k.label} checked={k.enabled} disabled={saving === k.kind} onChange={(v) => void setKind(k, v)} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="p-4">
            <p className="mb-2 text-sm font-semibold">Delivery</p>
            <div className="divide-y divide-border/40">
              <div className="flex items-center justify-between py-2.5"><p className="text-sm">In-app bell, badges & pop-ups</p><span className="text-xs text-muted-foreground">Follows feature switches</span></div>
              {deliveryChannels.map((c) => (
                <div key={c.channel} className="flex items-center justify-between py-2.5">
                  <p className="text-sm">{c.label}</p>
                  <div className="flex items-center gap-2">
                    {c.channel === 'push' && (
                      <Button size="sm" variant="ghost" disabled={testing} onClick={() => void testPush()} aria-label="Send a test alert to my phone">
                        <Send className="mr-1 h-3.5 w-3.5" />{testing ? 'Sending' : 'Test'}
                      </Button>
                    )}
                    <IOSSwitch label={c.label} checked={c.enabled} disabled={saving === c.channel} onChange={(v) => void setChannel(c.channel, v)} />
                  </div>
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
