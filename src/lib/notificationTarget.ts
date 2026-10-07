/**
 * Where tapping a notification goes. One resolver for the bell drop-down and
 * the side notifications window, so every alert kind opens its content.
 */
export type NotifLike = {
  type?: string | null;
  post_id?: string | null;
  from_user_id?: string | null;
  suggestion_type?: string | null;
  context_data?: unknown;
};

const ALIASES: Record<string, string> = { '/vr-world': '/zoe-omega' };

export function notificationTarget(n: NotifLike): string {
  const ctx = (n.context_data ?? {}) as { route?: unknown; link?: unknown; url?: unknown };
  const raw = [ctx.route, ctx.link, ctx.url].find((v) => typeof v === 'string' && v.startsWith('/')) as string | undefined;
  if (raw) {
    const [path, q] = raw.split('?');
    return (ALIASES[path] ?? path) + (q ? `?${q}` : '');
  }
  const t = n.type ?? '';
  if (n.post_id) return `/post/${n.post_id}`;
  if (n.suggestion_type === 'interest_match' || t === 'interest_match' || t === 'message' || t === 'direct_message' || t === 'missed_call')
    return n.from_user_id ? `/chat?user=${n.from_user_id}` : '/chat';
  if (t === 'friend_request' || t === 'friend_accepted') return '/huddle';
  if (t.startsWith('vr_')) return '/zoe-omega';
  if (t.startsWith('growth')) return '/growth-insights';
  if (t.startsWith('dhf')) return '/dhf-dashboard';
  if (t.startsWith('analytics_')) return '/analytics-dashboard';
  if (t === 'uptime_alert' || t.startsWith('system')) return '/admin/health';
  if (t === 'tier_upgrade' || t.includes('badge') || t.includes('challenge')) return '/profile';
  if (t.includes('music')) return '/music';
  if (n.from_user_id) return `/profile/${n.from_user_id}`;
  return '/notification-history';
}
