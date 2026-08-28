/**
 * PERSONAL GROWTH ONBOARDING
 *
 * Shown once after first sign-in. Writes growth_preferences and nothing else;
 * skipping is always allowed and never blocks the app. Uses existing design
 * tokens and shadcn primitives — no new palette.
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import {
  FOCUS_AREAS, REFLECTION_STYLE_OPTIONS, deviceTimeZone,
  slotsForFrequency, SLOT_LABEL, type ReflectionStyle,
} from '@/lib/growthSlot';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export const PersonalGrowthOnboarding: React.FC<Props> = ({ open, onOpenChange, onComplete }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [topics, setTopics] = useState<string[]>([]);
  const [style, setStyle] = useState<ReflectionStyle>('actionable');
  const [frequency, setFrequency] = useState(5);
  const [saving, setSaving] = useState(false);

  const toggleTopic = (topic: string) =>
    setTopics((prev) => (prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]));

  const persist = async (payload: Record<string, unknown>) => {
    if (!user) return false;
    const { error } = await supabase.from('growth_preferences').upsert(
      { user_id: user.id, timezone: deviceTimeZone(), ...payload },
      { onConflict: 'user_id' },
    );
    if (error) {
      toast.error('Could not save your preferences. Please try again.');
      return false;
    }
    return true;
  };

  const finish = async () => {
    setSaving(true);
    const ok = await persist({
      focus_areas: topics.length ? topics : [FOCUS_AREAS[0]],
      reflection_style: style,
      delivery_frequency: frequency,
      paused: false,
      onboarded_at: new Date().toISOString(),
    });
    setSaving(false);
    if (!ok) return;
    toast.success('Daily engine activated');
    onComplete?.();
    onOpenChange(false);
  };

  const skip = async () => {
    // Record the decision so the modal does not reappear every session.
    await persist({ paused: true, onboarded_at: new Date().toISOString() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) void skip(); }}>
      <DialogContent className="max-w-md">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Select your focus areas</DialogTitle>
              <DialogDescription>
                Choose the themes your daily insights should centre around.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2">
              {FOCUS_AREAS.map((area) => {
                const selected = topics.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleTopic(area)}
                    aria-pressed={selected}
                    className={`rounded-lg border p-3 text-left text-xs font-medium transition ${
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
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => void skip()}>Not now</Button>
              <Button className="flex-1" disabled={!topics.length} onClick={() => setStep(2)}>
                Next step
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Content delivery style</DialogTitle>
              <DialogDescription>How should your daily insights be structured?</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {REFLECTION_STYLE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setStyle(option.id)}
                  aria-pressed={style === option.id}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    style === option.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card hover:border-muted-foreground/40'
                  }`}
                >
                  <p className="text-sm font-semibold">{option.title}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)}>Next step</Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle>How often should Zoe deliver?</DialogTitle>
              <DialogDescription>
                You can change this or pause the engine any time in settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Slider
                value={[frequency]}
                min={1}
                max={5}
                step={1}
                onValueChange={([v]) => setFrequency(v)}
                aria-label="Insights per day"
              />
              <p className="text-sm text-muted-foreground">
                {frequency} insight{frequency > 1 ? 's' : ''} per day —{' '}
                {slotsForFrequency(frequency).map((s) => SLOT_LABEL[s]).join(', ')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setStep(2)}>Back</Button>
              <Button className="flex-1" disabled={saving} onClick={() => void finish()}>
                {saving ? 'Activating…' : 'Activate daily engine'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PersonalGrowthOnboarding;
