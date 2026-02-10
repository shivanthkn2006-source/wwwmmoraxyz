// ═══════════════════════════════════════════════════════════════════════════════
// SELFIE CITY ON-ROUTE ENGINE - Edge Function
// Analyzes user location + preferences + nearby deals
// Returns personalized notifications with brand logos
// Integrates with Zoe for emotional context-aware timing
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocationData {
  lat: number;
  lng: number;
}

interface BrandDeal {
  id: string;
  brand_name: string;
  brand_logo_url?: string;
  store_name?: string;
  category: string;
  subcategory?: string;
  discount_text?: string;
  description?: string;
  location_lat: number;
  location_lng: number;
  is_online: boolean;
  is_premium: boolean;
  valid_until?: string;
}

// Calculate distance between two coordinates in meters
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate direction
function calculateDirection(lat1: number, lng1: number, lat2: number, lng2: number): 'left' | 'right' | 'ahead' {
  const dLon = (lng2 - lng1);
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  
  if (bearing >= -30 && bearing <= 30) return 'ahead';
  if (bearing > 30 && bearing < 150) return 'right';
  return 'left';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token and verify user (optional - return empty if not authenticated)
    const authHeader = req.headers.get('Authorization');
    let user = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data, error: authError } = await supabase.auth.getUser(token);
      if (!authError && data?.user) {
        user = data.user;
      }
    }
    
    // If no authenticated user, return empty notifications gracefully
    if (!user) {
      console.log('[OnRoute] No authenticated user, returning empty notifications');
      return new Response(
        JSON.stringify({
          success: true,
          notifications: [],
          meta: { total_scanned: 0, within_radius: 0, returned: 0, is_premium_user: false, radius: 500 },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { location, radius = 500, limit = 10 }: { 
      location: LocationData; 
      radius?: number; 
      limit?: number;
    } = await req.json();

    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Invalid location data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[OnRoute] Processing request for user ${user.id} at ${location.lat},${location.lng}`);

    // Get user profile for premium check
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_tier, total_points')
      .eq('user_id', user.id)
      .single();

    const isPremiumUser = profile?.current_tier === 'Diamond' || 
                          profile?.current_tier === 'Platinum' ||
                          (profile?.total_points || 0) > 10000;

    // Get user brand preferences
    const { data: preferences } = await supabase
      .from('user_brand_preferences')
      .select('brand_name, affinity_score')
      .eq('user_id', user.id);

    const preferenceMap = new Map(
      (preferences || []).map(p => [p.brand_name.toLowerCase(), p.affinity_score])
    );

    // Get recently shown notifications (to avoid duplicates)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentNotifications } = await supabase
      .from('on_route_notifications')
      .select('deal_id')
      .eq('user_id', user.id)
      .gte('shown_at', oneHourAgo);

    const recentDealIds = new Set((recentNotifications || []).map(n => n.deal_id));

    // Get all active deals
    const { data: allDeals } = await supabase
      .from('brand_deals')
      .select('*')
      .eq('is_online', false)
      .or('valid_until.is.null,valid_until.gt.now()');

    // Filter and score deals
    const notifications: any[] = [];
    
    for (const deal of (allDeals || []) as BrandDeal[]) {
      // Skip if no location
      if (!deal.location_lat || !deal.location_lng) continue;
      
      // Skip if premium deal and user is not premium
      if (deal.is_premium && !isPremiumUser) continue;
      
      // Skip if recently shown
      if (recentDealIds.has(deal.id)) continue;
      
      // Calculate distance
      const distance = calculateDistance(
        location.lat, location.lng,
        deal.location_lat, deal.location_lng
      );
      
      // Skip if outside radius
      if (distance > radius) continue;
      
      // Calculate personalization score
      const affinityScore = preferenceMap.get(deal.brand_name.toLowerCase()) || 0;
      const distanceScore = 1 - (distance / radius); // Closer = higher score
      const premiumBonus = deal.is_premium ? 0.2 : 0;
      
      const totalScore = (affinityScore * 0.4) + (distanceScore * 0.4) + premiumBonus;
      
      const direction = calculateDirection(
        location.lat, location.lng,
        deal.location_lat, deal.location_lng
      );
      
      notifications.push({
        id: deal.id,
        type: deal.is_premium ? 'premium' : 'deal',
        title: deal.discount_text || 'Special Offer',
        description: deal.description || `Check out ${deal.brand_name}`,
        brandName: deal.brand_name,
        brandLogo: deal.brand_logo_url,
        storeName: deal.store_name,
        distance: Math.round(distance),
        direction,
        discount: deal.discount_text,
        category: deal.category,
        subcategory: deal.subcategory,
        isPremium: deal.is_premium,
        validUntil: deal.valid_until,
        score: totalScore,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Sort by score and limit
    notifications.sort((a, b) => b.score - a.score);
    const topNotifications = notifications.slice(0, limit);
    
    // Log to behavioral events
    if (topNotifications.length > 0) {
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: 'on_route_scan',
        event_category: 'ar_commerce',
        context_snippet: `Found ${topNotifications.length} deals within ${radius}m`,
        metadata: {
          location,
          radius,
          deals_found: topNotifications.length,
          is_premium_user: isPremiumUser,
        },
        dhf_logged: true,
      });
    }
    
    // Record route history
    await supabase.from('user_route_history').insert({
      user_id: user.id,
      location_lat: location.lat,
      location_lng: location.lng,
    });

    console.log(`[OnRoute] Returning ${topNotifications.length} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        notifications: topNotifications,
        meta: {
          total_scanned: allDeals?.length || 0,
          within_radius: notifications.length,
          returned: topNotifications.length,
          is_premium_user: isPremiumUser,
          radius,
        },
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[OnRoute] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
