-- Update the notifications_type_check constraint to include all notification types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
  'post_like'::text, 
  'comment'::text, 
  'comment_like'::text, 
  'comment_reply'::text,
  'tag'::text,
  'mention'::text,
  'tier'::text
]));