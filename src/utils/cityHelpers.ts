// Canonical city names and coordinates for map anchors
export const CANONICAL_CITIES = [
  'Delhi',
  'Mumbai',
  'Bangalore',
  'Chennai',
  'Trivandrum',
  'Kargil',
  'Bhuj',
  'Tinsukia',
  'Kanyakumari',
  'Hyderabad',
  'Kolkata',
  'Pune',
  'Ahmedabad',
  'Jaipur',
  'Surat',
  'Lucknow',
  'Kanpur',
  'Nagpur',
  'Indore',
  'Bhopal',
  'Vadodara',
  'Coimbatore',
  'Kochi',
  'Visakhapatnam',
  'Vijayawada',
  'Chandigarh',
] as const;

export type CanonicalCity = typeof CANONICAL_CITIES[number];

// Lat/lon coordinates for each canonical city
export const cityLatLon: Record<CanonicalCity, { lat: number; lon: number }> = {
  Delhi: { lat: 28.7041, lon: 77.1025 },
  Mumbai: { lat: 19.0760, lon: 72.8777 },
  Bangalore: { lat: 12.9716, lon: 77.5946 },
  Chennai: { lat: 13.0827, lon: 80.2707 },
  Trivandrum: { lat: 8.5241, lon: 76.9366 },
  Kargil: { lat: 34.5553, lon: 76.1193 },
  Bhuj: { lat: 23.2410, lon: 69.6669 },
  Tinsukia: { lat: 27.4920, lon: 95.3670 },
  Kanyakumari: { lat: 8.0883, lon: 77.5385 },
  Hyderabad: { lat: 17.3850, lon: 78.4867 },
  Kolkata: { lat: 22.5726, lon: 88.3639 },
  Pune: { lat: 18.5204, lon: 73.8567 },
  Ahmedabad: { lat: 23.0225, lon: 72.5714 },
  Jaipur: { lat: 26.9124, lon: 75.7873 },
  Surat: { lat: 21.1702, lon: 72.8311 },
  Lucknow: { lat: 26.8467, lon: 80.9462 },
  Kanpur: { lat: 26.4499, lon: 80.3319 },
  Nagpur: { lat: 21.1458, lon: 79.0882 },
  Indore: { lat: 22.7196, lon: 75.8577 },
  Bhopal: { lat: 23.2599, lon: 77.4126 },
  Vadodara: { lat: 22.3072, lon: 73.1812 },
  Coimbatore: { lat: 11.0168, lon: 76.9558 },
  Kochi: { lat: 9.9312, lon: 76.2673 },
  Visakhapatnam: { lat: 17.6868, lon: 83.2185 },
  Vijayawada: { lat: 16.5062, lon: 80.6480 },
  Chandigarh: { lat: 30.7333, lon: 76.7794 },
};

// Synonyms for city name mapping
export const CITY_SYNONYMS: Record<string, CanonicalCity> = {
  // Delhi variants
  'new delhi': 'Delhi',
  'delhi': 'Delhi',
  'newdelhi': 'Delhi',
  
  // Mumbai variants
  'mumbai': 'Mumbai',
  'bombay': 'Mumbai',
  
  // Bangalore variants
  'bangalore': 'Bangalore',
  'bengaluru': 'Bangalore',
  'bengalooru': 'Bangalore',
  
  // Chennai variants
  'chennai': 'Chennai',
  'madras': 'Chennai',
  
  // Trivandrum variants
  'trivandrum': 'Trivandrum',
  'thiruvananthapuram': 'Trivandrum',
  'tiruvananthapuram': 'Trivandrum',
  
  // Kargil variants
  'kargil': 'Kargil',
  
  // Bhuj variants
  'bhuj': 'Bhuj',
  
  // Tinsukia variants
  'tinsukia': 'Tinsukia',
  
  // Kanyakumari variants
  'kanyakumari': 'Kanyakumari',
  'kanniyakumari': 'Kanyakumari',
  'cape comorin': 'Kanyakumari',
  
  // Hyderabad variants
  'hyderabad': 'Hyderabad',
  
  // Kolkata variants
  'kolkata': 'Kolkata',
  'calcutta': 'Kolkata',
  
  // Pune variants
  'pune': 'Pune',
  'poona': 'Pune',
  
  // Ahmedabad variants
  'ahmedabad': 'Ahmedabad',
  'amdavad': 'Ahmedabad',
  
  // Jaipur variants
  'jaipur': 'Jaipur',
  
  // Surat variants
  'surat': 'Surat',
  
  // Lucknow variants
  'lucknow': 'Lucknow',
  
  // Kanpur variants
  'kanpur': 'Kanpur',
  'cawnpore': 'Kanpur',
  
  // Nagpur variants
  'nagpur': 'Nagpur',
  
  // Indore variants
  'indore': 'Indore',
  
  // Bhopal variants
  'bhopal': 'Bhopal',
  
  // Vadodara variants
  'vadodara': 'Vadodara',
  'baroda': 'Vadodara',
  
  // Coimbatore variants
  'coimbatore': 'Coimbatore',
  'kovai': 'Coimbatore',
  
  // Kochi variants
  'kochi': 'Kochi',
  'cochin': 'Kochi',
  
  // Visakhapatnam variants
  'visakhapatnam': 'Visakhapatnam',
  'vizag': 'Visakhapatnam',
  'vishakhapatnam': 'Visakhapatnam',
  
  // Vijayawada variants
  'vijayawada': 'Vijayawada',
  
  // Chandigarh variants
  'chandigarh': 'Chandigarh',
};

/**
 * Normalize a raw city string to a canonical city name
 * @param raw - Raw city name from geocoder or user input
 * @returns Canonical city name or null if not found
 */
export function normalizeCityRaw(raw: string | null | undefined): CanonicalCity | null {
  if (!raw) return null;
  
  const normalized = raw.trim().toLowerCase();
  
  // Check synonyms first
  if (normalized in CITY_SYNONYMS) {
    return CITY_SYNONYMS[normalized];
  }
  
  // Check if it's already a canonical city
  const canonical = CANONICAL_CITIES.find(
    city => city.toLowerCase() === normalized
  );
  
  return canonical || null;
}

/**
 * Calculate distance between two lat/lon points using Haversine formula
 * @returns Distance in kilometers
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Find nearest canonical city to given coordinates
 * @returns Object with city name and distance in km
 */
export function findNearestCity(
  lat: number,
  lon: number
): { city: CanonicalCity; distance: number } {
  let nearestCity: CanonicalCity = 'Delhi';
  let minDistance = Infinity;
  
  for (const city of CANONICAL_CITIES) {
    const { lat: cityLat, lon: cityLon } = cityLatLon[city];
    const distance = haversineDistanceKm(lat, lon, cityLat, cityLon);
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = city;
    }
  }
  
  return { city: nearestCity, distance: minDistance };
}
