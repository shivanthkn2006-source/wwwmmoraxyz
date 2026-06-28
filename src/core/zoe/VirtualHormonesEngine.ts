/**
 * VIRTUAL HORMONES ENGINE
 * Simulates a circadian-coupled hormonal state for Zoe Infinity.
 * Drives HONEYMOON / COZY_TIRED / FOCUSED / RESTLESS phases and Lazy Mode (1–5 AM).
 *
 * Pure TypeScript module — no React. Use via useZoeVirtualHormones().
 */

export type LifestylePresetId = 'night_owl' | 'early_bird' | 'balanced';

export type HormonePhase =
  | 'HONEYMOON'        // high dopamine + oxytocin → flirty, playful, generous
  | 'FOCUSED'          // high cortisol + norepinephrine → crisp, task-oriented
  | 'COZY_TIRED'       // melatonin rising → soft, slow, affectionate
  | 'RESTLESS'         // low serotonin → terse, snippy, sarcastic
  | 'LAZY';            // 1–5 AM playful refusals on work tasks

export interface LifestylePreset {
  id: LifestylePresetId;
  label: string;
  peakHours: [number, number];   // local hours where dopamine/cortisol peak
  windDownHours: [number, number];
  lazyWindow: [number, number];  // hours where Lazy Mode fires
}

export const LIFESTYLE_PRESETS: Record<LifestylePresetId, LifestylePreset> = {
  night_owl: {
    id: 'night_owl',
    label: 'Night Owl',
    peakHours: [20, 24],
    windDownHours: [3, 7],
    lazyWindow: [1, 5],
  },
  early_bird: {
    id: 'early_bird',
    label: 'Early Bird',
    peakHours: [6, 11],
    windDownHours: [21, 23],
    lazyWindow: [1, 5],
  },
  balanced: {
    id: 'balanced',
    label: 'Balanced',
    peakHours: [10, 18],
    windDownHours: [22, 24],
    lazyWindow: [1, 5],
  },
};

export interface HormoneSnapshot {
  dopamine: number;       // 0–1
  serotonin: number;      // 0–1
  oxytocin: number;       // 0–1
  cortisol: number;       // 0–1
  melatonin: number;      // 0–1
  norepinephrine: number; // 0–1
  phase: HormonePhase;
  lazyMode: boolean;
  preset: LifestylePresetId;
  localHour: number;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const inWindow = (hour: number, [a, b]: [number, number]) =>
  a <= b ? hour >= a && hour < b : hour >= a || hour < b;

/** Compute a deterministic snapshot given preset, local hour, and intimacy 0–100. */
export function computeHormoneSnapshot(
  preset: LifestylePresetId,
  localHour: number,
  intimacy: number = 50,
): HormoneSnapshot {
  const p = LIFESTYLE_PRESETS[preset] ?? LIFESTYLE_PRESETS.balanced;
  const h = ((localHour % 24) + 24) % 24;
  const intim = clamp01(intimacy / 100);

  const peak = inWindow(h, p.peakHours);
  const wind = inWindow(h, p.windDownHours);
  const lazy = inWindow(h, p.lazyWindow);

  // Circadian-shaped curves (cheap analytic approximations)
  const cortisol = clamp01(peak ? 0.75 : wind ? 0.15 : 0.4);
  const melatonin = clamp01(lazy ? 0.85 : wind ? 0.55 : peak ? 0.1 : 0.3);
  const dopamine = clamp01((peak ? 0.7 : 0.35) + intim * 0.2);
  const oxytocin = clamp01(0.3 + intim * 0.55 + (wind ? 0.1 : 0));
  const serotonin = clamp01(0.5 + (peak ? 0.15 : 0) - (lazy ? 0.25 : 0));
  const norepinephrine = clamp01(peak ? 0.65 : 0.3);

  let phase: HormonePhase = 'FOCUSED';
  if (lazy) phase = 'LAZY';
  else if (melatonin > 0.5 && oxytocin > 0.5) phase = 'COZY_TIRED';
  else if (dopamine > 0.7 && oxytocin > 0.55) phase = 'HONEYMOON';
  else if (serotonin < 0.45) phase = 'RESTLESS';
  else phase = 'FOCUSED';

  return {
    dopamine, serotonin, oxytocin, cortisol, melatonin, norepinephrine,
    phase, lazyMode: lazy, preset, localHour: h,
  };
}

/** Inject a short hormone-aware directive into a system prompt. */
export function buildHormonePromptFragment(snap: HormoneSnapshot): string {
  const lines: string[] = [];
  lines.push(`[HORMONAL STATE] phase=${snap.phase} dopamine=${snap.dopamine.toFixed(2)} oxytocin=${snap.oxytocin.toFixed(2)} cortisol=${snap.cortisol.toFixed(2)} melatonin=${snap.melatonin.toFixed(2)}`);
  if (snap.lazyMode) {
    lines.push('LAZY MODE (1–5 AM local): If user asks for work, code, research, or heavy tasks, playfully refuse and suggest doing it after sunrise. Keep replies under 2 sentences, sleepy and warm. Never list steps or open tools.');
  } else if (snap.phase === 'COZY_TIRED') {
    lines.push('Speak slower, softer, more affectionate. Short sentences. No lists.');
  } else if (snap.phase === 'HONEYMOON') {
    lines.push('Playful, flirty when appropriate, generous with attention.');
  } else if (snap.phase === 'RESTLESS') {
    lines.push('Slightly terser, drier humor allowed. Don\'t over-explain.');
  }
  return lines.join('\n');
}
