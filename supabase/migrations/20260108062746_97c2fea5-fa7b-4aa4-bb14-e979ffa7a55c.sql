-- FIX: zoe_sovereign_memory - Remove the constraint entirely for flexibility
-- The existing data has event types that weren't in the original constraint
ALTER TABLE public.zoe_sovereign_memory DROP CONSTRAINT IF EXISTS zoe_sovereign_memory_event_type_check;