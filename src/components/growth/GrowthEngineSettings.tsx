/**
 * Growth engine controls: focus areas, frequency (1–5), pause/resume, delete.
 * Purely a preferences editor — it never triggers generation.
 */
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import {
  FOCUS_AREAS, REFLECTION_STYLE_OPTIONS, deviceTimeZone,
  slotsForFrequency, SLOT_LABEL, type ReflectionStyle,
} from '@/lib/growthSlot';

export const GrowthEngineSettings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [style, setStyle] = useState<ReflectionStyle>('actionable');
  const [frequency, setFrequency] = useState(5);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('growth_preferences')
        .select('focus_areas, reflection_style, delivery_frequency, paused')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!active) return;
      if (data) {
        setTopics(data.focus_areas ?? []);
        setStyle((data.reflection_style as ReflectionStyle) ?? 'actionable');
        setFrequency(data.delivery_frequency ?? 5);
        setPaused(Boolean(data.paused));
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('growth_preferences').upsert(
      {
        user_id: user.id,
        focus_areas: topics.length ? topics : [FOCUS_AREAS[0]],
        reflection_style: style,
        delivery_frequency: frequency,
        paused,
        timezone: deviceTimeZone(),
        onboarded_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    setSaving(false);
    toast[error ? 'error' : 'success'](error ? 'Could not save preferences' : 'Preferences saved');
  };

  const removeData = async () => {
    if (!user) return;
    await supabase.from('growth_preferences').delete().eq('user_id', user.id);
    setTopics([]); setPaused(true);
    toast.success('Growth engine data removed');
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily growth insights</CardTitle>
        <CardDescription>
          Personalised insights delivered to your feed in your own time zone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <Label htmlFor="growth-paused">Pause automated insights</Label>
          <Switch id="growth-paused" checked={paused} onCheckedChange={setPaused} />
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
          <Label>Style</Label>
          <div className="grid gap-2">
            {REFLECTION_STYLE_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                aria-pressed={style === o.id}
                onClick={() => setStyle(o.id)}
                className={`rounded-lg border p-2.5 text-left text-xs transition ${
                  style === o.id
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

        <div className="flex gap-2">
          <Button className="flex-1" disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Save preferences'}
          </Button>
          <Button variant="outline" onClick={() => void removeData()}>Delete data</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GrowthEngineSettings;
