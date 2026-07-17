// Lightweight analytics dispatcher. Emits a CustomEvent on `window` and logs
// in dev so debug overlays / external listeners can trace behavior without
// requiring a full analytics SDK.
export type AnalyticsEvent =
  | { name: 'home_autoscroll_scope'; scope: 'today' | 'fallback'; count: number }
  | { name: 'loop_mute_toggle'; postId: string; muted: boolean; persisted: boolean };

export function trackEvent(evt: AnalyticsEvent) {
  try {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('mmora:analytics', { detail: evt }));
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info('[analytics]', evt.name, evt);
    }
    (window as any).__mmoraLastAnalytics = evt;
  } catch {
    // never throw from analytics
  }
}
