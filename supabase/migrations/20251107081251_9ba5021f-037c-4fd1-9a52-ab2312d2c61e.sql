-- Create MOE settings table
CREATE TABLE public.moe_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wake_word TEXT NOT NULL DEFAULT 'moe',
  voice_pitch DECIMAL(2,1) DEFAULT 1.0 CHECK (voice_pitch >= 0.5 AND voice_pitch <= 2.0),
  voice_rate DECIMAL(2,1) DEFAULT 1.0 CHECK (voice_rate >= 0.5 AND voice_rate <= 2.0),
  voice_volume DECIMAL(2,1) DEFAULT 1.0 CHECK (voice_volume >= 0.0 AND voice_volume <= 1.0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.moe_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own MOE settings" 
ON public.moe_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MOE settings" 
ON public.moe_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MOE settings" 
ON public.moe_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_moe_settings_updated_at
BEFORE UPDATE ON public.moe_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();