// ═══════════════════════════════════════════════════════════════════════════════
// ZOE LOCAL CONTEXT HOOK
// Comprehensive local intelligence: Geo-location, Weather, Traffic, Markets,
// Local Time, Amazon Products, and Offline Support
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { getWeatherInfo, getUserLocation } from '@/utils/weatherHelpers';
import { getTrafficInfo, getCommuteAdvice, getTrafficAlerts } from '@/utils/trafficHelpers';
import { getWeatherRecommendations, getHumorousWeatherComment } from '@/utils/weatherRecommendations';
import { supabase } from '@/integrations/supabase/client';

// ═══ INTERFACES ═══

export interface LocalWeather {
  temperature: number;
  condition: string;
  location: string;
  recommendations: Array<{ message: string; category: string; priority: string }>;
  humorousComment: string;
  lastUpdated: Date;
}

export interface LocalTraffic {
  summary: string;
  alerts: Array<{ severity: 'low' | 'medium' | 'high'; message: string }>;
  commuteAdvice: string;
  lastUpdated: Date;
}

export interface LocalMarket {
  name: string;
  type: 'supermarket' | 'mall' | 'pharmacy' | 'restaurant' | 'grocery';
  openNow: boolean;
  openingHours: string;
  distance?: string;
}

export interface AmazonProduct {
  name: string;
  category: string;
  priceRange: string;
  trending: boolean;
  available: boolean;
  deliveryEstimate: string;
}

export interface LocalTimeContext {
  time: string;
  date: string;
  dayOfWeek: string;
  timeOfDay: 'early morning' | 'morning' | 'afternoon' | 'evening' | 'night' | 'late night';
  isWeekend: boolean;
  greeting: string;
  activitySuggestion: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  city: string;
  region?: string;
  country?: string;
  source: 'browser' | 'ip' | 'cached' | 'default';
  lastUpdated: Date;
}

export interface LocalContextState {
  isLoading: boolean;
  isOnline: boolean;
  hasGeoPermission: boolean;
  location: GeoLocation | null;
  weather: LocalWeather | null;
  traffic: LocalTraffic | null;
  markets: LocalMarket[];
  amazonProducts: AmazonProduct[];
  localTime: LocalTimeContext;
  lastError: string | null;
}

// ═══ LOCAL MARKET DATA (India-focused) ═══

const INDIAN_MARKET_HOURS: Record<string, { open: number; close: number }> = {
  supermarket: { open: 8, close: 22 },
  mall: { open: 10, close: 22 },
  pharmacy: { open: 8, close: 23 },
  restaurant: { open: 11, close: 23 },
  grocery: { open: 6, close: 21 },
};

const LOCAL_MARKETS: LocalMarket[] = [
  { name: 'Big Bazaar', type: 'supermarket', openNow: true, openingHours: '8 AM - 10 PM' },
  { name: 'Reliance Fresh', type: 'grocery', openNow: true, openingHours: '6 AM - 9 PM' },
  { name: 'DMart', type: 'supermarket', openNow: true, openingHours: '8 AM - 10 PM' },
  { name: 'Spencer\'s', type: 'supermarket', openNow: true, openingHours: '9 AM - 10 PM' },
  { name: 'More Supermarket', type: 'grocery', openNow: true, openingHours: '7 AM - 10 PM' },
  { name: 'Apollo Pharmacy', type: 'pharmacy', openNow: true, openingHours: '8 AM - 11 PM' },
  { name: 'MedPlus', type: 'pharmacy', openNow: true, openingHours: '24 Hours' },
  { name: 'Local Kirana Store', type: 'grocery', openNow: true, openingHours: '7 AM - 9 PM' },
];

// ═══ AMAZON TRENDING PRODUCTS (India) ═══

const TRENDING_PRODUCTS: AmazonProduct[] = [
  { name: 'Wireless Earbuds', category: 'Electronics', priceRange: '₹999 - ₹2999', trending: true, available: true, deliveryEstimate: 'Tomorrow' },
  { name: 'Smart Watch', category: 'Electronics', priceRange: '₹1499 - ₹5999', trending: true, available: true, deliveryEstimate: '2-3 days' },
  { name: 'Water Bottle (1L)', category: 'Kitchen', priceRange: '₹199 - ₹499', trending: false, available: true, deliveryEstimate: 'Tomorrow' },
  { name: 'Phone Charger (Fast)', category: 'Electronics', priceRange: '₹299 - ₹899', trending: true, available: true, deliveryEstimate: 'Same Day' },
  { name: 'Backpack', category: 'Fashion', priceRange: '₹499 - ₹1999', trending: false, available: true, deliveryEstimate: '2-3 days' },
  { name: 'LED Bulb Pack', category: 'Home', priceRange: '₹149 - ₹349', trending: false, available: true, deliveryEstimate: 'Tomorrow' },
  { name: 'Power Bank 10000mAh', category: 'Electronics', priceRange: '₹699 - ₹1499', trending: true, available: true, deliveryEstimate: 'Same Day' },
  { name: 'Bluetooth Speaker', category: 'Electronics', priceRange: '₹799 - ₹2499', trending: true, available: true, deliveryEstimate: 'Tomorrow' },
  { name: 'Yoga Mat', category: 'Sports', priceRange: '₹299 - ₹899', trending: false, available: true, deliveryEstimate: '2-3 days' },
  { name: 'USB-C Cable', category: 'Electronics', priceRange: '₹99 - ₹399', trending: true, available: true, deliveryEstimate: 'Same Day' },
];

// ═══ HELPER FUNCTIONS ═══

function getLocalTimeContext(): LocalTimeContext {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  
  let timeOfDay: LocalTimeContext['timeOfDay'];
  let greeting: string;
  let activitySuggestion: string;
  
  if (hour >= 4 && hour < 6) {
    timeOfDay = 'early morning';
    greeting = 'Up early! The world is still quiet.';
    activitySuggestion = 'Great time for meditation or a morning walk.';
  } else if (hour >= 6 && hour < 12) {
    timeOfDay = 'morning';
    greeting = `Good morning! Happy ${dayOfWeek}.`;
    activitySuggestion = isWeekend ? 'Perfect for a relaxed breakfast or morning exercise.' : 'Ready to tackle the day?';
  } else if (hour >= 12 && hour < 17) {
    timeOfDay = 'afternoon';
    greeting = 'Good afternoon!';
    activitySuggestion = hour < 14 ? 'Lunch time! Take a break.' : 'Stay hydrated and keep going!';
  } else if (hour >= 17 && hour < 21) {
    timeOfDay = 'evening';
    greeting = 'Good evening!';
    activitySuggestion = isWeekend ? 'Perfect for family time or going out.' : 'Time to wind down from work.';
  } else if (hour >= 21 && hour < 24) {
    timeOfDay = 'night';
    greeting = 'Good night!';
    activitySuggestion = 'Time to relax. Maybe some light reading?';
  } else {
    timeOfDay = 'late night';
    greeting = 'Still awake? Hope everything is okay.';
    activitySuggestion = 'Consider getting some rest soon.';
  }
  
  return {
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    dayOfWeek,
    timeOfDay,
    isWeekend,
    greeting,
    activitySuggestion,
  };
}

function getMarketsWithCurrentStatus(hour: number): LocalMarket[] {
  return LOCAL_MARKETS.map(market => {
    const hours = INDIAN_MARKET_HOURS[market.type];
    const openNow = hours ? (hour >= hours.open && hour < hours.close) : true;
    return { ...market, openNow };
  });
}

// ═══ CACHE MANAGEMENT ═══

const CACHE_KEY = 'zoe-local-context-cache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCachedContext(): Partial<LocalContextState> | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    const cacheAge = Date.now() - data.timestamp;
    
    if (cacheAge > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return data.context;
  } catch {
    return null;
  }
}

function setCachedContext(context: Partial<LocalContextState>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      context,
    }));
  } catch {
    // Storage full or unavailable
  }
}

// ═══ MAIN HOOK ═══

export function useZoeLocalContext() {
  const [state, setState] = useState<LocalContextState>({
    isLoading: true,
    isOnline: navigator.onLine,
    hasGeoPermission: false,
    location: null,
    weather: null,
    traffic: null,
    markets: [],
    amazonProducts: [],
    localTime: getLocalTimeContext(),
    lastError: null,
  });
  
  const isInitialized = useRef(false);
  const locationWatchId = useRef<number | null>(null);

  // Update local time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => ({ ...prev, localTime: getLocalTimeContext() }));
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch geo-location
  const fetchLocation = useCallback(async (): Promise<GeoLocation | null> => {
    // Try browser geolocation first
    try {
      const position = await getUserLocation();
      const { latitude, longitude } = position.coords;
      
      // Get city name
      let city = 'your area';
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          { headers: { 'User-Agent': 'ZoeInfinity/1.0' } }
        );
        if (response.ok) {
          const data = await response.json();
          city = data.address?.city || data.address?.town || data.address?.village || 'your area';
        }
      } catch {
        // Use default
      }
      
      return {
        latitude,
        longitude,
        city,
        source: 'browser',
        lastUpdated: new Date(),
      };
    } catch (browserError) {
      console.log('[LocalContext] Browser geolocation failed, trying IP-based...');
    }
    
    // Fallback to IP-based location via edge function
    try {
      const { data } = await supabase.functions.invoke('get-user-location');
      if (data?.lat && data?.lng) {
        return {
          latitude: data.lat,
          longitude: data.lng,
          city: data.city || 'Unknown',
          region: data.region,
          country: data.country,
          source: 'ip',
          lastUpdated: new Date(),
        };
      }
    } catch {
      console.log('[LocalContext] IP geolocation failed');
    }
    
    // Use cached location - BUG FIX: Validate cached location has required properties
    const cached = getCachedContext();
    if (cached?.location && cached.location.latitude && cached.location.longitude) {
      return { 
        ...cached.location, 
        source: 'cached' as const,
        lastUpdated: cached.location.lastUpdated ? new Date(cached.location.lastUpdated) : new Date(),
      };
    }
    
    // Default to Trivandrum
    return {
      latitude: 8.5241,
      longitude: 76.9366,
      city: 'Thiruvananthapuram',
      country: 'India',
      source: 'default',
      lastUpdated: new Date(),
    };
  }, []);

  // Fetch weather
  const fetchWeather = useCallback(async (lat: number, lng: number): Promise<LocalWeather | null> => {
    try {
      const weather = await getWeatherInfo(lat, lng);
      if (!weather) return null;
      
      const recommendations = getWeatherRecommendations(weather.temperature, weather.condition);
      const humorousComment = getHumorousWeatherComment(weather.temperature, weather.condition);
      
      return {
        ...weather,
        recommendations,
        humorousComment,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('[LocalContext] Weather fetch failed:', error);
      return null;
    }
  }, []);

  // Fetch traffic
  const fetchTraffic = useCallback(async (lat: number, lng: number): Promise<LocalTraffic | null> => {
    try {
      const trafficInfo = await getTrafficInfo(lat, lng);
      const alerts = await getTrafficAlerts(lat, lng);
      const hour = new Date().getHours();
      
      return {
        summary: trafficInfo?.summary || 'Traffic data unavailable',
        alerts,
        commuteAdvice: getCommuteAdvice(hour),
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('[LocalContext] Traffic fetch failed:', error);
      return null;
    }
  }, []);

  // Initialize all context
  const initializeContext = useCallback(async () => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    const hour = new Date().getHours();
    const markets = getMarketsWithCurrentStatus(hour);
    const amazonProducts = TRENDING_PRODUCTS;
    
    // Start with local data immediately
    setState(prev => ({
      ...prev,
      markets,
      amazonProducts,
      localTime: getLocalTimeContext(),
    }));
    
    // Try to load cached data first
    const cached = getCachedContext();
    if (cached?.weather) {
      setState(prev => ({
        ...prev,
        weather: cached.weather as LocalWeather,
        traffic: cached.traffic as LocalTraffic,
        location: cached.location as GeoLocation,
      }));
    }
    
    // Then fetch fresh data if online
    if (navigator.onLine) {
      try {
        const location = await fetchLocation();
        if (location) {
          setState(prev => ({ ...prev, location, hasGeoPermission: location.source === 'browser' }));
          
          const [weather, traffic] = await Promise.all([
            fetchWeather(location.latitude, location.longitude),
            fetchTraffic(location.latitude, location.longitude),
          ]);
          
          setState(prev => ({
            ...prev,
            weather,
            traffic,
            isLoading: false,
          }));
          
          // Cache the results
          setCachedContext({ location, weather, traffic });
        }
      } catch (error) {
        console.error('[LocalContext] Initialization error:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          lastError: error instanceof Error ? error.message : 'Failed to load local context',
        }));
      }
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [fetchLocation, fetchWeather, fetchTraffic]);

  // Initialize on mount
  useEffect(() => {
    initializeContext();
    
    return () => {
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current);
      }
    };
  }, [initializeContext]);

  // Refresh all data
  const refresh = useCallback(async () => {
    isInitialized.current = false;
    await initializeContext();
  }, [initializeContext]);

  // Get contextual greeting with all local info
  const getContextualGreeting = useCallback((): string => {
    const { localTime, weather, location, traffic } = state;
    let parts: string[] = [localTime.greeting];
    
    if (weather) {
      parts.push(`It's ${weather.temperature}°C with ${weather.condition} in ${weather.location || location?.city || 'your area'}.`);
      if (weather.recommendations.length > 0) {
        const topRec = weather.recommendations[0];
        parts.push(topRec.message);
      }
    }
    
    if (traffic && traffic.alerts.length > 0) {
      const highAlert = traffic.alerts.find(a => a.severity === 'high' || a.severity === 'medium');
      if (highAlert) {
        parts.push(`⚠️ ${highAlert.message}`);
      }
    }
    
    return parts.join(' ');
  }, [state]);

  // Search Amazon products
  const searchProducts = useCallback((query: string): AmazonProduct[] => {
    const lower = query.toLowerCase();
    return state.amazonProducts.filter(p => 
      p.name.toLowerCase().includes(lower) || 
      p.category.toLowerCase().includes(lower)
    );
  }, [state.amazonProducts]);

  // Get open markets
  const getOpenMarkets = useCallback((): LocalMarket[] => {
    return state.markets.filter(m => m.openNow);
  }, [state.markets]);

  // Get markets by type
  const getMarketsByType = useCallback((type: LocalMarket['type']): LocalMarket[] => {
    return state.markets.filter(m => m.type === type);
  }, [state.markets]);

  // Get offline response for local queries
  const getOfflineLocalResponse = useCallback((query: string): string | null => {
    const lower = query.toLowerCase();
    const { localTime, weather, location, traffic, markets } = state;
    
    // Time queries
    if (lower.match(/what\s+(time|day|date)|current\s+time|today/)) {
      return `It's ${localTime.time} on ${localTime.date}. ${localTime.activitySuggestion}`;
    }
    
    // Weather queries
    if (lower.match(/weather|temperature|hot|cold|rain|sunny|forecast/)) {
      if (weather) {
        return `It's ${weather.temperature}°C with ${weather.condition} in ${weather.location}. ${weather.humorousComment}`;
      }
      return `I don't have current weather data, but I can tell you it's ${localTime.timeOfDay} on ${localTime.dayOfWeek}.`;
    }
    
    // Traffic queries
    if (lower.match(/traffic|commute|drive|road|highway|travel/)) {
      if (traffic) {
        return `${traffic.summary} ${traffic.commuteAdvice}`;
      }
      return `Traffic is typically ${localTime.isWeekend ? 'lighter on weekends' : 'heavier during rush hours (7-9 AM, 5-7 PM)'}.`;
    }
    
    // Market/store queries
    if (lower.match(/market|store|shop|supermarket|grocery|pharmacy|mall|open|close/)) {
      const openMarkets = markets.filter(m => m.openNow);
      if (openMarkets.length > 0) {
        const names = openMarkets.slice(0, 3).map(m => m.name).join(', ');
        return `Open right now: ${names}. There are ${openMarkets.length} places open near you.`;
      }
      return 'Most stores are typically open from 8 AM to 10 PM.';
    }
    
    // Amazon/product queries
    if (lower.match(/amazon|product|buy|order|shop|price|delivery/)) {
      const trending = TRENDING_PRODUCTS.filter(p => p.trending).slice(0, 3);
      const names = trending.map(p => p.name).join(', ');
      return `Trending on Amazon: ${names}. Most items have same-day or next-day delivery available.`;
    }
    
    // Location queries
    if (lower.match(/where\s+am\s+i|my\s+location|city|area/)) {
      if (location) {
        return `You're in ${location.city}${location.country ? `, ${location.country}` : ''}.`;
      }
      return "I couldn't determine your exact location. Enable location access for more accurate info.";
    }
    
    return null;
  }, [state]);

  return {
    // State
    ...state,
    
    // Actions
    refresh,
    getContextualGreeting,
    searchProducts,
    getOpenMarkets,
    getMarketsByType,
    getOfflineLocalResponse,
    
    // Direct accessors
    getCurrentTime: () => state.localTime,
    getWeather: () => state.weather,
    getTraffic: () => state.traffic,
    getLocation: () => state.location,
  };
}

export default useZoeLocalContext;
