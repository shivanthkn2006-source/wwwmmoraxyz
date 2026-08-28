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
import { logGrowthAudit } from '@/lib/growthAudit';
import {
  FOCUS_AREAS, REFLECTION_STYLE_OPTIONS, ALL_REFLECTION_STYLES, deviceTimeZone,
  slotsForFrequency, SLOT_LABEL, sanitizeStyles, type ReflectionStyle,
} from '@/lib/growthSlot';

export const GROWTH_ONBOARDING_SNOOZE_KEY = 'growth:onboarding:snoozed';
const SNOOZE_KEY = GROWTH_ONBOARDING_SNOOZE_KEY;

/** True when the user dismissed the modal earlier in this browser session. */
export function isOnboardingSnoozed(): boolean {
  try { return sessionStorage.getItem(SNOOZE_KEY) === '1'; } catch { return false; }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export const PersonalGrowthOnboarding: React.FC<Props> = ({ open, onOpenChange, onComplete }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [topics, setTopics] = useState<string[]>([]);
  const [styles, setStyles] = useState<ReflectionStyle[]>(['actionable']);
  const [frequency, setFrequency] = useState(5);
  const [saving, setSaving] = useState(false);

  const toggleStyle = (id: ReflectionStyle) =>
    setStyles((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const allStylesSelected = styles.length === ALL_REFLECTION_STYLES.length;

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
      reflection_style: sanitizeStyles(styles)[0],
      reflection_styles: sanitizeStyles(styles),
      delivery_frequency: frequency,
      paused: false,
      onboarded_at: new Date().toISOString(),
    });
    setSaving(false);
    if (!ok) return;
    void logGrowthAudit('onboarding_completed', {
      focus_areas: topics, styles: sanitizeStyles(styles), delivery_frequency: frequency,
    });
    toast.success('Daily engine activated');
    onComplete?.();
    onOpenChange(false);
  };

  /**
   * Explicit opt-out. Records the decision so the modal does not reappear, and
   * leaves the engine paused until the user turns it on from the insights page
   * or settings.
   */
  const skip = async () => {
    await persist({ paused: true, onboarded_at: new Date().toISOString() });
    void logGrowthAudit('onboarding_skipped', { step, paused: true, at: new Date().toISOString() });
    toast('Daily insights stay off — you can turn them on any time', {
      description: 'Growth insights → Turn the engine on',
    });
    onOpenChange(false);
  };

  /**
   * Accidental dismissal (outside click / Escape) must NOT silently opt the
   * user out for good — that produced accounts that were onboarded, paused and
   * permanently empty. Snooze for this session instead and ask again later.
   */
  const dismiss = () => {
    try { sessionStorage.setItem(SNOOZE_KEY, '1'); } catch { /* private mode */ }
    void logGrowthAudit('onboarding_dismissed', { step, paused: false, snoozed: true });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-w-md">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Select your focus areas ({topics.length} selected)</DialogTitle>
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
              <DialogTitle>Content delivery style ({styles.length} selected)</DialogTitle>
              <DialogDescription>
                Pick one or several — you can select all four and see every kind.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() =>
                  setStyles(allStylesSelected ? ['actionable'] : [...ALL_REFLECTION_STYLES])
                }
                aria-pressed={allStylesSelected}
                className={`w-full rounded-lg border p-2.5 text-left text-xs font-medium transition ${
                  allStylesSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card hover:border-muted-foreground/40'
                }`}
              >
                {allStylesSelected ? 'All styles selected' : 'Select all four styles'}
              </button>
              {REFLECTION_STYLE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleStyle(option.id)}
                  aria-pressed={styles.includes(option.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    styles.includes(option.id)
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
              <Button className="flex-1" disabled={!styles.length} onClick={() => setStep(3)}>Next step</Button>
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
