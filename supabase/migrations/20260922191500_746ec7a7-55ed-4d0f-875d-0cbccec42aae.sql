ALTER TABLE public.important_dates REPLICA IDENTITY FULL;
ALTER TABLE public.reminders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.important_dates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;