REVOKE EXECUTE ON FUNCTION public.deliver_due_dhf_essays() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.deliver_due_dhf_essays() FROM anon;
REVOKE EXECUTE ON FUNCTION public.deliver_due_dhf_essays() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.deliver_due_dhf_essays() TO postgres;