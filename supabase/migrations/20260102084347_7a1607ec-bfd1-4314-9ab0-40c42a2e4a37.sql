-- Add sponsorship fields to selfie_city_pins
ALTER TABLE public.selfie_city_pins 
ADD COLUMN IF NOT EXISTS sponsorship_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_premium_ad_space boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS detected_brands jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS brand_notifications_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS value_calculated_at timestamp with time zone;

-- Create High Value Zones table (malls, tourist spots, etc.)
CREATE TABLE IF NOT EXISTS public.high_value_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_name TEXT NOT NULL,
  zone_type TEXT NOT NULL, -- 'mall', 'tourist_spot', 'landmark', 'event_venue'
  location_lat NUMERIC NOT NULL,
  location_lng NUMERIC NOT NULL,
  radius_meters INTEGER DEFAULT 500,
  value_multiplier NUMERIC DEFAULT 1.5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Brand Sponsorship Alerts table
CREATE TABLE IF NOT EXISTS public.brand_sponsorship_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pin_id UUID REFERENCES public.selfie_city_pins(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  brand_category TEXT,
  user_id UUID NOT NULL,
  sponsorship_score INTEGER NOT NULL,
  location_name TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'claimed', 'expired', 'rejected'
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  claimed_by_brand_id UUID,
  claimed_at TIMESTAMP WITH TIME ZONE,
  payout_amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Brand Accounts table for brands to claim sponsorships
CREATE TABLE IF NOT EXISTS public.brand_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_name TEXT NOT NULL UNIQUE,
  brand_logo_url TEXT,
  brand_category TEXT,
  contact_email TEXT,
  notification_webhook TEXT,
  is_verified BOOLEAN DEFAULT false,
  budget_remaining NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.high_value_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_sponsorship_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for high_value_zones (public read)
CREATE POLICY "Anyone can read high value zones"
ON public.high_value_zones FOR SELECT
USING (true);

-- RLS Policies for brand_sponsorship_alerts
CREATE POLICY "Users can view their own sponsorship alerts"
ON public.brand_sponsorship_alerts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert sponsorship alerts"
ON public.brand_sponsorship_alerts FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update sponsorship alerts"
ON public.brand_sponsorship_alerts FOR UPDATE
USING (true);

-- RLS Policies for brand_accounts (public read for verified brands)
CREATE POLICY "Anyone can view verified brands"
ON public.brand_accounts FOR SELECT
USING (is_verified = true);

-- Add index for fast zone lookups
CREATE INDEX IF NOT EXISTS idx_high_value_zones_location ON public.high_value_zones(location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_sponsorship_alerts_brand ON public.brand_sponsorship_alerts(brand_name, status);
CREATE INDEX IF NOT EXISTS idx_selfie_pins_sponsorship ON public.selfie_city_pins(sponsorship_score DESC) WHERE is_premium_ad_space = true;

-- Insert some initial high-value zones
INSERT INTO public.high_value_zones (zone_name, zone_type, location_lat, location_lng, radius_meters, value_multiplier)
VALUES 
  ('Times Square', 'landmark', 40.7580, -73.9855, 300, 2.0),
  ('Mall of America', 'mall', 44.8549, -93.2422, 1000, 1.8),
  ('Las Vegas Strip', 'tourist_spot', 36.1147, -115.1728, 2000, 1.9),
  ('Rodeo Drive', 'landmark', 34.0674, -118.4016, 400, 2.5),
  ('Fifth Avenue', 'landmark', 40.7578, -73.9756, 500, 2.0),
  ('Shibuya Crossing', 'landmark', 35.6595, 139.7004, 200, 2.2),
  ('Oxford Street', 'landmark', 51.5152, -0.1418, 800, 1.8),
  ('Champs-Élysées', 'landmark', 48.8698, 2.3078, 600, 2.0)
ON CONFLICT DO NOTHING;