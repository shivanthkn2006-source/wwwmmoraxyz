-- ============================================
-- CQRS QUADRILLION SCALING MIGRATION
-- Phase 1: Indexing, Partitioning Foundation, CQRS Functions
-- ============================================

-- 1. GIN Indexes for JSONB columns (Performance Hardening)
CREATE INDEX IF NOT EXISTS idx_zsmt_merged_mind_entities 
ON public.zoe_sovereign_memory USING GIN (merged_mind_entities);

CREATE INDEX IF NOT EXISTS idx_zsmt_rca_diagnosis 
ON public.zoe_sovereign_memory USING GIN (rca_diagnosis_json);

CREATE INDEX IF NOT EXISTS idx_zsmt_zoe_state 
ON public.zoe_sovereign_memory USING GIN (zoe_state_json);

-- 2. Composite index for user_id + timestamp (Partitioning Foundation)
CREATE INDEX IF NOT EXISTS idx_zsmt_user_timestamp 
ON public.zoe_sovereign_memory (user_id, created_at DESC);

-- 3. Add relationship_data_jsonb column to ZSMT for SSOT coherence
ALTER TABLE public.zoe_sovereign_memory 
ADD COLUMN IF NOT EXISTS relationship_data_jsonb JSONB DEFAULT '[]'::jsonb;

-- 4. Add cqrs_replica_hint column for routing logic
ALTER TABLE public.zoe_sovereign_memory 
ADD COLUMN IF NOT EXISTS cqrs_write_priority BOOLEAN DEFAULT false;

-- 5. Create CQRS Query Function (Read Replica Target)
CREATE OR REPLACE FUNCTION public.cqrs_query_zoe_state(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSONB;
  v_cached_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- This function is designed to hit READ REPLICAS
  -- Returns cached/stale data acceptable for UI rendering
  
  SELECT jsonb_build_object(
    'ecn', COALESCE(zoe_state_json->'ecn', '{"primary_emotion": "neutral"}'::jsonb),
    'dhf', COALESCE(zoe_state_json->'dhf', '{"autonomy_level": 0.5}'::jsonb),
    'stability_score', COALESCE(system_stability_score, 1.0),
    'last_event', event_type,
    'cached_at', created_at,
    'replica_hint', 'read'
  ) INTO v_result
  FROM public.zoe_sovereign_memory
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(v_result, '{"replica_hint": "read", "ecn": {"primary_emotion": "neutral"}}'::jsonb);
END;
$$;

-- 6. Create CQRS Command Function (Primary Write Target)
CREATE OR REPLACE FUNCTION public.cqrs_command_log_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_content_text TEXT,
  p_zoe_state_json JSONB DEFAULT '{}'::jsonb,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  -- This function ONLY hits PRIMARY WRITE database
  -- Critical writes with ACID compliance
  
  INSERT INTO public.zoe_sovereign_memory (
    user_id,
    event_type,
    content_text,
    zoe_state_json,
    cqrs_write_priority
  ) VALUES (
    p_user_id,
    p_event_type,
    p_content_text,
    p_zoe_state_json || p_metadata,
    true  -- Mark as primary write
  )
  RETURNING id INTO v_entry_id;
  
  RETURN v_entry_id;
END;
$$;

-- 7. RAA Failsafe: Enhanced get_zoe_stability_score with 14-hour check
CREATE OR REPLACE FUNCTION public.get_zoe_stability_score(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_score NUMERIC;
  v_last_audit_at TIMESTAMP WITH TIME ZONE;
  v_hours_since_audit NUMERIC;
BEGIN
  -- Get latest RAA audit entry with timestamp
  SELECT system_stability_score, created_at 
  INTO v_score, v_last_audit_at
  FROM public.zoe_sovereign_memory
  WHERE user_id = p_user_id
    AND system_stability_score IS NOT NULL
    AND event_type = 'raa_audit'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- FAILSAFE: If no audit in 14 hours, return Critical Unknown (0.60)
  IF v_last_audit_at IS NULL THEN
    RETURN 0.60;  -- Critical Unknown - no audit ever recorded
  END IF;
  
  v_hours_since_audit := EXTRACT(EPOCH FROM (NOW() - v_last_audit_at)) / 3600;
  
  IF v_hours_since_audit > 14 THEN
    -- RAA has not reported in 14+ hours - force humanly-flawed dialogue
    RETURN 0.60;  -- Critical Unknown status
  END IF;
  
  RETURN COALESCE(v_score, 1.00);
END;
$$;

-- 8. Mind Merge Integrity Check Function
CREATE OR REPLACE FUNCTION public.append_merged_mind_entity(
  p_user_id UUID, 
  p_skill_id TEXT, 
  p_skill_type TEXT, 
  p_skill_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_entities JSONB;
  v_new_entity JSONB;
  v_updated_entities JSONB;
  v_skill_exists BOOLEAN;
BEGIN
  -- ACID Compliance: Verify skill_id exists in zoe_skill_uploads
  SELECT EXISTS(
    SELECT 1 FROM public.zoe_skill_uploads 
    WHERE id::text = p_skill_id OR skill_name = p_skill_id
  ) INTO v_skill_exists;
  
  -- If skill doesn't exist in uploads, check behavioral events as fallback
  IF NOT v_skill_exists THEN
    SELECT EXISTS(
      SELECT 1 FROM public.behavioral_events 
      WHERE user_id = p_user_id 
      AND metadata->>'skill_id' = p_skill_id
    ) INTO v_skill_exists;
  END IF;
  
  -- Concurrency check: Only proceed if skill is verified
  IF NOT v_skill_exists THEN
    -- Log failed merge attempt
    INSERT INTO public.zoe_sovereign_memory (
      user_id, event_type, content_text, error_data
    ) VALUES (
      p_user_id, 
      'mind_merge_failed',
      'Skill verification failed - skill_id not found',
      jsonb_build_object('skill_id', p_skill_id, 'reason', 'NOT_FOUND')
    );
    
    RETURN jsonb_build_object('success', false, 'error', 'SKILL_NOT_VERIFIED');
  END IF;
  
  -- Get current merged_mind_entities from latest ZSMT entry
  SELECT COALESCE(merged_mind_entities, '[]'::jsonb) INTO v_current_entities
  FROM public.zoe_sovereign_memory
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Create new entity object with ACID timestamp
  v_new_entity := jsonb_build_object(
    'skill_id', p_skill_id,
    'skill_type', p_skill_type,
    'merged_at', now(),
    'verified', true,
    'metadata', p_skill_metadata
  );
  
  -- Append to existing entities
  v_updated_entities := v_current_entities || jsonb_build_array(v_new_entity);
  
  -- Insert new ZSMT entry with merged entities (PRIMARY WRITE)
  INSERT INTO public.zoe_sovereign_memory (
    user_id,
    event_type,
    content_text,
    merged_mind_entities,
    cqrs_write_priority
  ) VALUES (
    p_user_id,
    'mind_merge',
    'Verified skill entity merged into consciousness',
    v_updated_entities,
    true
  );
  
  RETURN jsonb_build_object('success', true, 'entities', v_updated_entities);
END;
$$;

-- 9. Relationship Data Migration Function (SSOT Coherence)
CREATE OR REPLACE FUNCTION public.migrate_relationship_to_zsmt(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_relationships JSONB;
BEGIN
  -- Aggregate all relationships for user into JSONB array
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ur.id,
      'related_user_id', ur.related_user_id,
      'relationship_type', ur.relationship_type,
      'requester_label', ur.requester_label,
      'recipient_label', ur.recipient_label,
      'status', ur.status,
      'confirmed_at', ur.confirmed_at,
      'migrated_at', now()
    )
  ), '[]'::jsonb) INTO v_relationships
  FROM public.user_relationships ur
  WHERE ur.requester_id = p_user_id OR ur.related_user_id = p_user_id;
  
  -- Store in ZSMT as relationship_data_jsonb
  INSERT INTO public.zoe_sovereign_memory (
    user_id,
    event_type,
    content_text,
    relationship_data_jsonb,
    cqrs_write_priority
  ) VALUES (
    p_user_id,
    'relationship_migration',
    'Relationship data migrated to ZSMT for SSOT coherence',
    v_relationships,
    true
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'relationships_migrated', jsonb_array_length(v_relationships),
    'data', v_relationships
  );
END;
$$;

-- 10. CQRS Cache Invalidation Trigger
CREATE OR REPLACE FUNCTION public.cqrs_cache_invalidation_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Mark cache as stale when critical writes occur
  -- This would notify external cache (Redis) in production
  IF NEW.event_type IN ('raa_audit', 'mind_merge', 'relationship_migration', 'veto_override') THEN
    NEW.cqrs_write_priority := true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for cache invalidation
DROP TRIGGER IF EXISTS cqrs_cache_invalidation ON public.zoe_sovereign_memory;
CREATE TRIGGER cqrs_cache_invalidation
BEFORE INSERT ON public.zoe_sovereign_memory
FOR EACH ROW
EXECUTE FUNCTION public.cqrs_cache_invalidation_trigger();