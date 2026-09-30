REVOKE ALL ON FUNCTION public.karma_on_like() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.karma_on_rating() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.karma_on_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.karma_award_internal(uuid,integer,text,text,integer) FROM PUBLIC, anon, authenticated;