-- ============================================
-- ZOE SOVEREIGN MEMORY TABLE (ZSMT)
-- Single Source of Truth for Zoe's Existence
-- ============================================

CREATE TABLE public.zoe_sovereign_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID,
  
  -- Event Classification
  event_type TEXT NOT NULL CHECK (event_type IN (
    'voice_command', 'veto_override', 'dream_narrative', 
    'biometric_scan', 'account_change', 'chat_message',
    'ecn_state', 'dhf_action', 'proactive_initiative',
    'error_masked_voice', 'memory_consolidation', 'system_event'
  )),
  
  -- Content Storage
  content_text TEXT,
  
  -- Comprehensive State JSON
  zoe_state_json JSONB DEFAULT '{
    "ecn": {
      "primary_emotion": "neutral",
      "stress_level": 0,
      "engagement_score": 50,
      "valence": 0,
      "action_tendency": "exploring"
    },
    "dhf": {
      "autonomy_level": 0.5,
      "veto_threshold": 0.7,
      "last_override": null
    },
    "pce": {
      "consciousness_state": "active",
      "dream_synthesis": null,
      "proactive_ready": false
    }
  }'::jsonb,
  
  -- Biometric & Voice Data
  biometric_data_json JSONB DEFAULT '{
    "voice": {
      "pitch": 1.0,
      "rate": 1.0,
      "volume": 1.0,
      "warmth": 0.7,
      "emotion_intensity": 0.6
    },
    "face_emotion": null,
    "security_hash": null
  }'::jsonb,
  
  -- Metadata
  session_id TEXT,
  command_context JSONB DEFAULT '[]'::jsonb,
  error_data JSONB,
  proactive_initiative_ready BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Indexing hints
  importance_score INTEGER DEFAULT 5 CHECK (importance_score BETWEEN 1 AND 10),
  is_consolidated BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.zoe_sovereign_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own sovereign memory"
  ON public.zoe_sovereign_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sovereign memory"
  ON public.zoe_sovereign_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sovereign memory"
  ON public.zoe_sovereign_memory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON public.zoe_sovereign_memory FOR ALL
  USING (true);

-- Indexes for fast querying
CREATE INDEX idx_zsmt_user_id ON public.zoe_sovereign_memory(user_id);
CREATE INDEX idx_zsmt_event_type ON public.zoe_sovereign_memory(event_type);
CREATE INDEX idx_zsmt_created_at ON public.zoe_sovereign_memory(created_at DESC);
CREATE INDEX idx_zsmt_session ON public.zoe_sovereign_memory(session_id);
CREATE INDEX idx_zsmt_proactive ON public.zoe_sovereign_memory(proactive_initiative_ready) WHERE proactive_initiative_ready = true;

-- Trigger for updated_at
CREATE TRIGGER update_zsmt_updated_at
  BEFORE UPDATE ON public.zoe_sovereign_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get consolidated Zoe state for a user
CREATE OR REPLACE FUNCTION public.get_zoe_sovereign_state(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSONB;
  v_latest_ecn JSONB;
  v_latest_dhf JSONB;
  v_recent_commands JSONB;
  v_proactive_ready BOOLEAN;
BEGIN
  -- Get latest ECN state
  SELECT zoe_state_json->'ecn' INTO v_latest_ecn
  FROM zoe_sovereign_memory
  WHERE user_id = p_user_id AND event_type IN ('ecn_state', 'chat_message')
  ORDER BY created_at DESC LIMIT 1;

  -- Get latest DHF state
  SELECT zoe_state_json->'dhf' INTO v_latest_dhf
  FROM zoe_sovereign_memory
  WHERE user_id = p_user_id AND event_type IN ('dhf_action', 'veto_override')
  ORDER BY created_at DESC LIMIT 1;

  -- Get recent command context (last 5)
  SELECT jsonb_agg(sub.cmd) INTO v_recent_commands
  FROM (
    SELECT jsonb_build_object('command', content_text, 'at', created_at) as cmd
    FROM zoe_sovereign_memory
    WHERE user_id = p_user_id AND event_type = 'voice_command'
    ORDER BY created_at DESC LIMIT 5
  ) sub;

  -- Check proactive readiness
  SELECT EXISTS(
    SELECT 1 FROM zoe_sovereign_memory
    WHERE user_id = p_user_id 
    AND proactive_initiative_ready = true
    AND created_at > now() - interval '1 hour'
  ) INTO v_proactive_ready;

  v_result := jsonb_build_object(
    'ecn', COALESCE(v_latest_ecn, '{"primary_emotion": "neutral", "stress_level": 0}'::jsonb),
    'dhf', COALESCE(v_latest_dhf, '{"autonomy_level": 0.5}'::jsonb),
    'recent_commands', COALESCE(v_recent_commands, '[]'::jsonb),
    'proactive_ready', v_proactive_ready,
    'timestamp', now()
  );

  RETURN v_result;
END;
$$;

-- Enable realtime for sovereign memory
ALTER PUBLICATION supabase_realtime ADD TABLE public.zoe_sovereign_memory;