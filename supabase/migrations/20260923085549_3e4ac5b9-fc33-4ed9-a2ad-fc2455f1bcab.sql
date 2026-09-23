REVOKE ALL ON FUNCTION public.search_member_directory(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_member_directory(text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.search_member_directory(text, integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.search_member_directory(text, integer) FROM service_role;