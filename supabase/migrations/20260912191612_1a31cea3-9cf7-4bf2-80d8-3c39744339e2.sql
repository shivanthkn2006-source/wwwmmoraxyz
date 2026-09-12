CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.can_view_post(_post_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = _post_id
      AND auth.uid() IS NOT NULL
      AND (
        p.user_id = auth.uid()
        OR p.visibility = 'global'
        OR (p.visibility = 'personal' AND EXISTS (
              SELECT 1 FROM public.friendships f
              WHERE (f.user1_id = auth.uid() AND f.user2_id = p.user_id)
                 OR (f.user2_id = auth.uid() AND f.user1_id = p.user_id)
           ))
        OR (p.private_timeline_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.private_timeline_members m
              WHERE m.timeline_id = p.private_timeline_id AND m.user_id = auth.uid()
           ))
      )
  )
$$;

REVOKE ALL ON FUNCTION private.can_view_post(uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_view_post(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Tags visible on viewable posts" ON public.post_tags;
CREATE POLICY "Tags visible on viewable posts" ON public.post_tags
FOR SELECT TO authenticated
USING (tagged_user_id = auth.uid() OR tagged_by_user_id = auth.uid() OR private.can_view_post(post_id));

DROP POLICY IF EXISTS "Video assets visible on viewable posts" ON public.video_assets;
CREATE POLICY "Video assets visible on viewable posts" ON public.video_assets
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR (post_id IS NOT NULL AND private.can_view_post(post_id)));

DROP POLICY IF EXISTS "Ratings visible on viewable posts" ON public.post_ratings;
CREATE POLICY "Ratings visible on viewable posts" ON public.post_ratings
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.can_view_post(post_id));

DROP POLICY IF EXISTS "Comment likes visible on viewable posts" ON public.comment_likes;
CREATE POLICY "Comment likes visible on viewable posts" ON public.comment_likes
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.post_comments c
    WHERE c.id = comment_likes.comment_id AND private.can_view_post(c.post_id)
  )
);

DROP FUNCTION IF EXISTS public.can_view_post(uuid);