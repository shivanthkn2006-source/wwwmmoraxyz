-- Policies on private timelines call these helpers. Roles without EXECUTE got a hard
-- "permission denied" instead of simply seeing no rows. The helpers only answer
-- true/false for the given ids, so allowing the check is safe.
GRANT EXECUTE ON FUNCTION public.is_timeline_owner(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_timeline_member(uuid, uuid) TO anon, authenticated, service_role;