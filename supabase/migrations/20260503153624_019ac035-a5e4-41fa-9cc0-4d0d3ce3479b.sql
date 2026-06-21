-- Replace recursive private timeline policies with non-recursive security-definer helpers

CREATE OR REPLACE FUNCTION public.is_private_timeline_owner(_timeline_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.private_timelines pt
    WHERE pt.id = _timeline_id
      AND pt.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_private_timeline_member(_timeline_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.private_timeline_members ptm
    WHERE ptm.timeline_id = _timeline_id
      AND ptm.user_id = _user_id
  );
$$;

-- Keep legacy helper name but route it through the non-recursive helper.
CREATE OR REPLACE FUNCTION public.is_timeline_member(timeline_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_private_timeline_member(timeline_id, user_id);
$$;

DROP POLICY IF EXISTS "Members see own timeline memberships" ON public.private_timeline_members;
DROP POLICY IF EXISTS "Users can view private timeline posts" ON public.posts;
DROP POLICY IF EXISTS "Members can view their timelines" ON public.private_timelines;
DROP POLICY IF EXISTS "Users can view their private timelines" ON public.private_timelines;
DROP POLICY IF EXISTS "Timeline members can update timeline" ON public.private_timelines;
DROP POLICY IF EXISTS "Timeline creators can delete their timeline" ON public.private_timelines;

CREATE POLICY "Members see own timeline memberships"
ON public.private_timeline_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_private_timeline_owner(timeline_id, auth.uid())
);

CREATE POLICY "Users can view private timeline posts"
ON public.posts
FOR SELECT
USING (
  private_timeline_id IS NOT NULL
  AND (
    public.is_private_timeline_member(private_timeline_id, auth.uid())
    OR public.is_private_timeline_owner(private_timeline_id, auth.uid())
  )
);

CREATE POLICY "Members can view their timelines"
ON public.private_timelines
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_private_timeline_member(id, auth.uid())
);

CREATE POLICY "Timeline members can update timeline"
ON public.private_timelines
FOR UPDATE
USING (
  user_id = auth.uid()
  OR public.is_private_timeline_member(id, auth.uid())
)
WITH CHECK (
  user_id = auth.uid()
  OR public.is_private_timeline_member(id, auth.uid())
);

CREATE POLICY "Timeline creators can delete their timeline"
ON public.private_timelines
FOR DELETE
USING (user_id = auth.uid());