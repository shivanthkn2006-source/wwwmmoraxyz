-- Add missing external_virality_score column to zoe_sovereign_memory
ALTER TABLE public.zoe_sovereign_memory 
ADD COLUMN IF NOT EXISTS external_virality_score INTEGER DEFAULT 0;

-- Add index for faster virality queries
CREATE INDEX IF NOT EXISTS idx_zsmt_external_virality 
ON public.zoe_sovereign_memory(user_id, external_virality_score) 
WHERE external_virality_score > 0;

-- Add index for self-awareness queries
CREATE INDEX IF NOT EXISTS idx_zsmt_event_type_user 
ON public.zoe_sovereign_memory(user_id, event_type, created_at DESC);

-- Ensure behavioral_events has index for DHF learning
CREATE INDEX IF NOT EXISTS idx_behavioral_events_dhf 
ON public.behavioral_events(user_id, event_type, created_at DESC) 
WHERE dhf_logged = true;