-- ZSMT SCHEMA MIGRATION: ADD MIND MERGE AND RAA FIELDS (v3.0)

-- 1. Add the dedicated field for the Mind Merge Foundation
-- Tracks structural components (user_id, uploaded_skill_asset IDs) forming the "new consciousness"
ALTER TABLE public.zoe_sovereign_memory
ADD COLUMN IF NOT EXISTS merged_mind_entities JSONB DEFAULT '[]'::jsonb;

-- 2. Add the dedicated field for the Reflexive Audit Agent (RAA) analysis
-- Stores Root Cause Analysis (RCA) output and diagnosis
ALTER TABLE public.zoe_sovereign_memory
ADD COLUMN IF NOT EXISTS rca_diagnosis_json JSONB DEFAULT '{}'::jsonb;

-- 3. Add the dedicated field for the Stability Score (RAA Output)
-- Quick-check metric (0.00-1.00) derived from RAA's 12-hour report
ALTER TABLE public.zoe_sovereign_memory
ADD COLUMN IF NOT EXISTS system_stability_score NUMERIC DEFAULT 1.00;

-- 4. Add index for efficient RAA queries on stability score
CREATE INDEX IF NOT EXISTS idx_zsmt_stability_score ON public.zoe_sovereign_memory(system_stability_score) WHERE system_stability_score < 0.85;

-- 5. Add index for Mind Merge entity lookups
CREATE INDEX IF NOT EXISTS idx_zsmt_merged_minds ON public.zoe_sovereign_memory USING GIN(merged_mind_entities) WHERE merged_mind_entities != '[]'::jsonb;

-- 6. Create function to get latest stability score for user
CREATE OR REPLACE FUNCTION public.get_zoe_stability_score(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_score NUMERIC;
BEGIN
  SELECT system_stability_score INTO v_score
  FROM public.zoe_sovereign_memory
  WHERE user_id = p_user_id
    AND system_stability_score IS NOT NULL
    AND event_type = 'raa_audit'
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(v_score, 1.00);
END;
$$;

-- 7. Create function to update Mind Merge entities when skill is uploaded
CREATE OR REPLACE FUNCTION public.append_merged_mind_entity(
  p_user_id UUID,
  p_skill_id TEXT,
  p_skill_type TEXT,
  p_skill_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_current_entities JSONB;
  v_new_entity JSONB;
  v_updated_entities JSONB;
BEGIN
  -- Get current merged_mind_entities from latest ZSMT entry
  SELECT COALESCE(merged_mind_entities, '[]'::jsonb) INTO v_current_entities
  FROM public.zoe_sovereign_memory
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Create new entity object
  v_new_entity := jsonb_build_object(
    'skill_id', p_skill_id,
    'skill_type', p_skill_type,
    'merged_at', now(),
    'metadata', p_skill_metadata
  );
  
  -- Append to existing entities
  v_updated_entities := v_current_entities || jsonb_build_array(v_new_entity);
  
  -- Insert new ZSMT entry with merged entities
  INSERT INTO public.zoe_sovereign_memory (
    user_id,
    event_type,
    content_text,
    merged_mind_entities
  ) VALUES (
    p_user_id,
    'mind_merge',
    'New skill entity merged into consciousness',
    v_updated_entities
  );
  
  RETURN v_updated_entities;
END;
$$;

-- 8. Create function for RAA to log diagnosis
CREATE OR REPLACE FUNCTION public.log_raa_diagnosis(
  p_user_id UUID,
  p_rca_diagnosis JSONB,
  p_stability_score NUMERIC,
  p_error_patterns JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  INSERT INTO public.zoe_sovereign_memory (
    user_id,
    event_type,
    content_text,
    rca_diagnosis_json,
    system_stability_score,
    error_data
  ) VALUES (
    p_user_id,
    'raa_audit',
    CASE 
      WHEN p_stability_score < 0.85 THEN 'Low stability detected - triggering conversational mask'
      ELSE 'System operating normally'
    END,
    p_rca_diagnosis,
    p_stability_score,
    p_error_patterns
  )
  RETURNING id INTO v_entry_id;
  
  RETURN v_entry_id;
END;
$$;

-- 9. Migrate proactive_initiative_ready into zoe_state_json (SSOT principle)
-- This ensures all state is consolidated within zoe_state_json
UPDATE public.zoe_sovereign_memory
SET zoe_state_json = jsonb_set(
  COALESCE(zoe_state_json, '{}'::jsonb),
  '{pce,proactive_ready}',
  to_jsonb(COALESCE(proactive_initiative_ready, false))
)
WHERE proactive_initiative_ready IS NOT NULL
  AND (zoe_state_json->'pce'->>'proactive_ready')::boolean IS DISTINCT FROM proactive_initiative_ready;

-- Note: proactive_initiative_ready column kept for backwards compatibility but 
-- zoe_state_json.pce.proactive_ready is now the source of truth