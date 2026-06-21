-- Enable realtime for zoe_settings and ecn_analysis_queue
ALTER PUBLICATION supabase_realtime ADD TABLE public.zoe_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ecn_analysis_queue;