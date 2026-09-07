REVOKE EXECUTE ON FUNCTION public.can_insert_session() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_id(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_premium_access(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_timeline_member(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_timeline_owner(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_user_shadow_banned(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sentinel_is_blocked(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.validate_invite_code(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_sovereign_admin(uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.can_insert_session() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_premium_access(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_timeline_member(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_timeline_owner(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_user_shadow_banned(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.sentinel_is_blocked(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_invite_code(text) TO service_role;