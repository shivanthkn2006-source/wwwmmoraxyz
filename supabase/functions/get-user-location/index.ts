import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default locations for major Indian cities
const INDIAN_CITIES: Record<string, { lat: number; lng: number; name: string }> = {
  'delhi': { lat: 28.6139, lng: 77.2090, name: 'New Delhi' },
  'mumbai': { lat: 19.0760, lng: 72.8777, name: 'Mumbai' },
  'bangalore': { lat: 12.9716, lng: 77.5946, name: 'Bangalore' },
  'chennai': { lat: 13.0827, lng: 80.2707, name: 'Chennai' },
  'kolkata': { lat: 22.5726, lng: 88.3639, name: 'Kolkata' },
  'hyderabad': { lat: 17.3850, lng: 78.4867, name: 'Hyderabad' },
  'pune': { lat: 18.5204, lng: 73.8567, name: 'Pune' },
  'ahmedabad': { lat: 23.0225, lng: 72.5714, name: 'Ahmedabad' },
  'jaipur': { lat: 26.9124, lng: 75.7873, name: 'Jaipur' },
  'lucknow': { lat: 26.8467, lng: 80.9462, name: 'Lucknow' },
  'kochi': { lat: 9.9312, lng: 76.2673, name: 'Kochi' },
  'trivandrum': { lat: 8.5241, lng: 76.9366, name: 'Thiruvananthapuram' },
  'kozhikode': { lat: 11.2588, lng: 75.7804, name: 'Kozhikode' },
  'surat': { lat: 21.1702, lng: 72.8311, name: 'Surat' },
  'goa': { lat: 15.2993, lng: 74.1240, name: 'Goa' },
};

// Default fallback location (Center of India)
const DEFAULT_LOCATION = { lat: 20.5937, lng: 78.9629, name: 'India', city: 'unknown' };

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP from headers
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || '';
    
    console.log('[get-user-location] Client IP:', clientIp);

    // Try to get location from IP using free IP geolocation API
    if (clientIp && clientIp !== '127.0.0.1' && !clientIp.startsWith('192.168')) {
      try {
        const geoResponse = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,country,regionName,city,lat,lon`);
        const geoData = await geoResponse.json();
        
        if (geoData.status === 'success' && geoData.lat && geoData.lon) {
          console.log('[get-user-location] IP geolocation success:', geoData.city);
          return new Response(
            JSON.stringify({
              lat: geoData.lat,
              lng: geoData.lon,
              city: geoData.city || 'Unknown',
              region: geoData.regionName,
              country: geoData.country,
              source: 'ip_geolocation',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (geoError) {
        console.error('[get-user-location] IP geolocation failed:', geoError);
      }
    }

    // Parse request body for hints
    let cityHint = '';
    try {
      const body = await req.json();
      cityHint = body.cityHint?.toLowerCase() || '';
    } catch {
      // No body provided
    }

    // Try to match city hint
    if (cityHint) {
      for (const [key, location] of Object.entries(INDIAN_CITIES)) {
        if (cityHint.includes(key) || key.includes(cityHint)) {
          console.log('[get-user-location] City hint matched:', location.name);
          return new Response(
            JSON.stringify({
              lat: location.lat,
              lng: location.lng,
              city: location.name,
              source: 'city_hint',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Default to Trivandrum (Kerala) as per user's previous context
    const defaultCity = INDIAN_CITIES['trivandrum'];
    console.log('[get-user-location] Using default location:', defaultCity.name);
    
    return new Response(
      JSON.stringify({
        lat: defaultCity.lat,
        lng: defaultCity.lng,
        city: defaultCity.name,
        source: 'default',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-user-location] Error:', error);
    return new Response(
      JSON.stringify({
        ...DEFAULT_LOCATION,
        source: 'fallback',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
