-- Create invite_codes table for the Quantum Gatekeeper system
CREATE TABLE public.invite_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Only admins can view invite codes (using profiles username check)
CREATE POLICY "Admins can view all invite codes"
ON public.invite_codes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.username IN ('moksh50', 'Justmkbhd')
  )
);

-- Only admins can create invite codes
CREATE POLICY "Admins can create invite codes"
ON public.invite_codes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.username IN ('moksh50', 'Justmkbhd')
  )
);

-- Only admins can update invite codes
CREATE POLICY "Admins can update invite codes"
ON public.invite_codes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.username IN ('moksh50', 'Justmkbhd')
  )
);

-- Public can read invite codes to validate them (but only active ones)
CREATE POLICY "Anyone can validate active invite codes"
ON public.invite_codes
FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Create index for fast code lookup
CREATE INDEX idx_invite_codes_code ON public.invite_codes(code);
CREATE INDEX idx_invite_codes_active ON public.invite_codes(is_active) WHERE is_active = true;