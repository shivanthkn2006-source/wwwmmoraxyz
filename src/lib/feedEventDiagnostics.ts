import { supabase } from '@/integrations/supabase/client';

export type FeedEventName =
  | 'new_snapshot'
  | 'new_badge_rendered'
  | 'new_badge_viewed'
  | 'new_badge_suppressed'
  | 'like_event_received'
  | 'like_event_invalid'
  | 'like_event_fallback';

const recent = new Map<string, number>();

/** Structured client + backend diagnostics. Bounded and deduped to avoid noisy writes. */
export function logFeedEvent(
  event: FeedEventName,
  details: Record<string, unknown>,
  userId?: string,
): void {
  const signature = `${event}:${String(details.post_id ?? '')}:${String(details.reason ?? '')}`;
  const now = Date.now();
  if (now - (recent.get(signature) ?? 0) < 10_000) return;
  recent.set(signature, now);
  if (import.meta.env.DEV) console.info('[FeedEvent]', event, details);
  if (!userId) return;
  void supabase.from('feed_diagnostics_log').insert({
    user_id: userId,
    status: event.includes('invalid') || event.includes('suppressed') ? 'warning' : 'ok',
    message: event,
    error_code: `feed_${event}`,
    route: typeof window === 'undefined' ? '/home' : window.location.pathname,
    user_agent: typeof navigator === 'undefined' ? null : navigator.userAgent.slice(0, 200),
    context: details as never,
  }).then(({ error }) => {
    if (error && import.meta.env.DEV) console.warn('[FeedEvent] backend log failed', error.message);
  });
}

export const __resetFeedEventDiagnostics = () => recent.clear();