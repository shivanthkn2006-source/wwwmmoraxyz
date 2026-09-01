REVOKE EXECUTE ON FUNCTION public.can_insert_session() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_premium_access(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_root_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_timeline_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_timeline_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_user_shadow_banned(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.can_insert_session() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_premium_access(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_root_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_timeline_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_timeline_owner(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_user_shadow_banned(uuid) TO authenticated, service_role;