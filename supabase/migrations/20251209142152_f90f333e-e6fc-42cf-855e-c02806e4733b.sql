-- Fix dhf_asset_logs data_type constraint to include multimodal types
ALTER TABLE public.dhf_asset_logs DROP CONSTRAINT IF EXISTS dhf_asset_logs_data_type_check;

ALTER TABLE public.dhf_asset_logs ADD CONSTRAINT dhf_asset_logs_data_type_check 
CHECK (data_type = ANY (ARRAY[
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
  'audio'::text
]));