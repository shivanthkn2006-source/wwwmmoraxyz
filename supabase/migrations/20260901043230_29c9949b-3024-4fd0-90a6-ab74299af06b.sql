REVOKE ALL ON FUNCTION public.profiles_guard_immutable_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.messages_guard_participants() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.invite_codes_guard_control_columns() FROM PUBLIC, anon, authenticated;