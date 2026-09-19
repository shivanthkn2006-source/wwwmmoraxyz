ALTER TABLE public.quantum_call_signals
  DROP CONSTRAINT IF EXISTS quantum_call_signals_signal_type_check;

ALTER TABLE public.quantum_call_signals
  ADD CONSTRAINT quantum_call_signals_signal_type_check
  CHECK (signal_type IN (
    'offer', 'answer', 'ice-candidate', 'call-request', 'call-accept',
    'call-reject', 'call-end', 'call-busy',
    'ice-restart-offer', 'ice-restart-answer'
  ));

GRANT SELECT, INSERT, DELETE ON public.quantum_call_signals TO authenticated;
GRANT ALL ON public.quantum_call_signals TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.quantum_call_sessions TO authenticated;
GRANT ALL ON public.quantum_call_sessions TO service_role;