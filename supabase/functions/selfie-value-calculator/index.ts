import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sovereignFetch, sovereignKey } from "../_shared/sovereign-ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectedBrand {
  name: string;
  category: string;
  confidence: number;
  isPremium: boolean;
}

interface SponsorshipResult {
  sponsorshipScore: number;
  isPremiumAdSpace: boolean;
  detectedBrands: DetectedBrand[];
  zoneBonus: number;
  influenceBonus: number;
  brandNotifications: string[];
}

// Premium brand list with higher value
const PREMIUM_BRANDS = [
  'Nike', 'Adidas', 'Gucci', 'Louis Vuitton', 'Chanel', 'Prada', 'Hermès',
  'Apple', 'Samsung', 'Rolex', 'Omega', 'Ray-Ban', 'Oakley', 'Versace',
  'Balenciaga', 'Off-White', 'Supreme', 'Yeezy', 'Jordan', 'Dior',
  'Burberry', 'Fendi', 'Cartier', 'Tiffany', 'Valentino', 'Givenchy'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = sovereignKey();
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { pinId, imageUrl, userId, location } = await req.json();

    if (!pinId || !imageUrl) {
      return new Response(JSON.stringify({ error: 'Missing pinId or imageUrl' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Project Midas] Calculating value for pin:', pinId);

    // Step 1: Use Gemini Vision to detect brands in the image
    let detectedBrands: DetectedBrand[] = [];
    
    if (lovableApiKey) {
      try {
        const visionResponse = await sovereignFetch('sovereign://chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `You are a brand detection AI for Project Midas. Analyze images and identify visible brands, logos, and products.
                
Return ONLY a valid JSON array with this structure:
[{"name": "Brand Name", "category": "category", "confidence": 0.95, "isPremium": true}]

Categories: fashion, electronics, accessories, footwear, eyewear, jewelry, automotive, food_beverage, sports, beauty
isPremium should be true for luxury/high-end brands.
If no brands detected, return: []`
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Analyze this selfie image. Identify ALL visible brand names, logos, and branded products. List each brand with confidence score.'
                  },
                  {
                    type: 'image_url',
                    image_url: { url: imageUrl }
                  }
                ]
              }
            ],
            max_tokens: 1000,
          }),
        });

        if (visionResponse.ok) {
          const visionData = await visionResponse.json();
          const content = visionData.choices?.[0]?.message?.content || '[]';
          
          // Parse the JSON response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            detectedBrands = JSON.parse(jsonMatch[0]);
            console.log('[Project Midas] Detected brands:', detectedBrands);
          }
        }
      } catch (visionError) {
        console.error('[Project Midas] Vision analysis error:', visionError);
      }
    }

    // Step 2: Check if location is in a High Value Zone
    let zoneBonus = 0;
    let zoneName = '';
    
    if (location?.lat && location?.lng) {
      const { data: zones } = await supabase
        .from('high_value_zones')
        .select('*')
        .eq('is_active', true);

      if (zones) {
        for (const zone of zones) {
          const distance = calculateDistance(
            location.lat, 
            location.lng, 
            parseFloat(zone.location_lat), 
            parseFloat(zone.location_lng)
          );
          
          if (distance <= zone.radius_meters) {
            zoneBonus = Math.max(zoneBonus, (zone.value_multiplier - 1) * 20);
            zoneName = zone.zone_name;
            console.log(`[Project Midas] In high-value zone: ${zone.zone_name}, bonus: ${zoneBonus}`);
            break;
          }
        }
      }
    }

    // Step 3: Calculate influence score from user profile
    let influenceBonus = 0;
    
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profile) {
        // Check for badges (indicates engagement)
        const { count: badgeCount } = await supabase
          .from('user_badges')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        // Check post engagement
        const { data: posts } = await supabase
          .from('posts')
          .select('id')
          .eq('user_id', userId);
        
        const postCount = posts?.length || 0;

        // Calculate influence based on activity
        influenceBonus = Math.min(
          30,
          (badgeCount || 0) * 2 + Math.min(postCount, 10) * 1.5
        );
        
        console.log(`[Project Midas] Influence bonus: ${influenceBonus} (badges: ${badgeCount}, posts: ${postCount})`);
      }
    }

    // Step 4: Calculate final Sponsorship Score
    let baseScore = 20; // Everyone starts with 20

    // Brand detection score (up to 40 points)
    const brandScore = detectedBrands.reduce((acc, brand) => {
      const isPremiumBrand = PREMIUM_BRANDS.some(
        pb => brand.name.toLowerCase().includes(pb.toLowerCase())
      ) || brand.isPremium;
      
      return acc + (isPremiumBrand ? 15 : 8) * brand.confidence;
    }, 0);
    
    const brandBonus = Math.min(40, brandScore);

    // Final score calculation
    const sponsorshipScore = Math.round(
      Math.min(100, baseScore + brandBonus + zoneBonus + influenceBonus)
    );

    const isPremiumAdSpace = sponsorshipScore >= 80;

    console.log(`[Project Midas] Final Score: ${sponsorshipScore} (base: ${baseScore}, brands: ${brandBonus}, zone: ${zoneBonus}, influence: ${influenceBonus})`);

    // Step 5: Update the pin with sponsorship data
    await supabase
      .from('selfie_city_pins')
      .update({
        sponsorship_score: sponsorshipScore,
        is_premium_ad_space: isPremiumAdSpace,
        detected_brands: detectedBrands,
        value_calculated_at: new Date().toISOString(),
      })
      .eq('id', pinId);

    // Step 6: If Premium Ad Space, notify relevant brands
    const brandNotifications: string[] = [];
    
    if (isPremiumAdSpace && detectedBrands.length > 0) {
      console.log('[Project Midas] 🌟 Premium Ad Space detected! Notifying brands...');
      
      for (const brand of detectedBrands) {
        // Check if brand has an account
        const { data: brandAccount } = await supabase
          .from('brand_accounts')
          .select('*')
          .ilike('brand_name', `%${brand.name}%`)
          .eq('is_verified', true)
          .single();

        // Create sponsorship alert
        await supabase
          .from('brand_sponsorship_alerts')
          .insert({
            pin_id: pinId,
            brand_name: brand.name,
            brand_category: brand.category,
            user_id: userId,
            sponsorship_score: sponsorshipScore,
            location_name: zoneName || location?.name || 'Unknown',
            status: 'pending',
            claimed_by_brand_id: brandAccount?.id || null,
          });

        brandNotifications.push(brand.name);

        // If brand has webhook, notify them
        if (brandAccount?.notification_webhook) {
          try {
            await fetch(brandAccount.notification_webhook, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'premium_ad_space',
                pinId,
                imageUrl,
                sponsorshipScore,
                location: zoneName || location?.name,
                timestamp: new Date().toISOString(),
              }),
            });
            console.log(`[Project Midas] Notified ${brand.name} via webhook`);
          } catch (webhookError) {
            console.error(`[Project Midas] Webhook notification failed for ${brand.name}:`, webhookError);
          }
        }
      }

      // Mark pin as notified
      await supabase
        .from('selfie_city_pins')
        .update({ brand_notifications_sent: true })
        .eq('id', pinId);
    }

    // Log behavioral event
    await supabase.from('behavioral_events').insert({
      user_id: userId,
      event_type: 'selfie_value_calculated',
      event_category: 'monetization',
      context_snippet: `Sponsorship score: ${sponsorshipScore}, Brands: ${detectedBrands.map(b => b.name).join(', ')}`,
      metadata: {
        pin_id: pinId,
        sponsorship_score: sponsorshipScore,
        is_premium: isPremiumAdSpace,
        brands_detected: detectedBrands.length,
        zone_bonus: zoneBonus,
        influence_bonus: influenceBonus,
      },
      sentiment_score: isPremiumAdSpace ? 0.9 : 0.6,
    });

    const result: SponsorshipResult = {
      sponsorshipScore,
      isPremiumAdSpace,
      detectedBrands,
      zoneBonus,
      influenceBonus,
      brandNotifications,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Project Midas] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
