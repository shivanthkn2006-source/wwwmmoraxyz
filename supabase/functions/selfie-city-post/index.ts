import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      imageUrl, 
      caption, 
      location, 
      detectedProducts, 
      isPremium 
    } = await req.json();

    console.log('[Selfie City Post] Creating selfie pin for user:', user.id);

    // Get user profile for display name
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username, profile_photo_url')
      .eq('user_id', user.id)
      .single();

    // Create the selfie pin in selfie_city_pins table
    const { data: pin, error: pinError } = await supabase
      .from('selfie_city_pins')
      .insert({
        user_id: user.id,
        image_url: imageUrl,
        caption: caption || 'Check out what I\'m wearing! 📍',
        location_lat: location?.lat,
        location_lng: location?.lng,
        location_name: location?.name || 'Selfie City Pin',
        detected_products: detectedProducts || [],
        is_premium: isPremium || false,
        likes_count: 0,
        views_count: 0,
      })
      .select()
      .single();

    if (pinError) {
      console.error('[Selfie City Post] Error creating pin:', pinError);
      throw pinError;
    }

    const post = pin; // Alias for backward compatibility

    console.log('[Selfie City Post] Post created:', post.id);

    // Log behavioral event for Zoe learning
    await supabase.from('behavioral_events').insert({
      user_id: user.id,
      event_type: 'selfie_city_post',
      event_category: 'content_creation',
      context_snippet: `Posted selfie with ${detectedProducts?.length || 0} tagged products`,
      metadata: {
        post_id: post.id,
        products_count: detectedProducts?.length || 0,
        has_location: !!location,
        is_premium: isPremium
      },
      sentiment_score: 0.8
    });

    // 🌟 PROJECT MIDAS: Trigger sponsorship value calculation asynchronously
    console.log('[Selfie City Post] Triggering Project Midas value calculation...');
    
    // Fire and forget - don't wait for this to complete
    fetch(`${supabaseUrl}/functions/v1/selfie-value-calculator`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pinId: post.id,
        imageUrl,
        userId: user.id,
        location: {
          lat: location?.lat,
          lng: location?.lng,
          name: location?.name,
        },
      }),
    }).then(res => {
      if (res.ok) {
        console.log('[Selfie City Post] Project Midas calculation triggered successfully');
      } else {
        console.error('[Selfie City Post] Project Midas calculation failed:', res.status);
      }
    }).catch(err => {
      console.error('[Selfie City Post] Project Midas trigger error:', err);
    });

    return new Response(JSON.stringify({ 
      success: true,
      post: {
        id: post.id,
        imageUrl,
        caption,
        location,
        userName: profile?.display_name || profile?.username || 'Anonymous',
        avatarUrl: profile?.profile_photo_url,
        detectedProducts,
        isPremium,
        createdAt: post.created_at
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Selfie City Post] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
