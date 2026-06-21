// ═══════════════════════════════════════════════════════════════════════════════
// SELFIE CITY BRAND LEARNING - Edge Function
// Learns user brand preferences from:
// - Selfie product tags
// - Deal interactions
// - Route history
// - Purchase patterns
// Updates user_brand_preferences table with affinity scores
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InteractionData {
  brand_name: string;
  category?: string;
  interaction_type: 'view' | 'click' | 'save' | 'purchase' | 'selfie_tag';
  deal_id?: string;
  product_data?: any;
}

const SCORE_WEIGHTS = {
  view: 1,
  click: 3,
  save: 5,
  purchase: 10,
  selfie_tag: 8, // High score for actually wearing/owning the brand
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

    console.log(`[BrandLearning] Processing ${action} for user ${user.id}`);

    switch (action) {
      case 'record_interaction': {
        const { interaction }: { interaction: InteractionData } = body;
        
        if (!interaction?.brand_name) {
          return new Response(
            JSON.stringify({ error: 'Missing brand_name' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const score = SCORE_WEIGHTS[interaction.interaction_type] || 1;
        
        // Upsert preference
        const { data, error } = await supabase
          .from('user_brand_preferences')
          .upsert({
            user_id: user.id,
            brand_name: interaction.brand_name,
            category: interaction.category || 'General',
            affinity_score: score,
            interaction_count: 1,
            last_interaction: new Date().toISOString(),
          }, {
            onConflict: 'user_id,brand_name',
          })
          .select();

        // If already exists, increment the score
        if (!error) {
          // Update existing preference with incremented values
          await supabase
            .from('user_brand_preferences')
            .update({
              affinity_score: score,
              interaction_count: 1,
              last_interaction: new Date().toISOString(),
            })
            .eq('user_id', user.id)
            .eq('brand_name', interaction.brand_name);
        }

        // Log behavioral event
        await supabase.from('behavioral_events').insert({
          user_id: user.id,
          event_type: 'brand_preference_update',
          event_category: 'ar_commerce',
          context_snippet: `${interaction.interaction_type}: ${interaction.brand_name}`,
          metadata: interaction,
          dhf_logged: true,
        });

        return new Response(
          JSON.stringify({ success: true, score_added: score }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'batch_record': {
        const { interactions }: { interactions: InteractionData[] } = body;
        
        if (!interactions?.length) {
          return new Response(
            JSON.stringify({ error: 'No interactions provided' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        let totalScore = 0;
        const brandUpdates = new Map<string, { score: number; category: string }>();

        for (const interaction of interactions) {
          if (!interaction.brand_name) continue;
          
          const score = SCORE_WEIGHTS[interaction.interaction_type] || 1;
          const existing = brandUpdates.get(interaction.brand_name.toLowerCase());
          
          brandUpdates.set(interaction.brand_name.toLowerCase(), {
            score: (existing?.score || 0) + score,
            category: interaction.category || existing?.category || 'General',
          });
          
          totalScore += score;
        }

        // Batch upsert
        const upsertData = Array.from(brandUpdates.entries()).map(([brand, data]) => ({
          user_id: user.id,
          brand_name: brand,
          category: data.category,
          affinity_score: data.score,
          interaction_count: 1,
          last_interaction: new Date().toISOString(),
        }));

        await supabase.from('user_brand_preferences').upsert(upsertData, {
          onConflict: 'user_id,brand_name',
        });

        // Log behavioral event
        await supabase.from('behavioral_events').insert({
          user_id: user.id,
          event_type: 'brand_batch_update',
          event_category: 'ar_commerce',
          context_snippet: `Updated ${brandUpdates.size} brands, total score: ${totalScore}`,
          metadata: { brands_updated: brandUpdates.size, total_score: totalScore },
          dhf_logged: true,
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            brands_updated: brandUpdates.size,
            total_score_added: totalScore,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_preferences': {
        const { limit = 20, category } = body;
        
        let query = supabase
          .from('user_brand_preferences')
          .select('*')
          .eq('user_id', user.id)
          .order('affinity_score', { ascending: false })
          .limit(limit);

        if (category) {
          query = query.eq('category', category);
        }

        const { data: preferences, error } = await query;

        if (error) {
          throw error;
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            preferences: preferences || [],
            count: preferences?.length || 0,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_recommendations': {
        const { category, limit = 5 } = body;

        // Get user's top preferences
        const { data: preferences } = await supabase
          .from('user_brand_preferences')
          .select('brand_name, category, affinity_score')
          .eq('user_id', user.id)
          .order('affinity_score', { ascending: false })
          .limit(10);

        const topCategories = [...new Set(preferences?.map(p => p.category) || [])];

        // Get deals in those categories
        let query = supabase
          .from('brand_deals')
          .select('*')
          .or('valid_until.is.null,valid_until.gt.now()');

        if (category) {
          query = query.eq('category', category);
        } else if (topCategories.length > 0) {
          query = query.in('category', topCategories);
        }

        const { data: deals } = await query.limit(limit * 2);

        // Score and sort deals
        const scoredDeals = (deals || []).map(deal => {
          const pref = preferences?.find(p => 
            p.brand_name.toLowerCase() === deal.brand_name.toLowerCase()
          );
          return {
            ...deal,
            recommendation_score: pref?.affinity_score || 0,
          };
        });

        scoredDeals.sort((a, b) => b.recommendation_score - a.recommendation_score);

        return new Response(
          JSON.stringify({
            success: true,
            recommendations: scoredDeals.slice(0, limit),
            based_on_categories: topCategories,
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
    console.error('[BrandLearning] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
