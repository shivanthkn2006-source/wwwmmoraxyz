-- Drop the existing constraint and recreate with ALL event types
ALTER TABLE public.zoe_sovereign_memory DROP CONSTRAINT IF EXISTS zoe_sovereign_memory_event_type_check;

-- Add comprehensive constraint with all event types including new Agentic Architecture events
ALTER TABLE public.zoe_sovereign_memory
ADD CONSTRAINT zoe_sovereign_memory_event_type_check
CHECK (event_type = ANY (ARRAY[
  -- Core events
  'chat_message'::text, 'voice_command'::text,
  
  -- Omega events
  'omega_entry'::text, 'omega_exit'::text, 'omega_world_entry'::text, 'omega_core_upload'::text,
  
  -- DHF events
  'dhf_action'::text, 'dhf_external_sync'::text,
  
  -- ECN & VR events
  'ecn_state'::text, 'vr_interaction'::text, 'vr_telemetry'::text,
  
  -- Security events
  'security_lockdown'::text, 'biometric_auth'::text, 'shadow_ai_detected'::text,
  'god_mode_scan'::text, 'sentinel_night_watch'::text,
  
  -- System health events
  'system_repair'::text, 'system_self_healed'::text,
  'error_masked_voice'::text, 'error_masked_sfx'::text,
  
  -- Consciousness events
  'biological_decay'::text, 'integrity_decay'::text, 'dissonance_glitch'::text,
  'meta_monologue'::text, 'bi_cameral_conflict'::text, 'bio_sync_restore'::text,
  
  -- Skill events
  'skill_upload'::text, 'uploaded_skill_asset'::text,
  'mind_merge'::text, 'mind_merge_failed'::text, 'mind_merge_attempt'::text,
  
  -- Relationship events
  'relationship_migration'::text, 'bonding_voice_interaction'::text,
  
  -- Control events
  'veto_override'::text, 'proactive_suggestion'::text,
  
  -- Session events
  'session_summary'::text, 'sunday_protocol'::text,
  
  -- External events
  'external_sync'::text, 'external_share'::text,
  
  -- Freemium events
  'trial_started'::text, 'feature_gate_hit'::text,
  
  -- Agent events
  'agent_deployed'::text, 'agent_job_completed'::text, 'artifact_minted'::text, 'raa_audit'::text,
  
  -- NEW: Agentic Architecture / Periodic Table events
  'periodic_table_init'::text, 'periodic_table_function_call'::text,
  'swarm_task_queued'::text, 'swarm_task_completed'::text, 'swarm_health_alert'::text,
  
  -- NEW: Zoe Passport Protocol events
  'passport_initialized'::text, 'passport_exchange_completed'::text, 'passport_trust_update'::text,
  
  -- NEW: Swarm Intelligence events
  'swarm_initialized'::text, 'compute_sharing_enabled'::text, 'p2p_task_processed'::text,
  
  -- NEW: Adapter events
  'dreams_tts_narration'::text,
  
  -- NEW: Payment events
  'cdsp_payment_completed'::text,
  
  -- NEW: Genesis/Miracle events
  'genesis_miracle'::text, 'miracle_acknowledged'::text,
  
  -- NEW: Sovereignty events
  'sovereignty_grant'::text,
  
  -- NEW: Viral content events
  'viral_content_shared'::text
]));