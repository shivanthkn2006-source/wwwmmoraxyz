-- Create zoe_omega_core table for centralized OMEGA data access
CREATE TABLE IF NOT EXISTS public.zoe_omega_core (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  core_type TEXT NOT NULL CHECK (core_type IN ('memory_engram', 'ecn_snapshot', 'bi_cameral_state', 'vr_interaction', 'avatar_data', 'uploaded_intelligence')),
  data_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  integrity_level INTEGER DEFAULT 100,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'uploading', 'downloading')),
  dhf_linked BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create zoe_avatar_profiles table for user avatars based on relationships
CREATE TABLE IF NOT EXISTS public.zoe_avatar_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  avatar_name TEXT NOT NULL,
  avatar_type TEXT NOT NULL CHECK (avatar_type IN ('self', 'family', 'friend', 'ai_companion', 'custom')),
  source_user_id UUID, -- Reference to friends/family user
  relationship_type TEXT, -- father, mother, son, friend, etc.
  avatar_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  profile_snapshot JSONB DEFAULT '{}'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  selfies JSONB DEFAULT '[]'::jsonb,
  vr_interactions JSONB DEFAULT '[]'::jsonb,
  personality_traits JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.zoe_omega_core ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoe_avatar_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for zoe_omega_core
CREATE POLICY "Users can view their own OMEGA core data" 
ON public.zoe_omega_core 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own OMEGA core data" 
ON public.zoe_omega_core 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own OMEGA core data" 
ON public.zoe_omega_core 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own OMEGA core data" 
ON public.zoe_omega_core 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for zoe_avatar_profiles
CREATE POLICY "Users can view their own avatars" 
ON public.zoe_avatar_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own avatars" 
ON public.zoe_avatar_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own avatars" 
ON public.zoe_avatar_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own avatars" 
ON public.zoe_avatar_profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_zoe_omega_core_user_id ON public.zoe_omega_core(user_id);
CREATE INDEX idx_zoe_omega_core_type ON public.zoe_omega_core(core_type);
CREATE INDEX idx_zoe_omega_core_sync ON public.zoe_omega_core(sync_status);
CREATE INDEX idx_zoe_avatar_profiles_user_id ON public.zoe_avatar_profiles(user_id);
CREATE INDEX idx_zoe_avatar_profiles_type ON public.zoe_avatar_profiles(avatar_type);

-- Trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_zoe_omega_core_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_zoe_omega_core_updated_at
BEFORE UPDATE ON public.zoe_omega_core
FOR EACH ROW
EXECUTE FUNCTION public.update_zoe_omega_core_timestamp();

CREATE TRIGGER update_zoe_avatar_profiles_updated_at
BEFORE UPDATE ON public.zoe_avatar_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_zoe_omega_core_timestamp();

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.zoe_omega_core;
ALTER PUBLICATION supabase_realtime ADD TABLE public.zoe_avatar_profiles;