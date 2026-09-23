DROP POLICY IF EXISTS "Authenticated users can view public profiles" ON public.public_profiles;

CREATE POLICY "Members view self friends or admin directory"
ON public.public_profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR private.is_root_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.friendships f
    WHERE (f.user1_id = auth.uid() AND f.user2_id = public_profiles.user_id)
       OR (f.user2_id = auth.uid() AND f.user1_id = public_profiles.user_id)
  )
);

CREATE OR REPLACE FUNCTION public.search_member_directory(p_query text, p_limit integer DEFAULT 10)
RETURNS TABLE(user_id uuid, username text, display_name text, profile_photo_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.username, p.display_name, p.profile_photo_url
  FROM public.public_profiles p
  WHERE auth.uid() IS NOT NULL
    AND length(trim(coalesce(p_query, ''))) >= 2
    AND (
      p.display_name ILIKE '%' || replace(replace(trim(p_query), '%', '\%'), '_', '\_') || '%' ESCAPE '\'
      OR p.username ILIKE '%' || replace(replace(trim(p_query), '%', '\%'), '_', '\_') || '%' ESCAPE '\'
    )
  ORDER BY
    CASE WHEN lower(p.username) = lower(trim(p_query)) THEN 0 ELSE 1 END,
    p.display_name NULLS LAST,
    p.username NULLS LAST
  LIMIT least(greatest(coalesce(p_limit, 10), 1), 20);
$$;

REVOKE ALL ON FUNCTION public.search_member_directory(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_member_directory(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_member_directory(text, integer) TO service_role;