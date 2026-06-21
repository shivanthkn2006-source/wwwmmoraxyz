-- Fix notifications constraint to include all missing types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'like',
  'comment',
  'follow',
  'mention',
  'friend_request',
  'friend_request_accepted',
  'new_post',
  'badge_earned',
  'challenge_completed',
  'leaderboard_position',
  'nearby_friend',
  'smart_suggestion',
  'admin_notice',
  'private_timeline_invite',
  'private_timeline_post',
  'post_like',
  'lisa_suggestion',
  'comment_like',
  'post_tag',
  'post_comment',
  'interest_match'
));