-- Revert RLS policies to original state before modifications

-- Restore original post_comments policies
DROP POLICY IF EXISTS "Users can create comments" ON public.post_comments;
CREATE POLICY "Users can create comments"
ON public.post_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view comments on visible posts" ON public.post_comments;
CREATE POLICY "Users can view comments on visible posts"
ON public.post_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM posts
    WHERE posts.id = post_comments.post_id
  )
);

-- Restore original private_timeline_members policies
DROP POLICY IF EXISTS "Users can add members to timelines they belong to" ON public.private_timeline_members;
CREATE POLICY "Users can add members to timelines they belong to"
ON public.private_timeline_members
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id) 
  OR 
  (
    (auth.uid() = added_by_user_id) 
    AND 
    (EXISTS (
      SELECT 1
      FROM private_timeline_members existing
      WHERE existing.timeline_id = private_timeline_members.timeline_id
      AND existing.user_id = auth.uid()
    ))
  )
);

DROP POLICY IF EXISTS "Users can view timeline members" ON public.private_timeline_members;
CREATE POLICY "Users can view timeline members"
ON public.private_timeline_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM private_timeline_members existing
    WHERE existing.timeline_id = private_timeline_members.timeline_id
    AND existing.user_id = auth.uid()
  )
);