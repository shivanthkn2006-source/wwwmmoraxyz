-- Fix infinite recursion in private_timeline_members RLS policies
-- Create security definer function to check timeline membership
CREATE OR REPLACE FUNCTION public.is_timeline_member(timeline_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM private_timeline_members
    WHERE private_timeline_members.timeline_id = is_timeline_member.timeline_id
      AND private_timeline_members.user_id = is_timeline_member.user_id
  );
$$;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view timelines they are members of" ON private_timeline_members;
DROP POLICY IF EXISTS "Users can insert timeline members" ON private_timeline_members;
DROP POLICY IF EXISTS "Users can delete timeline members" ON private_timeline_members;

-- Create new policies using the security definer function
CREATE POLICY "Users can view timelines they are members of"
ON private_timeline_members FOR SELECT
USING (public.is_timeline_member(timeline_id, auth.uid()));

CREATE POLICY "Users can insert timeline members"
ON private_timeline_members FOR INSERT
WITH CHECK (public.is_timeline_member(timeline_id, auth.uid()));

CREATE POLICY "Users can delete timeline members"
ON private_timeline_members FOR DELETE
USING (public.is_timeline_member(timeline_id, auth.uid()));

-- Fix notifications check constraint to include all existing and new types
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
  'post_comment'
));