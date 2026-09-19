ALTER TABLE public.quantum_call_signals
  DROP CONSTRAINT IF EXISTS quantum_call_signals_signal_type_check;

ALTER TABLE public.quantum_call_signals
  ADD CONSTRAINT quantum_call_signals_signal_type_check
  CHECK (signal_type IN (
    'offer', 'answer', 'ice-candidate', 'call-request', 'call-accept',
    'call-reject', 'call-end', 'call-busy',
    'ice-restart-offer', 'ice-restart-answer',
    'group-invite', 'group-join', 'group-offer', 'group-answer', 'group-ice', 'group-leave'
  ));