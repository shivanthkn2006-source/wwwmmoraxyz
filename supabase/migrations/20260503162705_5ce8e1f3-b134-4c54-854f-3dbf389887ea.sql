
-- 1) cortex_logic: drop blanket select
DROP POLICY IF EXISTS "cortex_logic_select" ON public.cortex_logic;

-- 2) critical_user_paths: restrict writes to admins only
DROP POLICY IF EXISTS "Authenticated users can manage paths" ON public.critical_user_paths;
CREATE POLICY "Admins can insert paths" ON public.critical_user_paths
  FOR INSERT TO authenticated WITH CHECK (public.is_root_admin(auth.uid()));
CREATE POLICY "Admins can update paths" ON public.critical_user_paths
  FOR UPDATE TO authenticated USING (public.is_root_admin(auth.uid())) WITH CHECK (public.is_root_admin(auth.uid()));
CREATE POLICY "Admins can delete paths" ON public.critical_user_paths
  FOR DELETE TO authenticated USING (public.is_root_admin(auth.uid()));

-- 3) private_timeline_members: drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert timeline members" ON public.private_timeline_members;
DROP POLICY IF EXISTS "Authenticated users can delete timeline members" ON public.private_timeline_members;

-- 4) post_comments: proper visibility check
DROP POLICY IF EXISTS "Users can view comments on visible posts" ON public.post_comments;
CREATE POLICY "Users can view comments on visible posts"
ON public.post_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_comments.post_id
      AND (
        -- own post
        p.user_id = auth.uid()
        -- global posts viewable by any authenticated user
        OR (auth.uid() IS NOT NULL AND p.visibility = 'global')
        -- personal posts: only friends
        OR (
          p.visibility = 'personal'
          AND EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE (f.user1_id = auth.uid() AND f.user2_id = p.user_id)
               OR (f.user2_id = auth.uid() AND f.user1_id = p.user_id)
          )
        )
        -- private timeline posts
        OR (
          p.private_timeline_id IS NOT NULL
          AND (
            public.is_private_timeline_member(p.private_timeline_id, auth.uid())
            OR public.is_private_timeline_owner(p.private_timeline_id, auth.uid())
          )
        )
      )
  )
);

-- 5) system_health_logs: fix admin policy + restrict null-user inserts
DROP POLICY IF EXISTS "Admins can view all system health logs" ON public.system_health_logs;
CREATE POLICY "Admins can view all system health logs"
ON public.system_health_logs
FOR SELECT
USING (public.is_root_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own crash logs" ON public.system_health_logs;
CREATE POLICY "Users can insert their own crash logs"
ON public.system_health_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can update crash logs" ON public.system_health_logs;
CREATE POLICY "Users can update their own crash logs"
ON public.system_health_logs
FOR UPDATE
USING (auth.uid() = user_id);

-- 6) brand_accounts: require authentication for SELECT
DROP POLICY IF EXISTS "Anyone can view verified brands" ON public.brand_accounts;
CREATE POLICY "Authenticated users can view verified brands"
ON public.brand_accounts
FOR SELECT
TO authenticated
USING (is_verified = true);

-- 7) realtime.messages: require topic to contain subscriber's user id
DROP POLICY IF EXISTS "Users can subscribe to topics containing their uid" ON realtime.messages;
CREATE POLICY "Users can subscribe to topics containing their uid"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE '%' || auth.uid()::text || '%'
  OR realtime.topic() LIKE 'public:%'
  OR realtime.topic() LIKE 'broadcast:public:%'
);
