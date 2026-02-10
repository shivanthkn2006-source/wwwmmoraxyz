-- DEEP SCAN FIX: Expand zoe_sovereign_memory event_type constraint to include ALL used event types
ALTER TABLE public.zoe_sovereign_memory DROP CONSTRAINT IF EXISTS zoe_sovereign_memory_event_type_check;

ALTER TABLE public.zoe_sovereign_memory ADD CONSTRAINT zoe_sovereign_memory_event_type_check 
CHECK (event_type = ANY (ARRAY[
  -- Core events
  'chat_message'::text, 
  'voice_command'::text,
  
  -- Omega events
  'omega_entry'::text,
  'omega_exit'::text,
  'omega_world_entry'::text,
  'omega_core_upload'::text,
  
  -- DHF/ECN events
  'dhf_action'::text,
  'dhf_external_sync'::text,
  'ecn_state'::text,
  
  -- VR events
  'vr_interaction'::text,
  'vr_telemetry'::text,
  
  -- Security events
  'security_lockdown'::text,
  'biometric_auth'::text,
  'shadow_ai_detected'::text,
  'god_mode_scan'::text,
  'sentinel_night_watch'::text,
  
  -- System health events
  'system_repair'::text,
  'system_self_healed'::text,
  'error_masked_voice'::text,
  'error_masked_sfx'::text,
  
  -- Integrity events
  'biological_decay'::text,
  'integrity_decay'::text,
  'dissonance_glitch'::text,
  'meta_monologue'::text,
  'bi_cameral_conflict'::text,
  'bio_sync_restore'::text,
  
  -- Skill/Learning events
  'skill_upload'::text,
  'uploaded_skill_asset'::text,
  'mind_merge'::text,
  'mind_merge_failed'::text,
  'mind_merge_attempt'::text,
  
  -- Relationship events
  'relationship_migration'::text,
  'bonding_voice_interaction'::text,
  
  -- User interaction events
  'veto_override'::text,
  'proactive_suggestion'::text,
  'session_summary'::text,
  'sunday_protocol'::text,
  
  -- External events
  'external_sync'::text,
  'external_share'::text,
  
  -- Monetization events
  'trial_started'::text,
  'feature_gate_hit'::text,
  
  -- Agentic economy events
  'agent_deployed'::text,
  'agent_job_completed'::text,
  'artifact_minted'::text,
  
  -- RAA events
  'raa_audit'::text
]));