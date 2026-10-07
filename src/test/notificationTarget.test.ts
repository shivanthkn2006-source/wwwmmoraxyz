import { describe, it, expect } from 'vitest';
import { notificationTarget as t } from '@/lib/notificationTarget';

describe('notification tap destinations (every kind seen in the last 30 days)', () => {
  const u = 'u1';
  it.each([
    [{ type: 'post_like', post_id: 'p1', from_user_id: u }, '/post/p1'],
    [{ type: 'post_comment', post_id: 'p2', from_user_id: u }, '/post/p2'],
    [{ type: 'friend_request', from_user_id: u }, '/huddle'],
    [{ type: 'direct_message', from_user_id: u }, '/chat?user=u1'],
    [{ type: 'vr_doorway', from_user_id: u, context_data: { link: '/vr-world' } }, '/zoe-omega'],
    [{ type: 'vr_relic_found', context_data: { route: '/vr-world' } }, '/zoe-omega'],
    [{ type: 'vr_invite', context_data: { link: '/zoe-omega?vr=1&meet=portal' } }, '/zoe-omega?vr=1&meet=portal'],
    [{ type: 'growth_insight', from_user_id: u }, '/growth-insights'],
    [{ type: 'analytics_domain_visit', from_user_id: u }, '/analytics-dashboard'],
    [{ type: 'uptime_alert', from_user_id: u }, '/admin/health'],
    [{ type: 'something_new', from_user_id: u }, '/profile/u1'],
    [{ type: 'something_new' }, '/notification-history'],
  ])('%j → %s', (n, want) => { expect(t(n as never)).toBe(want); });
});
