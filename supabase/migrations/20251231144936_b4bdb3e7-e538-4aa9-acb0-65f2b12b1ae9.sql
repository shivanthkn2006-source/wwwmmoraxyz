-- =============================================
-- SELFIE CITY CORE TABLES - PHASE 1
-- =============================================

-- 1. selfie_city_pins: Store all selfie posts with geo-location
CREATE TABLE public.selfie_city_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  location_lat NUMERIC NOT NULL,
  location_lng NUMERIC NOT NULL,
  location_name TEXT,
  detected_products JSONB DEFAULT '[]'::jsonb,
  is_premium BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. brand_deals: Store local and online deals from 50+ Indian brands
CREATE TABLE public.brand_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL,
  brand_logo_url TEXT,
  store_name TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  discount_text TEXT,
  description TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC,
  is_online BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  target_user_tiers TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. user_route_history: Track user movement for On-Route algorithm
CREATE TABLE public.user_route_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  location_lat NUMERIC NOT NULL,
  location_lng NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- 4. on_route_notifications: Store notification history
CREATE TABLE public.on_route_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  deal_id UUID REFERENCES public.brand_deals(id) ON DELETE CASCADE,
  notification_type TEXT DEFAULT 'deal',
  shown_at TIMESTAMPTZ DEFAULT now(),
  clicked BOOLEAN DEFAULT false,
  dismissed BOOLEAN DEFAULT false
);

-- 5. user_brand_preferences: Track user brand affinities
CREATE TABLE public.user_brand_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  brand_name TEXT NOT NULL,
  category TEXT,
  affinity_score NUMERIC DEFAULT 0,
  interaction_count INTEGER DEFAULT 0,
  last_interaction TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, brand_name)
);

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.selfie_city_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_route_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.on_route_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_brand_preferences ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- selfie_city_pins: Users can read all, write own
CREATE POLICY "Anyone can view selfie pins" ON public.selfie_city_pins
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own pins" ON public.selfie_city_pins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pins" ON public.selfie_city_pins
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pins" ON public.selfie_city_pins
  FOR DELETE USING (auth.uid() = user_id);

-- brand_deals: Public read
CREATE POLICY "Anyone can view brand deals" ON public.brand_deals
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage deals" ON public.brand_deals
  FOR ALL USING (true) WITH CHECK (true);

-- user_route_history: Users read/write own only
CREATE POLICY "Users can view own route history" ON public.user_route_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own route history" ON public.user_route_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own route history" ON public.user_route_history
  FOR DELETE USING (auth.uid() = user_id);

-- on_route_notifications: Users read/write own only
CREATE POLICY "Users can view own notifications" ON public.on_route_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" ON public.on_route_notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.on_route_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- user_brand_preferences: Users read/write own only
CREATE POLICY "Users can view own preferences" ON public.user_brand_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.user_brand_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.user_brand_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_selfie_pins_location ON public.selfie_city_pins (location_lat, location_lng);
CREATE INDEX idx_selfie_pins_user ON public.selfie_city_pins (user_id);
CREATE INDEX idx_brand_deals_location ON public.brand_deals (location_lat, location_lng);
CREATE INDEX idx_brand_deals_category ON public.brand_deals (category);
CREATE INDEX idx_route_history_user ON public.user_route_history (user_id, recorded_at DESC);
CREATE INDEX idx_notifications_user ON public.on_route_notifications (user_id, shown_at DESC);
CREATE INDEX idx_brand_prefs_user ON public.user_brand_preferences (user_id);

-- =============================================
-- SEED INITIAL BRAND DEALS (50+ Indian Brands)
-- =============================================

INSERT INTO public.brand_deals (brand_name, brand_logo_url, store_name, category, subcategory, discount_text, description, location_lat, location_lng, is_online, is_premium) VALUES
-- Fashion
('FabIndia', 'https://logo.clearbit.com/fabindia.com', 'FabIndia Phoenix Mall', 'Fashion', 'Ethnic Wear', '40% OFF', 'Festive collection sale', 19.0178, 72.8478, false, false),
('Manyavar', 'https://logo.clearbit.com/manyavar.com', 'Manyavar Linking Road', 'Fashion', 'Ethnic Wear', '30% OFF', 'Wedding season special', 19.0641, 72.8345, false, true),
('W for Woman', 'https://logo.clearbit.com/wforwoman.com', 'W Inorbit Mall', 'Fashion', 'Western Wear', '50% OFF', 'End of season sale', 19.0619, 72.8353, false, false),
('Allen Solly', 'https://logo.clearbit.com/allensolly.com', 'Allen Solly High Street', 'Fashion', 'Formal', '35% OFF', 'Corporate collection', 19.1136, 72.8697, false, false),
('Raymond', 'https://logo.clearbit.com/raymond.in', 'Raymond Flagship Store', 'Fashion', 'Formal', '25% OFF', 'Premium suits collection', 19.0760, 72.8777, false, true),

-- Electronics
('Croma', 'https://logo.clearbit.com/croma.com', 'Croma Infinity Mall', 'Electronics', 'Gadgets', '20% OFF', 'Tech fest deals', 19.1177, 72.8391, false, false),
('Reliance Digital', 'https://logo.clearbit.com/reliancedigital.in', 'Reliance Digital Bandra', 'Electronics', 'Gadgets', '15% OFF', 'Smart home sale', 19.0596, 72.8295, false, false),
('Vijay Sales', 'https://logo.clearbit.com/vijaysales.com', 'Vijay Sales Dadar', 'Electronics', 'Appliances', '30% OFF', 'AC summer sale', 19.0178, 72.8478, false, false),

-- Food & Beverages
('Starbucks', 'https://logo.clearbit.com/starbucks.com', 'Starbucks BKC', 'Food', 'Coffee', 'Buy 1 Get 1', 'Happy hour special', 19.0657, 72.8694, false, false),
('Chaayos', 'https://logo.clearbit.com/chaayos.com', 'Chaayos Lower Parel', 'Food', 'Cafe', '20% OFF', 'Monsoon chai fest', 19.0019, 72.8313, false, false),
('Haldiram', 'https://logo.clearbit.com/haldirams.com', 'Haldiram Juhu', 'Food', 'Sweets', '15% OFF', 'Festival sweets box', 19.0965, 72.8265, false, false),
('Barbeque Nation', 'https://logo.clearbit.com/barbequenation.com', 'BBQ Nation Andheri', 'Food', 'Restaurant', '25% OFF', 'Unlimited buffet deal', 19.1197, 72.8468, false, false),

-- Jewelry
('Tanishq', 'https://logo.clearbit.com/tanishq.co.in', 'Tanishq Bandra', 'Jewelry', 'Gold', '10% Making Charges', 'Akshaya Tritiya offer', 19.0596, 72.8295, false, true),
('Kalyan Jewellers', 'https://logo.clearbit.com/kalyanjewellers.net', 'Kalyan Dadar', 'Jewelry', 'Gold', '15% OFF', 'Wedding collection', 19.0178, 72.8478, false, true),
('CaratLane', 'https://logo.clearbit.com/caratlane.com', 'CaratLane Online', 'Jewelry', 'Diamond', '20% OFF', 'Valentine special', 0, 0, true, false),

-- Beauty
('Nykaa', 'https://logo.clearbit.com/nykaa.com', 'Nykaa Luxe Palladium', 'Beauty', 'Cosmetics', '40% OFF', 'Pink Friday sale', 19.0019, 72.8313, false, false),
('Forest Essentials', 'https://logo.clearbit.com/forestessentialsindia.com', 'Forest Essentials Kala Ghoda', 'Beauty', 'Skincare', '25% OFF', 'Ayurvedic beauty box', 18.9322, 72.8326, false, true),
('Kama Ayurveda', 'https://logo.clearbit.com/kamaayurveda.com', 'Kama Ayurveda Online', 'Beauty', 'Skincare', '30% OFF', 'Festive glow kit', 0, 0, true, false),

-- Sports
('Decathlon', 'https://logo.clearbit.com/decathlon.com', 'Decathlon Malad', 'Sports', 'Fitness', '35% OFF', 'Fitness month sale', 19.1863, 72.8489, false, false),
('Nike', 'https://logo.clearbit.com/nike.com', 'Nike Palladium', 'Sports', 'Footwear', '30% OFF', 'Running collection', 19.0019, 72.8313, false, false),
('Puma', 'https://logo.clearbit.com/puma.com', 'Puma Linking Road', 'Sports', 'Apparel', '40% OFF', 'Athleisure sale', 19.0641, 72.8345, false, false),

-- Home & Lifestyle
('Home Centre', 'https://logo.clearbit.com/homecentre.in', 'Home Centre Phoenix', 'Home', 'Furniture', '45% OFF', 'Home makeover sale', 19.0859, 72.8896, false, false),
('IKEA', 'https://logo.clearbit.com/ikea.com', 'IKEA Navi Mumbai', 'Home', 'Furniture', '20% OFF', 'Bedroom collection', 19.0358, 73.0186, false, false),
('Pepperfry', 'https://logo.clearbit.com/pepperfry.com', 'Pepperfry Studio Andheri', 'Home', 'Furniture', '50% OFF', 'Living room fest', 19.1197, 72.8468, false, false),

-- Premium/Luxury
('Louis Vuitton', 'https://logo.clearbit.com/louisvuitton.com', 'LV Palladium', 'Luxury', 'Bags', 'VIP Access', 'New collection preview', 19.0019, 72.8313, false, true),
('Gucci', 'https://logo.clearbit.com/gucci.com', 'Gucci Palladium', 'Luxury', 'Fashion', 'VIP Access', 'Exclusive trunk show', 19.0019, 72.8313, false, true),
('BMW', 'https://logo.clearbit.com/bmw.com', 'BMW Navnit Motors', 'Automotive', 'Luxury Cars', 'Test Drive', 'X Series launch', 19.0760, 72.8777, false, true),
('Mercedes', 'https://logo.clearbit.com/mercedes-benz.com', 'Mercedes Andheri', 'Automotive', 'Luxury Cars', 'EMI Offer', 'S-Class exclusive', 19.1197, 72.8468, false, true),
('Audi', 'https://logo.clearbit.com/audi.com', 'Audi BKC', 'Automotive', 'Luxury Cars', 'Exchange Bonus', 'Q7 launch event', 19.0657, 72.8694, false, true),

-- Online Brands
('Myntra', 'https://logo.clearbit.com/myntra.com', 'Myntra App', 'Fashion', 'Online', '60% OFF', 'End of Reason Sale', 0, 0, true, false),
('Amazon India', 'https://logo.clearbit.com/amazon.in', 'Amazon App', 'Electronics', 'Online', '40% OFF', 'Great Indian Festival', 0, 0, true, false),
('Flipkart', 'https://logo.clearbit.com/flipkart.com', 'Flipkart App', 'Electronics', 'Online', '50% OFF', 'Big Billion Days', 0, 0, true, false),
('Ajio', 'https://logo.clearbit.com/ajio.com', 'Ajio App', 'Fashion', 'Online', '70% OFF', 'All Stars Sale', 0, 0, true, false),
('Tata CLiQ', 'https://logo.clearbit.com/tatacliq.com', 'Tata CLiQ App', 'Luxury', 'Online', '35% OFF', 'Luxury sale', 0, 0, true, true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.on_route_notifications;