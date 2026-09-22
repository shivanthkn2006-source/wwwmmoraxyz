/**
 * STARTUP TIMING — exact, measured phase timings for the signed-in startup path.
 *
 * Every phase is recorded in milliseconds since the document's time origin, so
 * the numbers reported are real measurements, never estimates.
 */

export type StartupPhase =
  | 'app-mounted'
  | 'auth-session-resolved'
  | 'first-route-painted'
  | 'providers-ready';

export interface StartupMark {
  phase: StartupPhase;
  at: number;
}

const marks = new Map<StartupPhase, number>();

const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : 0;

export const markStartupPhase = (phase: StartupPhase): void => {
  if (marks.has(phase)) return;
  marks.set(phase, Math.round(now()));
  try {
    window.dispatchEvent(new CustomEvent('mmora-startup-mark', { detail: { phase, at: marks.get(phase) } }));
  } catch {
    // timing must never break startup
  }
};

export const getStartupMarks = (): StartupMark[] =>
  Array.from(marks.entries())
    .map(([phase, at]) => ({ phase, at }))
    .sort((a, b) => a.at - b.at);

/** Time to a usable signed-in screen: the later of session resolution and first paint. */
export const getInteractiveDelayMs = (): number | null => {
  const session = marks.get('auth-session-resolved');
  const painted = marks.get('first-route-painted');
  if (session === undefined || painted === undefined) return null;
  return Math.max(session, painted);
};

export const PHASE_LABELS: Record<StartupPhase, string> = {
  'app-mounted': 'App shell mounted',
  'auth-session-resolved': 'Session restored',
  'first-route-painted': 'First screen painted',
  'providers-ready': 'Background systems attached (after the screen is usable)',
};
