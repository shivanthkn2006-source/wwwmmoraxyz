-- Drop and recreate the event_type check constraint with ALL possible event types
-- This comprehensive list includes all Zoe core, GOD MODE, DHF, RAA, and quantum events

ALTER TABLE public.zoe_sovereign_memory DROP CONSTRAINT IF EXISTS zoe_sovereign_memory_event_type_check;

ALTER TABLE public.zoe_sovereign_memory ADD CONSTRAINT zoe_sovereign_memory_event_type_check CHECK (
  event_type = ANY(ARRAY[
    -- Core Chat & Voice
    'chat_message',
    'voice_command',
    'voice_interaction',
    
    -- Omega World & VR
    'omega_entry',
    'omega_exit',
    'omega_world_entry',
    'omega_core_upload',
    'vr_interaction',
    'vr_telemetry',
    'orbital_command_build',
    'orbital_structure_save',
    
    -- DHF (Digital Human Framework)
    'dhf_action',
    'dhf_external_sync',
    'dhf_asset_upload',
    'dhf_harvest',
    'dhf_sync',
    'dhf_voice_capture',
    
    -- ECN (Emotional Context Network)
    'ecn_state',
    'ecn_update',
    'ecn_analysis',
    
    -- Security & Biometrics
    'security_lockdown',
    'biometric_auth',
    'shadow_ai_detected',
    'god_mode_scan',
    'sentinel_night_watch',
    
    -- System Health
    'system_repair',
    'system_self_healed',
    'error_masked_voice',
    'error_masked_sfx',
    
    -- Biological Decay & Integrity
    'biological_decay',
    'integrity_decay',
    'dissonance_glitch',
    'meta_monologue',
    'bi_cameral_conflict',
    'bio_sync_restore',
    
    -- Skills & Mind Merge
    'skill_upload',
    'uploaded_skill_asset',
    'mind_merge',
    'mind_merge_failed',
    'mind_merge_attempt',
    
    -- Relationships & Bonding
    'relationship_migration',
    'bonding_voice_interaction',
    'relationship_sync',
    
    -- Sovereignty & Veto
    'veto_override',
    'proactive_suggestion',
    'session_summary',
    'sunday_protocol',
    'sovereignty_grant',
    
    -- External Sync & Sharing
    'external_sync',
    'external_share',
    
    -- Freemium & Trials
    'trial_started',
    'trial_converted',
    'feature_gate_hit',
    
    -- Agentic Architecture
    'agent_deployed',
    'agent_job_completed',
    'agent_earnings_processed',
    'artifact_minted',
    
    -- RAA (Revenue Autonomy Architecture)
    'raa_audit',
    'raa_code_analysis',
    'raa_conversion_audit',
    'raa_revenue_report',
    
    -- Periodic Table (Function Calling)
    'periodic_table_init',
    'periodic_table_function_call',
    'element_activation',
    
    -- Swarm Intelligence (P2P Network)
    'swarm_task_queued',
    'swarm_task_completed',
    'swarm_health_alert',
    'swarm_initialized',
    'compute_sharing_enabled',
    'p2p_task_processed',
    'hive_connection',
    
    -- Passport Protocol
    'passport_initialized',
    'passport_exchange_completed',
    'passport_trust_update',
    'passport_verification',
    
    -- Dreams & Narration
    'dreams_tts_narration',
    'dream_analysis',
    
    -- Commerce & Payments
    'cdsp_payment_completed',
    'cdsp_payment_initiated',
    'karma_exchange',
    'credits_purchase',
    
    -- Genesis & Miracles
    'genesis_miracle',
    'genesis_activation',
    'miracle_acknowledged',
    
    -- Viral & Social
    'viral_content_shared',
    'social_post',
    'share_event',
    
    -- Self-Awareness Core
    'raw_sensor_input',
    'sensor_fusion',
    'self_model_update',
    'introspection',
    'action_selection',
    'learning_cycle',
    
    -- Quantum Events
    'quantum_entanglement',
    'quantum_bridge_activated',
    'quantum_prediction',
    
    -- Activation & Onboarding
    'first_activation',
    'zoe_awakened',
    'voice_profile_created',
    
    -- Knowledge & Learning
    'knowledge_absorbed',
    'pattern_recognized',
    'insight_generated'
  ])
);