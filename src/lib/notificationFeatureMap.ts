/**
 * NOTIFICATION → FEATURE MAPPING
 *
 * Every platform notification belongs to exactly one dock feature, so the user
 * can open the bottom-right home dock and immediately see WHICH menu entry has
 * something new. Pure, dependency-free and unit-testable.
 */
export type NotificationFeature =
  | 'feed'
  | 'messages'
  | 'friends'
  | 'growth'
  | 'compass'
  | 'zoe'
  | 'other';

export const FEATURE_LABELS: Record<NotificationFeature, string> = {
  feed: 'Home feed',
  messages: 'Messages',
  friends: 'Friends',
  growth: 'Growth insights',
  compass: "Zoe's DHF",
  zoe: 'Zoe AI',
  other: 'Notifications',
};

const TYPE_FEATURE: Record<string, NotificationFeature> = {
  post_like: 'feed',
  post_comment: 'feed',
  comment_like: 'feed',
  comment_reply: 'feed',
  post_tag: 'feed',
  like: 'feed',
  comment: 'feed',
  mention: 'feed',
  reply: 'feed',
  new_post: 'feed',
  message: 'messages',
  new_message: 'messages',
  chat_message: 'messages',
  friend_request: 'friends',
  friend_accepted: 'friends',
  friend_request_accepted: 'friends',
  new_match: 'friends',
  user_online: 'friends',
  friend_badge_earned: 'friends',
  friend_challenge_completed: 'friends',
  loop_like: 'feed',
  loop_comment: 'feed',
  new_loop: 'feed',
  growth_card: 'growth',
  growth_insight: 'growth',
  dhf_compass: 'compass',
  dhf_unlock: 'compass',
  compass_unlock: 'compass',
  zoe_mail: 'zoe',
  zoe_message: 'zoe',
  reminder: 'other',
};

export function featureForNotificationType(type?: string | null): NotificationFeature {
  if (!type) return 'other';
  return TYPE_FEATURE[type] ?? 'other';
}

export function featureLabelForType(type?: string | null): string {
  return FEATURE_LABELS[featureForNotificationType(type)];
}

export type FeatureCounts = Record<NotificationFeature, number>;

export const EMPTY_FEATURE_COUNTS: FeatureCounts = {
  feed: 0,
  messages: 0,
  friends: 0,
  growth: 0,
  compass: 0,
  zoe: 0,
  other: 0,
};

/** Groups unread notification rows into per-feature counts. */
export function countByFeature(rows: Array<{ type?: string | null }>): FeatureCounts {
  const counts: FeatureCounts = { ...EMPTY_FEATURE_COUNTS };
  rows.forEach((row) => {
    counts[featureForNotificationType(row.type)] += 1;
  });
  return counts;
}

/** Human "date · time" stamp used in every alert body. */
export function formatAlertStamp(value: string | number | Date = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
