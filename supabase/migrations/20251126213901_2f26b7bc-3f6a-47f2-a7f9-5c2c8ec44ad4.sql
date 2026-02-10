-- Fix private_timelines DELETE policy to allow creator to delete
DROP POLICY IF EXISTS "Timeline creators can delete their timeline" ON public.private_timelines;

CREATE POLICY "Timeline creators can delete their timeline" 
ON public.private_timelines
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM private_timeline_members
    WHERE timeline_id = private_timelines.id
    AND user_id = auth.uid()
    AND added_by_user_id = user_id  -- This means they added themselves (creator)
  )
);

-- Ensure posts in private timelines can be deleted by post owner
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;

CREATE POLICY "Users can delete their own posts" 
ON public.posts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Ensure comment likes counters are properly updated
DROP POLICY IF EXISTS "Users can view comment likes" ON public.comment_likes;

CREATE POLICY "Users can view comment likes" 
ON public.comment_likes
FOR SELECT
TO authenticated
USING (true);

-- Ensure post likes are viewable for private timeline posts
DROP POLICY IF EXISTS "Authenticated users can view post likes" ON public.post_likes;

CREATE POLICY "Authenticated users can view post likes" 
ON public.post_likes
FOR SELECT
TO authenticated
USING (true);

-- Fix private timeline members policy to be clearer
DROP POLICY IF EXISTS "Timeline members can add others" ON public.private_timeline_members;
DROP POLICY IF EXISTS "Users can add themselves to timelines" ON public.private_timeline_members;

CREATE POLICY "Users can add members to timelines they belong to" 
ON public.private_timeline_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Either adding themselves OR they're already a member of the timeline
  (auth.uid() = user_id) OR
  (auth.uid() = added_by_user_id AND EXISTS (
    SELECT 1
    FROM private_timeline_members ptm
    WHERE ptm.timeline_id = private_timeline_members.timeline_id
    AND ptm.user_id = auth.uid()
  ))
);

-- Ensure notifications can be deleted by users
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

CREATE POLICY "Users can delete their own notifications" 
ON public.notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Ensure saved posts can be viewed through joins
DROP POLICY IF EXISTS "Users can view their saved posts" ON public.saved_posts;

CREATE POLICY "Users can view their saved posts" 
ON public.saved_posts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Ensure friend requests can be deleted
DROP POLICY IF EXISTS "Users can delete friend requests" ON public.friend_requests;

CREATE POLICY "Users can delete friend requests" 
ON public.friend_requests
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Ensure friendships can be deleted (unfriend)
DROP POLICY IF EXISTS "Users can delete friendships" ON public.friendships;

CREATE POLICY "Users can delete friendships" 
ON public.friendships
FOR DELETE
TO authenticated
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Ensure private timeline members selection includes all members
DROP POLICY IF EXISTS "Users can read their own private timeline memberships" ON public.private_timeline_members;

CREATE POLICY "Users can view timeline members" 
ON public.private_timeline_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM private_timeline_members ptm
    WHERE ptm.timeline_id = private_timeline_members.timeline_id
    AND ptm.user_id = auth.uid()
  )
);

-- Ensure voice shortcuts can be deleted
DROP POLICY IF EXISTS "Users can delete their own shortcuts" ON public.voice_shortcuts;

CREATE POLICY "Users can delete their own shortcuts" 
ON public.voice_shortcuts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Ensure voice macros can be deleted
DROP POLICY IF EXISTS "Users can delete their own macros" ON public.voice_macros;

CREATE POLICY "Users can delete their own macros" 
ON public.voice_macros
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);