-- Fix notifications_type_check constraint to include all actual notification types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
  'post_like'::text,
  'post_comment'::text,
  'comment_like'::text,
  'comment_reply'::text,
  'post_tag'::text,
  'friend_request'::text,
  'tier_upgrade'::text,
  'tag'::text,
  'mention'::text,
  'tier'::text
]));