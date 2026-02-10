-- Drop the existing check constraint and add new one with OMEGA event types
ALTER TABLE public.zoe_sovereign_memory 
DROP CONSTRAINT IF EXISTS zoe_sovereign_memory_event_type_check;

-- Add new check constraint with all required event types including OMEGA
ALTER TABLE public.zoe_sovereign_memory
ADD CONSTRAINT zoe_sovereign_memory_event_type_check 
CHECK (event_type IN (
  'chat_message',
  'voice_command',
  'omega_entry',
  'omega_exit',
  'omega_world_entry',
  'biological_decay',
  'raa_audit',
  'mind_merge',
  'mind_merge_failed',
  'relationship_migration',
  'veto_override',
  'error_masked_voice',
  'dhf_action',
  'ecn_state',
  'skill_upload',
  'external_sync',
  'dhf_external_sync',
  'proactive_suggestion',
  'session_summary',
  'integrity_decay',
  'vr_interaction',
  'bi_cameral_conflict',
  'bio_sync_restore'
));