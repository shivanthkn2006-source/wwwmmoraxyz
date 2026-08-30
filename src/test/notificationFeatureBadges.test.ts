import { describe, expect, it } from 'vitest';
import {
  countByFeature,
  featureForNotificationType,
  featureLabelForType,
  formatAlertStamp,
} from '@/lib/notificationFeatureMap';
import { duePrenotice, UNLOCK_PRENOTICE_MINUTES } from '@/hooks/useDhfUnlockReminders';
import { alertCopy } from '@/hooks/useGlobalNotificationAlerts';

describe('notification feature mapping', () => {
  it('maps known types to features', () => {
    expect(featureForNotificationType('post_like')).toBe('feed');
    expect(featureForNotificationType('message')).toBe('messages');
    expect(featureForNotificationType('friend_request')).toBe('friends');
    expect(featureForNotificationType('dhf_unlock')).toBe('compass');
    expect(featureForNotificationType('totally_unknown')).toBe('other');
    expect(featureLabelForType('dhf_unlock')).toBe("Zoe's DHF");
  });

  it('counts unread rows per feature', () => {
    const counts = countByFeature([
      { type: 'post_like' }, { type: 'post_comment' }, { type: 'message' }, { type: null },
    ]);
    expect(counts.feed).toBe(2);
    expect(counts.messages).toBe(1);
    expect(counts.other).toBe(1);
  });
});

describe('alert copy', () => {
  it('includes date/time, feature, actor and content', () => {
    const copy = alertCopy(
      {
        id: 'n1',
        type: 'post_comment',
        created_at: '2026-08-30T10:15:00.000Z',
        context_data: { message: 'Nice shot!' },
      },
      'Asha',
    );
    expect(copy.title).toBe('New comment');
    expect(copy.description).toContain('Home feed');
    expect(copy.description).toContain('from Asha');
    expect(copy.description).toContain('Nice shot!');
    expect(copy.description).toContain(formatAlertStamp('2026-08-30T10:15:00.000Z'));
  });
});

describe('DHF unlock pre-notices', () => {
  it('fires inside the lead window only', () => {
    const slotAt11 = 11 * 60;
    expect(duePrenotice(slotAt11 - UNLOCK_PRENOTICE_MINUTES)?.time).toBe('11:00:00');
    expect(duePrenotice(slotAt11 - 1)?.time).toBe('11:00:00');
    expect(duePrenotice(slotAt11)).toBeNull();
    expect(duePrenotice(slotAt11 - UNLOCK_PRENOTICE_MINUTES - 1)).toBeNull();
  });
});
