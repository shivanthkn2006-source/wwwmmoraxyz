/**
 * GLOBE NAVIGATION SERVICE
 * 
 * Singleton service for controlling Selfie City 3D globe navigation.
 * Uses free Nominatim API for geocoding (no Google Maps).
 * Dispatches events for SelfiePins to consume for camera fly-to animations.
 */

// Event types for globe navigation
export interface GlobeFlyToEvent {
  lat: number;
  lng: number;
  name: string;
  zoom?: number;
  duration?: number;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  type: string;
}

// Rate limiting for Nominatim API (free tier: 1 request/second)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // 1.1 seconds

/**
 * Geocode a location string to coordinates using Nominatim (OpenStreetMap)
 * FREE API - No key required
 */
export const geocodeLocation = async (locationQuery: string): Promise<GeocodeResult | null> => {
  if (!locationQuery || locationQuery.trim().length === 0) {
    return null;
  }

  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();

  try {
    const encoded = encodeURIComponent(locationQuery.trim());
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`,
      {
        headers: {
          'User-Agent': 'SelfieCityApp/1.0 (AR Commerce Platform)',
          'Accept-Language': 'en',
        },
      }
    );

    if (!response.ok) {
      console.error('[GlobeNavService] Nominatim API error:', response.status);
      return null;
    }

    const results = await response.json();
    
    if (results && results.length > 0) {
      const result = results[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        displayName: result.display_name,
        type: result.type,
      };
    }

    return null;
  } catch (error) {
    console.error('[GlobeNavService] Geocoding error:', error);
    return null;
  }
};

/**
 * Dispatch a fly-to event for the globe to animate camera to location
 */
export const flyToLocation = (
  lat: number, 
  lng: number, 
  name: string,
  options?: { zoom?: number; duration?: number }
): void => {
  const event: GlobeFlyToEvent = {
    lat,
    lng,
    name,
    zoom: options?.zoom ?? 2,
    duration: options?.duration ?? 2000,
  };

  window.dispatchEvent(new CustomEvent('selfie-city-globe-fly-to', {
    detail: event
  }));

  console.log('[GlobeNavService] Dispatched fly-to:', name, lat, lng);
};

/**
 * Geocode and fly to a location by name
 * Combined convenience function
 */
export const searchAndFlyTo = async (
  locationQuery: string,
  options?: { zoom?: number; duration?: number }
): Promise<{ success: boolean; location?: GeocodeResult; error?: string }> => {
  console.log('[GlobeNavService] Searching for:', locationQuery);

  const geocoded = await geocodeLocation(locationQuery);
  
  if (!geocoded) {
    return { 
      success: false, 
      error: `Could not find "${locationQuery}" on the map` 
    };
  }

  flyToLocation(geocoded.lat, geocoded.lng, geocoded.displayName, options);
  
  return { 
    success: true, 
    location: geocoded 
  };
};

/**
 * Predefined locations for common Indian cities/landmarks
 * Fallback when Nominatim is slow or unavailable
 */
export const KNOWN_LOCATIONS: Record<string, { lat: number; lng: number }> = {
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'delhi': { lat: 28.6139, lng: 77.2090 },
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'bengaluru': { lat: 12.9716, lng: 77.5946 },
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'kolkata': { lat: 22.5726, lng: 88.3639 },
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'pune': { lat: 18.5204, lng: 73.8567 },
  'ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'jaipur': { lat: 26.9124, lng: 75.7873 },
  'surat': { lat: 21.1702, lng: 72.8311 },
  'lucknow': { lat: 26.8467, lng: 80.9462 },
  'kanpur': { lat: 26.4499, lng: 80.3319 },
  'nagpur': { lat: 21.1458, lng: 79.0882 },
  'indore': { lat: 22.7196, lng: 75.8577 },
  'coimbatore': { lat: 11.0168, lng: 76.9558 },
  'kochi': { lat: 9.9312, lng: 76.2673 },
  'goa': { lat: 15.2993, lng: 74.1240 },
  'chandigarh': { lat: 30.7333, lng: 76.7794 },
  'guwahati': { lat: 26.1445, lng: 91.7362 },
  // International
  'new york': { lat: 40.7128, lng: -74.0060 },
  'london': { lat: 51.5074, lng: -0.1278 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'singapore': { lat: 1.3521, lng: 103.8198 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'sydney': { lat: -33.8688, lng: 151.2093 },
};

/**
 * Quick fly-to for known locations (no API call)
 */
export const quickFlyToKnown = (cityName: string): boolean => {
  const normalized = cityName.toLowerCase().trim();
  const coords = KNOWN_LOCATIONS[normalized];
  
  if (coords) {
    flyToLocation(coords.lat, coords.lng, cityName, { duration: 1500 });
    return true;
  }
  
  return false;
};

/**
 * Smart fly-to: tries known locations first, then falls back to geocoding
 */
export const smartFlyTo = async (
  locationQuery: string,
  options?: { zoom?: number; duration?: number }
): Promise<{ success: boolean; location?: GeocodeResult; error?: string }> => {
  // Try known locations first (instant)
  const normalized = locationQuery.toLowerCase().trim();
  const knownCoords = KNOWN_LOCATIONS[normalized];
  
  if (knownCoords) {
    flyToLocation(knownCoords.lat, knownCoords.lng, locationQuery, options);
    return {
      success: true,
      location: {
        lat: knownCoords.lat,
        lng: knownCoords.lng,
        displayName: locationQuery,
        type: 'known_city',
      }
    };
  }
  
  // Fall back to Nominatim geocoding
  return searchAndFlyTo(locationQuery, options);
};

// Export a singleton-like interface
export const globeNavigationService = {
  geocodeLocation,
  flyToLocation,
  searchAndFlyTo,
  quickFlyToKnown,
  smartFlyTo,
  KNOWN_LOCATIONS,
};

export default globeNavigationService;
