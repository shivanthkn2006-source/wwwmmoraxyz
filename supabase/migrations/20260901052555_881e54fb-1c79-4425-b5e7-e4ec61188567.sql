REVOKE EXECUTE ON FUNCTION public.can_insert_session() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_premium_access(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_root_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_timeline_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_timeline_owner(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_user_shadow_banned(uuid) FROM anon;