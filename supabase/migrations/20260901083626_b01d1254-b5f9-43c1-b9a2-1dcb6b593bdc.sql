REVOKE EXECUTE ON FUNCTION public.check_face_login_rate_limit(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sentinel_is_blocked(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_invite_code(text) FROM anon;