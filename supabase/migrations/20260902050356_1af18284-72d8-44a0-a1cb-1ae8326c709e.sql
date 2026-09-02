REVOKE EXECUTE ON FUNCTION public.enforce_sovereign_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.block_vault_log_mutation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_sovereign_vault_sessions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sovereign_admin_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_sovereign_admin(uuid) FROM anon;