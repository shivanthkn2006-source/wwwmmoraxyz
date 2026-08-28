/**
 * Growth engine controls: focus areas, delivery styles, frequency (1–5),
 * notifications, pause/resume, next-insight status, regenerate, and a full
 * "delete my growth data" action.
 *
 * The panel is still a preferences editor — the only generation it can trigger
 * is the explicit, rate-limited "regenerate" button.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Loader2, RefreshCw, AlertCircle, CheckCircle2, Clock, PauseCircle, Download, BellRing,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useGrowthStatus, type NextStatus } from '@/hooks/useGrowthStatus';
import { useGrowthFlags } from '@/hooks/useGrowthFlags';
import { GROWTH_FLAGS } from '@/lib/growthFlags';
import { exportGrowthData } from '@/lib/growthExport';
import { pushPermission, requestPushPermission } from '@/lib/growthPush';
import {
  FOCUS_AREAS, REFLECTION_STYLE_OPTIONS, ALL_REFLECTION_STYLES, deviceTimeZone,
  slotsForFrequency, SLOT_LABEL, sanitizeStyles, type ReflectionStyle,
} from '@/lib/growthSlot';

const DIGEST_MODES = ['instant', 'daily', 'off'] as const;
type DigestMode = (typeof DIGEST_MODES)[number];

const DIGEST_COPY: Record<DigestMode, string> = {
  instant: 'Alert me as each insight is generated',
  daily: 'One daily summary instead of individual alerts',
  off: 'No alerts — I will check the feed myself',
};

const STATUS_COPY: Record<NextStatus, { label: string; tone: string; Icon: typeof Clock }> = {
  paused: { label: 'Paused — no new insights', tone: 'text-muted-foreground', Icon: PauseCircle },
  failed: { label: 'Last run reported a problem', tone: 'text-destructive', Icon: AlertCircle },
  pending: { label: 'Next insight is generating', tone: 'text-primary', Icon: Loader2 },
  scheduled: { label: 'Next insight is scheduled', tone: 'text-muted-foreground', Icon: Clock },
  complete: { label: 'All of today’s insights are delivered', tone: 'text-primary', Icon: CheckCircle2 },
};

interface GrowthEngineSettingsProps {
  onSaved?: () => void;
}

export const GrowthEngineSettings: React.FC<GrowthEngineSettingsProps> = ({ onSaved }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [styles, setStyles] = useState<ReflectionStyle[]>(['actionable']);
  const [frequency, setFrequency] = useState(5);
  const [paused, setPaused] = useState(false);
  const [notify, setNotify] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [digest, setDigest] = useState<DigestMode>('instant');
  const [exporting, setExporting] = useState(false);
  const { isEnabled } = useGrowthFlags();

  const { status, loading: statusLoading, regenerating, refresh: refreshStatus, regenerate } =
    useGrowthStatus(Boolean(user));

  const loadPrefs = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('growth_preferences')
      .select(
        'focus_areas, reflection_style, reflection_styles, delivery_frequency, paused, ' +
        'notify_on_new_insight, notify_push, notify_email, notify_digest',
      )
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      const row = data as unknown as Record<string, unknown>;
      setTopics((row.focus_areas as string[]) ?? []);
      setStyles(
        sanitizeStyles(
          (row.reflection_styles as unknown[])?.length
            ? (row.reflection_styles as unknown[])
            : [row.reflection_style],
        ),
      );
      setFrequency(Number(row.delivery_frequency ?? 5));
      setPaused(Boolean(row.paused));
      setNotify(row.notify_on_new_insight !== false);
      setNotifyPush(row.notify_push !== false);
      setNotifyEmail(Boolean(row.notify_email));
      setDigest(DIGEST_MODES.includes(row.notify_digest as DigestMode)
        ? (row.notify_digest as DigestMode)
        : 'instant');
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { void loadPrefs(); }, [loadPrefs]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('growth_preferences').upsert(
      {
        user_id: user.id,
        focus_areas: topics.length ? topics : [FOCUS_AREAS[0]],
        reflection_style: sanitizeStyles(styles)[0],
        reflection_styles: sanitizeStyles(styles),
        delivery_frequency: frequency,
        paused,
        notify_on_new_insight: notify,
        notify_push: notifyPush,
        notify_email: notifyEmail,
        notify_digest: digest,
        timezone: deviceTimeZone(),
        onboarded_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    setSaving(false);
    if (error) { toast.error('Could not save preferences'); return; }
    toast.success(paused ? 'Insights paused' : 'Preferences saved');
    void refreshStatus();
    if (!paused) {
      void supabase.functions.invoke('growth-dispatch', { body: { action: 'catchup-me' } })
        .finally(() => onSaved?.());
    } else {
      onSaved?.();
    }
  };

  /**
   * Hard delete: stops future generation first (pause), then removes saved
   * bookmarks, analytics, delivered cards and finally the preference row, so a
   * concurrent worker run can never re-populate after the wipe.
   */
  const removeData = async () => {
    if (!user) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await supabase.from('growth_preferences').update({ paused: true }).eq('user_id', user.id);
      await supabase.from('growth_saved_items').delete().eq('user_id', user.id);
      await supabase.from('growth_card_events').delete().eq('user_id', user.id);
      await supabase.from('growth_feed_items').delete().eq('user_id', user.id);
      const { error } = await supabase.from('growth_preferences').delete().eq('user_id', user.id);
      if (error) throw error;
      setTopics([]); setStyles(['actionable']); setFrequency(5); setPaused(true);
      toast.success('All growth data deleted');
      void refreshStatus();
    } catch {
      toast.error('Could not delete every item — please try again');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const onRegenerate = async () => {
    const res = await regenerate();
    toast[res.ok ? 'success' : 'error'](res.ok ? 'Insight regenerated' : res.error ?? 'Could not regenerate');
  };

  /** Asks for device permission before enabling push, so the toggle never lies. */
  const togglePush = async (next: boolean) => {
    if (!next) { setNotifyPush(false); return; }
    const permission = await requestPushPermission();
    if (permission === 'granted') { setNotifyPush(true); return; }
    setNotifyPush(false);
    toast.error(
      permission === 'unsupported'
        ? 'This browser cannot show device notifications'
        : 'Allow notifications in your browser settings to enable this',
    );
  };

  const onExport = async (format: 'csv' | 'json') => {
    if (!user) return;
    setExporting(true);
    try {
      const summary = await exportGrowthData(user.id, format);
      toast.success(`Exported ${summary.insights} insights and ${summary.events} events`);
    } catch {
      toast.error('Could not build your export — please try again');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return null;

  const copy = STATUS_COPY[status?.next_status ?? 'scheduled'];
  const StatusIcon = copy.Icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily growth insights</CardTitle>
        <CardDescription>
          Personalised insights delivered to your feed in your own time zone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div
          className="rounded-lg border border-border bg-muted/40 p-3"
          data-growth-status={status?.next_status ?? 'unknown'}
        >
          {statusLoading ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Checking your delivery status…
            </p>
          ) : (
            <>
              <p className={`flex items-center gap-2 text-xs font-medium ${copy.tone}`}>
                <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {copy.label}
              </p>
              {status?.next && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Next: {status.next.label} at {status.next.local_time} ({status.timezone})
                </p>
              )}
              {status?.engine_paused_reason && (
                <p className="mt-1 text-[11px] text-destructive">{status.engine_paused_reason}</p>
              )}
            </>
          )}
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={regenerating || paused}
              onClick={() => void onRegenerate()}
            >
              {regenerating
                ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                : <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}
              Regenerate next insight
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void refreshStatus()}>Refresh</Button>
          </div>
        </div>

        {status?.schedule?.length ? (
          <div className="space-y-1.5" data-growth-schedule>
            <Label>Today’s delivery windows</Label>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {status.schedule.map((entry) => (
                <li key={entry.slot} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-xs">{entry.label}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {entry.local_time} ·{' '}
                    {entry.status === 'delivered' ? 'Delivered'
                      : entry.status === 'pending' ? 'Generating'
                      : entry.status === 'shadow' ? 'Preview only'
                      : 'Scheduled'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <Label htmlFor="growth-paused">Pause automated insights</Label>
          <Switch id="growth-paused" checked={paused} onCheckedChange={setPaused} />
        </div>

        <div className="space-y-3 rounded-lg border border-border p-3" data-growth-notifications>
          <p className="flex items-center gap-2 text-xs font-semibold">
            <BellRing className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Notifications
          </p>

          <div className="flex items-center justify-between">
            <Label htmlFor="growth-notify" className="text-xs font-normal">
              In-app alert when a new insight arrives
            </Label>
            <Switch id="growth-notify" checked={notify} onCheckedChange={setNotify} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="growth-notify-push" className="text-xs font-normal">
                Device / mobile push notification
              </Label>
              <p className="text-[10px] text-muted-foreground">
                {pushPermission() === 'denied'
                  ? 'Blocked in your browser settings'
                  : pushPermission() === 'unsupported'
                    ? 'Not supported on this browser'
                    : 'Works on this device, including installed mobile app'}
              </p>
            </div>
            <Switch
              id="growth-notify-push"
              checked={notifyPush}
              disabled={!isEnabled(GROWTH_FLAGS.push)}
              onCheckedChange={(v) => void togglePush(v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="growth-notify-email" className="text-xs font-normal">
                Email me new insights
              </Label>
              {!isEnabled(GROWTH_FLAGS.email) && (
                <p className="text-[10px] text-muted-foreground">Rolling out — not enabled for your account yet</p>
              )}
            </div>
            <Switch
              id="growth-notify-email"
              checked={notifyEmail}
              disabled={!isEnabled(GROWTH_FLAGS.email)}
              onCheckedChange={setNotifyEmail}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-normal">How often</Label>
            <div className="grid gap-1.5">
              {DIGEST_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={digest === mode}
                  onClick={() => setDigest(mode)}
                  className={`rounded-lg border p-2 text-left text-xs capitalize transition ${
                    digest === mode
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card hover:border-muted-foreground/40'
                  }`}
                >
                  <span className="font-medium">{mode}</span>
                  <span className="block text-[10px] text-muted-foreground">{DIGEST_COPY[mode]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Focus areas</Label>
          <div className="grid grid-cols-2 gap-2">
            {FOCUS_AREAS.map((area) => {
              const selected = topics.includes(area);
              return (
                <button
                  key={area}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    setTopics((p) => (p.includes(area) ? p.filter((t) => t !== area) : [...p, area]))
                  }
                  className={`rounded-lg border p-2.5 text-left text-xs transition ${
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card hover:border-muted-foreground/40'
                  }`}
                >
                  {area}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Content delivery style</Label>
          <button
            type="button"
            onClick={() =>
              setStyles(
                styles.length === ALL_REFLECTION_STYLES.length
                  ? ['actionable']
                  : [...ALL_REFLECTION_STYLES],
              )
            }
            aria-pressed={styles.length === ALL_REFLECTION_STYLES.length}
            className={`w-full rounded-lg border p-2.5 text-left text-xs font-medium transition ${
              styles.length === ALL_REFLECTION_STYLES.length
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card hover:border-muted-foreground/40'
            }`}
          >
            {styles.length === ALL_REFLECTION_STYLES.length
              ? 'All styles selected'
              : 'Select all four styles'}
          </button>
          <div className="grid gap-2">
            {REFLECTION_STYLE_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                aria-pressed={styles.includes(o.id)}
                onClick={() =>
                  setStyles((prev) =>
                    prev.includes(o.id) ? prev.filter((s) => s !== o.id) : [...prev, o.id],
                  )
                }
                className={`rounded-lg border p-2.5 text-left text-xs transition ${
                  styles.includes(o.id)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card hover:border-muted-foreground/40'
                }`}
              >
                {o.title}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Insights per day: {frequency}</Label>
          <Slider value={[frequency]} min={1} max={5} step={1} onValueChange={([v]) => setFrequency(v)} />
          <p className="text-xs text-muted-foreground">
            {slotsForFrequency(frequency).map((s) => SLOT_LABEL[s]).join(', ')}
          </p>
        </div>

        {isEnabled(GROWTH_FLAGS.export) && (
          <div className="space-y-2 rounded-lg border border-border p-3" data-growth-export>
            <Label className="text-xs">Export my growth data</Label>
            <p className="text-[10px] text-muted-foreground">
              Preferences, delivered insights, bookmarks and card analytics.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={exporting} onClick={() => void onExport('csv')}>
                {exporting
                  ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  : <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}
                CSV
              </Button>
              <Button size="sm" variant="outline" disabled={exporting} onClick={() => void onExport('json')}>
                <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                JSON
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button className="flex-1" disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Save preferences'}
          </Button>
          <Button
            variant={confirmDelete ? 'destructive' : 'outline'}
            disabled={deleting}
            onClick={() => void removeData()}
          >
            {deleting ? 'Deleting…' : confirmDelete ? 'Confirm delete' : 'Delete data'}
          </Button>
        </div>
        {confirmDelete && !deleting && (
          <p className="text-[11px] text-muted-foreground">
            This permanently removes your preferences, delivered cards, saved bookmarks and
            analytics, and stops all future generation.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default GrowthEngineSettings;
