CREATE OR REPLACE FUNCTION public.search_member_directory(p_query text)
RETURNS TABLE(user_id uuid, display_name text, username text, profile_photo_url text, bio text, profession text, field_of_study text, hobbies text[], status text, event_date date, event_recurring boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT pp.user_id, pp.display_name, pp.username, pp.profile_photo_url, pp.bio, pp.profession, pp.field_of_study, pp.hobbies, pp.status, pp.event_date, pp.event_recurring
  FROM public.public_profiles pp
  WHERE auth.uid() IS NOT NULL
    AND length(btrim(coalesce(p_query,''))) >= 2
    AND pp.user_id <> auth.uid()
    AND coalesce(pp.profile_visibility,'public') = 'public'
    AND (pp.username ILIKE '%' || btrim(p_query) || '%' OR pp.display_name ILIKE '%' || btrim(p_query) || '%')
  ORDER BY pp.display_name
  LIMIT 10
$$;
REVOKE ALL ON FUNCTION public.search_member_directory(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_member_directory(text) TO authenticated;