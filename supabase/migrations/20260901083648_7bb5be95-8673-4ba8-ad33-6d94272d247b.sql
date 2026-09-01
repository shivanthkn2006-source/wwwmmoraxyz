REVOKE EXECUTE ON FUNCTION public.check_face_login_rate_limit(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sentinel_is_blocked(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_face_login_rate_limit(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sentinel_is_blocked(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_invite_code(text) TO authenticated, service_role;