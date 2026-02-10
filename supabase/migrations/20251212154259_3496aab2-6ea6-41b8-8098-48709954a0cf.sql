-- Fix dhf_asset_logs constraint to allow 'behavioral_event' data type
ALTER TABLE public.dhf_asset_logs DROP CONSTRAINT IF EXISTS dhf_asset_logs_data_type_check;
ALTER TABLE public.dhf_asset_logs ADD CONSTRAINT dhf_asset_logs_data_type_check CHECK (
  data_type = ANY (ARRAY[
    'Health Record'::text, 
    'Journal Entry'::text, 
    'Financial Data'::text, 
    'Personal Document'::text, 
    'Memory Archive'::text, 
    'Preference Profile'::text, 
    'Relationship Data'::text, 
    'Career Document'::text, 
    'Educational Record'::text, 
    'Other'::text, 
    'image'::text, 
    'document'::text, 
    'video'::text, 
    'visual_perception'::text, 
    'multimodal_scan'::text, 
    'audio'::text,
    'behavioral_event'::text
  ])
);

-- Fix zoe_sovereign_memory constraint to allow more event types
ALTER TABLE public.zoe_sovereign_memory DROP CONSTRAINT IF EXISTS zoe_sovereign_memory_event_type_check;
ALTER TABLE public.zoe_sovereign_memory ADD CONSTRAINT zoe_sovereign_memory_event_type_check CHECK (
  event_type = ANY (ARRAY[
    'voice_command'::text, 
    'veto_override'::text, 
    'dream_narrative'::text, 
    'biometric_scan'::text, 
    'account_change'::text, 
    'chat_message'::text, 
    'ecn_state'::text, 
    'dhf_action'::text, 
    'proactive_initiative'::text, 
    'error_masked_voice'::text, 
    'memory_consolidation'::text, 
    'system_event'::text,
    'zoe_interaction'::text,
    'entity_activation'::text,
    'skill_upload'::text,
    'mind_merge'::text,
    'raa_audit'::text,
    'relationship_message'::text
  ])
);