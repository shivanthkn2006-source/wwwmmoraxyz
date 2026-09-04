/**
 * REAL-TIME BEHAVIOUR METER — measured, never simulated.
 *
 * A tiny singleton that observes what the member actually does in this session:
 *   • typing speed / variance — real keystroke timestamps on text inputs
 *   • context switches        — real `visibilitychange` events
 *   • session interruptions   — real window `blur` events
 *   • deep work minutes       — wall-clock focused time (total minus hidden time)
 *
 * Nothing is randomised. Fields with no observations yet return `null`, and
 * callers must treat `null` as "not measured", not as zero.
 */

interface BehaviorSnapshot {
  typingSpeedWpm: number | null;
  typingSpeedVariance: number | null;
  contextSwitches: number;
  sessionInterruptions: number;
  deepWorkMinutes: number;
}

const KEY_WINDOW = 120; // keep the last N intervals

let started = false;
let intervals: number[] = [];
let lastKeyAt = 0;
let contextSwitches = 0;
let sessionInterruptions = 0;
let focusedMs = 0;
let lastFocusTick = Date.now();

function tickFocus() {
  const now = Date.now();
  if (typeof document === 'undefined' || document.visibilityState === 'visible') {
    focusedMs += now - lastFocusTick;
  }
  lastFocusTick = now;
}

export function startBehaviorMeter(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  lastFocusTick = Date.now();

  window.addEventListener('keydown', (event) => {
    // Only count real text entry, not shortcuts or navigation keys.
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
    const now = performance.now();
    if (lastKeyAt > 0) {
      const delta = now - lastKeyAt;
      // Ignore pauses longer than 5s — that is thinking, not typing rhythm.
      if (delta > 0 && delta < 5000) {
        intervals.push(delta);
        if (intervals.length > KEY_WINDOW) intervals = intervals.slice(-KEY_WINDOW);
      }
    }
    lastKeyAt = now;
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    tickFocus();
    if (document.visibilityState === 'hidden') contextSwitches += 1;
  });

  window.addEventListener('blur', () => {
    tickFocus();
    sessionInterruptions += 1;
  });
  window.addEventListener('focus', tickFocus);
}

export function readBehaviorSnapshot(): BehaviorSnapshot {
  tickFocus();
  let typingSpeedWpm: number | null = null;
  let typingSpeedVariance: number | null = null;

  if (intervals.length >= 5) {
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    // 5 characters ≈ 1 word (standard WPM convention).
    typingSpeedWpm = Math.round(60_000 / (mean * 5));
    const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
    typingSpeedVariance = Number((Math.sqrt(variance) / 10).toFixed(2));
  }

  return {
    typingSpeedWpm,
    typingSpeedVariance,
    contextSwitches,
    sessionInterruptions,
    deepWorkMinutes: Math.round(focusedMs / 60_000),
  };
}

export function resetBehaviorMeter(): void {
  intervals = [];
  lastKeyAt = 0;
  contextSwitches = 0;
  sessionInterruptions = 0;
  focusedMs = 0;
  lastFocusTick = Date.now();
}

export type { BehaviorSnapshot };
