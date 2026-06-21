-- Brand Campaigns table (for merchant bounties)
CREATE TABLE IF NOT EXISTS public.brand_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_account_id UUID REFERENCES public.brand_accounts(id),
  merchant_user_id UUID NOT NULL,
  campaign_name TEXT NOT NULL,
  description TEXT,
  reward_type TEXT NOT NULL DEFAULT 'points',
  reward_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  geofence_center_lat NUMERIC NOT NULL,
  geofence_center_lng NUMERIC NOT NULL,
  geofence_radius_meters INTEGER NOT NULL DEFAULT 500,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  max_claims INTEGER DEFAULT NULL,
  current_claims INTEGER DEFAULT 0,
  budget_total NUMERIC DEFAULT 0,
  budget_spent NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  target_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Divine notifications tracking (rate limiting)
CREATE TABLE IF NOT EXISTS public.divine_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_id UUID REFERENCES public.brand_campaigns(id),
  deal_id UUID REFERENCES public.brand_deals(id),
  notification_type TEXT NOT NULL DEFAULT 'whisper',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  brand_name TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC,
  distance_meters NUMERIC,
  reward_offered NUMERIC DEFAULT 0,
  was_clicked BOOLEAN DEFAULT false,
  was_converted BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  clicked_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Campaign claims (when users fulfill bounties)
CREATE TABLE IF NOT EXISTS public.campaign_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.brand_campaigns(id),
  user_id UUID NOT NULL,
  pin_id UUID REFERENCES public.selfie_city_pins(id),
  status TEXT NOT NULL DEFAULT 'pending',
  reward_earned NUMERIC DEFAULT 0,
  verified_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add merchant role to brand_accounts
ALTER TABLE public.brand_accounts ADD COLUMN IF NOT EXISTS merchant_user_id UUID;

-- Enable RLS
ALTER TABLE public.brand_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divine_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brand_campaigns
CREATE POLICY "Merchants can view their own campaigns" ON public.brand_campaigns
  FOR SELECT USING (auth.uid() = merchant_user_id);

CREATE POLICY "Merchants can create campaigns" ON public.brand_campaigns
  FOR INSERT WITH CHECK (auth.uid() = merchant_user_id);

CREATE POLICY "Merchants can update their campaigns" ON public.brand_campaigns
  FOR UPDATE USING (auth.uid() = merchant_user_id);

CREATE POLICY "Anyone can view active campaigns" ON public.brand_campaigns
  FOR SELECT USING (status = 'active' AND end_time > now());

-- RLS Policies for divine_notifications
CREATE POLICY "Users can view their notifications" ON public.divine_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can insert notifications" ON public.divine_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their notifications" ON public.divine_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for campaign_claims
CREATE POLICY "Users can view their claims" ON public.campaign_claims
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create claims" ON public.campaign_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Merchants can view claims on their campaigns" ON public.campaign_claims
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.brand_campaigns 
      WHERE brand_campaigns.id = campaign_claims.campaign_id 
      AND brand_campaigns.merchant_user_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can update claims" ON public.campaign_claims
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.brand_campaigns 
      WHERE brand_campaigns.id = campaign_claims.campaign_id 
      AND brand_campaigns.merchant_user_id = auth.uid()
    )
  );

-- Function to check daily notification limit
CREATE OR REPLACE FUNCTION public.get_daily_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.divine_notifications
    WHERE user_id = p_user_id
    AND sent_at >= CURRENT_DATE
    AND sent_at < CURRENT_DATE + INTERVAL '1 day'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update campaign claims count
CREATE OR REPLACE FUNCTION public.update_campaign_claims_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.brand_campaigns
  SET current_claims = current_claims + 1,
      updated_at = now()
  WHERE id = NEW.campaign_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_campaign_claim_created ON public.campaign_claims;
CREATE TRIGGER on_campaign_claim_created
  AFTER INSERT ON public.campaign_claims
  FOR EACH ROW
  EXECUTE FUNCTION public.update_campaign_claims_count();

-- Enable realtime for live feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_claims;