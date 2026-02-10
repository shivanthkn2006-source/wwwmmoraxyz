-- Create voice print enrollment table for biometric login
CREATE TABLE public.voice_print_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  voice_signature_hash TEXT NOT NULL,
  device_fingerprint TEXT,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  use_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  offline_key_hash TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_print_enrollments ENABLE ROW LEVEL SECURITY;

-- Users can only access their own voice prints
CREATE POLICY "Users can view their own voice prints"
ON public.voice_print_enrollments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voice prints"
ON public.voice_print_enrollments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice prints"
ON public.voice_print_enrollments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice prints"
ON public.voice_print_enrollments
FOR DELETE
USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_voice_prints_user_id ON public.voice_print_enrollments(user_id);
CREATE INDEX idx_voice_prints_active ON public.voice_print_enrollments(is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER update_voice_print_enrollments_updated_at
BEFORE UPDATE ON public.voice_print_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();