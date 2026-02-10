// Comprehensive searchable data including dictionary and locations

export interface DictionaryEntry {
  word: string;
  definition: string;
  partOfSpeech: string;
  examples?: string[];
}

export interface LocationEntry {
  name: string;
  type: 'country' | 'city' | 'village' | 'region';
  country?: string;
  region?: string;
  coordinates?: { lat: number; lon: number };
}

// Common English words and their definitions (expandable database)
export const DICTIONARY_ENTRIES: DictionaryEntry[] = [
  // App-related terms
  { word: 'profile', definition: 'A brief description of a person or their characteristics', partOfSpeech: 'noun' },
  { word: 'search', definition: 'To look for or seek something', partOfSpeech: 'verb' },
  { word: 'settings', definition: 'Configuration or preferences for a system', partOfSpeech: 'noun' },
  { word: 'notification', definition: 'A message or alert informing someone of something', partOfSpeech: 'noun' },
  { word: 'privacy', definition: 'The state of being free from public attention', partOfSpeech: 'noun' },
  { word: 'voice', definition: 'Sound produced by speaking or singing', partOfSpeech: 'noun' },
  { word: 'command', definition: 'An authoritative order or instruction', partOfSpeech: 'noun' },
  { word: 'friend', definition: 'A person with whom one has a bond of mutual affection', partOfSpeech: 'noun' },
  { word: 'message', definition: 'A communication sent or received', partOfSpeech: 'noun' },
  { word: 'post', definition: 'To publish or share content online', partOfSpeech: 'verb' },
  { word: 'share', definition: 'To give a portion of something to others', partOfSpeech: 'verb' },
  { word: 'like', definition: 'To find agreeable or enjoyable', partOfSpeech: 'verb' },
  { word: 'comment', definition: 'A remark expressing an opinion or reaction', partOfSpeech: 'noun' },
  { word: 'location', definition: 'A particular place or position', partOfSpeech: 'noun' },
  { word: 'chat', definition: 'To talk in a friendly and informal way', partOfSpeech: 'verb' },
  { word: 'assistant', definition: 'A person or program that helps', partOfSpeech: 'noun' },
  { word: 'connect', definition: 'To join or link together', partOfSpeech: 'verb' },
  { word: 'discover', definition: 'To find or learn something for the first time', partOfSpeech: 'verb' },
  { word: 'explore', definition: 'To travel through or examine thoroughly', partOfSpeech: 'verb' },
  { word: 'customize', definition: 'To modify to suit individual requirements', partOfSpeech: 'verb' },
  
  // Common verbs
  { word: 'create', definition: 'To bring something into existence', partOfSpeech: 'verb' },
  { word: 'update', definition: 'To make something more modern or current', partOfSpeech: 'verb' },
  { word: 'delete', definition: 'To remove or erase', partOfSpeech: 'verb' },
  { word: 'edit', definition: 'To prepare content for publication by correcting or modifying', partOfSpeech: 'verb' },
  { word: 'browse', definition: 'To look through or survey casually', partOfSpeech: 'verb' },
  { word: 'navigate', definition: 'To find your way around a system or place', partOfSpeech: 'verb' },
  
  // Common nouns
  { word: 'feature', definition: 'A distinctive attribute or aspect of something', partOfSpeech: 'noun' },
  { word: 'content', definition: 'Information or material provided', partOfSpeech: 'noun' },
  { word: 'platform', definition: 'A digital system or service for interaction', partOfSpeech: 'noun' },
  { word: 'interface', definition: 'A point where two systems meet and interact', partOfSpeech: 'noun' },
  { word: 'account', definition: 'A record of a user in a system', partOfSpeech: 'noun' },
  { word: 'community', definition: 'A group of people with shared interests', partOfSpeech: 'noun' },
];

// World locations (countries, major cities, regions)
export const LOCATION_ENTRIES: LocationEntry[] = [
  // Countries
  { name: 'India', type: 'country', coordinates: { lat: 20.5937, lon: 78.9629 } },
  { name: 'United States', type: 'country', coordinates: { lat: 37.0902, lon: -95.7129 } },
  { name: 'United Kingdom', type: 'country', coordinates: { lat: 55.3781, lon: -3.4360 } },
  { name: 'Canada', type: 'country', coordinates: { lat: 56.1304, lon: -106.3468 } },
  { name: 'Australia', type: 'country', coordinates: { lat: -25.2744, lon: 133.7751 } },
  { name: 'Germany', type: 'country', coordinates: { lat: 51.1657, lon: 10.4515 } },
  { name: 'France', type: 'country', coordinates: { lat: 46.2276, lon: 2.2137 } },
  { name: 'Japan', type: 'country', coordinates: { lat: 36.2048, lon: 138.2529 } },
  { name: 'China', type: 'country', coordinates: { lat: 35.8617, lon: 104.1954 } },
  { name: 'Brazil', type: 'country', coordinates: { lat: -14.2350, lon: -51.9253 } },

  // Major Indian Cities
  { name: 'Mumbai', type: 'city', country: 'India', region: 'Maharashtra', coordinates: { lat: 19.0760, lon: 72.8777 } },
  { name: 'Delhi', type: 'city', country: 'India', region: 'Delhi', coordinates: { lat: 28.7041, lon: 77.1025 } },
  { name: 'Bangalore', type: 'city', country: 'India', region: 'Karnataka', coordinates: { lat: 12.9716, lon: 77.5946 } },
  { name: 'Bengaluru', type: 'city', country: 'India', region: 'Karnataka', coordinates: { lat: 12.9716, lon: 77.5946 } },
  { name: 'Hyderabad', type: 'city', country: 'India', region: 'Telangana', coordinates: { lat: 17.3850, lon: 78.4867 } },
  { name: 'Chennai', type: 'city', country: 'India', region: 'Tamil Nadu', coordinates: { lat: 13.0827, lon: 80.2707 } },
  { name: 'Kolkata', type: 'city', country: 'India', region: 'West Bengal', coordinates: { lat: 22.5726, lon: 88.3639 } },
  { name: 'Pune', type: 'city', country: 'India', region: 'Maharashtra', coordinates: { lat: 18.5204, lon: 73.8567 } },
  { name: 'Ahmedabad', type: 'city', country: 'India', region: 'Gujarat', coordinates: { lat: 23.0225, lon: 72.5714 } },
  { name: 'Jaipur', type: 'city', country: 'India', region: 'Rajasthan', coordinates: { lat: 26.9124, lon: 75.7873 } },
  { name: 'Lucknow', type: 'city', country: 'India', region: 'Uttar Pradesh', coordinates: { lat: 26.8467, lon: 80.9462 } },
  { name: 'Surat', type: 'city', country: 'India', region: 'Gujarat', coordinates: { lat: 21.1702, lon: 72.8311 } },
  { name: 'Kanpur', type: 'city', country: 'India', region: 'Uttar Pradesh', coordinates: { lat: 26.4499, lon: 80.3319 } },
  { name: 'Nagpur', type: 'city', country: 'India', region: 'Maharashtra', coordinates: { lat: 21.1458, lon: 79.0882 } },
  { name: 'Indore', type: 'city', country: 'India', region: 'Madhya Pradesh', coordinates: { lat: 22.7196, lon: 75.8577 } },
  { name: 'Thane', type: 'city', country: 'India', region: 'Maharashtra', coordinates: { lat: 19.2183, lon: 72.9781 } },
  { name: 'Bhopal', type: 'city', country: 'India', region: 'Madhya Pradesh', coordinates: { lat: 23.2599, lon: 77.4126 } },
  { name: 'Visakhapatnam', type: 'city', country: 'India', region: 'Andhra Pradesh', coordinates: { lat: 17.6869, lon: 83.2185 } },
  { name: 'Patna', type: 'city', country: 'India', region: 'Bihar', coordinates: { lat: 25.5941, lon: 85.1376 } },
  { name: 'Vadodara', type: 'city', country: 'India', region: 'Gujarat', coordinates: { lat: 22.3072, lon: 73.1812 } },
  { name: 'Ghaziabad', type: 'city', country: 'India', region: 'Uttar Pradesh', coordinates: { lat: 28.6692, lon: 77.4538 } },
  { name: 'Ludhiana', type: 'city', country: 'India', region: 'Punjab', coordinates: { lat: 30.9010, lon: 75.8573 } },
  { name: 'Agra', type: 'city', country: 'India', region: 'Uttar Pradesh', coordinates: { lat: 27.1767, lon: 78.0081 } },
  { name: 'Nashik', type: 'city', country: 'India', region: 'Maharashtra', coordinates: { lat: 19.9975, lon: 73.7898 } },
  { name: 'Faridabad', type: 'city', country: 'India', region: 'Haryana', coordinates: { lat: 28.4089, lon: 77.3178 } },
  { name: 'Meerut', type: 'city', country: 'India', region: 'Uttar Pradesh', coordinates: { lat: 28.9845, lon: 77.7064 } },
  { name: 'Rajkot', type: 'city', country: 'India', region: 'Gujarat', coordinates: { lat: 22.3039, lon: 70.8022 } },
  { name: 'Varanasi', type: 'city', country: 'India', region: 'Uttar Pradesh', coordinates: { lat: 25.3176, lon: 82.9739 } },
  { name: 'Srinagar', type: 'city', country: 'India', region: 'Jammu and Kashmir', coordinates: { lat: 34.0837, lon: 74.7973 } },
  { name: 'Amritsar', type: 'city', country: 'India', region: 'Punjab', coordinates: { lat: 31.6340, lon: 74.8723 } },
  { name: 'Chandigarh', type: 'city', country: 'India', region: 'Chandigarh', coordinates: { lat: 30.7333, lon: 76.7794 } },
  { name: 'Guwahati', type: 'city', country: 'India', region: 'Assam', coordinates: { lat: 26.1445, lon: 91.7362 } },
  { name: 'Bhubaneswar', type: 'city', country: 'India', region: 'Odisha', coordinates: { lat: 20.2961, lon: 85.8245 } },
  { name: 'Kochi', type: 'city', country: 'India', region: 'Kerala', coordinates: { lat: 9.9312, lon: 76.2673 } },
  { name: 'Thiruvananthapuram', type: 'city', country: 'India', region: 'Kerala', coordinates: { lat: 8.5241, lon: 76.9366 } },
  { name: 'Coimbatore', type: 'city', country: 'India', region: 'Tamil Nadu', coordinates: { lat: 11.0168, lon: 76.9558 } },
  { name: 'Madurai', type: 'city', country: 'India', region: 'Tamil Nadu', coordinates: { lat: 9.9252, lon: 78.1198 } },
  { name: 'Mysore', type: 'city', country: 'India', region: 'Karnataka', coordinates: { lat: 12.2958, lon: 76.6394 } },
  { name: 'Goa', type: 'city', country: 'India', region: 'Goa', coordinates: { lat: 15.2993, lon: 74.1240 } },

  // Global Cities
  { name: 'London', type: 'city', country: 'United Kingdom', coordinates: { lat: 51.5074, lon: -0.1278 } },
  { name: 'New York', type: 'city', country: 'United States', coordinates: { lat: 40.7128, lon: -74.0060 } },
  { name: 'Paris', type: 'city', country: 'France', coordinates: { lat: 48.8566, lon: 2.3522 } },
  { name: 'Tokyo', type: 'city', country: 'Japan', coordinates: { lat: 35.6762, lon: 139.6503 } },
  { name: 'Sydney', type: 'city', country: 'Australia', coordinates: { lat: -33.8688, lon: 151.2093 } },
  { name: 'Dubai', type: 'city', country: 'UAE', coordinates: { lat: 25.2048, lon: 55.2708 } },
  { name: 'Singapore', type: 'city', country: 'Singapore', coordinates: { lat: 1.3521, lon: 103.8198 } },
  { name: 'Berlin', type: 'city', country: 'Germany', coordinates: { lat: 52.5200, lon: 13.4050 } },
  { name: 'Toronto', type: 'city', country: 'Canada', coordinates: { lat: 43.6532, lon: -79.3832 } },
  { name: 'São Paulo', type: 'city', country: 'Brazil', coordinates: { lat: -23.5505, lon: -46.6333 } },

  // Indian Villages/Towns and Heritage Sites
  { name: 'Khajuraho', type: 'village', country: 'India', region: 'Madhya Pradesh' },
  { name: 'Hampi', type: 'village', country: 'India', region: 'Karnataka' },
  { name: 'Mahabalipuram', type: 'village', country: 'India', region: 'Tamil Nadu' },
  { name: 'Pushkar', type: 'village', country: 'India', region: 'Rajasthan' },
  { name: 'Rishikesh', type: 'city', country: 'India', region: 'Uttarakhand' },
  { name: 'Haridwar', type: 'city', country: 'India', region: 'Uttarakhand' },
  { name: 'Puri', type: 'city', country: 'India', region: 'Odisha' },
  { name: 'Tirupati', type: 'city', country: 'India', region: 'Andhra Pradesh' },
  { name: 'Ajmer', type: 'city', country: 'India', region: 'Rajasthan' },
  { name: 'Ujjain', type: 'city', country: 'India', region: 'Madhya Pradesh' },
  { name: 'Shirdi', type: 'village', country: 'India', region: 'Maharashtra' },
  { name: 'Dwarka', type: 'city', country: 'India', region: 'Gujarat' },
  { name: 'Allahabad', type: 'city', country: 'India', region: 'Uttar Pradesh' },
  { name: 'Prayagraj', type: 'city', country: 'India', region: 'Uttar Pradesh' },
  { name: 'Mathura', type: 'city', country: 'India', region: 'Uttar Pradesh' },
  { name: 'Vrindavan', type: 'city', country: 'India', region: 'Uttar Pradesh' },
  { name: 'Konark', type: 'village', country: 'India', region: 'Odisha' },
  { name: 'Sanchi', type: 'village', country: 'India', region: 'Madhya Pradesh' },
  { name: 'Ellora', type: 'village', country: 'India', region: 'Maharashtra' },
  { name: 'Ajanta', type: 'village', country: 'India', region: 'Maharashtra' },
  
  // International Villages/Towns
  { name: 'Cotswolds', type: 'village', country: 'United Kingdom', region: 'England' },
  { name: 'Provence', type: 'region', country: 'France' },
  { name: 'Tuscany', type: 'region', country: 'Italy' },
  { name: 'Bavaria', type: 'region', country: 'Germany' },
];

export const searchDictionary = (query: string): DictionaryEntry[] => {
  const lowercaseQuery = query.toLowerCase().trim();
  if (!lowercaseQuery) return [];
  
  return DICTIONARY_ENTRIES.filter(entry => 
    entry.word.toLowerCase().includes(lowercaseQuery) ||
    entry.definition.toLowerCase().includes(lowercaseQuery)
  ).slice(0, 5);
};

export const searchLocations = (query: string): LocationEntry[] => {
  const lowercaseQuery = query.toLowerCase().trim();
  if (!lowercaseQuery) return [];
  
  return LOCATION_ENTRIES.filter(location => 
    location.name.toLowerCase().includes(lowercaseQuery) ||
    location.country?.toLowerCase().includes(lowercaseQuery) ||
    location.region?.toLowerCase().includes(lowercaseQuery) ||
    location.type.toLowerCase().includes(lowercaseQuery)
  ).slice(0, 10);
};

export const getLocationsByType = (type: 'country' | 'city' | 'village' | 'region'): LocationEntry[] => {
  return LOCATION_ENTRIES.filter(l => l.type === type);
};
