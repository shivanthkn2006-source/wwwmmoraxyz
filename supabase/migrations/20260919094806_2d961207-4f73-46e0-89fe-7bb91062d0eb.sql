ALTER TABLE public.quantum_call_signals
  ADD CONSTRAINT quantum_call_signals_distinct_participants
  CHECK (caller_id <> receiver_id) NOT VALID;

ALTER TABLE public.quantum_call_signals
  VALIDATE CONSTRAINT quantum_call_signals_distinct_participants;

DROP POLICY IF EXISTS "Users can update their own call sessions"
  ON public.quantum_call_sessions;

CREATE POLICY "Users can update their own call sessions"
  ON public.quantum_call_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = caller_id OR auth.uid() = receiver_id);