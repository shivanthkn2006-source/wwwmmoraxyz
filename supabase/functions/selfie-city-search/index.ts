import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sovereignFetch, sovereignKey } from "../_shared/sovereign-ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SOVEREIGN_AI_KEY = sovereignKey();
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Indian brand categories with local brands
const INDIAN_BRAND_CATEGORIES = {
  fashion: [
    'Fabindia', 'Raymond', 'Peter England', 'Allen Solly', 'Van Heusen',
    'Biba', 'W for Woman', 'Global Desi', 'FBB', 'Manyavar',
    'Pantaloons', 'Westside', 'Lifestyle', 'Max Fashion', 'Reliance Trends',
    'Aurelia', 'Soch', 'Kalki Fashion', 'Indya', 'Label Ritu Kumar'
  ],
  electronics: [
    'Boat', 'Noise', 'Realme', 'OnePlus', 'Micromax',
    'Intex', 'Voltas', 'Godrej', 'Bajaj', 'Havells',
    'Crompton', 'Orient', 'Luminous', 'V-Guard', 'Syska',
    'iBall', 'Zebronics', 'Portronics', 'Ambrane', 'pTron'
  ],
  grocery: [
    'Tata Salt', 'Aashirvaad', 'Fortune', 'Patanjali', 'MDH',
    'Everest', 'Catch', 'Saffola', 'Haldiram', 'Bikaji',
    'Paper Boat', 'Raw Pressery', 'Amul', 'Mother Dairy', 'Britannia',
    'Parle', 'ITC', 'Dabur', 'Marico', 'Emami'
  ],
  beauty: [
    'Lakme', 'Biotique', 'Himalaya', 'Forest Essentials', 'Kama Ayurveda',
    'Colorbar', 'Sugar Cosmetics', 'Nykaa', 'Plum', 'Mamaearth',
    'WOW Skin Science', 'Khadi Natural', 'VLCC', 'Lotus Herbals', 'Shahnaz Husain',
    'Blue Heaven', 'Elle 18', 'Faces Canada', 'MyGlamm', 'Minimalist'
  ],
  food: [
    'Haldiram', 'Bikaji', 'Bikanervala', 'Sagar Ratna', 'Saravana Bhavan',
    'Café Coffee Day', 'Chaayos', 'Tea Post', 'Chai Point', 'Third Wave Coffee',
    'Faasos', 'Behrouz Biryani', 'Oven Story', 'EatFit', 'Freshmenu',
    'Rebel Foods', 'Box8', 'Licious', 'FreshToHome', 'Country Delight'
  ],
  home: [
    'Godrej Interio', 'Nilkamal', 'Urban Ladder', 'Pepperfry', 'HomeTown',
    'Durian', 'Sleepwell', 'Kurlon', 'Wipro Lighting', 'Philips India',
    'Jaipur Rugs', 'Fabindia Home', 'Chumbak', 'India Circus', 'Good Earth',
    'Asian Paints', 'Berger Paints', 'Nerolac', 'Dulux', 'Pidilite'
  ],
  health: [
    'Patanjali', 'Dabur', 'Himalaya', 'Zandu', 'Hamdard',
    'Baidyanath', 'Charak', 'Sri Sri Tattva', 'Organic India', 'Kapiva',
    'HealthKart', 'Healthvit', 'Muscleblaze', 'GNC India', 'Oziva',
    'Wellbeing Nutrition', 'Setu', 'Dr. Morepen', 'Mankind Pharma', 'Cipla'
  ],
  services: [
    'Urban Company', 'Housejoy', 'Sulekha', 'Just Dial', 'UrbanClap',
    'Portea', 'Curefit', 'Lenskart', 'Practo', 'PharmEasy',
    'BigBasket', 'Grofers', 'Dunzo', 'Swiggy', 'Zomato',
    'Ola', 'Rapido', 'Porter', 'Housejoy', 'BookMyShow'
  ],
  meals: [
    'McDonald\'s', 'KFC', 'Domino\'s', 'Pizza Hut', 'Subway',
    'Burger King', 'Wendy\'s', 'Taco Bell', 'Starbucks', 'Dunkin',
    'Haldiram', 'Saravana Bhavan', 'Bikanervala', 'Paradise Biryani', 'Karim\'s',
    'Chaayos', 'Café Coffee Day', 'Third Wave Coffee', 'Social', 'Smoke House Deli'
  ]
};

// Common meal/food keywords to detect food searches
const MEAL_KEYWORDS = ['meal', 'meals', 'food', 'eat', 'eating', 'restaurant', 'cafe', 'coffee', 
  'breakfast', 'lunch', 'dinner', 'snack', 'biryani', 'pizza', 'burger', 'chai', 'tea', 'dosa',
  'thali', 'curry', 'roti', 'naan', 'samosa', 'vada', 'idli', 'pav bhaji'];

// Generate random outlet timing
function generateOutletTiming(): { opens: string; closes: string; isOpen: boolean } {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Random opening hours between 7-11 AM
  const opensHour = 7 + Math.floor(Math.random() * 4);
  // Random closing hours between 9-11 PM
  const closesHour = 21 + Math.floor(Math.random() * 2);
  
  const isOpen = currentHour >= opensHour && currentHour < closesHour;
  
  return {
    opens: `${opensHour}:00 AM`,
    closes: `${closesHour > 12 ? closesHour - 12 : closesHour}:00 PM`,
    isOpen
  };
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Get real deals from database with location data
async function getLocationBasedDeals(query: string, userLocation?: { lat: number; lng: number }) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Search brand_deals table
    const { data: deals, error } = await supabase
      .from('brand_deals')
      .select('*')
      .or(`brand_name.ilike.%${query}%,category.ilike.%${query}%,subcategory.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(20);
    
    if (error) {
      console.error('[selfie-city-search] DB error:', error);
      return [];
    }
    
    // Transform deals with location and timing info
    return (deals || []).map(deal => {
      const timing = generateOutletTiming();
      const distance = userLocation && deal.location_lat && deal.location_lng
        ? calculateDistance(userLocation.lat, userLocation.lng, deal.location_lat, deal.location_lng)
        : null;
      
      return {
        type: 'offer' as const,
        name: deal.brand_name,
        brand: deal.brand_name,
        category: deal.category,
        subcategory: deal.subcategory,
        description: deal.description,
        discount: deal.discount_text,
        store_name: deal.store_name,
        location: {
          lat: deal.location_lat,
          lng: deal.location_lng,
          name: deal.store_name || `${deal.brand_name} Store`
        },
        timing: {
          opens: timing.opens,
          closes: timing.closes,
          isOpen: timing.isOpen,
          status: timing.isOpen ? 'Open Now' : 'Closed'
        },
        distance_km: distance ? Math.round(distance * 10) / 10 : null,
        distance_text: distance ? `${Math.round(distance * 10) / 10} km away` : null,
        relevance_score: distance ? Math.max(10, 100 - Math.floor(distance * 5)) : 80,
        is_premium: deal.is_premium,
        thumbnail: deal.brand_logo_url
      };
    }).sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
  } catch (err) {
    console.error('[selfie-city-search] getLocationBasedDeals error:', err);
    return [];
  }
}

// Search algorithm using Lovable AI - enhanced with location awareness
async function smartSearch(query: string, location?: { lat: number; lng: number }, userPreferences?: string[]) {
  // Check if it's a meal/food related search
  const isMealSearch = MEAL_KEYWORDS.some(kw => query.toLowerCase().includes(kw));
  
  const systemPrompt = `You are Zoe, the AI assistant for Selfie City - an AR commerce platform in India.
Your task is to search and find relevant products, brands, offers, and local sellers based on user queries.
${isMealSearch ? 'This appears to be a FOOD/MEAL search - prioritize restaurants, cafes, and food outlets.' : ''}

Available Indian brand categories:
${Object.entries(INDIAN_BRAND_CATEGORIES).map(([cat, brands]) => 
  `${cat.toUpperCase()}: ${brands.slice(0, 10).join(', ')}...`
).join('\n')}

User preferences: ${userPreferences?.join(', ') || 'None specified'}
Location context: ${location ? `Near coordinates ${location.lat}, ${location.lng} (India)` : 'Unknown location'}

IMPORTANT: For each result, include realistic location coordinates in India and outlet timing.

Respond with a JSON object containing:
{
  "results": [
    {
      "type": "brand" | "product" | "offer" | "seller" | "category" | "restaurant",
      "name": "Name",
      "brand": "Brand name if applicable",
      "category": "Category",
      "description": "Brief description",
      "price_range": "₹XXX - ₹XXX" (if known),
      "discount": "XX% off" (if applicable),
      "store_name": "Store/Outlet name",
      "location": {
        "lat": latitude (number between 18-28 for major Indian cities),
        "lng": longitude (number between 72-88 for major Indian cities),
        "name": "Location name"
      },
      "timing": {
        "opens": "9:00 AM",
        "closes": "10:00 PM",
        "isOpen": true/false,
        "status": "Open Now" or "Closed"
      },
      "relevance_score": 0-100,
      "tags": ["tag1", "tag2"]
    }
  ],
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "categories_matched": ["category1", "category2"],
  "zoe_insight": "A brief, helpful insight about the search"
}`;

  const response = await sovereignFetch('sovereign://chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SOVEREIGN_AI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Search query: "${query}"${isMealSearch ? ' (FOOD SEARCH - show restaurants and food outlets with locations and timing)' : ''}` }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[selfie-city-search] AI error:', response.status, errorText);
    throw new Error('AI search failed');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  // Parse JSON from response
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Calculate distances if user location provided
      if (location && parsed.results) {
        parsed.results = parsed.results.map((r: any) => {
          if (r.location?.lat && r.location?.lng) {
            const dist = calculateDistance(location.lat, location.lng, r.location.lat, r.location.lng);
            return {
              ...r,
              distance_km: Math.round(dist * 10) / 10,
              distance_text: `${Math.round(dist * 10) / 10} km away`
            };
          }
          return r;
        });
        
        // Sort by distance
        parsed.results.sort((a: any, b: any) => (a.distance_km || 999) - (b.distance_km || 999));
      }
      
      return parsed;
    }
  } catch (e) {
    console.error('[selfie-city-search] JSON parse error:', e);
  }
  
  // Fallback response
  return {
    results: [],
    suggestions: ['Try searching for a specific brand', 'Browse by category', 'Check nearby offers'],
    categories_matched: [],
    zoe_insight: 'I could not find specific results. Try a different search term.',
  };
}

// Quick local search without AI (for autocomplete) - returns 10 results
function quickLocalSearch(query: string): any[] {
  const q = query.toLowerCase();
  const results: any[] = [];
  
  for (const [category, brands] of Object.entries(INDIAN_BRAND_CATEGORIES)) {
    for (const brand of brands) {
      if (brand.toLowerCase().includes(q)) {
        results.push({
          type: 'brand',
          name: brand,
          category,
          relevance_score: brand.toLowerCase().startsWith(q) ? 100 : 70,
        });
      }
    }
  }
  
  // Add category matches
  for (const category of Object.keys(INDIAN_BRAND_CATEGORIES)) {
    if (category.toLowerCase().includes(q)) {
      results.push({
        type: 'category',
        name: category.charAt(0).toUpperCase() + category.slice(1),
        category,
        relevance_score: 90,
      });
    }
  }
  
  // Sort and return top 10
  return results.sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 10);
}

// Fallback search without Zoe/AI - works offline or when AI is unavailable
function fallbackSearch(query: string, location?: { lat: number; lng: number }): any {
  const q = query.toLowerCase();
  const results: any[] = [];
  
  // Check if meal search
  const isMealSearch = MEAL_KEYWORDS.some(kw => q.includes(kw));
  const searchCategories = isMealSearch ? ['food', 'meals'] : Object.keys(INDIAN_BRAND_CATEGORIES);
  
  // Search relevant categories
  for (const category of searchCategories) {
    const brands = (INDIAN_BRAND_CATEGORIES as any)[category] || [];
    for (const brand of brands) {
      if (brand.toLowerCase().includes(q) || category.includes(q) || isMealSearch) {
        const relevance = brand.toLowerCase().startsWith(q) ? 95 : 
                         brand.toLowerCase().includes(q) ? 80 : 60;
        
        // Generate mock location in India
        const mockLat = 18 + Math.random() * 10; // 18-28 (major cities)
        const mockLng = 72 + Math.random() * 16; // 72-88 (major cities)
        const timing = generateOutletTiming();
        const distance = location ? calculateDistance(location.lat, location.lng, mockLat, mockLng) : null;
        
        results.push({
          type: isMealSearch ? 'restaurant' : 'brand',
          name: brand,
          brand: brand,
          category: category.charAt(0).toUpperCase() + category.slice(1),
          description: `Popular ${category} ${isMealSearch ? 'outlet' : 'brand'} in India`,
          store_name: `${brand} ${['Mall', 'Express', 'Outlet', 'Store'][Math.floor(Math.random() * 4)]}`,
          location: {
            lat: mockLat,
            lng: mockLng,
            name: `${brand} - ${['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad'][Math.floor(Math.random() * 5)]}`
          },
          timing: {
            opens: timing.opens,
            closes: timing.closes,
            isOpen: timing.isOpen,
            status: timing.isOpen ? 'Open Now' : 'Closed'
          },
          distance_km: distance ? Math.round(distance * 10) / 10 : null,
          distance_text: distance ? `${Math.round(distance * 10) / 10} km away` : null,
          relevance_score: relevance,
        });
      }
    }
  }

  const sorted = results.sort((a, b) => {
    // Sort by distance first if available, then by relevance
    if (a.distance_km !== null && b.distance_km !== null) {
      return a.distance_km - b.distance_km;
    }
    return b.relevance_score - a.relevance_score;
  }).slice(0, 15);
  
  return {
    results: sorted,
    suggestions: ['Try nearby stores', 'Browse categories', 'Check trending products'],
    categories_matched: [...new Set(sorted.map(r => r.category))],
    zoe_insight: sorted.length > 0 
      ? `Found ${sorted.length} ${isMealSearch ? 'food outlets' : 'matches'} for "${query}"${location ? ' near you' : ''} (offline mode)` 
      : 'No results found. Try a different search term.',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const authClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const authToken = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authToken);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { query, location, preferences, mode, useZoe = true } = await req.json();
    
    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[selfie-city-search] Query:', query, 'Mode:', mode, 'UseZoe:', useZoe, 'Location:', location);

    // Quick mode for autocomplete (always local, no AI)
    if (mode === 'quick') {
      const results = quickLocalSearch(query);
      return new Response(
        JSON.stringify({ results, suggestions: [], categories_matched: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to get real deals from database first
    const dbDeals = await getLocationBasedDeals(query, location);

    // Check if Zoe/AI should be used
    if (!useZoe || !SOVEREIGN_AI_KEY) {
      console.log('[selfie-city-search] Using fallback search (Zoe unavailable)');
      const fallbackResults = fallbackSearch(query, location);
      // Merge with DB deals
      fallbackResults.results = [...dbDeals, ...fallbackResults.results].slice(0, 15);
      return new Response(
        JSON.stringify(fallbackResults),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Full AI-powered search with Zoe
    try {
      const searchResults = await smartSearch(query, location, preferences);
      // Merge with DB deals (prioritize real deals)
      if (dbDeals.length > 0) {
        searchResults.results = [...dbDeals, ...(searchResults.results || [])].slice(0, 20);
      }
      return new Response(
        JSON.stringify(searchResults),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (aiError) {
      // Fallback if AI fails
      console.error('[selfie-city-search] AI failed, using fallback:', aiError);
      const fallbackResults = fallbackSearch(query, location);
      fallbackResults.results = [...dbDeals, ...fallbackResults.results].slice(0, 15);
      return new Response(
        JSON.stringify(fallbackResults),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[selfie-city-search] Error:', error);
    // Even on error, try fallback
    try {
      const body = await req.clone().json();
      if (body.query) {
        const fallbackResults = fallbackSearch(body.query, body.location);
        return new Response(
          JSON.stringify(fallbackResults),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch {}
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Search failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
