-- Phase 1: DHF Security & Storage Setup

-- Create the private DHF assets storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dhf_assets', 
  'dhf_assets', 
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'application/json', 'text/csv']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for DHF Assets
-- INSERT Policy: Only allow users to upload to their own folder
CREATE POLICY "Users can upload DHF assets to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dhf_assets' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- SELECT Policy: Only allow users to view their own files
CREATE POLICY "Users can view their own DHF assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'dhf_assets' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE Policy: Only allow users to delete their own files
CREATE POLICY "Users can delete their own DHF assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'dhf_assets' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE Policy: Only allow users to update their own files
CREATE POLICY "Users can update their own DHF assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'dhf_assets' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'dhf_assets' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Phase 2: Create DHF Audit/Integrity Table
CREATE TABLE IF NOT EXISTS public.dhf_asset_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  data_type TEXT NOT NULL CHECK (data_type IN (
    'Health Record', 
    'Journal Entry', 
    'Financial Data', 
    'Personal Document', 
    'Memory Archive',
    'Preference Profile',
    'Relationship Data',
    'Career Document',
    'Educational Record',
    'Other'
  )),
  upload_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  dhf_stack_hash TEXT NOT NULL,
  file_size_bytes BIGINT,
  content_summary TEXT,
  extracted_entities JSONB DEFAULT '[]'::jsonb,
  sensitivity_level TEXT DEFAULT 'medium' CHECK (sensitivity_level IN ('low', 'medium', 'high', 'critical')),
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  veto_keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on dhf_asset_logs
ALTER TABLE public.dhf_asset_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dhf_asset_logs
CREATE POLICY "Users can view their own DHF asset logs"
ON public.dhf_asset_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own DHF asset logs"
ON public.dhf_asset_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own DHF asset logs"
ON public.dhf_asset_logs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own DHF asset logs"
ON public.dhf_asset_logs
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create DHF learning history table for continuous improvement
CREATE TABLE IF NOT EXISTS public.dhf_learning_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  execution_count INTEGER DEFAULT 0,
  last_refinement_at TIMESTAMPTZ,
  emotional_trends JSONB DEFAULT '{}'::jsonb,
  cognitive_patterns JSONB DEFAULT '{}'::jsonb,
  behavioral_shifts JSONB DEFAULT '{}'::jsonb,
  dhf_model_version TEXT DEFAULT '1.0',
  refinement_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on dhf_learning_history
ALTER TABLE public.dhf_learning_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dhf_learning_history
CREATE POLICY "Users can view their own DHF learning history"
ON public.dhf_learning_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage DHF learning"
ON public.dhf_learning_history
FOR ALL
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dhf_asset_logs_user_id ON public.dhf_asset_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_dhf_asset_logs_data_type ON public.dhf_asset_logs(data_type);
CREATE INDEX IF NOT EXISTS idx_dhf_asset_logs_veto_keywords ON public.dhf_asset_logs USING GIN(veto_keywords);
CREATE INDEX IF NOT EXISTS idx_dhf_learning_history_user_id ON public.dhf_learning_history(user_id);

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_dhf_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_dhf_asset_logs_timestamp
BEFORE UPDATE ON public.dhf_asset_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_dhf_timestamp();

CREATE TRIGGER update_dhf_learning_history_timestamp
BEFORE UPDATE ON public.dhf_learning_history
FOR EACH ROW
EXECUTE FUNCTION public.update_dhf_timestamp();