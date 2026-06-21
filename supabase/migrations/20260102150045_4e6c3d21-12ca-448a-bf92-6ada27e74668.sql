-- ═══════════════════════════════════════════════════════════════════════════════
-- QUANTUM CALL SIGNALS TABLE - P2P WebRTC Signaling via Supabase Realtime
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.quantum_call_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate', 'call-request', 'call-accept', 'call-reject', 'call-end', 'call-busy')),
  signal_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  encrypted_payload TEXT, -- Quantum Shield encrypted signaling data
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 seconds'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quantum_call_signals ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see signals they're involved in
CREATE POLICY "Users can view their own call signals"
  ON public.quantum_call_signals
  FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create call signals"
  ON public.quantum_call_signals
  FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can delete their own call signals"
  ON public.quantum_call_signals
  FOR DELETE
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Create index for fast lookups
CREATE INDEX idx_quantum_call_signals_receiver ON public.quantum_call_signals(receiver_id, created_at DESC);
CREATE INDEX idx_quantum_call_signals_caller ON public.quantum_call_signals(caller_id, created_at DESC);

-- Enable Realtime for signaling
ALTER PUBLICATION supabase_realtime ADD TABLE public.quantum_call_signals;

-- Auto-cleanup expired signals (via cron or trigger)
CREATE OR REPLACE FUNCTION public.cleanup_expired_call_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.quantum_call_signals
  WHERE expires_at < now();
END;
$$;

-- Call session tracking for analytics
CREATE TABLE public.quantum_call_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  call_quality TEXT DEFAULT 'unknown',
  codec_used TEXT DEFAULT 'opus',
  bitrate_kbps INTEGER DEFAULT 32,
  encryption_level TEXT DEFAULT 'quantum_shield',
  ended_by UUID,
  end_reason TEXT
);

ALTER TABLE public.quantum_call_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own call sessions"
  ON public.quantum_call_sessions
  FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create call sessions"
  ON public.quantum_call_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update their own call sessions"
  ON public.quantum_call_sessions
  FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);