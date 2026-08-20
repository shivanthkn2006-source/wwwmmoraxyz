DROP POLICY IF EXISTS "Users can view comments on visible posts" ON public.post_comments;

CREATE POLICY "Users can view comments on visible posts"
  ON public.post_comments
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_comments.post_id
        AND (
          p.user_id = auth.uid()
          OR (p.visibility = 'global' AND p.private_timeline_id IS NULL)
          OR (
            p.visibility = 'personal' AND EXISTS (
              SELECT 1 FROM public.friendships f
              WHERE (f.user1_id = auth.uid() AND f.user2_id = p.user_id)
                 OR (f.user2_id = auth.uid() AND f.user1_id = p.user_id)
            )
          )
          OR (
            p.private_timeline_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.private_timeline_members m
              WHERE m.timeline_id = p.private_timeline_id
                AND m.user_id = auth.uid()
            )
          )
        )
    )
  );
