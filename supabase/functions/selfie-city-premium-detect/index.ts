// ═══════════════════════════════════════════════════════════════════════════════
// SELFIE CITY PREMIUM DETECTION - Edge Function
// Detects premium users based on:
// - Detected luxury brands in selfies
// - Premium store visits
// - High-value product interactions
// - Celebrity/VIP status
// Returns premium score and upgrades user tier if threshold met
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Luxury brand categories with premium scores
const LUXURY_BRANDS: Record<string, { tier: 'ultra' | 'high' | 'premium'; score: number }> = {
  // Ultra Luxury (Score: 100)
  'louis vuitton': { tier: 'ultra', score: 100 },
  'hermès': { tier: 'ultra', score: 100 },
  'hermes': { tier: 'ultra', score: 100 },
  'chanel': { tier: 'ultra', score: 100 },
  'rolls royce': { tier: 'ultra', score: 100 },
  'bentley': { tier: 'ultra', score: 100 },
  'patek philippe': { tier: 'ultra', score: 100 },
  'richard mille': { tier: 'ultra', score: 100 },
  
  // High Luxury (Score: 80)
  'gucci': { tier: 'high', score: 80 },
  'prada': { tier: 'high', score: 80 },
  'dior': { tier: 'high', score: 80 },
  'versace': { tier: 'high', score: 80 },
  'burberry': { tier: 'high', score: 80 },
  'rolex': { tier: 'high', score: 80 },
  'omega': { tier: 'high', score: 80 },
  'cartier': { tier: 'high', score: 80 },
  'tiffany': { tier: 'high', score: 80 },
  'bmw': { tier: 'high', score: 80 },
  'mercedes': { tier: 'high', score: 80 },
  'mercedes-benz': { tier: 'high', score: 80 },
  'audi': { tier: 'high', score: 80 },
  'porsche': { tier: 'high', score: 80 },
  'jaguar': { tier: 'high', score: 80 },
  'land rover': { tier: 'high', score: 80 },
  'range rover': { tier: 'high', score: 80 },
  
  // Premium (Score: 50)
  'michael kors': { tier: 'premium', score: 50 },
  'coach': { tier: 'premium', score: 50 },
  'kate spade': { tier: 'premium', score: 50 },
  'ralph lauren': { tier: 'premium', score: 50 },
  'tommy hilfiger': { tier: 'premium', score: 50 },
  'hugo boss': { tier: 'premium', score: 50 },
  'tag heuer': { tier: 'premium', score: 50 },
  'apple': { tier: 'premium', score: 50 },
  'samsung premium': { tier: 'premium', score: 50 },
  'bose': { tier: 'premium', score: 50 },
  'bang & olufsen': { tier: 'premium', score: 50 },
  'volvo': { tier: 'premium', score: 50 },
  'lexus': { tier: 'premium', score: 50 },
  'infiniti': { tier: 'premium', score: 50 },
};

// Premium tier thresholds
const TIER_THRESHOLDS = {
  diamond: 500,
  platinum: 300,
  gold: 150,
  silver: 50,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action } = body;

    console.log(`[PremiumDetect] Processing ${action} for user ${user.id}`);

    switch (action) {
      case 'analyze_products': {
        const { products }: { products: Array<{ name?: string; brand?: string; category?: string }> } = body;
        
        if (!products?.length) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              is_premium: false, 
              score: 0,
              detected_luxury: [],
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        let totalScore = 0;
        const detectedLuxury: Array<{ brand: string; tier: string; score: number }> = [];

        for (const product of products) {
          const brandName = (product.brand || product.name || '').toLowerCase();
          
          for (const [luxury, info] of Object.entries(LUXURY_BRANDS)) {
            if (brandName.includes(luxury)) {
              totalScore += info.score;
              detectedLuxury.push({
                brand: luxury,
                tier: info.tier,
                score: info.score,
              });
              break;
            }
          }
        }

        const isPremium = totalScore >= TIER_THRESHOLDS.silver;
        
        // Determine tier
        let suggestedTier = null;
        if (totalScore >= TIER_THRESHOLDS.diamond) suggestedTier = 'Diamond';
        else if (totalScore >= TIER_THRESHOLDS.platinum) suggestedTier = 'Platinum';
        else if (totalScore >= TIER_THRESHOLDS.gold) suggestedTier = 'Gold';
        else if (totalScore >= TIER_THRESHOLDS.silver) suggestedTier = 'Silver';

        // Log detection event
        if (detectedLuxury.length > 0) {
          await supabase.from('behavioral_events').insert({
            user_id: user.id,
            event_type: 'premium_detection',
            event_category: 'ar_commerce',
            context_snippet: `Detected ${detectedLuxury.length} luxury items, score: ${totalScore}`,
            metadata: {
              total_score: totalScore,
              detected_luxury: detectedLuxury,
              suggested_tier: suggestedTier,
            },
            dhf_logged: true,
          });
        }

        return new Response(
          JSON.stringify({
            success: true,
            is_premium: isPremium,
            score: totalScore,
            detected_luxury: detectedLuxury,
            suggested_tier: suggestedTier,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'calculate_premium_score': {
        // Get all user's detected products from selfie pins
        const { data: pins } = await supabase
          .from('selfie_city_pins')
          .select('detected_products')
          .eq('user_id', user.id);

        // Get brand preferences
        const { data: preferences } = await supabase
          .from('user_brand_preferences')
          .select('brand_name, affinity_score')
          .eq('user_id', user.id);

        let totalScore = 0;
        const luxuryBrandsFound = new Set<string>();

        // Analyze selfie products
        for (const pin of pins || []) {
          const products = pin.detected_products || [];
          for (const product of products) {
            const brandName = (product.brand || product.name || '').toLowerCase();
            
            for (const [luxury, info] of Object.entries(LUXURY_BRANDS)) {
              if (brandName.includes(luxury) && !luxuryBrandsFound.has(luxury)) {
                totalScore += info.score;
                luxuryBrandsFound.add(luxury);
              }
            }
          }
        }

        // Add points from brand preferences
        for (const pref of preferences || []) {
          const brandLower = pref.brand_name.toLowerCase();
          const luxuryInfo = Object.entries(LUXURY_BRANDS).find(([name]) => 
            brandLower.includes(name)
          );
          
          if (luxuryInfo) {
            totalScore += Math.min(pref.affinity_score, luxuryInfo[1].score);
          }
        }

        // Determine tier
        let newTier = null;
        if (totalScore >= TIER_THRESHOLDS.diamond) newTier = 'Diamond';
        else if (totalScore >= TIER_THRESHOLDS.platinum) newTier = 'Platinum';
        else if (totalScore >= TIER_THRESHOLDS.gold) newTier = 'Gold';
        else if (totalScore >= TIER_THRESHOLDS.silver) newTier = 'Silver';

        // Get current tier
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_tier, total_points')
          .eq('user_id', user.id)
          .single();

        const tierRank = { Diamond: 4, Platinum: 3, Gold: 2, Silver: 1, Bronze: 0 };
        const currentRank = tierRank[profile?.current_tier as keyof typeof tierRank] || 0;
        const newRank = tierRank[newTier as keyof typeof tierRank] || 0;

        // Upgrade tier if higher
        let tierUpgraded = false;
        if (newRank > currentRank) {
          await supabase
            .from('profiles')
            .update({ 
              current_tier: newTier,
              total_points: Math.max(profile?.total_points || 0, totalScore * 100),
            })
            .eq('user_id', user.id);
          
          tierUpgraded = true;

          // Log tier upgrade
          await supabase.from('behavioral_events').insert({
            user_id: user.id,
            event_type: 'premium_tier_upgrade',
            event_category: 'ar_commerce',
            context_snippet: `Upgraded from ${profile?.current_tier || 'None'} to ${newTier}`,
            metadata: {
              previous_tier: profile?.current_tier,
              new_tier: newTier,
              total_score: totalScore,
              luxury_brands: Array.from(luxuryBrandsFound),
            },
            dhf_logged: true,
          });
        }

        return new Response(
          JSON.stringify({
            success: true,
            total_score: totalScore,
            luxury_brands_detected: Array.from(luxuryBrandsFound),
            current_tier: profile?.current_tier,
            calculated_tier: newTier,
            tier_upgraded: tierUpgraded,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'check_premium_status': {
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_tier, total_points, username')
          .eq('user_id', user.id)
          .single();

        const isPremium = ['Diamond', 'Platinum', 'Gold'].includes(profile?.current_tier || '');
        
        // VIP users
        const vipUsers = ['moksh50', 'Justmkbhd'];
        const isVIP = vipUsers.includes(profile?.username || '');

        return new Response(
          JSON.stringify({
            success: true,
            is_premium: isPremium || isVIP,
            is_vip: isVIP,
            current_tier: profile?.current_tier,
            total_points: profile?.total_points,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('[PremiumDetect] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
