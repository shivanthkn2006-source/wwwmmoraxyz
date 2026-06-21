-- Add missing notification types to the check constraint
-- This fixes the "notifications_type_check" constraint violation errors

-- Drop the existing check constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add updated check constraint with all notification types
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'post_like',
    'post_comment',
    'post_tag',
    'friend_request',
    'friend_accepted',
    'badge_earned',
    'challenge_completed',
    'lisa_suggestion',
    'proactive_notification',
    'user_online',
    'achievement_unlocked'
  ));