import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserLocation {
  user_id: string;
  lat: number;
  lng: number;
}

interface Campaign {
  id: string;
  campaign_name: string;
  description: string | null;
  reward_type: string;
  reward_amount: number;
  geofence_center_lat: number;
  geofence_center_lng: number;
  geofence_radius_meters: number;
  end_time: string;
  target_tags: string[] | null;
  brand_account_id: string | null;
}

interface BrandDeal {
  id: string;
  brand_name: string;
  discount_text: string | null;
  description: string | null;
  location_lat: number | null;
  location_lng: number | null;
  store_name: string | null;
  category: string;
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, lat, lng } = await req.json() as UserLocation;

    if (!user_id || lat === undefined || lng === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing user_id, lat, or lng" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Divine Notification] Processing location for user ${user_id}: ${lat}, ${lng}`);

    // Check daily notification limit (max 3 per day)
    const { data: dailyCount } = await supabase
      .rpc('get_daily_notification_count', { p_user_id: user_id });

    if (dailyCount && dailyCount >= 3) {
      console.log(`[Divine Notification] Daily limit reached for user ${user_id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Daily notification limit reached",
          notifications_sent: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const remainingNotifications = 3 - (dailyCount || 0);

    // Get user's brand preferences from behavioral events
    const { data: userPreferences } = await supabase
      .from('behavioral_events')
      .select('metadata')
      .eq('user_id', user_id)
      .eq('event_type', 'like_post')
      .limit(100);

    const likedBrands = new Set<string>();
    userPreferences?.forEach(event => {
      if (event.metadata?.brand_name) {
        likedBrands.add(event.metadata.brand_name.toLowerCase());
      }
      if (event.metadata?.detected_brands) {
        (event.metadata.detected_brands as string[]).forEach(brand => {
          likedBrands.add(brand.toLowerCase());
        });
      }
    });

    // Get active campaigns within range
    const { data: campaigns } = await supabase
      .from('brand_campaigns')
      .select('*')
      .eq('status', 'active')
      .lte('start_time', new Date().toISOString())
      .gte('end_time', new Date().toISOString());

    // Get brand deals within range
    const { data: deals } = await supabase
      .from('brand_deals')
      .select('*')
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null)
      .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`);

    const notifications: any[] = [];
    const PROXIMITY_THRESHOLD = 100; // 100 meters

    // Check campaigns
    for (const campaign of (campaigns || []) as Campaign[]) {
      if (notifications.length >= remainingNotifications) break;

      const distance = calculateDistance(
        lat, lng,
        campaign.geofence_center_lat,
        campaign.geofence_center_lng
      );

      // Check if user is within the geofence or within proximity threshold
      const isInRange = distance <= Math.max(campaign.geofence_radius_meters, PROXIMITY_THRESHOLD);

      if (isInRange) {
        // Check if user has already been notified for this campaign recently
        const { data: existingNotification } = await supabase
          .from('divine_notifications')
          .select('id')
          .eq('user_id', user_id)
          .eq('campaign_id', campaign.id)
          .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (!existingNotification?.length) {
          // Generate personalized message
          const message = campaign.reward_type === 'mmora_points'
            ? `Post a selfie here and earn ${campaign.reward_amount} Mmora Points!`
            : `Earn $${campaign.reward_amount} by posting a selfie at this location!`;

          const notification = {
            user_id,
            notification_type: 'campaign_opportunity',
            title: `📍 ${campaign.campaign_name}`,
            message,
            campaign_id: campaign.id,
            location_lat: campaign.geofence_center_lat,
            location_lng: campaign.geofence_center_lng,
            distance_meters: Math.round(distance),
            reward_offered: campaign.reward_amount,
            expires_at: campaign.end_time
          };

          notifications.push(notification);
        }
      }
    }

    // Check brand deals
    for (const deal of (deals || []) as BrandDeal[]) {
      if (notifications.length >= remainingNotifications) break;
      if (!deal.location_lat || !deal.location_lng) continue;

      const distance = calculateDistance(lat, lng, deal.location_lat, deal.location_lng);

      if (distance <= PROXIMITY_THRESHOLD) {
        // Check user affinity for this brand
        const hasAffinity = likedBrands.has(deal.brand_name.toLowerCase()) ||
                           likedBrands.has(deal.category.toLowerCase());

        // Higher priority if user has shown interest
        if (hasAffinity || distance <= 50) {
          // Check if already notified
          const { data: existingNotification } = await supabase
            .from('divine_notifications')
            .select('id')
            .eq('user_id', user_id)
            .eq('deal_id', deal.id)
            .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .limit(1);

          if (!existingNotification?.length) {
            const direction = distance <= 20 ? "You're here!" : 
                            distance <= 50 ? "Just steps away" : 
                            "Turn right";

            const notification = {
              user_id,
              notification_type: 'deal_nearby',
              title: `🛍️ ${deal.brand_name} Deal`,
              message: `${direction}. ${deal.store_name || deal.brand_name} has ${deal.discount_text || 'a special offer'}! ${hasAffinity ? 'We know you love this brand!' : ''}`,
              deal_id: deal.id,
              brand_name: deal.brand_name,
              location_lat: deal.location_lat,
              location_lng: deal.location_lng,
              distance_meters: Math.round(distance)
            };

            notifications.push(notification);
          }
        }
      }
    }

    // Insert notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from('divine_notifications')
        .insert(notifications);

      if (insertError) {
        console.error('[Divine Notification] Insert error:', insertError);
        throw insertError;
      }

      console.log(`[Divine Notification] Sent ${notifications.length} notifications to user ${user_id}`);

      // Log behavioral event
      await supabase.from('behavioral_events').insert({
        user_id,
        event_type: 'divine_notification_received',
        event_category: 'monetization',
        context_snippet: `Received ${notifications.length} location-based notifications`,
        metadata: {
          notification_count: notifications.length,
          location: { lat, lng },
          notification_types: notifications.map(n => n.notification_type)
        },
        sentiment_score: 0.8
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications_sent: notifications.length,
        remaining_today: remainingNotifications - notifications.length,
        notifications: notifications.map(n => ({
          type: n.notification_type,
          title: n.title,
          message: n.message,
          distance: n.distance_meters
        }))
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("[Divine Notification] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
