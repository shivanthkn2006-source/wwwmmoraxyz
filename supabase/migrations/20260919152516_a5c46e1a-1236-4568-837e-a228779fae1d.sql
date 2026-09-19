ALTER TABLE public.quantum_call_signals REPLICA IDENTITY FULL;
ALTER TABLE public.quantum_call_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quantum_call_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quantum_call_sessions;