REVOKE EXECUTE ON FUNCTION public.can_read_message_media(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_message_media(text) TO authenticated;